/**
 * Supabase Storage, as a client.
 *
 * ADR-011 puts brand assets in a PUBLIC, content-addressed bucket and payment
 * proofs in a private one behind an authorizing endpoint.
 *
 * ══ THIS FILE NOW TALKS TO BOTH, AND THE OLD COMMENT SAID IT MUST NOT ════════
 *
 * The previous version of this paragraph read: *"If a private-bucket path is
 * ever added it does not belong here — its whole point is that reads are
 * mediated, and a module that uploads to both invites the signed-URL step being
 * skipped for 'just this one'."*
 *
 * **The worry was right and the remedy was wrong.** Keeping the private path out
 * of this file did not make reads mediated; it made proofs land in the PUBLIC
 * bucket, because that was the only bucket the one storage module knew. A client
 * PII document was served from a permanently public URL to anyone holding it —
 * which is precisely the outcome the separation was meant to prevent.
 *
 * So the private path lives here, and the guarantee is structural instead of
 * geographic. **`uploadPrivate` returns a KEY, never a URL**, and there is no
 * `privateUrl(key)` to pair with `publicUrl(key)` — a caller that wants
 * something renderable has to call `signedUrl`, which is asynchronous, bounded
 * in time, and can only be reached from an authenticated route. The signed-URL
 * step cannot be "skipped for just this one" because there is nothing to skip
 * to: the alternative does not exist to be typed.
 *
 * `bookings.boundaries.test.ts` fails if a private key reaches `publicUrl`.
 *
 * Modelled on `gotrue.ts`, deliberately, down to the shape of the error type:
 * one file owns the HTTP conversation with one external service, and the rest
 * of the codebase deals in a `failure` slug rather than in status codes.
 *
 * ── CREDENTIALS ─────────────────────────────────────────────────────────────
 *
 * The service-role key, which bypasses RLS and Storage policy entirely (spike
 * 001/C7). It never leaves this process, is never logged, never appears in a
 * thrown message, and is not echoed into an error even when Storage returns one
 * containing it. Storage's own error body is read for a `message` and nothing
 * else is propagated.
 */

/** Bounded, because `fetch` has no default timeout — same reasoning as jwt.ts. */
const STORAGE_TIMEOUT_MS = 15_000;

/**
 * The public bucket, named once.
 *
 * Not configurable, deliberately. A bucket name in the environment is a bucket
 * name that differs between environments, and an object URL is written into the
 * database — so a staging row would carry a path that production cannot serve.
 */
export const PUBLIC_MEDIA_BUCKET = 'public-media';

/**
 * The private bucket. Payment proofs, and nothing else.
 *
 * Named the same way as the public one — a constant, not configuration — which
 * is what "like the public one" means here. The reasoning above applies with
 * more force, not less: a bucket name that differs between environments is a
 * name the object key does not carry, so a row written in staging would resolve
 * against a bucket production does not have, and the failure would surface as a
 * 404 on someone's payment proof rather than at deploy time.
 *
 * **Supabase does not enforce privacy from the name.** The bucket has to be
 * created with public read DISABLED, and `docs/ENVIRONMENT.md` carries that as
 * an owed step with the command that verifies it. Creating it public would make
 * this whole change cosmetic.
 */
export const PRIVATE_MEDIA_BUCKET = 'private-media';

/** How long a payment-proof link lives. Long enough to open, short enough that
 * a copied URL in a chat log stops working before it is read twice. */
export const SIGNED_URL_TTL_SECONDS = 300;

export type StorageFailure = 'rejected' | 'unavailable' | 'not-found';

export class StorageError extends Error {
  readonly failure: StorageFailure;
  /** Storage's own message, for the log. Never sent to a client. */
  readonly providerMessage: string | undefined;

  constructor(
    failure: StorageFailure,
    message: string,
    providerMessage?: string,
  ) {
    super(message);
    this.name = 'StorageError';
    this.failure = failure;
    this.providerMessage = providerMessage;
  }
}

export interface StorageClient {
  /**
   * Stores `body` at `key` in the public bucket and returns its public URL.
   *
   * `upsert` is deliberately NOT enabled: keys carry a UUID, so a collision
   * means something has gone wrong upstream and overwriting would hide it.
   */
  upload(input: {
    readonly key: string;
    readonly body: Buffer;
    readonly contentType: string;
  }): Promise<{ readonly url: string }>;

