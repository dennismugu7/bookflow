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
 * Whether a business row exists at all, ignoring membership.
 *
 * ── THIS IS THE ONE UNSCOPED READ IN THE MODULE, AND IT EXISTS FOR THE LOG ──
 *
 * **DO-NOT-VIBE: the membership scoping rule (`CLAUDE.md` §6).** Every other
 * read here traverses `user → membership → business`. This one does not, and
 * that is the whole reason it is written separately, named awkwardly, and
 * documented at this length rather than folded into a helper someone can reach
 * for without noticing.
 *
 * **What it is for.** `findBusinessForUser` conflates "no such business" with
 * "not yours" so that no caller can surface the difference — which is right for
 * the *response* and leaves the server unable to tell an operator which of the
 * two just happened. A 404 rate that is entirely "not yours" means something
 * very different from one that is entirely "no such id", and only one of those
 * is worth waking up for. This answers that question **for the log only**.
 *
 * ── THE CONSTRAINTS ON USING IT, WHICH ARE THE POINT ────────────────────────
 *
 * - **Its result must never reach a response**, in any form: not a status code,
 *   not a message, not a timing difference the caller can measure by design.
 *   The 404 is byte-identical either way and `schema.integration.test.ts`
 *   asserts that.
 * - **It returns a boolean, never a row.** There is nothing here to leak even
 *   if someone did misuse it — no name, no `published`, no id beyond the one
 *   the caller already supplied.
 * - **It runs only on a path that has already failed the scoped read**, so it
 *   costs one primary-key lookup on an error path and nothing on the happy one.
 * - **It has exactly one permitted caller: `logScopedMiss`**, which returns
 *   `Promise<void>`. Nothing else in this module or any other may call it, and
 *   no new caller may be added without the same review the Do-Not-Vibe rule
 *   requires of the original.
 *
 * ── THE CONSTRAINTS ARE ENFORCED, NOT REQUESTED ─────────────────────────────
 *
 * A comment asking people not to misuse something is a comment. **`businesses.
 * boundaries.test.ts` reads this source tree and fails** if this function
 * acquires a second caller, is imported from outside `modules/businesses/`, or
 * if `logScopedMiss` stops returning `Promise<void>` — the type that makes it
 * impossible for this answer to be returned to a caller rather than merely
 * unlikely.
 *
 * **It exists solely so a log can record a distinction the response
 * deliberately hides.** If that reason ever stops being true, the right change
 * is to delete this function, not to widen it.
 *
 * The alternative was to log "scoped miss" without distinguishing the two, and
 * that was rejected: it records that something was refused while discarding the
 * only fact that says whether anything is wrong.
 */
