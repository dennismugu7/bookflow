import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import type { CryptoKey, JSONWebKeySet, JWK } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import { createServer } from 'node:http';

import { JwtError, createJwtVerifier, defaultFetchJwks } from './jwt.ts';

/**
 * Unit tests for the verification module. No database, no network — the JWKS is
 * served from an injected function, which also lets these count fetches.
 *
 * These are the negative cases. A verifier that accepts a valid token is easy;
 * the whole value of this component is what it refuses, so most of what follows
 * is forgeries.
 */

const SUPABASE_URL = 'https://project.supabase.co';
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const AUDIENCE = 'authenticated';
const SUBJECT = '11111111-1111-4111-8111-111111111111';
const KID = 'test-key-1';

let privateKey: CryptoKey;
let publicJwk: JWK;
let jwks: JSONWebKeySet;

beforeAll(async () => {
  const pair = await generateKeyPair('ES256', { extractable: true });
  privateKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: KID, alg: 'ES256' };
  jwks = { keys: [publicJwk] };
});

interface TokenOverrides {
  readonly issuer?: string;
  readonly audience?: string;
  readonly subject?: string;
  readonly kid?: string;
  readonly expiresIn?: string;
}

async function mint(overrides: TokenOverrides = {}): Promise<string> {
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: overrides.kid ?? KID })
    .setIssuer(overrides.issuer ?? ISSUER)
    .setAudience(overrides.audience ?? AUDIENCE)
    .setSubject(overrides.subject ?? SUBJECT)
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? '1h')
    .sign(privateKey);
}

function verifier(overrides: { now?: () => number } = {}) {
  return createJwtVerifier({
    supabaseUrl: SUPABASE_URL,
    audience: AUDIENCE,
    fetchJwks: () => Promise.resolve(jwks),
    ...(overrides.now === undefined ? {} : { now: overrides.now }),
  });
}

async function expectRejected(
  token: string,
  failure: 'invalid-token' | 'expired-token' | 'missing-token',
): Promise<JwtError> {
  const subject = verifier();
  try {
    await subject.verify(token);
  } catch (error) {
    expect(error, 'rejected with a JwtError').toBeInstanceOf(JwtError);
    expect((error as JwtError).failure).toBe(failure);
    return error as JwtError;
  }
  throw new Error('token was accepted but should have been rejected');
}

describe('a valid token', () => {
  it('is accepted, and yields only the subject', async () => {
    const principal = await verifier().verify(await mint());

    expect(principal).toEqual({ userId: SUBJECT });
    // The control for every rejection below: if this ever fails, the negative
    // tests are passing for the wrong reason.
    expect(Object.keys(principal)).toEqual(['userId']);
  });
});

describe('algorithm confusion', () => {
  it('rejects a token signed with a different algorithm', async () => {
    // HS256 signed with the PUBLIC key as the HMAC secret — the classic
    // confusion attack. A verifier that took the algorithm from the header
    // would accept this, because the key it needs is public.
    const secret = new TextEncoder().encode(JSON.stringify(publicJwk));
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', kid: KID })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(SUBJECT)
      .setExpirationTime('1h')
      .sign(secret);

    const error = await expectRejected(forged, 'invalid-token');
    expect(error.message).toMatch(/unsupported algorithm: HS256/);
  });

  it('rejects alg: none, with no signature at all', async () => {
    // Hand-built: no library will sign this, which is the point.
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', kid: KID, typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: ISSUER,
        aud: AUDIENCE,
        sub: SUBJECT,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url');

    const error = await expectRejected(
      `${header}.${payload}.`,
      'invalid-token',
    );
    expect(error.message).toMatch(/unsupported algorithm: none/);
  });

  it('rejects RS256, even though it is also asymmetric', async () => {
    const rsa = await generateKeyPair('RS256', { extractable: true });
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: KID })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(SUBJECT)
      .setExpirationTime('1h')
      .sign(rsa.privateKey);

    await expectRejected(forged, 'invalid-token');
  });
});

