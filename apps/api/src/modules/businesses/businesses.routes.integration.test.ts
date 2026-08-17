import { sql } from 'kysely';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.ts';
import { getConfig } from '../../platform/config.ts';
import { useTransaction } from '../../../test/integration/harness.ts';
import { unrelatedAccountWithBusiness } from '../../../test/integration/accounts.ts';

/**
 * The pierce's API layer, driven through the real app with a real token.
 *
 * ══ THE COUNTER IS DRIVEN, NOT ASSERTED FROM ONE SIDE ═══════════════════════
 *
 * `GET /v1/me/business` answering 404 proves nothing on its own — a route that
 * always 404s would pass it. The seeded owner HAS a business, so the read is
 * driven **1 → 0 → 1** on one account within a single test: read it, delete the
 * membership, read again, restore, read again. A number that has only ever been
 * observed at one value has not been observed.
 *
 * The token is genuine, signed in against local GoTrue with the seeded user's
 * password, so this exercises the real ES256/JWKS path.
 */

const ctx = useTransaction();

const SEEDED_USER = '00000000-0000-4000-8000-000000000001';
const SEEDED_BUSINESS = '00000000-0000-4000-8000-000000000002';
const SEEDED_NAME = 'Demo Salon';
// `seed.sql` opts this row into `published` deliberately, against ADR-004's
// default of false — read from the file rather than assumed, because asserting
// `false` here would have failed for the right reason and cost a cycle.
const SEEDED_PUBLISHED = true;

const config = getConfig();
const AUTH_BASE = `${config.SUPABASE_URL}/auth/v1`;
const ANON_KEY = config.SUPABASE_ANON_KEY ?? '';

let app: FastifyInstance;
let token: string;

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
        `stack running? response: ${JSON.stringify(body)}`,
    );
  }
  return body.access_token;
}

beforeAll(async () => {
  token = await signIn();
  app = await buildApp(config, { db: () => ctx.db });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function bearer(): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

/** Reads the stored name straight from the table, bypassing the route. */
async function storedName(businessId: string): Promise<string | undefined> {
  const result = await sql<{ name: string }>`
    select name from public.businesses where id = ${businessId}::uuid
  `.execute(ctx.db);
  return result.rows[0]?.name;
}

describe('GET /v1/me/business', () => {
  it('drives 1 → 0 → 1 on the same account, so neither answer is a constant', async () => {
    // 1 — the seeded owner has a business.
    const first = await app.inject({
      method: 'GET',
      url: '/v1/me/business',
      headers: bearer(),
    });
    expect(first.statusCode, 'the owner starts with a business').toBe(200);
    expect(first.json()).toEqual({
      id: SEEDED_BUSINESS,
      name: SEEDED_NAME,
      published: SEEDED_PUBLISHED,
    });

    // 0 — take the membership away. Rolled back with the transaction.
    await sql`delete from public.memberships where user_id = ${SEEDED_USER}::uuid`.execute(
      ctx.db,
    );

    const none = await app.inject({
      method: 'GET',
      url: '/v1/me/business',
      headers: bearer(),
    });
    expect(none.statusCode, 'no membership means no business').toBe(404);
    expect(none.json()).toEqual({
      type: '/problems/not-found',
      title: 'Not found',
      status: 404,
    });

    // 1 again — put it back. Without this the 404 above is consistent with a
    // route that broke permanently rather than one that answered honestly.
    await sql`
      insert into public.memberships (user_id, business_id)
      values (${SEEDED_USER}::uuid, ${SEEDED_BUSINESS}::uuid)
    `.execute(ctx.db);

    const restored = await app.inject({
      method: 'GET',
      url: '/v1/me/business',
      headers: bearer(),
    });
    expect(restored.statusCode, 'the counter must come back').toBe(200);
    expect(restored.json()).toMatchObject({ id: SEEDED_BUSINESS });
  });

  it('criterion 19 — is 401 with no token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/me/business',
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      type: '/problems/missing-token',
      title: 'Authentication required',
      status: 401,
    });
  });

  it('criterion 31 — carries no detail and no instance in its failure body', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/me/business',
    });
    const body: Record<string, unknown> = response.json();

    // A detail string is where an error response leaks (platform/problem.ts).
    expect(Object.keys(body).sort()).toEqual(['status', 'title', 'type']);
    expect(body['detail']).toBeUndefined();
    expect(body['instance']).toBeUndefined();
  });
});