export async function businessExistsUnscoped(
  executor: Executor,
  businessId: string,
): Promise<boolean> {
  const row = await executor
    .selectFrom('businesses')
    .where('businesses.id', '=', sql<string>`${businessId}::uuid`)
    .select('businesses.id')
    .executeTakeFirst();

  return row !== undefined;
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
 * ── OWNED MEANS OWNED: THE ROLE IS FILTERED ─────────────────────────────────
 *
 * `role = 'owner'` is in the `where`, and it has to be. **Today it changes
 * nothing** — `ck_memberships_role` permits no other value, so every membership
 * row is an owner row. **It changes everything the day I9 widens that
 * vocabulary**, which the migration for `uq_memberships_one_owner_per_user`
 * names as the whole reason that index is PARTIAL: a non-owner membership at a
 * second business must stay possible.
 *
 * Without this filter, an owner of B1 who is also a stylist at B2 would get
 * whichever membership was created first, and `GET /v1/me/business` would route
 * them into a salon that is not theirs. **The filter is added while it is
 * provably inert, because the alternative is adding it after the state exists —
 * when the fix and the bug arrive together.**
 *
 * It also makes the partial index usable here: `uq_memberships_one_owner_per_user`
 * is `(user_id) where role = 'owner'`, and PostgreSQL will only choose a partial
 * index when the query's predicate implies the index's. Without the filter this
 * falls back to `uq_memberships_user_business`'s `user_id` prefix, over every
 * membership rather than every owner membership.
 *
 * ── ONE ROW, AND IT IS NOW A SCHEMA GUARANTEE ───────────────────────────────
 *
 * ADR-003 is one business per account, and **`uq_memberships_one_owner_per_user`
 * enforces it** — at most one `role = 'owner'` membership per user, so with the
 * filter above this query can match at most one row. **That was not true when
 * this comment was first written**: it said "until the partial unique index that
 * enforces it lands", and the index lands in the same change set as this
 * sentence.
 *
 * **So `orderBy` and `limit(1)` are now DEFENSIVE rather than load-bearing**, and
 * they stay. The determinism argument is unchanged and still worth having: if
 * the guarantee is ever weakened — the index dropped, its predicate altered —
 * this returns a stable answer instead of whatever the planner reached first,
 * and a non-deterministic answer to "which is my business" is a bug that appears
 * only under load.
 */
export async function findBusinessOwnedBy(
  executor: Executor,
  scope: { readonly userId: string },
): Promise<BusinessRow | undefined> {
  return await executor
    .selectFrom('businesses')
    .innerJoin('memberships', 'memberships.business_id', 'businesses.id')
    .where('memberships.user_id', '=', sql<string>`${scope.userId}::uuid`)
    .where('memberships.role', '=', 'owner')
    .select(['businesses.id', 'businesses.name', 'businesses.published'])
    .orderBy('memberships.created_at', 'asc')
    .limit(1)
    .executeTakeFirst();
}

/**
 * Creates a business and the caller's owner membership, atomically.
 *
 * ── ONE STATEMENT, NOT A TRANSACTION, AND THE REASON IS THE HARNESS ─────────
 *
 * Both rows must land or neither must: a business with no membership belongs to
 * nobody and is unreachable through the scoping rule — an orphan no request can
 * ever see or delete.
 *
 * The obvious implementation is `executor.transaction()`. **It is wrong here.**
 * `Executor` is `Kysely | Transaction`, and in every integration test it is
 * already a transaction (the harness rolls one back per test). Kysely's
 * `Transaction` extends `Kysely`, so `.transaction()` compiles — and would issue
 * `BEGIN` inside an open transaction, which PostgreSQL warns about and ignores,
 * then `COMMIT`, **which would commit the test's transaction for real and leave
 * rows behind.** That is exactly the failure `CLAUDE.md` §5 describes for a
 * repository that opens its own connection.
 *
 * A single statement sidesteps it entirely: **PostgreSQL executes one statement
 * atomically by definition**, in autocommit or inside a transaction, without
 * either side knowing. Both inserts live in one CTE, so a failure on the
 * membership — including
 * `uq_memberships_one_owner_per_user` — rolls the business back with it, by
 * construction rather than by remembering to.
 */
export async function createBusinessForUser(
  executor: Executor,
  userId: string,
  name: string,
): Promise<BusinessRow | undefined> {
  const result = await sql<BusinessRow>`
    with new_business as (
      insert into public.businesses (name) values (${name})
      returning id, name, published
    ), new_membership as (
      -- ROLE STATED, NOT INHERITED. memberships.role defaults to 'owner', so
      -- this column could be omitted -- and must not be. The row has to fall
      -- inside uq_memberships_one_owner_per_user's predicate (where role =
      -- 'owner') for the cardinality rule to bind it, and a row whose membership
      -- of that predicate depends on a column default is a row that silently
      -- leaves the index the day the default changes. ck_memberships_role is
      -- documented as the place the vocabulary widens, which makes the default
      -- exactly the wrong thing to depend on here.
      insert into public.memberships (user_id, business_id, role)
      select ${userId}::uuid, id, 'owner' from new_business
      returning id
    )
    -- new_membership IS UNREFERENCED BELOW, BY DESIGN. Do not delete it as dead
    -- code: PostgreSQL executes a data-modifying CTE exactly once and to
    -- completion, whether or not the primary query reads its output. Removing it
    -- silently drops the membership insert, leaving a business owned by nobody --
    -- unreachable through the scoping rule, and invisible to every cleanup that
    -- resolves ownership through memberships (K79).
    select id, name, published from new_business
  `.execute(executor);

  return result.rows[0];
}

/**
 * Does this error mean the caller already owns a business?
 *
 * Exported and pure so the mapping can be asserted without provoking a real
 * concurrent write — see `businesses.conflict-predicate.test.ts`. Matching on the
 * constraint NAME rather than on 23505 alone is deliberate: 23505 is every
 * unique violation on the table, and `uq_memberships_user_business` means
 * something entirely different.
 */
export function isSecondBusinessConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; constraint?: unknown };
  return (
    candidate.code === '23505' &&
    candidate.constraint === 'uq_memberships_one_owner_per_user'
  );
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
 *
 * ── IT DOES NOT FILTER ROLE, AND THAT ASYMMETRY IS DELIBERATE (K80) ─────────
 *
 * `findBusinessOwnedBy` filters `role = 'owner'`; this does not. The `exists`
 * subquery matches ANY membership for that user on that business, so once I9
 * widens `ck_memberships_role`, a stylist at a salon could rename it.
 *
 * **The asymmetry is deliberate because the two questions differ.**
 * `findBusinessOwnedBy` answers *"which business is MINE"*, and "mine" has one
 * correct meaning — the one I own. Renaming is an authorization question with no
 * decided answer: **whether a non-owner role may rename a business is a product
 * decision nobody has made**, and guessing it here in either direction would be
 * answering an open item by implementation. Adding `role = 'owner'` would decide
 * it as "no"; leaving it decides nothing, because no non-owner row can exist yet.
 *
 * **Tracked as K80, triggered by `ck_memberships_role` widening** — the same
 * event that makes it reachable. Until then this is unreachable rather than
 * wrong.
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

/**
 * The two reads and writes `createMyBusiness` needs, as a port it can be given.
 *
 * ── THE SAME SHAPE AS `GoTrueClient`, AND FOR THE SAME REASON ───────────────
 *
 * `auth.service.ts` takes `gotrue: GoTrueClient` through `SignupDeps` rather
 * than importing the client, which is what lets a test point sign-up at a
 * GoTrue that fails in a chosen way. **This exists so the same can be done to
 * the constraint branch**, which no test could otherwise reach: it fires only
 * when two creations interleave, and the integration harness has one connection
 * per test.
 *
 * **The executor is still a parameter of every method** (`CLAUDE.md` §5). The
 * port does not capture a connection; it is the same functions behind a name
 * the service can be handed a different implementation of.
 *
 * **`isSecondBusinessConflict` is deliberately NOT here.** It classifies a
 * driver error, and injecting it would let a fake decide what counts as a
 * conflict — which is exactly the judgement the branch test needs to exercise
 * for real. A fake raises a synthetic `23505`; the genuine predicate reads it.
 */
export interface BusinessRepository {
  findBusinessOwnedBy(
    executor: Executor,
    scope: { readonly userId: string },
  ): Promise<BusinessRow | undefined>;
  createBusinessForUser(
    executor: Executor,
    userId: string,
    name: string,
  ): Promise<BusinessRow | undefined>;
}

/** The real one. What every production call site passes. */
export const businessRepository: BusinessRepository = {
  findBusinessOwnedBy,
  createBusinessForUser,
};
