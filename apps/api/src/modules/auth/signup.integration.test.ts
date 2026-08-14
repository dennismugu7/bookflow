import { createServer, type Server } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';
import { sql } from 'kysely';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.ts';
import { getConfig } from '../../platform/config.ts';
import { createDb, type Database } from '../../platform/db.ts';
import { createGoTrueClient } from '../../platform/gotrue.ts';
import {
  createBreachChecker,
  type BreachChecker,
} from '../../platform/pwned.ts';
import { adminConnectionString } from '../../../test/integration/admin-connection.ts';
import { CURRENT_TERMS_VERSION } from './auth.service.ts';

/**
 * POST /v1/auth/signup, end to end, against the real local stack.
 *
 * ══ WHY THIS FILE DOES NOT USE `useTransaction()` ═══════════════════════════
 *
 * Every other integration test in this project runs inside a transaction that
 * is rolled back. This one MUST NOT, and the reason is the thing under test.
 *
 * Sign-up spans two systems: GoTrue over HTTP, and our database. GoTrue commits
 * its `auth.users` row on its own connection the instant the admin call
 * returns; nothing we do in a transaction can hold it or undo it. So:
 *
 *  1. **A rolled-back profile insert makes the compensation tests vacuous.**
 *     "No profile row survives" is trivially true when every row disappears at
 *     the end of the test regardless. The assertion would pass against an
 *     implementation that compensates nothing at all — which is precisely the
 *     bug ADR-037 asks for fault injection to catch.
 *
 *  2. **The compensating delete would deadlock.** Inserting `user_profiles`
 *     takes a FOR KEY SHARE lock on the referenced `auth.users` row and holds
 *     it until the transaction ends. GoTrue's DELETE, on another connection,
 *     would block on that lock until the test gave up.
 *
 * So these tests commit for real and clean up explicitly in `afterEach`.
 * Deleting the `auth.users` row cascades to `user_profiles` (ADR-036), so the
 * cleanup is one statement — and if it ever stops being enough, the next test
 * run says so rather than hiding it.
 *
 * ══ DO-NOT-VIBE ═════════════════════════════════════════════════════════════
 * Auth, and the compensation boundary. Presented unreviewed.
 * ════════════════════════════════════════════════════════════════════════════
 */

const config = getConfig();

/**
 * The local mail catcher, on the fixed port `supabase/config.toml` gives
 * `[inbucket]` (docs/ENVIRONMENT.md §3). Test-only, so it is not in `config.ts`
 * — the API never talks to it, GoTrue does.
 */
const MAILPIT = 'http://127.0.0.1:54324';

let appDb: Database;
let adminDb: Database;
let app: FastifyInstance;

/** Addresses this file created, cleaned up after every test. */
const created = new Set<string>();

function newEmail(tag: string): string {
  const email = `signup-${tag}-${randomUUID()}@bookflow.test`;
  created.add(email);
  return email;
}

const STRONG_PASSWORD = 'a-perfectly-fine-password';

/**
 * Real passwords, with their real counts from the live service on 2026-08-14.
 * `password123` was returned as `C6008F9CAB4083784CBD1874F76618D2A97:2266543`.
 */
const BREACHED = new Map<string, number>([
  ['password123', 2_266_543],
  ['qwerty12345', 296_136],
]);

function sha1Upper(value: string): string {
  return createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();
}

/**
 * A local stand-in for haveibeenpwned's range API, speaking its wire format.
 *
 * Not a mock of our client — the client under test really does hash, really
 * does slice a prefix, really does issue an HTTP request and really does parse
 * the response. Only the corpus is local, which is what makes the suite
 * hermetic: a check designed to FAIL OPEN must not be able to turn CI red by
 * being unreachable, and a third party must not be in the path of every run.
 *
 * Two properties this deliberately preserves:
 *
 *  • **The prefix is honoured.** Suffixes are emitted only when the requested
 *    prefix matches, so a client that sent the wrong five characters — or the
 *    whole hash — gets a miss rather than a lucky hit.
 *  • **Padding is included, with count 0.** The strong password's own suffix is
 *    emitted as padding, so a parser that treated presence as breach would
 *    reject it and the happy path would fail. That is the bug this guards.
 */