describe('PATCH /v1/businesses/:businessId', () => {
  it('criterion 13 — renames, and a subsequent read returns the new name', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: 'Renamed Salon' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: 'Renamed Salon' });

    // Not just the 200 — the change is read back through the other route.
    const readBack = await app.inject({
      method: 'GET',
      url: '/v1/me/business',
      headers: bearer(),
    });
    expect(readBack.json()).toMatchObject({ name: 'Renamed Salon' });
  });

  it('criterion 21 — a non-member gets 404 AND the name is unchanged afterwards', async () => {
    const stranger = await unrelatedAccountWithBusiness(
      ctx,
      { userId: SEEDED_USER, email: 'owner@bookflow.test' },
      'Stranger Salon',
    );

    // The seeded owner's token against the stranger's business.
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${stranger.businessId}`,
      headers: bearer(),
      payload: { name: 'Hijacked' },
    });

    expect(response.statusCode, 'not yours reads as not found').toBe(404);
    expect(response.json()).toEqual({
      type: '/problems/not-found',
      title: 'Not found',
      status: 404,
    });

    // The half that matters. A 404 with the write having happened anyway is
    // the failure this assertion exists to catch.
    expect(
      await storedName(stranger.businessId),
      'a refused rename must not have written',
    ).toBe('Stranger Salon');
  });

  it('is byte-identical for not-yours and does-not-exist', async () => {
    const stranger = await unrelatedAccountWithBusiness(
      ctx,
      { userId: SEEDED_USER, email: 'owner@bookflow.test' },
      'Stranger Salon',
    );

    const notYours = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${stranger.businessId}`,
      headers: bearer(),
      payload: { name: 'x' },
    });
    const doesNotExist = await app.inject({
      method: 'PATCH',
      url: '/v1/businesses/99999999-9999-4999-8999-999999999999',
      headers: bearer(),
      payload: { name: 'x' },
    });

    expect(notYours.statusCode).toBe(doesNotExist.statusCode);
    expect(notYours.body).toBe(doesNotExist.body);
  });

  it('criterion 14 — a rename changes the name and nothing else', async () => {
    const before = await sql<{
      id: string;
      published: boolean;
      membership_count: string;
    }>`
      select b.id, b.published,
             (select count(*)::text from public.memberships m
               where m.business_id = b.id) as membership_count
        from public.businesses b where b.id = ${SEEDED_BUSINESS}::uuid
    `.execute(ctx.db);

    await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: 'Something Else' },
    });

    const after = await sql<{
      id: string;
      name: string;
      published: boolean;
      membership_count: string;
    }>`
      select b.id, b.name, b.published,
             (select count(*)::text from public.memberships m
               where m.business_id = b.id) as membership_count
        from public.businesses b where b.id = ${SEEDED_BUSINESS}::uuid
    `.execute(ctx.db);

    // The name moved…
    expect(after.rows[0]?.name).toBe('Something Else');
    // …and nothing else did. Asserted against what was read BEFORE rather than
    // against constants, so this keeps meaning the same thing if the seed
    // changes.
    expect(after.rows[0]?.id).toBe(before.rows[0]?.id);
    expect(after.rows[0]?.published).toBe(before.rows[0]?.published);
    expect(after.rows[0]?.membership_count).toBe(
      before.rows[0]?.membership_count,
    );
  });

  it('criterion 16 — no field other than the name can be changed', async () => {
    // Sent the way the API would actually receive it: extra keys in the JSON
    // body. Zod strips unknown keys rather than rejecting them, so the risk
    // this guards is silent acceptance, not a 400.
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: {
        name: 'Renamed',
        published: true,
        id: '11111111-1111-4111-8111-111111111111',
      },
    });

    expect(response.statusCode).toBe(200);

    const row = await sql<{ id: string; published: boolean }>`
      select id, published from public.businesses
       where id = ${SEEDED_BUSINESS}::uuid
    `.execute(ctx.db);

    expect(row.rows[0]?.id, 'the id must be unwritable').toBe(SEEDED_BUSINESS);
    expect(
      row.rows[0]?.published,
      'publishing must not be reachable through the rename route (ADR-004)',
    ).toBe(SEEDED_PUBLISHED);
  });

  it('criterion 17 — no request removes a business or its membership', async () => {
    // Absence is what nobody writes a test for, so this asserts it directly:
    // the route that would do it does not exist, and the rows survive the
    // attempt.
    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
    });

    // 404 from Fastify's router — no DELETE handler is registered at all.
    // Asserted as "not a success" rather than as a specific code, because the
    // criterion is about the business surviving, not about the shape of the
    // refusal.
    expect(response.statusCode).toBeGreaterThanOrEqual(400);

    const business = await sql<{ count: string }>`
      select count(*)::text as count from public.businesses
       where id = ${SEEDED_BUSINESS}::uuid
    `.execute(ctx.db);
    const membership = await sql<{ count: string }>`
      select count(*)::text as count from public.memberships
       where business_id = ${SEEDED_BUSINESS}::uuid
    `.execute(ctx.db);

    expect(business.rows[0]?.count).toBe('1');
    expect(membership.rows[0]?.count).toBe('1');

    // And it is still readable through the API afterwards — the row surviving
    // in the table is necessary but not sufficient.
    const readBack = await app.inject({
      method: 'GET',
      url: '/v1/me/business',
      headers: bearer(),
    });
    expect(readBack.statusCode).toBe(200);
  });

  it('criterion 19 — is 401 with no token, and nothing is written', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      payload: { name: 'Unauthenticated Rename' },
    });

    expect(response.statusCode).toBe(401);
    expect(await storedName(SEEDED_BUSINESS)).toBe(SEEDED_NAME);
  });

  it('is 400 for a businessId that is not a uuid', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/businesses/not-a-uuid',
      headers: bearer(),
      payload: { name: 'x' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      type: '/problems/validation-failed',
    });
  });
});

