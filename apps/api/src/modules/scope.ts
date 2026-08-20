import { sql, type RawBuilder } from 'kysely';

/**
 * The membership scoping rule, as one SQL fragment.
 *
 * ══ DO-NOT-VIBE: THE MEMBERSHIP SCOPING RULE (`CLAUDE.md` §6) ═══════════════
 *
 * `CLAUDE.md` §5: *"Every protected read and write is scoped
 * `user → membership → business`, applied in the repository layer."* Six
 * modules now configure a business — services, team members, opening hours,
 * media, publishing, and the public projection — and every statement in every
 * one of them has to traverse it.
 *
 * ── WHY ONE FRAGMENT AND NOT SIX COPIES ─────────────────────────────────────
 *
 * Six hand-written copies of a three-clause predicate is six chances to drop a
 * clause. Dropping `role = 'owner'` is invisible today, because
 * `ck_memberships_role` permits no other value; it stops being invisible the
 * day I9 widens that vocabulary, and by then it is in six places. Dropping the
 * `user_id` clause is a cross-tenant read that every test still passes,
 * because every test has one account.
 *
 * **So it is written once, and a reviewer checks one predicate.**
 *
 * ── WHY A SCALAR SUBQUERY AND NOT A RESOLVED ID ─────────────────────────────
 *
 * The obvious alternative is a helper that returns the caller's `business_id`,
 * which callers then filter by. It is weaker in a way that matters: the
 * traversal happens once, somewhere else, and every statement afterwards
 * filters on a plain value that a bug can substitute. Inlined as a subquery,
 * **each statement carries its own proof of scope** and a statement missing it
 * is missing it visibly.
 *
 * ── WHY `limit 1` IS SAFE HERE ──────────────────────────────────────────────
 *
 * A scalar subquery that returned two rows would be a runtime error, so the
 * limit is not cosmetic. It cannot actually fire:
 * `uq_memberships_one_owner_per_user` permits at most one `role = 'owner'`
 * membership per user, which is ADR-003 as a schema guarantee. The limit is
 * defensive against that index being weakened, exactly as
 * `findBusinessOwnedBy`'s `orderBy`/`limit` are and for the same reason.
 *
 * ── WHAT IT EVALUATES TO WHEN THERE IS NO MEMBERSHIP ────────────────────────
 *
 * `null`. Every comparison against it is then `null` rather than true, so a
 * caller with no business matches no rows on a read, updates nothing, deletes
 * nothing, and inserts nothing — **the safe direction in all four cases,
 * without any of them testing for it.** Routes turn "no rows" into a 404.
 */
export function ownedBusinessOf(userId: string): RawBuilder<string> {
  return sql<string>`(
    select m.business_id
      from public.memberships m
     where m.user_id = ${userId}::uuid
       and m.role = 'owner'
     limit 1
  )`;
}

/** What every scoped repository function needs to know about the caller. */
export interface OwnerScope {
  readonly userId: string;
}