function startRangeStub(): Promise<{ server: Server; url: string }> {
  const server = createServer((request, response) => {
    const prefix = (request.url ?? '').replace('/range/', '').toUpperCase();
    const lines: string[] = [];

    for (const [password, count] of BREACHED) {
      const digest = sha1Upper(password);
      if (digest.startsWith(prefix)) {
        lines.push(`${digest.slice(5)}:${String(count)}`);
      }
    }

    // Padding, exactly as the real service pads: fabricated entries at count 0.
    const strong = sha1Upper(STRONG_PASSWORD);
    if (strong.startsWith(prefix)) lines.push(`${strong.slice(5)}:0`);
    lines.push(`${'0'.repeat(35)}:0`);

    response.writeHead(200, { 'content-type': 'text/plain' });
    // CRLF, like the real one — the parser has to cope with it.
    response.end(lines.join('\r\n'));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('range stub did not bind a port');
      }
      resolve({ server, url: `http://127.0.0.1:${String(address.port)}` });
    });
  });
}

let rangeStub: Server;
let breachChecker: BreachChecker;

const validBody = (email: string): Record<string, string> => ({
  email,
  password: STRONG_PASSWORD,
  firstName: 'Ada',
  lastName: 'Lovelace',
});

interface AuthUserRow {
  readonly id: string;
  readonly email_confirmed_at: Date | null;
  readonly confirmation_sent_at: Date | null;
}

/** Reads `auth.users` directly. The application role has no grants there. */
async function authUser(email: string): Promise<AuthUserRow | undefined> {
  const result = await sql<AuthUserRow>`
    select id, email_confirmed_at, confirmation_sent_at
    from auth.users where email = ${email}
  `.execute(adminDb);
  return result.rows[0];
}

async function authUserCount(): Promise<number> {
  const result = await sql<{ count: string }>`
    select count(*)::text as count from auth.users
  `.execute(adminDb);
  return Number(result.rows[0]?.count ?? '-1');
}

interface ProfileRow {
  readonly id: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly terms_version: string;
  readonly terms_accepted_at: Date;
}

async function profile(userId: string): Promise<ProfileRow | undefined> {
  const result = await sql<ProfileRow>`
    select id, first_name, last_name, terms_version, terms_accepted_at
    from public.user_profiles where id = ${userId}::uuid
  `.execute(adminDb);
  return result.rows[0];
}

async function profileCountFor(email: string): Promise<number> {
  const result = await sql<{ count: string }>`
    select count(*)::text as count
    from public.user_profiles p
    join auth.users u on u.id = p.id
    where u.email = ${email}
  `.execute(adminDb);
  return Number(result.rows[0]?.count ?? '-1');
}

/** How many messages GoTrue actually delivered to this address. */
async function mailCountTo(email: string): Promise<number> {
  const response = await fetch(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  if (!response.ok) {
    throw new Error(
      `Mailpit answered HTTP ${String(response.status)}. The local stack must ` +
        'run with mail enabled — GoTrue has nowhere to deliver otherwise, and ' +
        'the happy path fails for a reason unrelated to the code under test.',
    );
  }
  const body = (await response.json()) as { messages_count?: number };
  return body.messages_count ?? 0;
}

beforeAll(async () => {
  const stub = await startRangeStub();
  rangeStub = stub.server;
  breachChecker = createBreachChecker({ baseUrl: stub.url });

  // A REAL, committing executor — see the note at the top of this file.
  appDb = createDb(config.DATABASE_URL);
  adminDb = createDb(adminConnectionString());
  app = await buildApp(config, { db: () => appDb, breachChecker });
  await app.ready();
});

/**
 * Removes this address's messages from the local mailbox.
 *
 * The database returns to baseline on its own — deleting the `auth.users` row
 * cascades — but **mail is not a database row and nothing reclaims it**. Left
 * alone, every run added four messages to a mailbox that is never emptied.
 *
 * That would not have broken these tests, because every assertion counts mail
 * for ONE freshly generated address. It is cleaned up anyway: a local mailbox
 * growing without bound is exactly the kind of accumulated state that makes a
 * later test fail for a reason unrelated to the code under test, and "it is
 * harmless today" is the argument that gets that wrong.
 */
async function purgeMailTo(email: string): Promise<void> {
  const found = await fetch(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  if (!found.ok) return;

  const body = (await found.json()) as { messages?: { ID: string }[] };
  const ids = (body.messages ?? []).map((message) => message.ID);
  if (ids.length === 0) return;

  await fetch(`${MAILPIT}/api/v1/messages`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ IDs: ids }),
  });
}

afterEach(async () => {
  for (const email of created) {
    // Cascades to `user_profiles` (ADR-036).
    await sql`delete from auth.users where email = ${email}`.execute(adminDb);
    await purgeMailTo(email);
  }
  created.clear();
});

