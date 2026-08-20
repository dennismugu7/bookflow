import { sql } from 'kysely';

import type { Executor } from '../../platform/db.ts';
import { ownedBusinessOf, type OwnerScope } from '../scope.ts';

/**
 * Knows the database. Applies the membership scoping rule (`CLAUDE.md` §4, §5).
 */

export interface PublishableRow {
  readonly id: string;
  readonly name: string;
  readonly published: boolean;
  readonly handle: string | null;
  readonly serviceCount: number;
  readonly openDayCount: number;
}

/**
 * Everything the publish decision needs, in one read.
 *
 * ── ONE STATEMENT, BECAUSE THE ANSWER MUST BE SELF-CONSISTENT ───────────────
 *
 * Three separate reads — the business, the service count, the open-day count —
 * would each see their own snapshot, so a service deleted between the second
 * and the third would let a salon publish with none. One statement sees one
 * snapshot.
 *
 * It is still not a guarantee against a delete that lands after this read and
 * before the update; nothing short of locking is, and locking a row to publish
 * it would be a heavy answer to a problem whose worst outcome is a published
 * salon with an empty service list for as long as it takes the owner to notice.
 * Recorded rather than defended.
 */
export async function findPublishable(
  executor: Executor,
  scope: OwnerScope,
): Promise<PublishableRow | undefined> {
  const result = await sql<PublishableRow>`
    select
      b.id,
      b.name,
      b.published,
      b.handle,
      (select count(*) from public.services s where s.business_id = b.id)::int
        as "serviceCount",
      (select count(*) from public.opening_hours h where h.business_id = b.id)::int
        as "openDayCount"
      from public.businesses b
     where b.id = ${ownedBusinessOf(scope.userId)}
  `.execute(executor);

  return result.rows[0];
}

/**
 * Publishes, claiming `handle`.
 *
 * Returns `undefined` when the handle is already taken, which the service turns
 * into another attempt with a different suffix. `on conflict do nothing` rather
 * than catching 23505: the caller has to distinguish "taken" from every other
 * failure, and a `returning` that yields no row says exactly that without
 * inspecting an error's shape.
 *
 * **`published` and `handle` are set together and only when `handle is null`.**
 * ADR-021 makes a handle permanent, so this can never overwrite one — a
 * business that already has a handle is not re-published by this path at all,
 * and the service answers it before reaching here.
 */
export async function publishWithHandle(
  executor: Executor,
  scope: OwnerScope,
  handle: string,
): Promise<{ readonly id: string; readonly name: string } | undefined> {
  const result = await sql<{ id: string; name: string }>`
    update public.businesses
       set published = true,
           handle = ${handle}
     where id = ${ownedBusinessOf(scope.userId)}
       and handle is null
       and not exists (
         select 1 from public.businesses other where other.handle = ${handle}
       )
    returning id, name
  `.execute(executor);

  return result.rows[0];
}

/** Publishes a business that already holds a handle. Idempotent. */
export async function markPublished(
  executor: Executor,
  scope: OwnerScope,
): Promise<void> {
  await sql`
    update public.businesses
       set published = true
     where id = ${ownedBusinessOf(scope.userId)}
  `.execute(executor);
}
