import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { getConfig } from './config.ts';
import {
  createStorageClient,
  PRIVATE_MEDIA_BUCKET,
  PUBLIC_MEDIA_BUCKET,
  removeQuietly,
  StorageError,
  type StorageClient,
} from './storage.ts';

/**
 * Real objects, through a real Storage.
 *
 * ══ WHY THIS FILE EXISTS, WHICH IS A FAILURE WORTH RECORDING ════════════════
 *
 * `.github/workflows/ci.yml` excluded `storage-api` from the Supabase stack
 * with the note "ADR-011's buckets are not exercised yet". True when written,
 * false from the day the media endpoints shipped — **and nothing noticed the
 * justification had expired.**
 *
 * So every image path was broken on staging from merge until a human opened the
 * dashboard, while eight green jobs said otherwise. Every storage test in this
 * repository used a FAKE, and a fake is exactly as green when the real bucket
 * does not exist.
 *
 * These tests round-trip actual bytes. They are the thing that fails when a
 * bucket is missing, misnamed, or — the one that matters most —
 * **accidentally public.**
 *
 * ── THEY DO NOT USE THE TRANSACTION HARNESS ────────────────────────────────
 *
 * There is no transaction to roll back: Storage is not Postgres, and an object
 * written here survives the test unless it is deleted. So each test cleans up
 * after itself in `afterEach`, keyed on a per-test UUID prefix so two runs
 * cannot collide.
 */

const config = getConfig();

const storage: StorageClient = createStorageClient({
  baseUrl: config.SUPABASE_URL,
  serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
});

/** Sixteen bytes that begin exactly as a PNG does. */
const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52,
]);

/** Everything written by the current test, removed afterwards. */
const written: Array<{ key: string; bucket: 'public' | 'private' }> = [];

function publicKey(): string {
  const key = `test/${randomUUID()}.png`;
  written.push({ key, bucket: 'public' });
  return key;
}

function privateKey(): string {
  const key = `test/${randomUUID()}.png`;
  written.push({ key, bucket: 'private' });
  return key;
}

afterEach(async () => {
  for (const { key, bucket } of written.splice(0)) {
    // Best-effort: a test that already failed must not fail again in teardown
    // and hide its own message.
    try {
      if (bucket === 'public') await storage.remove(key);
      else await storage.removePrivate(key);
    } catch {
      // Ignored on purpose.
    }
  }
});

/** A plain fetch, with no credentials at all — an anonymous visitor. */
async function fetchAnonymously(url: string): Promise<Response> {
  return await fetch(url);
}

describe('the public bucket serves what was put in it', () => {
  it('returns a URL that actually serves the bytes', async () => {
    const key = publicKey();
    const { url } = await storage.upload({
      key,
      body: PNG_BYTES,
      contentType: 'image/png',
    });

    // ── FETCHED WITHOUT CREDENTIALS, WHICH IS THE POINT ──────────────────
    //
    // A banner on a salon's public booking page is loaded by a stranger's
    // browser with no token. Fetching it with the service-role key would prove
    // the object exists and nothing about whether anyone can see it.
    const response = await fetchAnonymously(url);

    expect(response.status).toBe(200);
    const served = Buffer.from(await response.arrayBuffer());
    expect(served.equals(PNG_BYTES)).toBe(true);

    // And the URL names the public bucket, not the private one — a mistake
    // that would otherwise surface only as a 404 on somebody's booking page.
    expect(url).toContain(PUBLIC_MEDIA_BUCKET);
    expect(url).not.toContain(PRIVATE_MEDIA_BUCKET);
  });
});

