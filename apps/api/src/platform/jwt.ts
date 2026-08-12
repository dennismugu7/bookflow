import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import type { JSONWebKeySet, JWTPayload } from 'jose';

/**
 * JWT verification (ADR-017, spike 001/C5).
 *
 * ── THIS IS A DO-NOT-VIBE SURFACE (CLAUDE.md §6) ────────────────────────────
 * It decides whether a request is authenticated. Read it line by line. At the
 * time of writing it has not been reviewed.
 *
 * Supabase Auth issues ES256 tokens and publishes a JWKS; spike 001/C5 verified
 * that a separate Node service can validate them with cached keys and no call
 * back to Supabase on the request path. This module is that verification.
 *
 * ── What is checked, and against what ───────────────────────────────────────
 *
 * 1. ALGORITHM — must be exactly `ES256`.
 *    Checked TWICE, deliberately. Once here, by reading the protected header
 *    before any verification happens and rejecting anything else outright; and
 *    once inside `jwtVerify`, via its `algorithms` allowlist.
 *
 *    "The library handles it" is not a review answer. Algorithm confusion is
 *    the classic failure of this exact component: a token whose header says
 *    `alg: none` and carries no signature, or one that says `HS256` so that a
 *    verifier which selects the algorithm from the header uses an ECDSA PUBLIC
 *    key — which is public — as an HMAC SECRET. Both are forged tokens that
 *    verify. The defence is never to take the algorithm from the token, and the
 *    explicit check below is what makes that visible to a reviewer rather than
 *    a property of a dependency's defaults.
 *
 * 2. SIGNATURE — against the public key whose `kid` the header names, from the
 *    JWKS at `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`. Keys are cached;
 *    see the rotation rules below.
 *
 * 3. EXPIRY — `exp`, by `jwtVerify`, with a deliberately small clock tolerance.
 *    ADR-017 makes the access token's one-hour lifetime the only bound on
 *    exposure after logout, since there is no denylist. A generous tolerance
 *    would silently extend that bound, so it is 5 seconds — enough for ordinary
 *    clock skew between a phone and a server, not enough to matter.
 *
 * 4. ISSUER — `iss` must equal `<SUPABASE_URL>/auth/v1` exactly. The value
 *    comes from configuration (`config.ts`, `SUPABASE_URL`), never from the
 *    token. This is what stops a well-formed token minted by a DIFFERENT
 *    Supabase project — anyone can create one — from authenticating here.
 *
 * 5. AUDIENCE — `aud` must equal `authenticated`. GoTrue sets this for a
 *    signed-in user; `anon` tokens carry a different audience, so this is what
 *    stops the publishable anon key, which ships inside the Flutter app and is
 *    not a secret, being presented as a user session.
 *
 * 6. SUBJECT — `sub` must be present and a UUID. It becomes the principal.
 *
 * ── What is NOT trusted ─────────────────────────────────────────────────────
 * Nothing but `sub`. Not `role`, not `email`, not `app_metadata`, not
 * `user_metadata` — the last of which is writable by the user (ADR-037 rejects
 * a trigger reading it for exactly this reason). Authorization comes from the
 * database via the membership scoping rule (ADR-003, ADR-013), never from a
 * claim the token carries.
 */

/** The only thing the rest of the application learns from a token. */
export interface Principal {
  readonly userId: string;
}

export type JwtFailure = 'missing-token' | 'invalid-token' | 'expired-token';

export class JwtError extends Error {
  readonly failure: JwtFailure;

  constructor(failure: JwtFailure, detail: string) {
    super(detail);
    this.name = 'JwtError';
    this.failure = failure;
  }
}

export interface JwtVerifierOptions {
  /** `SUPABASE_URL`. The issuer and the JWKS URI are both derived from it. */
  readonly supabaseUrl: string;
  /** Expected `aud`. GoTrue uses `authenticated` for a signed-in user. */
  readonly audience: string;
  /**
   * Injected so tests can serve a JWKS without a network, and count fetches.
   * Defaults to `fetch`.
   */
  readonly fetchJwks?: (uri: string) => Promise<JSONWebKeySet>;
  /** Test seam for the clock. Milliseconds since epoch. */
  readonly now?: () => number;
}

export interface JwtVerifier {
  verify(token: string): Promise<Principal>;
  /** Test seam: how many times the JWKS has actually been fetched. */
  readonly fetchCount: number;
}

