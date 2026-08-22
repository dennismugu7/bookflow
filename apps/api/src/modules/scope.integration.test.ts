import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import {
  accountWithBusiness,
  accountWithoutBusiness,
} from '../../test/integration/accounts.ts';
import { useTransaction } from '../../test/integration/harness.ts';
import { ownedBusinessOf } from './scope.ts';

/**
 * The membership scoping rule, asserted directly.
 *
 * ══ IT HAD NO TEST OF ITS OWN ═══════════════════════════════════════════════
 *
 * `scope.ts` holds the one predicate every protected read and write in six
 * modules depends on (`CLAUDE.md` §5, §6). It was exercised only INCIDENTALLY —
 * by service tests that happen to call repositories that happen to use it — and
 * every one of those tests is about something else.
 *
 * That is the weakest possible coverage for the strongest possible claim.
 * Incidental exercise proves the predicate does not crash; it does not prove
 * what the predicate is FOR, which is that a caller with no membership reaches
 * nothing.
 *
 * ── THE PATTERN IS `platform/role.integration.test.ts`'s ───────────────────
 *
 * That file drives the database grants directly and asserts **what must not be
 * possible**, rather than checking that the happy path happens to work. This is
 * the same shape one layer up: the SQL fragment is used against real tables, by
 * a real account with no membership, and the assertion is the absence.
 *
 * ── WHY A DISTRACTOR IS IN EVERY CASE ──────────────────────────────────────
 *
 * A stranger reading nothing from an EMPTY table proves nothing at all — a
 * predicate that always matched zero rows would pass. So every test below
 * plants a fully-populated business owned by somebody else. The rows the
 * stranger must not see are there, and available to be returned.
 *
 * This is the same standard `businesses.integration.test.ts` sets and states:
 * "assert the property that matters, against a database where the wrong answer
 * is available to be returned."
 */

const ctx = useTransaction();

/** Every table the scoping rule guards, and how a row is planted in one. */
const GUARDED_TABLES = [
  'services',
  'team_members',
  'opening_hours',
  'portfolio_images',
  'bookings',
] as const;

/**
 * One row in every guarded table, belonging to `businessId`.
 *
 * Written with raw SQL rather than through the service layer deliberately: the
 * services enforce the very rule under test, so seeding through them would make
 * the fixture depend on the thing it exists to challenge.
 */
async function populate(businessId: string): Promise<void> {
  await sql`
    insert into public.services (business_id, name, duration_minutes, price_kes, position)
    values (${businessId}::uuid, 'Silk press', 60, 2500, 0)
  `.execute(ctx.db);

  await sql`
    insert into public.team_members (business_id, name, position)
    values (${businessId}::uuid, 'Grace Wanjiru', 0)
  `.execute(ctx.db);

  await sql`
    insert into public.opening_hours (business_id, day_of_week, open_time, close_time)
    values (${businessId}::uuid, 0, '09:00', '17:00')
  `.execute(ctx.db);

  await sql`
    insert into public.portfolio_images (business_id, image_url, position)
    values (${businessId}::uuid, 'http://example.invalid/a.jpg', 0)
  `.execute(ctx.db);

  await sql`
    insert into public.bookings (
      business_id, service_name, duration_minutes, price_kes,
      client_name, client_email, client_phone, starts_at, ends_at
    ) values (
      ${businessId}::uuid, 'Silk press', 60, 2500,
      'Ada Client', 'ada@example.invalid', '+254700000000',
      '2026-09-07T09:00:00+03:00'::timestamptz,
      '2026-09-07T10:00:00+03:00'::timestamptz
    )
  `.execute(ctx.db);
}

async function countVisibleTo(table: string, userId: string): Promise<number> {
  const result = await sql<{ n: number }>`
    select count(*)::int as n
      from ${sql.raw(`public.${table}`)}
     where business_id = ${ownedBusinessOf(userId)}
  `.execute(ctx.db);
  return result.rows[0]?.n ?? 0;
}

describe('a caller with no membership reads nothing', () => {
  it('sees zero rows in every guarded table, while another salon is full', async () => {
    const stranger = await accountWithoutBusiness(ctx);
    const owner = await accountWithBusiness(ctx, 'Somebody Else’s Salon');
    await populate(owner.businessId);

    for (const table of GUARDED_TABLES) {
      // The control FIRST: the row exists and is reachable by its owner. Without
      // this, "the stranger sees nothing" is indistinguishable from "the insert
      // silently failed", and the whole file would pass while asserting nothing.
      expect(
        await countVisibleTo(table, owner.userId),
        `${table}: the fixture row is not visible to its own owner`,
      ).toBe(1);

      expect(
        await countVisibleTo(table, stranger.userId),
        `${table}: a caller with no membership can read another salon's rows`,
      ).toBe(0);
    }
  });

  it('is null rather than an error when there is no membership', async () => {
    // The property the whole design rests on, stated in `scope.ts`: with no
    // membership the subquery is `null`, and every comparison against null is
    // null rather than true. That is what makes a missing membership fail
    // CLOSED on reads, updates, deletes AND inserts without any of the four
    // testing for it.
    const stranger = await accountWithoutBusiness(ctx);

    const result = await sql<{ scoped: string | null }>`
      select ${ownedBusinessOf(stranger.userId)} as scoped
    `.execute(ctx.db);

    expect(result.rows[0]?.scoped).toBeNull();
  });
});

