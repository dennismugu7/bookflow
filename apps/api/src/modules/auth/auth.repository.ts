import { sql } from 'kysely';

import type { Executor } from '../../platform/db.ts';

/**
 * Knows the database. No rules, no HTTP, no GoTrue.
 *
 * There is no membership scoping rule to apply here: at sign-up the caller has
 * no principal, no membership and no business — the row being written IS the
 * user. That absence is deliberate and is the reason this file is short; every
 * OTHER repository in this codebase takes a scope (`CLAUDE.md` §5).
 */

export interface NewProfile {
  /** The GoTrue user id. `user_profiles.id` IS `auth.users.id` (ADR-031). */
  readonly userId: string;
  readonly firstName: string;
  readonly lastName: string;
  /** SERVER-supplied. Never accepted from the request — see auth.service.ts. */
  readonly termsVersion: string;
}

export async function insertProfile(
  executor: Executor,
  profile: NewProfile,
): Promise<void> {
  await executor
    .insertInto('user_profiles')
    .values({
      id: sql<string>`${profile.userId}::uuid`,
      first_name: profile.firstName,
      last_name: profile.lastName,
      terms_version: profile.termsVersion,
      // `now()` from the database, not the API process: one clock, and it is
      // the same one `created_at` defaults to (ADR-010 — instants are
      // timestamptz in UTC).
      terms_accepted_at: sql<Date>`now()`,
    })
    .execute();
}

/**
 * Removes the profile, if it is there. Part of compensation, so it must be
 * safe to call when the insert never happened.
 */
export async function deleteProfile(
  executor: Executor,
  userId: string,
): Promise<void> {
  await executor
    .deleteFrom('user_profiles')
    .where('id', '=', sql<string>`${userId}::uuid`)
    .execute();
}