  /**
   * Removes an object. A missing object is success — the state this call exists
   * to reach is "not there", and treating 404 as failure would make deleting a
   * row whose object was already gone impossible.
   */
  remove(key: string): Promise<void>;

  /** The public URL an object at `key` is served from. */
  publicUrl(key: string): string;

  /**
   * Stores `body` in the PRIVATE bucket and returns the key it was stored at.
   *
   * **The return type is the point.** `upload` hands back a URL because a public
   * object has one permanently; this hands back a key because a private object
   * has no address until somebody with authority asks for one. A caller cannot
   * accidentally persist something renderable, because it was never given one.
   */
  uploadPrivate(input: {
    readonly key: string;
    readonly body: Buffer;
    readonly contentType: string;
  }): Promise<{ readonly key: string }>;

  /**
   * A short-lived URL for a private object.
   *
   * Throws `StorageError('not-found')` when the object is not there — which is
   * a real case rather than a defensive one: a booking row can outlive its
   * object if the bucket is emptied or an upload was rolled back.
   */
  signedUrl(
    key: string,
    expiresInSeconds?: number,
  ): Promise<{ readonly url: string }>;
}

export interface StorageClientOptions {
  /** Project origin, e.g. `http://127.0.0.1:54321`. `/storage/v1` is appended. */
  readonly baseUrl: string;
  readonly serviceRoleKey: string;
  readonly timeoutMs?: number;
}