describe('decision 9 — the trimming boundaries, through the route', () => {
  it('criterion 37, 39 — stores a padded name trimmed, on a rename', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: '   Vera’s Salon   ' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: 'Vera’s Salon' });
    // Asserted against the column, not only the response: the response could
    // be trimmed while the stored value is not.
    expect(await storedName(SEEDED_BUSINESS)).toBe('Vera’s Salon');
  });

  it('criterion 9, 38 — accepts 200 non-whitespace characters carrying padding', async () => {
    const name = 'a'.repeat(200);

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: `  ${name}  ` },
    });

    // Only holds because `.trim()` precedes `.max(200)` in the chain.
    expect(response.statusCode, '200 chars plus padding must pass').toBe(200);
    expect(await storedName(SEEDED_BUSINESS)).toBe(name);
  });

  it('criterion 12 — rejects a whitespace-only name', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: '     ' },
    });

    // Only holds because `.trim()` precedes `.min(1)`.
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      type: '/problems/validation-failed',
    });
    expect(await storedName(SEEDED_BUSINESS)).toBe(SEEDED_NAME);
  });

  it('criterion 10 — rejects 201 characters', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: 'a'.repeat(201) },
    });

    expect(response.statusCode).toBe(400);
    expect(await storedName(SEEDED_BUSINESS)).toBe(SEEDED_NAME);
  });

  it('criterion 8 — accepts a name of exactly one non-whitespace character', async () => {
    // The boundary opposite criterion 10. Both ends, or neither is a boundary
    // test — a `.min(1)` written as `.min(2)` passes every other case here.
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: 'V' },
    });

    expect(response.statusCode).toBe(200);
    expect(await storedName(SEEDED_BUSINESS)).toBe('V');
  });

  it('criterion 11 — rejects an empty name', async () => {
    // Its own test. It was asserted before, inside one named for the response
    // BODY — which proved the behaviour and mapped no criterion, because the
    // grep in `01-acceptance-criteria.md` reads names, not assertions.
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: '' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      type: '/problems/validation-failed',
    });
    expect(await storedName(SEEDED_BUSINESS)).toBe(SEEDED_NAME);
  });

  it('criterion 40 — two names differing only in surrounding whitespace store identically', async () => {
    await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: 'Sharp Cuts' },
    });
    const bare = await storedName(SEEDED_BUSINESS);

    await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: '   Sharp Cuts   ' },
    });
    const padded = await storedName(SEEDED_BUSINESS);

    // Compared to each other rather than to a literal: this asserts the two
    // inputs CONVERGE, which is what the criterion says, and would still hold
    // if the trimming rule itself changed.
    expect(padded).toBe(bare);
  });

  it('criterion 32 — a validation failure body does not echo the submitted name', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/businesses/${SEEDED_BUSINESS}`,
      headers: bearer(),
      payload: { name: '' },
    });

    const body: Record<string, unknown> = response.json();
    expect(response.statusCode).toBe(400);
    // The submitted name must not be echoed back — criterion 32.
    expect(Object.keys(body).sort()).toEqual(['status', 'title', 'type']);
  });
});