afterAll(async () => {
  await app.close();
  await appDb.destroy();
  await adminDb.destroy();
  await new Promise<void>((resolve, reject) => {
    rangeStub.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

describe('POST /v1/auth/signup — the happy path', () => {
  it('creates both rows, dispatches exactly one email, and hands back no session', async () => {
    const email = newEmail('happy');

    const before = await mailCountTo(email);
    expect(before, 'a fresh address starts with no mail').toBe(0);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: validBody(email),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ status: 'confirmation_required' });

    // No session, no token, no id, no echo of the address (spike 002 L3 — an
    // unconfirmed user cannot log in, so there is nothing to hand out).
    expect(Object.keys(response.json())).toEqual(['status']);

    const user = await authUser(email);
    expect(user, 'the auth user exists').toBeDefined();

    // UNCONFIRMED, and the confirmation was SENT. This pair is the whole point:
    // ADR-037 claimed the admin call sends the mail, and spike 002 L2 measured
    // that it does not. If a later refactor collapses the mechanism back to one
    // call, `confirmation_sent_at` goes null and this line fails.
    expect(user?.email_confirmed_at, 'not confirmed by us').toBeNull();
    expect(
      user?.confirmation_sent_at,
      'GoTrue sent its own activation email (the resend step ran)',
    ).not.toBeNull();

    const row = await profile(user?.id ?? '');
    expect(row, 'the profile exists').toBeDefined();
    expect(row?.first_name).toBe('Ada');
    expect(row?.last_name).toBe('Lovelace');

    // SERVER-supplied, and never taken from the request — ADR-037's entire
    // reason for existing. The request body carries no terms field at all, so
    // there is nothing a client could have set.
    expect(row?.terms_version).toBe(CURRENT_TERMS_VERSION);
    expect(row?.terms_accepted_at).toBeInstanceOf(Date);

    expect(await mailCountTo(email), 'exactly one email, not two').toBe(1);
  });
});

describe('compensation — a failed profile insert leaves no account behind', () => {
  it('deletes the auth user, and sends no mail at all', async () => {
    const email = newEmail('profile-fail');

    // ── REAL FAULT INJECTION, NOT A MOCK ────────────────────────────────────
    //
    // The executor handed to the app is a transaction that has already failed.
    // Postgres refuses every subsequent statement on it with `current
    // transaction is aborted`, so `insertProfile` fails at the DATABASE, in the
    // real repository, on a real connection. Nothing in the service, the
    // repository or the GoTrue client is stubbed: the two GoTrue calls in this
    // test are genuine HTTP to the real local GoTrue.
    const aborted = await appDb.startTransaction().execute();
    try {
      await sql`select 1 / 0`.execute(aborted);
    } catch {
      // Expected. The transaction is now poisoned, which is the fixture.
    }

    const brokenApp = await buildApp(config, {
      db: () => aborted,
      breachChecker,
    });
    await brokenApp.ready();

    try {
      const response = await brokenApp.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: validBody(email),
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        type: '/problems/internal-error',
        title: 'Internal server error',
        status: 500,
      });

      // ── ADR-037's REQUIRED ASSERTION ──────────────────────────────────────
      // "no orphaned auth.users row survives a failed profile insert".
      expect(
        await authUser(email),
        'the auth user was created and must have been deleted again',
      ).toBeUndefined();

      // And no mail, because step 3 never ran. This is the ordering argument
      // from the ADR-037 amendment, asserted: the profile insert sits BEFORE
      // the send precisely so that a rollback is invisible to the user.
      expect(
        await mailCountTo(email),
        'nothing was sent, so there is no dead activation link in an inbox',
      ).toBe(0);
    } finally {
      await brokenApp.close();
      await aborted.rollback().execute();
    }
  });
});