describe('claims', () => {
  it('rejects an expired token', async () => {
    // Well outside the 5s clock tolerance — `-1s` would be ACCEPTED, which is
    // the tolerance working as designed and was worth discovering here rather
    // than assuming.
    const token = await mint({ expiresIn: '-60s' });
    await expectRejected(token, 'expired-token');
  });

  it('rejects a token that expired within the clock tolerance window only just', async () => {
    // Tolerance is 5s. At 4s past expiry it is still accepted; at 30s it is
    // not. This pins the tolerance rather than leaving it to a default.
    const token = await mint({ expiresIn: '1s' });
    const base = Date.now();

    const lenient = verifier({ now: () => base + 4_000 });
    await expect(lenient.verify(token)).resolves.toEqual({ userId: SUBJECT });

    const strict = verifier({ now: () => base + 30_000 });
    await expect(strict.verify(token)).rejects.toBeInstanceOf(JwtError);
  });

  it('rejects a token from a different issuer', async () => {
    // A real, correctly signed token from someone else's Supabase project.
    // Anyone can create one; the issuer check is what keeps it out.
    const token = await mint({
      issuer: 'https://someone-else.supabase.co/auth/v1',
    });
    await expectRejected(token, 'invalid-token');
  });

  it('rejects a token with the wrong audience', async () => {
    // What an `anon` token looks like: correctly signed by the right issuer,
    // wrong audience.
    const token = await mint({ audience: 'anon' });
    await expectRejected(token, 'invalid-token');
  });

  it('rejects a token with no usable subject', async () => {
    const token = await mint({ subject: 'not-a-uuid' });
    const error = await expectRejected(token, 'invalid-token');
    expect(error.message).toMatch(/no usable subject/);
  });

  it('rejects an empty token as missing rather than invalid', async () => {
    // The distinction matters to the client: "log in" versus "your token is
    // wrong" are different remedies (ADR-014's stable slugs).
    await expectRejected('   ', 'missing-token');
  });
});

