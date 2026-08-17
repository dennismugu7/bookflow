import type { Executor } from '../../platform/db.ts';
import {
  type BusinessRow,
  type BusinessScope,
  findBusinessOwnedBy,
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