/** Long enough that key rotation is picked up; short enough to bound churn. */
const JWKS_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * How long an unknown `kid` is remembered as unknown.
 *
 * Without this, a caller presenting tokens with random `kid`s turns every
 * request into a JWKS fetch — the API becomes an amplifier pointed at its own
 * auth server, from an unauthenticated endpoint. Thirty seconds is long enough
 * to absorb a flood and short enough that a genuinely new key is picked up
 * almost immediately.
 */
const UNKNOWN_KID_TTL_MS = 30 * 1000;

const CLOCK_TOLERANCE_SECONDS = 5;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function defaultFetchJwks(uri: string): Promise<JSONWebKeySet> {
  const response = await fetch(uri, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`JWKS fetch failed: HTTP ${String(response.status)}`);
  }
  return (await response.json()) as JSONWebKeySet;
}

export function createJwtVerifier(options: JwtVerifierOptions): JwtVerifier {
  const issuer = `${options.supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
  const jwksUri = `${issuer}/.well-known/jwks.json`;
  const fetchJwks = options.fetchJwks ?? defaultFetchJwks;
  const now = options.now ?? Date.now;

  let jwks: JSONWebKeySet | undefined;
  let keySet: ReturnType<typeof createLocalJWKSet> | undefined;
  let fetchedAt = 0;
  let fetchCount = 0;
  const unknownKids = new Map<string, number>();

  async function refresh(): Promise<void> {
    fetchCount += 1;
    jwks = await fetchJwks(jwksUri);
    keySet = createLocalJWKSet(jwks);
    fetchedAt = now();
  }

  function known(kid: string): boolean {
    return (jwks?.keys ?? []).some((key) => key.kid === kid);
  }

  return {
    get fetchCount(): number {
      return fetchCount;
    },

    async verify(token: string): Promise<Principal> {
      if (token.trim() === '') {
        throw new JwtError('missing-token', 'no token presented');
      }

      // Read the header WITHOUT verifying anything. Everything in it is
      // attacker-controlled and is used only to decide which key to try and to
      // reject outright.
      let header;
      try {
        header = decodeProtectedHeader(token);
      } catch {
        throw new JwtError('invalid-token', 'malformed token');
      }

      // CHECK 1 of 2 on the algorithm. `none` fails here like anything else:
      // it is simply not the string `ES256`.
      if (header.alg !== 'ES256') {
        throw new JwtError(
          'invalid-token',
          `unsupported algorithm: ${String(header.alg)}`,
        );
      }

      const kid = header.kid;
      if (typeof kid !== 'string' || kid === '') {
        throw new JwtError('invalid-token', 'token names no key');
      }

      const unknownSince = unknownKids.get(kid);
      if (unknownSince !== undefined) {
        if (now() - unknownSince < UNKNOWN_KID_TTL_MS) {
          // Negative cache hit: refuse without touching the network.
          throw new JwtError('invalid-token', 'unknown signing key');
        }
        unknownKids.delete(kid);
      }

      if (jwks === undefined || now() - fetchedAt > JWKS_MAX_AGE_MS) {
        await refresh();
      }

      if (!known(kid)) {
        // Refetch ONCE. Key rotation must not require a deploy, so an unknown
        // kid is first assumed to be a new key rather than an attack.
        await refresh();
        if (!known(kid)) {
          unknownKids.set(kid, now());
          throw new JwtError('invalid-token', 'unknown signing key');
        }
      }

      let payload: JWTPayload;
      try {
        const result = await jwtVerify(token, keySet!, {
          // CHECK 2 of 2 on the algorithm: an allowlist, so the header cannot
          // select the verification algorithm even if the check above were
          // removed.
          algorithms: ['ES256'],
          issuer,
          audience: options.audience,
          clockTolerance: CLOCK_TOLERANCE_SECONDS,
          currentDate: new Date(now()),
        });
        payload = result.payload;
      } catch (error) {
        const code =
          error instanceof Error && error.name === 'JWTExpired'
            ? 'expired-token'
            : 'invalid-token';
        throw new JwtError(
          code,
          error instanceof Error ? error.message : 'verification failed',
        );
      }

      const sub = payload.sub;
      if (typeof sub !== 'string' || !UUID.test(sub)) {
        throw new JwtError('invalid-token', 'token has no usable subject');
      }

      // Only `sub`. See the note at the top of this file.
      return { userId: sub };
    },
  };
}
