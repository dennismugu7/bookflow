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
    // Exact, so a new response field lands here deliberately. `handle` is null
    // because the seed publishes this salon without minting one.
    expect(response.json()).toEqual({
      id: SEEDED_BUSINESS,
      name: 'Demo Salon',
      published: true,
      handle: null,
    });
  });

  it('criterion 20 — gives the SAME response for “not yours” and “does not exist”', async () => {
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

/**
 * ══ THE DEFAULT-DENY SWEEP ══════════════════════════════════════════════════
 *
 * `platform/auth.ts` protects every route that does not declare
 * `config: { public: true }`, and until now that was proved ROUTE BY ROUTE —
 * one 401 test per endpoint. That covers the routes someone remembered to
 * write a test for, which is precisely the set that is not at risk.
 *
 * **This asks the route table instead.** It enumerates what the built app
 * actually registered and asserts every route answers 401 without a token,
 * excepting a short declared list of the ones that are public on purpose. A
 * fourth route added without auth is caught because it is in the table, not
 * because anybody thought about it.
 *
 * ── WHY THE PUBLIC LIST IS DECLARED HERE RATHER THAN READ FROM THE ROUTE ────
 *
 * `printRoutes` reports methods and paths, not `config`. Reading the flag back
 * would make the test agree with the route by construction — it would assert
 * "routes marked public are public", which is a tautology. **Declaring the list
 * makes the test fail in BOTH directions:** a route that stops being protected
 * fails it, and a route that becomes public deliberately fails it too, until
 * somebody adds it here. The second failure is the review prompt, and this list
 * is the whole public surface of the API in one place.
 */
describe('default-deny, swept over the registered route table', () => {
  /** Every method+path that is public ON PURPOSE. Nothing else may be. */
  const DELIBERATELY_PUBLIC = new Set<string>([
    // Liveness. Infrastructure's consumer, and it must answer when the
    // versioned surface cannot.
    'GET /health',
    'HEAD /health',
    // ADR-032's mediated sign-up: there is no token before an account exists.
    'POST /v1/auth/signup',
    // ── THE ONLY ROUTE THAT PUBLISHES DATA ON PURPOSE ────────────────────────
    //
    // The client web app's booking page. Public by design and by ADR-004: it
    // answers only for a business whose `published` is true, and it emits an
    // ALLOWLIST projection (`public/public.schema.ts`) rather than a row with
    // fields removed.
    //
    // Its presence on this list is the review prompt the list exists for. The
    // question it should provoke is not "is this route public" — it plainly is
    // — but **"is what it returns still only what a stranger may see"**, and
    // the answer to that lives in the schema, not here.
    'GET /v1/public/salons/:handle',
    'HEAD /v1/public/salons/:handle',
    // ── THE BOOKING SURFACE, AND THE ONE UNAUTHENTICATED WRITE ───────────────
    //
    // Availability is a read of a published salon's diary, which is what a
    // booking page is for. The POST is the API's only unauthenticated write
    // apart from sign-up — it is rate-limited for that reason, and the
    // exclusion constraint bounds what it can do even unthrottled.
    //
    // Neither returns owner data: the receipt is an allowlist, the same shape
    // and for the same reason as the public salon page.
    'GET /v1/public/salons/:handle/availability',
    'HEAD /v1/public/salons/:handle/availability',
    'POST /v1/public/salons/:handle/bookings',
  ]);

  /** `:param` segments filled with a real UUID so routing matches. */
  function concreteUrl(path: string): string {
    return path
      .split('/')
      .map((segment) =>
        segment.startsWith(':')
          ? '00000000-0000-4000-8000-00000000000a'
          : segment,
      )
      .join('/');
  }

  /**
   * What the app registered, parsed from its own route table.
   *
   * ── THE TREE IS NESTED EVEN WITH `commonPrefix: false` ─────────────────────
   *
   * Fastify prints a radix tree, and a child line carries only its SUFFIX:
   *
   * ```
   * ├── /v1/me (GET, HEAD)
   * │   └── /business (GET, HEAD)
   * └── /v1/businesses (POST)
   *     └── /:businessId (GET, HEAD, PATCH)
   * ```
   *
   * **The first version of this parser read those suffixes as whole paths**, so
   * it swept `/business` and `/:businessId` — URLs that match no route. Those
   * answer 401 anyway, because authentication runs in `onRequest` and precedes
   * routing, **so the sweep reported a clean pass while testing nothing.** That
   * is the exact failure mode the criteria file warns about: an instrument that
   * under-reports reads like work already done. It was caught by the control
   * test below, which is the reason the control is written first.
   *
   * So depth is tracked and prefixes are joined.
   */
  function registeredRoutes(
    instance: FastifyInstance,
  ): { readonly method: string; readonly path: string }[] {
    const routes: { method: string; path: string }[] = [];
    const prefixes: string[] = [];

    for (const line of instance
      .printRoutes({ commonPrefix: false })
      .split('\n')) {
      const marker = line.search(/[├└]/);
      if (marker < 0) continue;

      // `├── ` and `│   ` are four characters each, one per level.
      const depth = marker / 4;
      const body = line.slice(marker + 4);
      const match = /^(\S*)\s+\((.+)\)\s*$/.exec(body);
      if (match === null) continue;

      prefixes.length = depth;
      prefixes[depth] = match[1] ?? '';
      const path = prefixes.join('');

      for (const method of (match[2] ?? '').split(',')) {
        routes.push({ method: method.trim(), path });
      }
    }

    return routes;
  }

  /**
   * Every route that answered something other than 401 without a token, and is
   * not on the declared public list. Empty is the only acceptable answer.
   */
  async function unprotectedRoutes(
    instance: FastifyInstance,
  ): Promise<string[]> {
    const leaks: string[] = [];

    for (const route of registeredRoutes(instance)) {
      const name = `${route.method} ${route.path}`;
      if (DELIBERATELY_PUBLIC.has(name)) continue;

      const response = await instance.inject({
        method: route.method as 'GET',
        url: concreteUrl(route.path),
      });

      // No body is sent deliberately: authentication runs in `onRequest`,
      // before validation, so a protected route must answer 401 rather than
      // 400. A 400 here would mean the body was parsed before the token was
      // checked, which is its own defect.
      if (response.statusCode !== 401) leaks.push(name);
    }

    return leaks;
  }

  it('the sweep can read the route table at all — the control for the two below', () => {
    const routes = registeredRoutes(app);
    const names = routes.map((route) => `${route.method} ${route.path}`);

    // Without this, a parser that matched nothing would report a clean sweep
    // and read exactly like a pass. Both halves matter: a plausible count, and
    // the specific routes this slice added.
    expect(routes.length).toBeGreaterThanOrEqual(8);
    expect(names).toContain('POST /v1/businesses');
    expect(names).toContain('GET /v1/me/business');
    expect(names).toContain('PATCH /v1/businesses/:businessId');
    expect(names).toContain('GET /health');
  });

  it('every registered route not declared public answers 401 without a token', async () => {
    expect(await unprotectedRoutes(app)).toEqual([]);
  });

  it('DRIVEN — the sweep catches a route that is public and should not be', async () => {
    // The control that makes the assertion above mean something. A sweep that
    // always returns an empty list passes whatever the app does; this builds
    // the same app with one extra unprotected route and proves the sweep sees
    // it. The route is added before `ready()`, which is the only window
    // Fastify allows, and this instance is never used for anything else.
    const probe = await buildApp(config, { db: () => ctx.db });
    probe.get('/v1/probe-unprotected', { config: { public: true } }, () => ({
      reachable: true,
    }));
    await probe.ready();

    try {
      // GET and HEAD: Fastify registers HEAD alongside every GET, and the sweep
      // reports both because both are reachable. Asserting the exact pair
      // rather than "contains" keeps it honest — a sweep that flagged every
      // route would also contain this one.
      expect(await unprotectedRoutes(probe)).toEqual([
        'GET /v1/probe-unprotected',
        'HEAD /v1/probe-unprotected',
      ]);
    } finally {
      await probe.close();
    }
  });
});