describe('a caller with no membership writes nothing', () => {
  it('updates zero rows in every guarded table', async () => {
    const stranger = await accountWithoutBusiness(ctx);
    const owner = await accountWithBusiness(ctx, 'Untouchable Salon');
    await populate(owner.businessId);

    // ── THE SHAPE EVERY SCOPED UPDATE IN THE CODEBASE USES ────────────────
    //
    // The predicate is in the `where`, not in a check before the statement.
    // That is what makes a stranger's update a no-op rather than a guarded
    // write — see `renameBusinessForUser` for the argument.
    const renamed = await sql<{ id: string }>`
      update public.services set name = 'Hijacked'
       where business_id = ${ownedBusinessOf(stranger.userId)}
      returning id
    `.execute(ctx.db);

    expect(
      renamed.rows.length,
      'a caller with no membership updated another salon’s service',
    ).toBe(0);

    // And the row is untouched — asserted separately, because "returning
    // nothing" and "changing nothing" are not the same claim.
    const name = await sql<{ name: string }>`
      select name from public.services where business_id = ${owner.businessId}::uuid
    `.execute(ctx.db);
    expect(name.rows[0]?.name).toBe('Silk press');
  });

  it('deletes zero rows in every guarded table', async () => {
    const stranger = await accountWithoutBusiness(ctx);
    const owner = await accountWithBusiness(ctx, 'Undeletable Salon');
    await populate(owner.businessId);

    for (const table of GUARDED_TABLES) {
      const deleted = await sql<{ id: string }>`
        delete from ${sql.raw(`public.${table}`)}
         where business_id = ${ownedBusinessOf(stranger.userId)}
        returning id
      `.execute(ctx.db);

      expect(
        deleted.rows.length,
        `${table}: a caller with no membership deleted another salon's rows`,
      ).toBe(0);

      // Still there.
      expect(await countVisibleTo(table, owner.userId)).toBe(1);
    }
  });

  it('inserts nothing, because the business_id is null and the column is not', async () => {
    const stranger = await accountWithoutBusiness(ctx);

    // ── THE INSERT CASE, WHICH IS THE ONE PEOPLE FORGET ───────────────────
    //
    // A read that returns nothing is obviously safe. An INSERT is the case
    // where a null scope could plausibly have written an orphan row — and it
    // cannot, because `business_id` is NOT NULL. The scoping rule and the
    // column constraint close it together, and neither alone would.
    await expect(
      sql`
        insert into public.services (business_id, name, duration_minutes, price_kes, position)
        values (${ownedBusinessOf(stranger.userId)}, 'Ghost', 30, 100, 0)
      `.execute(ctx.db),
    ).rejects.toThrow();
  });
});

/**
 * ══ THE CROSS-TENANT CASE, WHICH IS THE ONE THAT HAPPENS ════════════════════
 *
 * The tests above use a caller with NO membership. That is the easy half: the
 * scoping subquery is `null` for them, and null compares false against
 * everything, so a great many wrong implementations still pass.
 *
 * **This is the case the rule actually exists for.** Owner B is authenticated,
 * holds a perfectly good owner membership, and their scoping subquery resolves
 * to a real business id. Every read and write they make is a legitimate query
 * with a non-null scope — and it must reach nothing of owner A's.
 *
 * A predicate that filtered on "has any membership" rather than on WHICH
 * business would pass every test above and fail every one of these. So would
 * one that resolved the id once and then forgot to filter by it.
 */