describe('tampering', () => {
  it('rejects a token whose payload has been edited', async () => {
    const token = await mint();
    const [header, , signature] = token.split('.');

    const swapped = Buffer.from(
      JSON.stringify({
        iss: ISSUER,
        aud: AUDIENCE,
        sub: '22222222-2222-4222-8222-222222222222',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url');

    await expectRejected(`${header}.${swapped}.${signature}`, 'invalid-token');
  });

  it('rejects a token whose signature has been altered', async () => {
    const token = await mint();
    const flipped =
      token.slice(0, -3) + (token.endsWith('AAA') ? 'BBB' : 'AAA');

    await expectRejected(flipped, 'invalid-token');
  });
});

describe('key rotation and the unknown-kid path', () => {
  it('does not fetch twice for a cold cache plus an unknown kid', async () => {
    // The cold-cache refresh and the unknown-kid refetch would otherwise fire
    // microseconds apart, and the second cannot learn anything the first did
    // not.
    let fetches = 0;
    const subject = createJwtVerifier({
      supabaseUrl: SUPABASE_URL,
      audience: AUDIENCE,
      fetchJwks: () => {
        fetches += 1;
        return Promise.resolve(jwks);
      },
    });

    await expect(
      subject.verify(await mint({ kid: 'never-heard-of-it' })),
    ).rejects.toBeInstanceOf(JwtError);

    expect(fetches, 'one fetch, not two').toBe(1);
  });

  it('refetches exactly once for an unknown kid, then caches the negative', async () => {
    let fetches = 0;
    const subject = createJwtVerifier({
      supabaseUrl: SUPABASE_URL,
      audience: AUDIENCE,
      fetchJwks: () => {
        fetches += 1;
        return Promise.resolve(jwks);
      },
    });

    // Warm the cache first, so the refetch below is unambiguously the
    // unknown-kid one rather than the cold-start one.
    await subject.verify(await mint());
    expect(fetches, 'cold start').toBe(1);

    const stranger = await mint({ kid: 'a-key-we-do-not-have' });

    await expect(subject.verify(stranger)).rejects.toBeInstanceOf(JwtError);
    expect(fetches, 'one refetch for the unknown kid').toBe(2);

    // Twenty more attempts with the same unknown kid must not touch the
    // network at all. Without the negative cache this endpoint is an
    // unauthenticated amplifier pointed at the auth server.
    for (let i = 0; i < 20; i += 1) {
      await expect(subject.verify(stranger)).rejects.toBeInstanceOf(JwtError);
    }
    expect(fetches, 'negative cache absorbed the flood').toBe(2);
  });

  it('bounds the unknown-kid map instead of growing it per request', async () => {
    // The TTL bounds how LONG an entry lives, not how MANY exist. Without a
    // cap, a caller sending a fresh random kid every request adds an entry per
    // request and frees none for thirty seconds — the same unauthenticated
    // denial of service the negative cache exists to prevent, arriving as
    // memory exhaustion rather than fetch amplification.
    const subject = createJwtVerifier({
      supabaseUrl: SUPABASE_URL,
      audience: AUDIENCE,
      fetchJwks: () => Promise.resolve(jwks),
    });

    const attempts = 5_000;
    for (let i = 0; i < attempts; i += 1) {
      await expect(
        subject.verify(await mint({ kid: `flood-${String(i)}` })),
      ).rejects.toBeInstanceOf(JwtError);
    }

    // Unbounded, this would be 5000.
    expect(
      subject.unknownKidCount,
      'the map is capped, not merely expiring',
    ).toBeLessThanOrEqual(1_000);
    expect(
      subject.unknownKidCount,
      'and it is actually being used',
    ).toBeGreaterThan(0);
  });

  it('sweeps expired entries rather than only evicting on overflow', async () => {
    let clock = 1_000_000;
    const subject = createJwtVerifier({
      supabaseUrl: SUPABASE_URL,
      audience: AUDIENCE,
      fetchJwks: () => Promise.resolve(jwks),
      now: () => clock,
    });

    for (let i = 0; i < 5; i += 1) {
      await expect(
        subject.verify(await mint({ kid: `stale-${String(i)}` })),
      ).rejects.toBeInstanceOf(JwtError);
    }
    expect(subject.unknownKidCount).toBe(5);

    // Past the TTL. The next insert should sweep all five.
    clock += 60_000;
    await expect(
      subject.verify(await mint({ kid: 'fresh' })),
    ).rejects.toBeInstanceOf(JwtError);

    expect(subject.unknownKidCount, 'five swept, one remembered').toBe(1);
  });

  it('coalesces concurrent refreshes into a single fetch', async () => {
    // A key rotation makes every in-flight request miss at the same instant.
    // Fifty of them must not become fifty fetches against the auth server at
    // the moment it is least wanted.
    let fetches = 0;
    const subject = createJwtVerifier({
      supabaseUrl: SUPABASE_URL,
      audience: AUDIENCE,
      fetchJwks: async () => {
        fetches += 1;
        // Yield, so all fifty callers are genuinely in flight together. With a
        // synchronously-resolved promise they would serialise and the test
        // would pass without the fix.
        await new Promise((resolve) => setTimeout(resolve, 20));
        return jwks;
      },
    });

    const token = await mint();
    const results = await Promise.all(
      Array.from({ length: 50 }, () => subject.verify(token)),
    );

    expect(results).toHaveLength(50);
    expect(results[0]).toEqual({ userId: SUBJECT });
    // Uncoalesced, this would be 50.
    expect(fetches, 'fifty concurrent misses, one fetch').toBe(1);
  });
  it('picks up a rotated key without a restart', async () => {
    const rotated = await generateKeyPair('ES256', { extractable: true });
    const rotatedJwk = {
      ...(await exportJWK(rotated.publicKey)),
      kid: 'rotated-key',
      alg: 'ES256',
    };

    let served: JSONWebKeySet = jwks;
    let fetches = 0;
    const subject = createJwtVerifier({
      supabaseUrl: SUPABASE_URL,
      audience: AUDIENCE,
      fetchJwks: () => {
        fetches += 1;
        return Promise.resolve(served);
      },
    });

    // Warm the cache with the old key.
    await subject.verify(await mint());
    expect(fetches).toBe(1);

    // Supabase rotates. A token arrives signed by a key we have never seen.
    served = { keys: [rotatedJwk] };
    const newToken = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: 'rotated-key' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(SUBJECT)
      .setExpirationTime('1h')
      .sign(rotated.privateKey);

    await expect(subject.verify(newToken)).resolves.toEqual({
      userId: SUBJECT,
    });
    expect(fetches, 'one refetch, no deploy required').toBe(2);
  });
});

describe('the default JWKS fetcher', () => {
  it('gives up rather than hanging on a server that accepts and stalls', async () => {
    // `fetch` has no default timeout. A JWKS endpoint that completes the TCP
    // handshake and then never answers would otherwise hold the request that
    // triggered the refresh open indefinitely — and, since refreshes are
    // coalesced, every request waiting on it too.
    const server = createServer(() => {
      // Accept, and deliberately never respond.
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    const port =
      typeof address === 'object' && address !== null ? address.port : 0;

    try {
      const started = Date.now();
      await expect(
        defaultFetchJwks(`http://127.0.0.1:${String(port)}/jwks.json`, 250),
      ).rejects.toThrow();
      // Without the timeout this never settles and the test times out instead.
      expect(Date.now() - started, 'abandoned promptly').toBeLessThan(5_000);
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    }
  });
});
