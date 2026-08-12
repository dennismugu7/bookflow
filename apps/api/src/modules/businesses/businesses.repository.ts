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