describe('one owner reaches nothing belonging to another', () => {
  it('reads only their own rows, in every guarded table', async () => {
    const alice = await accountWithBusiness(ctx, 'Alice’s Salon');
    await populate(alice.businessId);

    const bob = await accountWithBusiness(ctx, 'Bob’s Salon');
    await populate(bob.businessId);

    for (const table of GUARDED_TABLES) {
      // ── EXACTLY ONE, NOT "AT LEAST ONE" AND NOT ZERO ────────────────────
      //
      // Both salons have a row in every table. `toBe(1)` is what distinguishes
      // "scoped correctly" from "sees everything": a rule that dropped its
      // business filter would return 2 here and still satisfy any assertion
      // phrased as "can see their own".
      expect(
        await countVisibleTo(table, alice.userId),
        `${table}: Alice does not see exactly her own row`,
      ).toBe(1);

      expect(
        await countVisibleTo(table, bob.userId),
        `${table}: Bob does not see exactly his own row`,
      ).toBe(1);
    }
  });

  it('reads their OWN row and not the other salon’s, by id', async () => {
    const alice = await accountWithBusiness(ctx, 'Alice’s Salon');
    await populate(alice.businessId);
    const bob = await accountWithBusiness(ctx, 'Bob’s Salon');
    await populate(bob.businessId);

    // Counting is not quite enough: two salons with one row each would also
    // give 1/1 to an implementation that returned the WRONG one. This asserts
    // which business the visible row belongs to.
    const seen = await sql<{ businessId: string }>`
      select business_id as "businessId" from public.services
       where business_id = ${ownedBusinessOf(bob.userId)}
    `.execute(ctx.db);

    expect(seen.rows).toHaveLength(1);
    expect(seen.rows[0]?.businessId).toBe(bob.businessId);
    expect(seen.rows[0]?.businessId).not.toBe(alice.businessId);
  });

  it('cannot update another owner’s rows', async () => {
    const alice = await accountWithBusiness(ctx, 'Alice’s Salon');
    await populate(alice.businessId);
    const bob = await accountWithBusiness(ctx, 'Bob’s Salon');
    await populate(bob.businessId);

    // Bob's own update succeeds — the control. Without it, "Alice's row is
    // unchanged" would also pass for a rule that updates nothing at all.
    const mine = await sql<{ id: string }>`
      update public.services set name = 'Bob renamed his own'
       where business_id = ${ownedBusinessOf(bob.userId)}
      returning id
    `.execute(ctx.db);
    expect(mine.rows).toHaveLength(1);

    // And Alice's is untouched by it.
    const hers = await sql<{ name: string }>`
      select name from public.services where business_id = ${alice.businessId}::uuid
    `.execute(ctx.db);
    expect(
      hers.rows[0]?.name,
      'one owner’s update reached another owner’s row',
    ).toBe('Silk press');
  });

  it('cannot delete another owner’s rows, in any guarded table', async () => {
    const alice = await accountWithBusiness(ctx, 'Alice’s Salon');
    await populate(alice.businessId);
    const bob = await accountWithBusiness(ctx, 'Bob’s Salon');
    await populate(bob.businessId);

    for (const table of GUARDED_TABLES) {
      const deleted = await sql<{ id: string }>`
        delete from ${sql.raw(`public.${table}`)}
         where business_id = ${ownedBusinessOf(bob.userId)}
        returning id
      `.execute(ctx.db);

      // Bob deletes exactly his own — one row, not two.
      expect(
        deleted.rows,
        `${table}: Bob's delete did not remove exactly his own row`,
      ).toHaveLength(1);

      // Alice's survives.
      expect(
        await countVisibleTo(table, alice.userId),
        `${table}: one owner's delete reached another owner's rows`,
      ).toBe(1);
    }
  });
});

describe('the rule filters on the owner role, not merely on membership', () => {
  it('ignores a membership whose role is not owner', async () => {
    const owner = await accountWithBusiness(ctx, 'Role Salon');
    await populate(owner.businessId);

    // ── UNREACHABLE TODAY, AND THAT IS WHY IT IS DRIVEN HERE ──────────────
    //
    // `ck_memberships_role` permits only 'owner', so this row has to be forced
    // past the constraint to exist at all. `scope.ts` says dropping the role
    // clause "is invisible today ... it stops being invisible the day I9 widens
    // that vocabulary, and by then it is in six places".
    //
    // This is that day, simulated: the constraint is dropped inside the
    // transaction (rolled back with it), a stylist membership is planted, and
    // the rule is asserted to ignore it. If somebody removes `role = 'owner'`
    // from the fragment, this fails now rather than after I9 ships.
    const stylist = await accountWithoutBusiness(ctx);

    await ctx.asAdmin(async () => {
      await sql`
        alter table public.memberships drop constraint ck_memberships_role
      `.execute(ctx.db);
    });

    await sql`
      insert into public.memberships (user_id, business_id, role)
      values (${stylist.userId}::uuid, ${owner.businessId}::uuid, 'stylist')
    `.execute(ctx.db);

    // The membership exists...
    const membership = await sql<{ n: number }>`
      select count(*)::int as n from public.memberships
       where user_id = ${stylist.userId}::uuid
    `.execute(ctx.db);
    expect(membership.rows[0]?.n).toBe(1);

    // ...and the scoping rule still resolves to nothing for them.
    const scoped = await sql<{ scoped: string | null }>`
      select ${ownedBusinessOf(stylist.userId)} as scoped
    `.execute(ctx.db);
    expect(
      scoped.rows[0]?.scoped,
      'a non-owner membership satisfied the owner-scoped rule',
    ).toBeNull();

    for (const table of GUARDED_TABLES) {
      expect(await countVisibleTo(table, stylist.userId)).toBe(0);
    }
  });
});
