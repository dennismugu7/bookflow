import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import { useTransaction } from '../../test/integration/harness.ts';

/**
 * Asserts what migration 20260811164304_foundation_schema guarantees, against
 * the real local database.
 *
 * The schema is the foundation every later slice builds on and migrations are
 * Do-Not-Vibe, so these test the invariants rather than the shape: that the
 * uniqueness constraint actually rejects, that the cascade actually cascades,
 * and that a non-privileged role actually reads nothing.
 */

const ctx = useTransaction();

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

/** Creates an auth user directly. Local only, inside a rolled-back transaction. */
async function makeUser(id: string, email: string): Promise<void> {
  // asAdmin, deliberately: the migration grants the application role nothing on
  // `auth`, and ADR-037 has the API create users through GoTrue's admin API
  // over HTTP rather than by writing this table. A fixture may do it; the
  // application may not.
  await ctx.asAdmin(async () => {
    await sql`
      insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
      values ('00000000-0000-0000-0000-000000000000', ${id}::uuid,
              'authenticated', 'authenticated', ${email}, now(), now())
    `.execute(ctx.db);
  });
}

async function makeBusiness(name: string): Promise<string> {
  const result = await sql<{ id: string }>`
    insert into public.businesses (name) values (${name}) returning id
  `.execute(ctx.db);
  const id = result.rows[0]?.id;
  if (id === undefined) throw new Error('no business id returned');
  return id;
}

describe('migration 20260811164304_foundation_schema', () => {
  it('creates exactly the three tables ADR-031 specifies, and no more', async () => {
    const result = await sql<{ tablename: string }>`
      select tablename from pg_tables where schemaname = 'public' order by tablename
    `.execute(ctx.db);

    expect(result.rows.map((r) => r.tablename)).toEqual([
      'businesses',
      'memberships',
      'user_profiles',
    ]);
  });

  it('has row-level security enabled on all three', async () => {
    const result = await sql<{ relname: string; relrowsecurity: boolean }>`
      select c.relname, c.relrowsecurity
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname
    `.execute(ctx.db);

    expect(result.rows).toHaveLength(3);
    for (const row of result.rows) {
      expect(row.relrowsecurity, `${row.relname} has RLS enabled`).toBe(true);
    }
  });

  it('has no permissive policies — RLS with nothing allowed through', async () => {
    // ADR-013: RLS is defence in depth, not the authorization mechanism. With
    // it enabled and no policy at all, a non-bypassing role sees zero rows.
    const result = await sql<{ count: string }>`
      select count(*)::text as count from pg_policies where schemaname = 'public'
    `.execute(ctx.db);

    expect(result.rows[0]?.count).toBe('0');
  });

  it('maintains updated_at by trigger, overriding whatever the writer sets', async () => {
    const id = await makeBusiness('Trigger Probe');

    // `now()` is the transaction timestamp and does not advance inside one, so
    // "did it move?" cannot be observed here. The stronger property is tested
    // instead: the writer sets updated_at to a date in 2000 and the trigger
    // overwrites it regardless (ADR-036 — updated_at is not the writer's to
    // set).
    await sql`
      update public.businesses
      set name = 'Renamed', updated_at = timestamptz '2000-01-01 00:00:00Z'
      where id = ${id}::uuid
    `.execute(ctx.db);

    const after = await sql<{ updated_at: Date; matches_now: boolean }>`
      select updated_at, updated_at = now() as matches_now
      from public.businesses where id = ${id}::uuid
    `.execute(ctx.db);

    expect(after.rows[0]!.updated_at.getUTCFullYear()).not.toBe(2000);
    expect(after.rows[0]!.matches_now).toBe(true);
  });

  it('defaults businesses.published to false — the safe default (ADR-004)', async () => {
    const id = await makeBusiness('Unpublished By Default');

    const result = await sql<{ published: boolean }>`
      select published from public.businesses where id = ${id}::uuid
    `.execute(ctx.db);

    expect(result.rows[0]?.published).toBe(false);
  });
});

