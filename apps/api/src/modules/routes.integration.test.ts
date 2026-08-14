import { SignJWT, generateKeyPair } from 'jose';
import { sql } from 'kysely';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.ts';
import { getConfig } from '../platform/config.ts';
import { useTransaction } from '../../test/integration/harness.ts';

/**
 * The whole path: a real token from real GoTrue, through verification, to a
 * scoped repository read against the real database.
 *
 * Everything here runs as the application role, per the harness. The app is
 * built with the test's rolled-back transaction as its executor, so routes read
 * exactly what the test wrote and nothing survives.
 *
 * The token is genuine — signed in against the local GoTrue with the seeded
 * user's password — so this exercises the actual ES256/JWKS path rather than a
 * verifier configured to trust the test's own keys.
 */

const ctx = useTransaction();

const SEEDED_USER = '00000000-0000-4000-8000-000000000001';
const SEEDED_BUSINESS = '00000000-0000-4000-8000-000000000002';

const config = getConfig();
const AUTH_BASE = `${config.SUPABASE_URL}/auth/v1`;
const ANON_KEY = config.SUPABASE_ANON_KEY ?? '';

let app: FastifyInstance;
let realToken: string;

/** Signs the seeded user in against local GoTrue and returns a real token. */
async function signIn(): Promise<string> {
  const response = await fetch(`${AUTH_BASE}/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@bookflow.test',
      password: 'password123',
    }),
  });

  const body = (await response.json()) as { access_token?: string };
  if (typeof body.access_token !== 'string') {
    throw new Error(
      `could not sign in the seeded user against ${AUTH_BASE} — is the local ` +
        `stack running with gotrue and kong? response: ${JSON.stringify(body)}`,
    );
  }
  return body.access_token;
}

beforeAll(async () => {
  realToken = await signIn();
  // The app reads through the test's transaction, so its writes roll back with
  // everything else.
  app = await buildApp(config, { db: () => ctx.db });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('the token really is what production will see', () => {
  it('is ES256 with a kid, from the configured issuer', () => {
    const decode = (part: string): Record<string, unknown> =>
      JSON.parse(Buffer.from(part, 'base64url').toString()) as Record<
        string,
        unknown
      >;

    const parts = realToken.split('.');
    expect(parts, 'a JWT has three parts').toHaveLength(3);

    const header = decode(parts[0]!);
    const payload = decode(parts[1]!);

    expect(header['alg'], 'ADR-017 and spike C5: asymmetric, not HS256').toBe(
      'ES256',
    );
    expect(typeof header['kid']).toBe('string');
    expect(payload['iss']).toBe(AUTH_BASE);
    expect(payload['aud']).toBe('authenticated');
    expect(payload['sub']).toBe(SEEDED_USER);
  });
});

describe('GET /v1/me', () => {
  it('returns the caller’s own profile with a real token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${realToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: SEEDED_USER,
      firstName: 'Dennis',
      lastName: 'Mugu',
      avatarPath: null,
    });
  });

  it('is 401 with no token at all', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/me' });

    expect(response.statusCode).toBe(401);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.json()).toEqual({
      type: '/problems/missing-token',
      title: 'Authentication required',
      status: 401,
    });
  });

  it('is 401 with a well-formed token from a different issuer', async () => {
    // Correctly signed, unexpired, right audience, right shape — and minted by
    // someone else's project. Only the issuer check keeps it out.
    const pair = await generateKeyPair('ES256', { extractable: true });
    const foreign = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: 'foreign-key' })
      .setIssuer('https://someone-else.supabase.co/auth/v1')
      .setAudience('authenticated')
      .setSubject(SEEDED_USER)
      .setExpirationTime('1h')
      .sign(pair.privateKey);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${foreign}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      type: '/problems/invalid-token',
      title: 'Authentication failed',
      status: 401,
    });
  });

  it('is 401 with a garbage Authorization header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ type: '/problems/missing-token' });
  });
});

describe('malformed input is a 400 problem document, on every route shape', () => {
  /**
   * ── A CONTRACT TEST, NOT A SIGN-UP TEST ────────────────────────────────────
   *
   * ADR-014 promises RFC 9457 for errors. Until this block existed the API
   * answered **500** to every malformed request, and
   * `GET /v1/businesses/not-a-uuid` had done so since PR 2b — undetected,
   * because no test had ever sent a bad request to any route.
   *
   * One case per INPUT SHAPE the API has, so that adding a shape without
   * handling it is a failing test rather than a discovery in production:
   *
   *   params        GET  /v1/businesses/:businessId
   *   body (schema) POST /v1/auth/signup
   *   body (parse)  POST /v1/auth/signup with JSON that does not parse
   *
   * `GET /health` and `GET /v1/me` take no input at all and are therefore not
   * omissions here — there is nothing to malform.
   */

  const problem400 = {
    type: '/problems/validation-failed',
    title: 'Invalid request',
    status: 400,
  };

  it('params: /v1/businesses/not-a-uuid is 400, not 500', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/businesses/not-a-uuid',
      headers: { authorization: `Bearer ${realToken}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.json()).toEqual(problem400);
  });

  it('params: authentication still comes first', async () => {
    // A malformed id must not become a way to learn that a route exists, or to
    // reach validation, without a token. 401 beats 400.
    const response = await app.inject({
      method: 'GET',
      url: '/v1/businesses/not-a-uuid',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ type: '/problems/missing-token' });
  });

  it('body: a signup missing every required field is 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(problem400);
  });

  it('body: a signup with an unparseable JSON body is 400', async () => {
    // FST_ERR_CTP_INVALID_JSON_BODY carries no `validation` array, unlike a
    // schema failure. It answered 500 under the first version of the fix, which
    // is exactly why this case is its own test.
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: '{"email": "someone@example.com",',
      headers: { 'content-type': 'application/json' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(problem400);
  });

  it('leaks nothing about what was wrong with the input', async () => {
    // The body is the slug, the title and the status — never a field name, a
    // constraint, or an echo of the value. A reflected value is how an error
    // response becomes a probe.
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'not-an-email',
        password: 'x',
        firstName: '',
        lastName: '',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(Object.keys(response.json()).sort()).toEqual([
      'status',
      'title',
      'type',
    ]);
    expect(response.body).not.toContain('not-an-email');
    expect(response.body).not.toContain('email');
  });
});

