import { sql } from 'kysely';

import type { Executor } from '../../platform/db.ts';

/**
 * Knows the database. Applies the membership scoping rule (`CLAUDE.md` §4, §5).
 *
 * See `../README.md` for why the scope is a required parameter rather than a
 * separate check the caller is trusted to remember.
 */

export interface BusinessScope {
  readonly userId: string;
  readonly businessId: string;
}

export interface BusinessRow {
  readonly id: string;
  readonly name: string;
  readonly published: boolean;
}

/**
 * The caller's business, or `undefined`.
 *
 * `undefined` means BOTH "no such business" and "not this user's business", and
 * that conflation is deliberate — see `businesses.routes.ts`. The repository
 * does not distinguish them, so no caller can accidentally surface the
 * difference.
 */
export async function findBusinessForUser(
  executor: Executor,
  scope: BusinessScope,
): Promise<BusinessRow | undefined> {
  const result = await executor
    .selectFrom('businesses')
    .innerJoin('memberships', 'memberships.business_id', 'businesses.id')
    .where('businesses.id', '=', sql<string>`${scope.businessId}::uuid`)
    .where('memberships.user_id', '=', sql<string>`${scope.userId}::uuid`)
    .select(['businesses.id', 'businesses.name', 'businesses.published'])
    .executeTakeFirst();

  return result;
}

/**
 * The caller's own business, without being told which one it is.
 *
 * `findBusinessForUser` answers "may this user see THAT business" and needs the
 * id. This answers "which business, if any, is this user's" — the question the
 * client has to ask before it has any id at all, and the one
 * `apps/mobile/lib/features/membership/membership_repository.dart` records that
 * no endpoint could answer.
 *
 * ── STILL SCOPED THROUGH MEMBERSHIP, NOT AROUND IT ──────────────────────────
 *
 * The traversal is the same `user → membership → business` (`CLAUDE.md` §5); it
 * is the *starting point* that differs. Both begin from `memberships.user_id`,
 * which is `uq_memberships_user_business`'s leading column, so the index that
 * serves one serves the other.
 *
 * ── WHY `undefined` IS AN ANSWER HERE, NOT A REFUSAL ────────────────────────
 *
 * For `findBusinessForUser`, `undefined` conflates "no such business" with "not
 * yours", deliberately, so no caller can surface the difference. Here it means
 * something narrower and entirely ordinary: **this account has not created a
 * business yet.** That is the state every newly signed-up owner is in, not an
 * authorization failure, and the route above this must not turn it into one.
 *
 * ── ONE ROW, AND WHY THAT IS SAFE TO ASSUME ─────────────────────────────────
 *
 * ADR-003 is one business per account. Until the partial unique index that
 * enforces it lands, that is a rule the schema does not hold — so this takes
 * the first row rather than pretending the cardinality is guaranteed. It is
 * ordered so the choice is deterministic rather than whatever the planner
 * returns first; a non-deterministic answer to "which is my business" would be
 * a bug that appears only under load.
 */
export async function findBusinessOwnedBy(
  executor: Executor,
  scope: { readonly userId: string },
): Promise<BusinessRow | undefined> {
  return await executor
    .selectFrom('businesses')
    .innerJoin('memberships', 'memberships.business_id', 'businesses.id')
    .where('memberships.user_id', '=', sql<string>`${scope.userId}::uuid`)
    .select(['businesses.id', 'businesses.name', 'businesses.published'])
    .orderBy('memberships.created_at', 'asc')
    .limit(1)
    .executeTakeFirst();
}

/**
 * Renames the caller's business. Returns `undefined` if it is not theirs, or
 * does not exist.
 *
 * ── THE SCOPE IS IN THE UPDATE, NOT IN A CHECK BEFORE IT ────────────────────
 *
 * The membership predicate is part of the `where`, so a business the caller has
 * no membership in matches no row and nothing is written. The alternative —
 * read to authorize, then update — is two statements with a gap between them,
 * and it puts the rule somewhere a later edit can drop it while the update
 * still looks correct.
 *
 * Kysely has no join on `update`, so membership is expressed as an `exists`
 * subquery over the same `user → membership → business` traversal the reads use
 * (`CLAUDE.md` §5).
 *
 * `updated_at` is not set here. `trg_businesses_updated_at` maintains it
 * (ADR-036), and setting it in application code is how it comes to lie.
 *
 * **The name arrives already trimmed** — `businessName` in `businesses.schema.ts`
 * trims at the route boundary (decision 9), so nothing here re-trims and there
 * is exactly one place that rule lives.
 */
export async function renameBusinessForUser(
  executor: Executor,
  scope: BusinessScope,
  name: string,
): Promise<BusinessRow | undefined> {
  return await executor
    .updateTable('businesses')
    .set({ name })
    .where('businesses.id', '=', sql<string>`${scope.businessId}::uuid`)
    // The builder is taken whole rather than destructured: pulling `exists` and
    // `selectFrom` off it separates the methods from their object, which
    // `@typescript-eslint/unbound-method` refuses for good reason.
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom('memberships')
          .select('memberships.id')
          .whereRef('memberships.business_id', '=', 'businesses.id')
          .where(
            'memberships.user_id',
            '=',
            sql<string>`${scope.userId}::uuid`,
          ),
      ),
    )
    .returning(['businesses.id', 'businesses.name', 'businesses.published'])
    .executeTakeFirst();
}