function providerMessageOf(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const candidate = body as { message?: unknown; error?: unknown };
  for (const value of [candidate.message, candidate.error]) {
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}

export function createStorageClient(
  options: StorageClientOptions,
): StorageClient {
  const origin = options.baseUrl.replace(/\/+$/, '');
  const storageBase = `${origin}/storage/v1`;
  const timeoutMs = options.timeoutMs ?? STORAGE_TIMEOUT_MS;

  /**
   * The path segment for a key.
   *
   * Each segment is encoded separately so the slashes that structure the key —
   * `{businessId}/{purpose}/{uuid}.{ext}` — survive, while anything inside a
   * segment cannot introduce another one. The key is built from a UUID and a
   * fixed vocabulary today; encoding it anyway means that stays true if a
   * future caller passes something derived from user input.
   */
  function encodeKey(key: string): string {
    return key.split('/').map(encodeURIComponent).join('/');
  }

  return {
    publicUrl(key): string {
      return `${storageBase}/object/public/${PUBLIC_MEDIA_BUCKET}/${encodeKey(key)}`;
    },

    async upload({ key, body, contentType }): Promise<{ url: string }> {
      const path = `/object/${PUBLIC_MEDIA_BUCKET}/${encodeKey(key)}`;

      let response: Response;
      try {
        response = await fetch(`${storageBase}${path}`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${options.serviceRoleKey}`,
            'content-type': contentType,
            // Explicit. Storage defaults to no-cache for objects uploaded
            // through this API, and these are content-addressed by a UUID in
            // the key — a given URL's bytes never change, so a year is honest
            // rather than optimistic (ADR-011: "content-hashed immutable").
            'cache-control': 'public, max-age=31536000, immutable',
          },
          body: new Uint8Array(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        // The origin is safe to name — it is not a credential — and naming it
        // is the difference between a diagnosable log line and "fetch failed".
        throw new StorageError(
          'unavailable',
          `object storage unreachable at ${storageBase}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }

      if (response.status === 200 || response.status === 201) {
        return { url: this.publicUrl(key) };
      }

      const providerMessage = providerMessageOf(await readJson(response));
      throw new StorageError(
        response.status >= 500 ? 'unavailable' : 'rejected',
        `object storage refused the upload (HTTP ${String(response.status)})`,
        providerMessage,
      );
    },

    async remove(key): Promise<void> {
      const path = `/object/${PUBLIC_MEDIA_BUCKET}/${encodeKey(key)}`;

      let response: Response;
      try {
        response = await fetch(`${storageBase}${path}`, {
          method: 'DELETE',
          headers: { authorization: `Bearer ${options.serviceRoleKey}` },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        throw new StorageError(
          'unavailable',
          `object storage unreachable at ${storageBase}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }

      // 404 means the object is already gone, which is the state this call
      // exists to reach. Same reasoning as `gotrue.deleteUser`.
      if (response.status === 200 || response.status === 404) return;

      const providerMessage = providerMessageOf(await readJson(response));
      throw new StorageError(
        response.status >= 500 ? 'unavailable' : 'rejected',
        `object storage refused the delete (HTTP ${String(response.status)})`,
        providerMessage,
      );
    },

    async uploadPrivate({ key, body, contentType }): Promise<{ key: string }> {
      const path = `/object/${PRIVATE_MEDIA_BUCKET}/${encodeKey(key)}`;

      let response: Response;
      try {
        response = await fetch(`${storageBase}${path}`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${options.serviceRoleKey}`,
            'content-type': contentType,
            // ── NOT the public bucket's immutable year ──────────────────────
            //
            // `upload` sends `public, max-age=31536000, immutable` because a
            // brand asset is content-addressed and meant to be cached hard, by
            // browsers and by anything between. A payment proof is somebody's
            // financial document reached through a URL that expires in five
            // minutes; telling every intermediary it may hold a copy for a year
            // would undo the expiry the signed URL exists to impose.
            'cache-control': 'private, no-store',
          },
          body: new Uint8Array(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        throw new StorageError(
          'unavailable',
          `object storage unreachable at ${storageBase}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }

      // No URL is constructed here, and none can be. See the interface comment.
      if (response.status === 200 || response.status === 201) return { key };

      const providerMessage = providerMessageOf(await readJson(response));
      throw new StorageError(
        response.status >= 500 ? 'unavailable' : 'rejected',
        `object storage refused the private upload (HTTP ${String(response.status)})`,
        providerMessage,
      );
    },

    async signedUrl(key, expiresInSeconds): Promise<{ url: string }> {
      const path = `/object/sign/${PRIVATE_MEDIA_BUCKET}/${encodeKey(key)}`;
      const expiresIn = expiresInSeconds ?? SIGNED_URL_TTL_SECONDS;

      let response: Response;
      try {
        response = await fetch(`${storageBase}${path}`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${options.serviceRoleKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ expiresIn }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        throw new StorageError(
          'unavailable',
          `object storage unreachable at ${storageBase}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }

      if (response.status === 404) {
        // Distinguished from `rejected` because the CALLER can act on it: a
        // booking whose object is gone answers 404 to the owner rather than
        // 503, and those mean different things to whoever is looking at it.
        throw new StorageError(
          'not-found',
          'no such object in private storage',
        );
      }

      if (response.status !== 200) {
        const providerMessage = providerMessageOf(await readJson(response));
        throw new StorageError(
          response.status >= 500 ? 'unavailable' : 'rejected',
          `object storage refused to sign (HTTP ${String(response.status)})`,
          providerMessage,
        );
      }

      // Storage answers `{ signedURL: "/object/sign/<bucket>/<key>?token=..." }`
      // — a path, not an absolute URL, and the casing is theirs.
      const body = (await readJson(response)) as { signedURL?: unknown } | null;
      const signed = body?.signedURL;
      if (typeof signed !== 'string' || signed === '') {
        throw new StorageError(
          'unavailable',
          'object storage returned no signed URL',
        );
      }

      return {
        url: signed.startsWith('http')
          ? signed
          : `${storageBase}${signed.startsWith('/') ? '' : '/'}${signed}`,
      };
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    return text === '' ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * The object key a public URL points at, or `undefined` if it does not point
 * into our bucket at all.
 *
 * ── WHY THIS PARSES RATHER THAN TRUSTS ──────────────────────────────────────
 *
 * Deleting a portfolio image deletes a row and an object, and the object is
 * identified by a URL that came out of the database. If that URL were ever
 * something else — an externally-hosted image, a hand-edited row, a future
 * import — turning it into a key by string surgery would aim a delete at a
 * path derived from an attacker-influenced value.
 *
 * So the URL must start with this bucket's public prefix, and anything that
 * does not is not ours to delete. The caller drops the row and leaves the
 * object alone, which is the safe direction: an orphaned object costs storage,
 * a wrongly-deleted one costs someone's photograph.
 */
export function keyFromPublicUrl(
  client: StorageClient,
  url: string,
): string | undefined {
  const prefix = client.publicUrl('');
  if (!url.startsWith(prefix)) return undefined;

  const encoded = url.slice(prefix.length);
  if (encoded === '') return undefined;

  try {
    return encoded.split('/').map(decodeURIComponent).join('/');
  } catch {
    return undefined;
  }
}