describe('memberships uniqueness', () => {
  it('rejects a user joining the same business twice', async () => {
    await makeUser(OWNER, 'unique-probe@bookflow.test');
    const businessId = await makeBusiness('Uniqueness Probe');

    await sql`
      insert into public.memberships (user_id, business_id)
      values (${OWNER}::uuid, ${businessId}::uuid)
    `.execute(ctx.db);

    await ctx.expectDenied(
      () =>
        sql`
          insert into public.memberships (user_id, business_id)
          values (${OWNER}::uuid, ${businessId}::uuid)
        `.execute(ctx.db),
      /uq_memberships_user_business/,
      'a duplicate membership is rejected by name',
    );
  });

  it('uq_memberships_user_business alone does NOT stop a second business — a different index does', async () => {
    // ══ THIS TEST CHANGED ON 2026-08-17, AND ITS OLD COMMENT WAS RIGHT ═══════
    //
    // It used to be called "allows the same user in a different business", and
    // it passed, and it said:
    //
    //   "The constraint is on the pair, not on user_id alone. ADR-003 makes one
    //    business per account a product rule, not a schema one."
    //
    // **That was accurate, and it was the evidence nobody consulted.** For six
    // days the frame, the Phase 1 design and the session that wrote both
    // asserted that `uq_memberships_user_business` enforced ADR-003's
    // cardinality. This file said in plain words that it did not, and sat there
    // passing.
    //
    // Business-setup decision 10 changed the world rather than the reading:
    // `uq_memberships_one_owner_per_user` now enforces the rule. So the same
    // two inserts that used to be legal are refused — **and by the OTHER index,
    // which is the whole point of asserting on the name.**
    await makeUser(OWNER, 'pair-probe@bookflow.test');
    const first = await makeBusiness('Pair Probe A');
    const second = await makeBusiness('Pair Probe B');

    await sql`insert into public.memberships (user_id, business_id) values (${OWNER}::uuid, ${first}::uuid)`.execute(
      ctx.db,
    );

    await ctx.expectDenied(
      () =>
        sql`insert into public.memberships (user_id, business_id) values (${OWNER}::uuid, ${second}::uuid)`.execute(
          ctx.db,
        ),
      // NOT `uq_memberships_user_business` — the pair differs, so that
      // constraint is satisfied. If this ever starts failing by that name
      // instead, the partial index has been dropped and something else is
      // catching it by accident.
      /uq_memberships_one_owner_per_user/,
      'a second owner membership is refused by the partial index, not by the pair constraint',
    );

    const result = await sql<{ count: string }>`
      select count(*)::text as count from public.memberships where user_id = ${OWNER}::uuid
    `.execute(ctx.db);

    expect(result.rows[0]?.count, 'the first membership survives').toBe('1');
  });

  it('rejects a role outside the I9 vocabulary', async () => {
    await makeUser(OWNER, 'role-probe@bookflow.test');
    const businessId = await makeBusiness('Role Probe');

    await ctx.expectDenied(
      () =>
        sql`
          insert into public.memberships (user_id, business_id, role)
          values (${OWNER}::uuid, ${businessId}::uuid, 'receptionist')
        `.execute(ctx.db),
      /ck_memberships_role/,
      'an unknown role is rejected by name',
    );
  });
});

