import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import { isSecondBusinessConflict } from '../../src/modules/businesses/businesses.repository.ts';
import { accountWithBusiness, accountWithoutBusiness } from './accounts.ts';
import { APPLICATION_ROLE, useTransaction } from './harness.ts';

/**
 * `uq_memberships_one_owner_per_user` — ADR-003's cardinality, enforced.
 *
 * ══ WHY THESE ARE SEQUENTIAL AND NOT CONCURRENT ═════════════════════════════
 *
 * Criteria 48 and 49 are worded around *concurrent* creation attempts. What the
 * index actually guarantees is narrower and stronger: **at most one owner
 * membership per user, at commit time, whatever the interleaving.** Two
 * sequential inserts prove exactly that.
 *
 * A concurrent test would additionally exercise PostgreSQL blocking the second
 * inserter until the first commits — which is PostgreSQL's own property, tested
 * by PostgreSQL, and re-proving it here would be testing the database rather
 * than this schema. Spike 001/C1 took the same position for the exclusion
 * constraint. The harness has one connection per test by design, and adding a
 * second to observe a documented lock is cost without evidence.
 *
 * **What sequential CANNOT prove, and what therefore is not claimed here:** that
 * a refused second creation leaves no orphaned business behind (criterion 49's
 * second clause). That is a property of the ROUTE's transaction boundary, not of
 * the index, and it needs `POST /v1/businesses` to exist. Neither 48 nor 49 is
 * named in this file for that reason.
 */

const ctx = useTransaction();