describe('compensation — a failed confirmation send leaves nothing behind', () => {
  /**
   * "Created but unemailable", from the ADR-037 amendment.
   *
   * ── WHAT THIS REPRODUCES, AND WHAT IT CANNOT ────────────────────────────
   *
   * On staging the trigger is the admin/public asymmetry (spike 002 S2): the
   * admin API does not validate address deliverability and `/resend` does, so
   * step 1 succeeds for an address step 3 rejects.
   *
   * **That asymmetry does not exist locally.** Probed on 2026-08-14 against
   * this stack: `@bookflow.test`, `@localhost`, `@a`, `@invalid` and
   * `@example.invalid` were all accepted by BOTH the admin API and `/resend`.
   * There is no address that reproduces it here, so a test that pretended to
   * would be asserting a behaviour the local stack does not have.
   *
   * So the failure is injected at the same seam instead — a real HTTP 500 from
   * `/resend` — which drives the identical branch. Everything else is real:
   * `POST /admin/users` and the compensating `DELETE` are proxied straight
   * through to the real GoTrue, so the account really is created and really is
   * deleted. Only the one call under test is made to fail.
   */
  let proxy: Server;
  let proxyUrl: string;

  beforeAll(async () => {
    proxy = createServer((request, response) => {
      void (async (): Promise<void> => {
        const url = request.url ?? '';

        if (request.method === 'POST' && url.startsWith('/auth/v1/resend')) {
          response.writeHead(500, { 'content-type': 'application/json' });
          response.end(
            JSON.stringify({
              error_code: 'unexpected_failure',
              msg: 'injected by signup.integration.test.ts',
            }),
          );
          return;
        }

        // Everything else goes to the real GoTrue, unmodified.
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(chunk as Buffer);
        const payload = Buffer.concat(chunks);

        const headers: Record<string, string> = {};
        for (const [name, value] of Object.entries(request.headers)) {
          if (['host', 'connection', 'content-length'].includes(name)) continue;
          if (typeof value === 'string') headers[name] = value;
        }

        const forwarded: RequestInit = {
          method: request.method ?? 'GET',
          headers,
        };
        if (payload.length > 0) forwarded.body = payload;

        const upstream = await fetch(`${config.SUPABASE_URL}${url}`, forwarded);

        const bytes = Buffer.from(await upstream.arrayBuffer());
        response.writeHead(upstream.status, {
          'content-type':
            upstream.headers.get('content-type') ?? 'application/json',
        });
        response.end(bytes);
      })();
    });

    await new Promise<void>((resolve) => {
      proxy.listen(0, '127.0.0.1', resolve);
    });
    const address = proxy.address();
    if (address === null || typeof address === 'string') {
      throw new Error('proxy did not bind a port');
    }
    proxyUrl = `http://127.0.0.1:${String(address.port)}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      proxy.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it('deletes both the auth user and the profile', async () => {
    const email = newEmail('resend-fail');

    const failingSend = await buildApp(config, {
      db: () => appDb,
      gotrue: createGoTrueClient({
        baseUrl: proxyUrl,
        serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
        anonKey: config.SUPABASE_ANON_KEY,
      }),
      breachChecker,
    });
    await failingSend.ready();

    try {
      const response = await failingSend.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: validBody(email),
      });

      // 503, not 500: the account could not be created *right now*. Retrying
      // the same request later may well work.
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        type: '/problems/auth-unavailable',
        title: 'Authentication service unavailable',
        status: 503,
      });

      // NEITHER row survives. The profile is deleted explicitly by the service
      // and the auth user by the compensating GoTrue call — both asserted, so
      // that a compensation which only did half the job would fail here.
      expect(
        await authUser(email),
        'the auth user must not survive an unemailable address',
      ).toBeUndefined();
      expect(
        await profileCountFor(email),
        'and neither must the profile row it owned',
      ).toBe(0);

      expect(await mailCountTo(email), 'nothing was delivered').toBe(0);
    } finally {
      await failingSend.close();
    }
  });
});

describe('a duplicate address is answered exactly as success', () => {
  it('is byte-identical, creates nothing, and sends no second email', async () => {
    const email = newEmail('duplicate');

    const first = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: validBody(email),
    });
    expect(first.statusCode).toBe(202);

    const original = await authUser(email);
    expect(original).toBeDefined();
    const originalId = original?.id ?? '';

    const second = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email,
        // Deliberately different in every field a response could reflect.
        password: 'a-completely-different-password',
        firstName: 'Grace',
        lastName: 'Hopper',
      },
    });

    // ── THE ASSERTION THIS TEST EXISTS FOR ──────────────────────────────────
    //
    // Not "both 2xx" — IDENTICAL. Status, body and content-type. Any difference
    // at all turns a public, unauthenticated endpoint into an oracle for which
    // addresses have accounts. Same reasoning, and the same test shape, as
    // "not yours" versus "does not exist" on GET /v1/businesses/:id.
    expect(second.statusCode).toBe(first.statusCode);
    expect(second.body).toBe(first.body);
    expect(second.headers['content-type']).toBe(first.headers['content-type']);

    // Nothing was created, and nothing was overwritten.
    const after = await authUser(email);
    expect(after?.id, 'still the same account').toBe(originalId);

    const rows = await sql<{ count: string }>`
      select count(*)::text as count from auth.users where email = ${email}
    `.execute(adminDb);
    expect(rows.rows[0]?.count, 'exactly one account for the address').toBe(
      '1',
    );

    const row = await profile(originalId);
    expect(
      row?.first_name,
      'the second request must not have overwritten the profile',
    ).toBe('Ada');

    // One email in total — the first sign-up's. A second send would leak the
    // duplicate through the mailbox even though the response did not, and would
    // also mail a person who did not just ask for anything.
    expect(await mailCountTo(email), 'no second activation email').toBe(1);
  });
});

describe('a password below ADR-030’s floor never reaches the provider', () => {
  it('is rejected by Zod, and no account is created anywhere', async () => {
    const email = newEmail('weak');
    const usersBefore = await authUserCount();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      // Seven characters. ADR-030's floor is eight.
      payload: { ...validBody(email), password: 'short12' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.json()).toEqual({
      type: '/problems/validation-failed',
      title: 'Invalid request',
      status: 400,
    });

    // ── "BEFORE ANYTHING ELSE" — ASSERTED, NOT ASSUMED ──────────────────────
    // Not merely "no user for this address": the whole table is unchanged. If
    // validation ran after the admin call, a user would exist and be deleted,
    // and a leak in that path would show up as a count that did not return to
    // where it started.
    expect(
      await authUserCount(),
      'the user list is unchanged — Zod ran before GoTrue was called',
    ).toBe(usersBefore);
    expect(await authUser(email)).toBeUndefined();
    expect(await mailCountTo(email), 'and nothing was sent').toBe(0);
  });

  it('rejects a password over bcrypt’s 72-byte truncation point', async () => {
    // Not a policy invention: bcrypt silently truncates at 72 bytes, so two
    // different long passwords would hash the same and the user would never be
    // told. Rejecting is the honest answer.
    const email = newEmail('long');
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { ...validBody(email), password: 'x'.repeat(73) },
    });

    expect(response.statusCode).toBe(400);
    expect(await authUser(email)).toBeUndefined();
  });
});

describe('the leaked-password check (ADR-030)', () => {
  it('refuses a known-breached password before any account exists', async () => {
    const email = newEmail('breached');
    const usersBefore = await authUserCount();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      // Long enough to clear ADR-030's floor, so the ONLY thing that can reject
      // it is the corpus. 2,266,543 breaches as of 2026-08-14.
      payload: { ...validBody(email), password: 'password123' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      type: '/problems/password-rejected',
      title: 'Password rejected',
      status: 400,
    });

    // BEFORE any account exists — the check is step 0, ahead of GoTrue, so
    // there is nothing to compensate and the table never moved.
    expect(
      await authUserCount(),
      'the user list is unchanged — nothing was created and then deleted',
    ).toBe(usersBefore);
    expect(await authUser(email)).toBeUndefined();
    expect(await mailCountTo(email), 'and nothing was sent').toBe(0);
  });

  it('accepts a strong password whose suffix appears as padding', async () => {
    // The stub returns this password's own suffix with count 0, exactly as the
    // real service pads its responses. A parser that read presence as breach
    // would reject it here — which is the whole reason this assertion is not
    // just a second copy of the happy path.
    const email = newEmail('strong');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: validBody(email),
    });

    expect(response.statusCode).toBe(202);
    const user = await authUser(email);
    expect(user, 'a non-breached password creates the account').toBeDefined();
    expect(user?.confirmation_sent_at).not.toBeNull();
  });

  it('still signs the user up when the corpus is unreachable — fail open', async () => {
    const email = newEmail('hibp-down');

    // Port 1 on loopback: nothing listens, so this is a real connection
    // refusal rather than a stubbed rejection. The timeout is short so the
    // test does not pay for the failure it is asserting.
    const offline = await buildApp(config, {
      db: () => appDb,
      breachChecker: createBreachChecker({
        baseUrl: 'http://127.0.0.1:1',
        timeoutMs: 500,
      }),
    });
    await offline.ready();

    try {
      const response = await offline.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: validBody(email),
      });

      // ── THE POINT OF FAILING OPEN ─────────────────────────────────────────
      // A free, unauthenticated third party being down must not stop owners
      // creating accounts. During an outage the policy falls back to ADR-030's
      // length floor, which is what every account created before this code
      // existed was held to.
      expect(response.statusCode).toBe(202);
      expect(response.json()).toEqual({ status: 'confirmation_required' });

      const user = await authUser(email);
      expect(user, 'the account really was created').toBeDefined();
      expect(
        user?.confirmation_sent_at,
        'and the flow ran to completion, not just past the check',
      ).not.toBeNull();
    } finally {
      await offline.close();
    }
  });
});
