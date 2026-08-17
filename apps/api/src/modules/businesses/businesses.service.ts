import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import {
  type BusinessRow,
  type BusinessScope,
  createBusinessForUser,
  findBusinessOwnedBy,
  isSecondBusinessConflict,
  renameBusinessForUser,
} from './businesses.repository.ts';

/**
 * Business logic. All of it (`CLAUDE.md` §4).
 *
 * ── PASS-THROUGH, DELIBERATELY, AND ONLY FOR NOW ────────────────────────────
 *
 * There is no rule to apply to "which business is mine". The feature manual's
 * Phase 3 permits exactly this for a vertical slice — "for the slice, it can
 * just pass data through" — and the layer exists now rather than later because
 * the next two things this module gains are not pass-throughs: creation has to
 * refuse a second business (decision 8), and both creation and rename have to
 * hold a transaction the route must not know about.
 *
 * Adding the layer when it first has a rule would mean moving the route's call
 * site at the same moment the rule arrives, which is the diff where mistakes
 * hide. It is one indirection now against that.
 *
 * The executor is a parameter, never a module-level pool (`CLAUDE.md` §5): a
 * function that opens its own connection escapes the test transaction and
 * writes for real.
 */

/**
 * The caller's business, or `undefined` if they have not created one.
 *
 * `undefined` is an ordinary answer, not a refusal — see the repository. The
 * route turns it into a 404 and the Flutter repository turns that back into
 * "no business yet"; neither treats it as an error.
 */
export async function getMyBusiness(
  db: Executor,
  scope: { readonly userId: string },
): Promise<BusinessRow | undefined> {
  return await findBusinessOwnedBy(db, scope);
}

/**
 * Creates the caller's business.
 *
 * ── TWO LAYERS OF DEFENCE, AND THE SECOND IS THE REAL ONE ───────────────────
 *
 * Decision 8 refuses a second business with a conflict. This checks first —
 * which gives the ordinary caller a clean 409 without provoking a database
 * error — and then **relies on the index** for the case the check cannot see:
 * two requests that both read before either writes.
 *
 * **The pre-check is a courtesy; `uq_memberships_one_owner_per_user` is the
 * guarantee.** If the check were removed the behaviour would be identical, only
 * noisier. If the index were removed the check would be a race, and criterion 22
 * would silently stop holding. That ordering matters when someone later
 * wonders which to keep.
 *
 * Throws `ProblemError('business-already-exists')` either way, so the route does
 * not have to know which layer caught it.
 */
export async function createMyBusiness(
  db: Executor,
  scope: { readonly userId: string },
  name: string,
): Promise<BusinessRow> {
  const existing = await findBusinessOwnedBy(db, scope);
  if (existing !== undefined) {
    throw new ProblemError(
      'business-already-exists',
      'this account already has a business',
    );
  }

  let created: BusinessRow | undefined;
  try {
    created = await createBusinessForUser(db, scope.userId, name);
  } catch (error) {
    if (isSecondBusinessConflict(error)) {
      // The index caught what the check could not. Same answer to the caller —
      // and nothing was written, because both inserts are one statement.
      throw new ProblemError(
        'business-already-exists',
        'this account already has a business (constraint)',
      );
    }
    throw error;
  }

  if (created === undefined) {
    // A statement that inserted and returned nothing. The contract says this
    // cannot happen; failing is right, because the alternative is answering 201
    // with no business.
    throw new Error('business insert returned no row');
  }

  return created;
}

/**
 * Renames a business the caller is a member of.
 *
 * `undefined` means the business is not theirs or does not exist — the two are
 * not distinguished here, and the route must not distinguish them either.
 *
 * `name` is already trimmed by the route's schema (decision 9). This layer does
 * not re-trim: two places applying the same rule is two places for it to drift.
 */
export async function renameMyBusiness(
  db: Executor,
  scope: BusinessScope,
  name: string,
): Promise<BusinessRow | undefined> {
  return await renameBusinessForUser(db, scope, name);
}