describe('uq_memberships_one_owner_per_user', () => {
  it('rejects a second owner membership for the same user', async () => {
    const owner = await accountWithBusiness(ctx, 'First Salon');
    // A second business, owned by somebody else, so a row EXISTS for this user
    // to be attached to. Without it the insert below could fail for a foreign
    // key reason and look like the index working.
    const other = await accountWithBusiness(ctx, 'Second Salon');

    await ctx.expectDenied(
      () =>
        sql`
          insert into public.memberships (user_id, business_id, role)
          values (${owner.userId}::uuid, ${other.businessId}::uuid, 'owner')
        `.execute(ctx.db),
      /uq_memberships_one_owner_per_user/,
      'a second owner membership must be refused by the partial unique index, by name',
    );

    // And the first survives — a constraint that rejected by destroying the
    // existing row would also pass the assertion above.
    const count = await sql<{ count: string }>`
      select count(*)::text as count from public.memberships
       where user_id = ${owner.userId}::uuid
    `.execute(ctx.db);
    expect(count.rows[0]?.count).toBe('1');
  });

  /**
   * THE REAL ERROR MEETS THE REAL PREDICATE.
   *
   * `businesses.conflict-predicate.test.ts` asserts `isSecondBusinessConflict`
   * against errors this project CONSTRUCTS — `{ code: '23505', constraint:
   * 'uq_…' }` — and `businesses.conflict-service.test.ts` drives the service
   * with a fake repository raising one. **Both encode a belief about what
   * PostgreSQL raises for a partial unique index. Neither checks it.**
   *
   * This is the only assertion in the project where the error PostgreSQL
   * actually raises is handed to the predicate that production branches on. It
   * guards the one path the service's pre-check does not cover: the pre-check
   * catches every SEQUENTIAL second creation, so `isSecondBusinessConflict` is
   * reached only when two creations interleave — which nothing else here can
   * produce, and which is exactly when being wrong turns a 409 into a 500.
   *
   * ── WHY THIS DOES NOT USE `ctx.expectDenied` ────────────────────────────────
   *
   * That helper returns `Promise<void>` and discards the error it caught, by
   * design — its job is to assert a denial, not to hand the failure onward.
   * Widening it to return the error would change a shared helper's contract for
   * one caller. So this test does its own savepoint capture: the same three
   * steps, local to the one place that needs the object.
   */
  it('the error PostgreSQL raises is the one isSecondBusinessConflict matches', async () => {
    const owner = await accountWithBusiness(ctx, 'First Salon');
    const other = await accountWithBusiness(ctx, 'Second Salon');

    // A failed statement aborts the transaction, so the probe runs inside a
    // savepoint — the same reason `expectDenied` uses one.
    await sql.raw('savepoint predicate_probe').execute(ctx.db);
    let caught: unknown;
    try {
      await sql`
        insert into public.memberships (user_id, business_id, role)
        values (${owner.userId}::uuid, ${other.businessId}::uuid, 'owner')
      `.execute(ctx.db);
    } catch (error) {
      caught = error;
    }
    await sql.raw('rollback to savepoint predicate_probe').execute(ctx.db);
    await sql.raw(`set local role ${APPLICATION_ROLE}`).execute(ctx.db);

    // The insert must have failed at all — otherwise the assertion below would
    // be about `undefined` and would fail for the wrong reason.
    expect(
      caught,
      'the second owner membership was accepted; there is no error to classify',
    ).toBeInstanceOf(Error);

    expect(
      isSecondBusinessConflict(caught),
      'the predicate production branches on does not recognise the error ' +
        'PostgreSQL actually raises for this index — a 409 would be a 500',
    ).toBe(true);

    // Stated separately so a failure says WHICH half is wrong: the error class
    // or the constraint name.
    const pg = caught as { code?: unknown; constraint?: unknown };
    expect(pg.code).toBe('23505');
    expect(pg.constraint).toBe('uq_memberships_one_owner_per_user');
  });

  it('does not stop two DIFFERENT users each owning a business', async () => {
    // The predicate is on `user_id`. A unique index missing its predicate — or
    // written on the wrong column — would fail this.
    const first = await accountWithBusiness(ctx, 'Alpha Salon');
    const second = await accountWithBusiness(ctx, 'Beta Salon');

    expect(first.membershipId).not.toBe(second.membershipId);

    const count = await sql<{ count: string }>`
      select count(*)::text as count from public.memberships
       where user_id in (${first.userId}::uuid, ${second.userId}::uuid)
    `.execute(ctx.db);
    expect(count.rows[0]?.count).toBe('2');
  });

  it('criterion 50 — the index is partial on role = owner (SCHEMA proxy, not the behaviour)', async () => {
    // ══ THIS IS A SCHEMA ASSERTION STANDING IN FOR A BEHAVIOURAL ONE ═════════
    //
    // Criterion 50 says an account holding an `owner` membership can still take
    // a membership with a DIFFERENT role at a second business — the property
    // that pins this index to being partial rather than a plain
    // `unique (user_id)`.
    //
    // **That behaviour cannot be exercised today.** `ck_memberships_role`
    // permits only 'owner', so the row that would distinguish a partial index
    // from a plain one CANNOT BE INSERTED AT ALL — any attempt is refused by a
    // check constraint rather than by the index under test, and asserting that
    // refusal would be asserting the wrong thing entirely.
    //
    // So this reads the index's definition instead. **It proves the index was
    // DECLARED partial. It does not prove a non-owner membership is accepted,
    // because nothing can accept one yet.** The limitation that matters: a
    // future change to `ck_memberships_role` would not fail this test, so it
    // cannot notice the day the real behaviour becomes testable. Criterion 50
    // becomes properly mappable when I9 widens the vocabulary.
    const index = await sql<{ indexdef: string }>`
      select indexdef from pg_indexes
       where schemaname = 'public'
         and tablename = 'memberships'
         and indexname = 'uq_memberships_one_owner_per_user'
    `.execute(ctx.db);

    const definition = index.rows[0]?.indexdef;
    expect(definition, 'the index must exist').toBeDefined();
    expect(definition).toMatch(/CREATE UNIQUE INDEX/i);
    expect(definition).toMatch(/\(user_id\)/);
    // The predicate. Without it the index is a plain unique key and criterion
    // 50's behaviour is forbidden forever rather than merely untestable.
    expect(definition, 'the index must be PARTIAL on owner').toMatch(
      /WHERE \(role = 'owner'::text\)/i,
    );
  });

  it('leaves an account with no membership alone', async () => {
    // A partial unique index indexes only matching rows, so an account with no
    // membership is outside it entirely. Asserted because "no rows" is the
    // state every new owner is in.
    const nobody = await accountWithoutBusiness(ctx);

    const count = await sql<{ count: string }>`
      select count(*)::text as count from public.memberships
       where user_id = ${nobody.userId}::uuid
    `.execute(ctx.db);
    expect(count.rows[0]?.count).toBe('0');
  });
});