describe('the private bucket does not serve anything to anybody', () => {
  it('refuses an anonymous read of an uploaded object', async () => {
    const key = privateKey();
    const stored = await storage.uploadPrivate({
      key,
      body: PNG_BYTES,
      contentType: 'image/png',
    });
    expect(stored.key).toBe(key);

    // ══ THE ASSERTION THE WHOLE PRIVACY FIX RESTS ON ═══════════════════════
    //
    // Payment proofs are clients' M-Pesa screenshots. If `private-media` were
    // created public — one toggle, in a dashboard or in `config.toml` — every
    // proof would be world-readable to anyone holding a key, the API would keep
    // signing URLs that work, and **every other test in this repository would
    // still pass.**
    //
    // The URL is built the way an attacker would: the public-object path for
    // the private bucket, which is exactly what `publicUrl` produces if
    // somebody ever points it at the wrong bucket.
    const guessed = `${config.SUPABASE_URL}/storage/v1/object/public/${PRIVATE_MEDIA_BUCKET}/${key}`;
    const response = await fetchAnonymously(guessed);

    expect(
      response.status,
      'private-media served an object anonymously — the bucket is public',
    ).toBeGreaterThanOrEqual(400);
  });

  it('signs a URL that works, and refuses one for a key that does not exist', async () => {
    const key = privateKey();
    await storage.uploadPrivate({
      key,
      body: PNG_BYTES,
      contentType: 'image/png',
    });

    const { url } = await storage.signedUrl(key);
    const response = await fetchAnonymously(url);

    expect(response.status).toBe(200);
    const served = Buffer.from(await response.arrayBuffer());
    expect(served.equals(PNG_BYTES)).toBe(true);

    // A key nobody uploaded. `getPaymentProof` turns this into a 404 rather
    // than a 503, and that branch has never run against a real Storage before.
    await expect(
      storage.signedUrl(`test/${randomUUID()}.png`),
    ).rejects.toMatchObject({ failure: 'not-found' });
  });

  it('refuses a tampered token on an otherwise valid signed URL', async () => {
    const key = privateKey();
    await storage.uploadPrivate({
      key,
      body: PNG_BYTES,
      contentType: 'image/png',
    });

    const { url } = await storage.signedUrl(key);

    // ── THE SIGNATURE IS DOING THE WORK, NOT THE OBSCURITY OF THE PATH ────
    //
    // Flipping one character of the token gives a URL that is correct in every
    // other respect: right bucket, right object, right shape. If this served
    // the bytes, the "signed" URL would be a long unguessable path and nothing
    // more — and a leaked path would be permanent access rather than five
    // minutes of it.
    const tampered = url.replace(
      /token=(.)/,
      (_match, first: string) => `token=${first === 'a' ? 'b' : 'a'}`,
    );
    expect(tampered).not.toBe(url);

    const response = await fetchAnonymously(tampered);
    expect(
      response.status,
      'a tampered signature still served the object',
    ).toBeGreaterThanOrEqual(400);
  });
});

describe('removeQuietly removes what it was given, and nothing else', () => {
  it('deletes the named object and leaves its neighbour alone', async () => {
    const doomed = privateKey();
    const bystander = privateKey();

    for (const key of [doomed, bystander]) {
      await storage.uploadPrivate({
        key,
        body: PNG_BYTES,
        contentType: 'image/png',
      });
    }

    await removeQuietly(
      (key) => storage.removePrivate(key),
      { warn: () => {} },
      doomed,
      'test cleanup',
    );

    // Gone.
    await expect(storage.signedUrl(doomed)).rejects.toMatchObject({
      failure: 'not-found',
    });

    // ── THE HALF THAT A MOCK CANNOT PROVE ────────────────────────────────
    //
    // The unit tests assert "the removed key equals the uploaded key", which
    // catches a wrong ARGUMENT. Only a real store catches a wrong PATH — an
    // `encodeKey` that mangled a slash, say, would delete a prefix rather than
    // an object, and every fake would report success.
    const survivor = await storage.signedUrl(bystander);
    const response = await fetchAnonymously(survivor.url);
    expect(
      response.status,
      'removing one object removed its neighbour too',
    ).toBe(200);
  });

  it('does not throw when the object is already gone', async () => {
    // The idempotence the account-deletion sweep relies on: a retry after a
    // partial failure removes objects that the first attempt already took.
    let warned = false;
    await removeQuietly(
      (key) => storage.removePrivate(key),
      { warn: () => (warned = true) },
      `test/${randomUUID()}.png`,
      'already gone',
    );

    // A 404 is success in `removePrivate`, so nothing is even warned about.
    expect(warned).toBe(false);
  });

  it('logs rather than throws when the delete genuinely fails', async () => {
    const failures: object[] = [];

    await removeQuietly(
      () =>
        Promise.reject(new StorageError('unavailable', 'object storage down')),
      { warn: (context: object) => failures.push(context) },
      'test/whatever.png',
      'storage is down',
    );

    // The caller is on a path that is already failing; a throw here would
    // replace their real error with one about cleanup.
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ event: 'media.object_orphaned' });
  });
});
