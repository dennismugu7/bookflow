import { sql } from 'kysely';

import type { Executor } from '../../platform/db.ts';
import { ownedBusinessOf, type OwnerScope } from '../scope.ts';

/**
 * Knows the database. Applies the membership scoping rule (`CLAUDE.md` §4, §5).
 */

export interface OpeningHoursRow {
  readonly dayOfWeek: number;
  readonly openTime: string;
  readonly closeTime: string;
}

/**
 * `to_char`, not the raw column.
 *
 * PostgreSQL renders `time` as `HH:MM:SS`, so a client that sent `09:00` would
 * read back `09:00:00` and a naive round-trip comparison would fail. The wire
 * format is `HH:MM` (see `hours.schema.ts`) and this is where it is made true.
 */
const COLUMNS = sql`
  day_of_week as "dayOfWeek",
  to_char(open_time, 'HH24:MI') as "openTime",
  to_char(close_time, 'HH24:MI') as "closeTime"
`;

export async function listOpeningHours(
  executor: Executor,
  scope: OwnerScope,
): Promise<OpeningHoursRow[]> {
  const result = await sql<OpeningHoursRow>`
    select ${COLUMNS}
      from public.opening_hours
     where business_id = ${ownedBusinessOf(scope.userId)}
     order by day_of_week asc
  `.execute(executor);

  return result.rows;
}

/**
 * Replaces the whole week, atomically, and returns it as stored.
 *
 * ══ ONE STATEMENT, NOT A TRANSACTION — AND NOT THE OBVIOUS ONE ══════════════
 *
 * `executor.transaction()` is wrong here for the reason `createBusinessForUser`
 * sets out at length: `Executor` is already a transaction in every integration
 * test, and opening another would `COMMIT` the harness's and leave rows behind.
 * A single statement is atomic by definition, in autocommit or inside a
 * transaction, without either side knowing.
 *
 * ── WHY IT IS NOT "DELETE EVERYTHING, THEN INSERT EVERYTHING" ───────────────
 *
 * That is the shape one reaches for, and inside one statement it is a bug.
 * **The execution order of data-modifying CTEs is not specified**, so the
 * insert may run before the delete — and `uq_opening_hours_business_day` would
 * then refuse the new Monday because the old Monday is still there. It would
 * work in testing and fail on a plan change, which is the worst kind.
 *
 * So the two writes are made **disjoint** instead, and order stops mattering:
 *
 *   - the DELETE removes only days the request does NOT contain
 *   - the UPSERT touches only days it does
 *
 * No row is both, so the unique index never sees a conflict between them, and
 * `on conflict do update` handles the day that already existed.
 *
 * ── AN EMPTY WEEK IS A VALID ANSWER ─────────────────────────────────────────
 *
 * `days = []` deletes everything and inserts nothing: the salon is closed all
 * week. `not in (select ... from incoming)` over an empty set is true for every
 * row, which is exactly right — and is the reason A6's "an omitted day means
 * closed" is representable at all.
 *
 * ── AND A CALLER WITH NO BUSINESS CHANGES NOTHING ───────────────────────────
 *
 * `ownedBusinessOf` is `null` for them, so the DELETE's `where` is `null` —
 * matching nothing — and the UPSERT's guard fails. The route turns the empty
 * result into a 404.
 */
export async function replaceOpeningHours(
  executor: Executor,
  scope: OwnerScope,
  days: readonly OpeningHoursRow[],
): Promise<OpeningHoursRow[]> {
  const payload = JSON.stringify(
    days.map((day) => ({
      day: day.dayOfWeek,
      open: day.openTime,
      close: day.closeTime,
    })),
  );

  const result = await sql<OpeningHoursRow>`
    with owner as (
      select ${ownedBusinessOf(scope.userId)} as business_id
    ), incoming as (
      select *
        from jsonb_to_recordset(${payload}::jsonb)
          as entry(day int, open text, close text)
    ), removed as (
      delete from public.opening_hours
       where business_id = (select business_id from owner)
         and day_of_week not in (select day from incoming)
      returning 1
    ), upserted as (
      insert into public.opening_hours (business_id, day_of_week, open_time, close_time)
      select
        (select business_id from owner),
        entry.day,
        entry.open::time,
        entry.close::time
        from incoming as entry
       where (select business_id from owner) is not null
      on conflict on constraint uq_opening_hours_business_day
      do update set
        open_time = excluded.open_time,
        close_time = excluded.close_time
      returning ${COLUMNS}
    )
    -- The "removed" CTE is unreferenced BY DESIGN. PostgreSQL executes a
    -- data-modifying CTE exactly once and to completion whether or not the
    -- primary query reads it; deleting it silently stops days being removed,
    -- and the week would only ever grow. Same trap as new_membership in
    -- businesses.repository.ts.
    select "dayOfWeek", "openTime", "closeTime"
      from upserted
     order by "dayOfWeek" asc
  `.execute(executor);

  return result.rows;
}

/** How many days the caller's business is open. Used by the publish check. */
export async function countOpeningHours(
  executor: Executor,
  scope: OwnerScope,
): Promise<number> {
  const result = await sql<{ count: string }>`
    select count(*)::text as count
      from public.opening_hours
     where business_id = ${ownedBusinessOf(scope.userId)}
  `.execute(executor);

  return Number(result.rows[0]?.count ?? '0');
}