describe('cascades', () => {
  it('deleting an auth user removes their profile and memberships', async () => {
    await makeUser(OWNER, 'cascade-probe@bookflow.test');
    const businessId = await makeBusiness('Cascade Probe');

    await sql`
      insert into public.user_profiles (id, first_name, last_name, terms_version, terms_accepted_at)
      values (${OWNER}::uuid, 'Cascade', 'Probe', 'v1', now())
    `.execute(ctx.db);
    await sql`
      insert into public.memberships (user_id, business_id)
      values (${OWNER}::uuid, ${businessId}::uuid)
    `.execute(ctx.db);

    await ctx.asAdmin(async () => {
      await sql`delete from auth.users where id = ${OWNER}::uuid`.execute(
        ctx.db,
      );
    });

    const profiles = await sql<{ count: string }>`
      select count(*)::text as count from public.user_profiles where id = ${OWNER}::uuid
    `.execute(ctx.db);
    const memberships = await sql<{ count: string }>`
      select count(*)::text as count from public.memberships where user_id = ${OWNER}::uuid
    `.execute(ctx.db);

    expect(profiles.rows[0]?.count).toBe('0');
    expect(memberships.rows[0]?.count).toBe('0');
  });

  it('deleting a business removes its memberships but not the user', async () => {
    await makeUser(OTHER, 'business-cascade@bookflow.test');
    const businessId = await makeBusiness('Business Cascade Probe');

    await sql`
      insert into public.memberships (user_id, business_id)
      values (${OTHER}::uuid, ${businessId}::uuid)
    `.execute(ctx.db);

    await sql`delete from public.businesses where id = ${businessId}::uuid`.execute(
      ctx.db,
    );

    const memberships = await sql<{ count: string }>`
      select count(*)::text as count from public.memberships where business_id = ${businessId}::uuid
    `.execute(ctx.db);
    const users = await ctx.asAdmin(
      async () =>
        await sql<{ count: string }>`
          select count(*)::text as count from auth.users where id = ${OTHER}::uuid
        `.execute(ctx.db),
    );

    expect(memberships.rows[0]?.count).toBe('0');
    expect(users.rows[0]?.count).toBe('1');
  });
});

describe('anon and authenticated read nothing', () => {
  // Two independent mechanisms guard these tables, and each is tested on its
  // own so that neither can be silently removed while the other hides it.
  //
  //   1. REVOKE — anon and authenticated hold no table privileges at all.
  //   2. RLS with no policies — even with privileges, zero rows are visible.
  //
  // `ctx.asRole` restores the application role afterwards, which matters here
  // more than anywhere: see the savepoint warning in the harness.

  for (const role of ['anon', 'authenticated'] as const) {
    it(`denies ${role} outright — no privilege on any of the three tables`, async () => {
      await makeBusiness(`Privilege Probe ${role}`);

      for (const table of ['businesses', 'memberships', 'user_profiles']) {
        await ctx.asRole(role, () =>
          ctx.expectDenied(
            () => sql.raw(`select * from public.${table}`).execute(ctx.db),
            /permission denied/i,
            `${role} cannot read ${table}`,
          ),
        );
      }
    });

    it(`sees zero rows as ${role} even when granted select — RLS alone suffices`, async () => {
      // Proves layer 2 independently: hand the role the privilege the REVOKE
      // removed, and RLS still yields nothing. If someone re-grants these in a
      // later migration, this test keeps passing and the system stays safe.
      await makeBusiness(`RLS Probe ${role}`);

      // The grant itself needs ownership, so it is admin work.
      await ctx.asAdmin(async () => {
        await sql
          .raw(`grant select on public.businesses to ${role}`)
          .execute(ctx.db);
      });

      const result = await ctx.asRole(
        role,
        async () =>
          await sql<{ count: string }>`
            select count(*)::text as count from public.businesses
          `.execute(ctx.db),
      );

      expect(result.rows[0]?.count).toBe('0');
    });
  }

  it('the application role reads normally — the control', async () => {
    // Same transaction, ambient role, no switch: the API's own credential sees
    // its data, which is what makes the two results above meaningful.
    await makeBusiness('Application Role Probe');

    const result = await sql<{ count: string }>`
      select count(*)::text as count from public.businesses
    `.execute(ctx.db);

    expect(Number(result.rows[0]?.count ?? '0')).toBeGreaterThan(0);
  });

  it('runs as the application role by default', async () => {
    // The ambient condition itself, asserted rather than assumed. If this ever
    // reports `postgres`, every other test in the suite is running with
    // privileges the API does not have.
    const result = await sql<{ current_user: string }>`
      select current_user
    `.execute(ctx.db);

    expect(result.rows[0]?.current_user).toBe('bookflow_api');
  });
});