describe('GET /health stays public', () => {
  it('answers without a token', async () => {
    // The one route that opts out. If default-deny ever inverts, this is not
    // what catches it — the tests above are — but a probe that needs a token is
    // a broken probe.
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});

describe('GET /v1/businesses/:businessId — the scoping rule', () => {
  it('returns a business the caller is a member of', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: { authorization: `Bearer ${realToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: SEEDED_BUSINESS,
      name: 'Demo Salon',
      published: true,
    });
  });

  it('gives the SAME response for “not yours” and “does not exist”', async () => {
    // ── THE TEST THIS ROUTE EXISTS FOR ──────────────────────────────────────
    //
    // A business that is real but belongs to someone else, and a business id
    // that has never existed, must be indistinguishable. Not "both 4xx" —
    // byte-identical, status and body, or the difference is an oracle: iterate
    // ids, and whichever response differs tells an attacker which businesses
    // are real. ADR-016 chose UUID keys so ids could not be enumerated; a
    // status code that confirms existence hands that property back.

    // A real business the seeded user has no membership in.
    const other = await sql<{ id: string }>`
      insert into public.businesses (name) values ('Someone Else''s Salon')
      returning id
    `.execute(ctx.db);
    const othersBusinessId = other.rows[0]?.id;
    expect(othersBusinessId, 'the fixture business was created').toBeTruthy();

    const memberships = await sql<{ count: string }>`
      select count(*)::text as count from public.memberships
      where business_id = ${othersBusinessId}::uuid
    `.execute(ctx.db);
    expect(memberships.rows[0]?.count, 'nobody is a member of it').toBe('0');

    // An id that has never existed.
    const nonexistentId = '99999999-9999-4999-8999-999999999999';
    const absent = await sql<{ count: string }>`
      select count(*)::text as count from public.businesses
      where id = ${nonexistentId}::uuid
    `.execute(ctx.db);
    expect(absent.rows[0]?.count, 'it really does not exist').toBe('0');

    const notYours = await app.inject({
      method: 'GET',
      url: `/v1/businesses/${othersBusinessId}`,
      headers: { authorization: `Bearer ${realToken}` },
    });
    const notFound = await app.inject({
      method: 'GET',
      url: `/v1/businesses/${nonexistentId}`,
      headers: { authorization: `Bearer ${realToken}` },
    });

    expect(notYours.statusCode).toBe(404);
    expect(notFound.statusCode).toBe(404);

    // Identical, not merely equivalent.
    expect(notYours.statusCode).toBe(notFound.statusCode);
    expect(notYours.body).toBe(notFound.body);
    expect(notYours.headers['content-type']).toBe(
      notFound.headers['content-type'],
    );
    expect(notYours.json()).toEqual({
      type: '/problems/not-found',
      title: 'Not found',
      status: 404,
    });
  });

  it('is 401 rather than 404 when unauthenticated — authentication comes first', async () => {
    // An unauthenticated caller learns nothing about the id either way.
    const response = await app.inject({
      method: 'GET',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
    });

    expect(response.statusCode).toBe(401);
  });
});
