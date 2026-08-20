import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import type { OwnerScope } from '../scope.ts';
import {
  listOpeningHours,
  replaceOpeningHours,
  type OpeningHoursRow,
} from './hours.repository.ts';
import { businessExistsFor } from '../businesses/businesses.service.ts';

/** Business logic. All of it. */

export async function getOpeningHours(
  db: Executor,
  scope: OwnerScope,
): Promise<OpeningHoursRow[]> {
  return await listOpeningHours(db, scope);
}

/**
 * Replaces the week.
 *
 * ══ AN EMPTY RESULT IS AMBIGUOUS, SO IT IS DISAMBIGUATED ════════════════════
 *
 * The repository returns no rows in two entirely different situations:
 *
 *   1. the caller has no business — nothing was written, and this is a 404
 *   2. the caller sent `days: []` — the week was cleared, and this is a 200
 *
 * Every other write in this feature can treat "no rows" as case 1, because
 * every other write inserts at least one row when it succeeds. This one can
 * succeed by writing none, so it has to ask.
 *
 * The extra read runs only when the result is empty, which is the uncommon
 * path, and never on the ordinary save.
 */
export async function setOpeningHours(
  db: Executor,
  scope: OwnerScope,
  days: readonly OpeningHoursRow[],
): Promise<OpeningHoursRow[]> {
  const stored = await replaceOpeningHours(db, scope, days);

  if (stored.length === 0 && !(await businessExistsFor(db, scope))) {
    throw new ProblemError('not-found', 'no business for this principal');
  }

  return stored;
}
