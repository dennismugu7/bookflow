import { sql } from 'kysely';

import type { Executor } from '../../platform/db.ts';

export interface ProfileRow {
  readonly id: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly avatar_path: string | null;
}

/**
 * The caller's own profile.
 *
 * Scoped by construction: the key IS the caller's id (ADR-031 makes
 * `user_profiles.id` the `auth.users` id). Note that this route therefore does
 * NOT exercise the membership scoping rule at all, which is why
 * `GET /v1/businesses/:id` exists alongside it.
 */
export async function findProfileByUserId(
  executor: Executor,
  scope: { readonly userId: string },
): Promise<ProfileRow | undefined> {
  return await executor
    .selectFrom('user_profiles')
    .where('id', '=', sql<string>`${scope.userId}::uuid`)
    .select(['id', 'first_name', 'last_name', 'avatar_path'])
    .executeTakeFirst();
}
