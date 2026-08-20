import { sql } from 'kysely';

import type { Executor } from '../../platform/db.ts';
import { ownedBusinessOf, type OwnerScope } from '../scope.ts';

/**
 * Knows the database. Applies the membership scoping rule (`CLAUDE.md` §4, §5).
 *
 * **Every statement below carries `ownedBusinessOf` in its own `where`.** Not
 * one of them takes a business id from a caller, so there is no id here that a
 * bug could substitute — see `../scope.ts` for why that is the shape.
 */

export interface ServiceRow {
  readonly id: string;
  readonly name: string;
  readonly durationMinutes: number;
  readonly priceKes: number;
  readonly position: number;
}

/** The columns, aliased to the wire's names once, here. */
const COLUMNS = sql`
  id,
  name,
  duration_minutes as "durationMinutes",
  price_kes as "priceKes",
  position
`;

export async function listServices(
  executor: Executor,
  scope: OwnerScope,
): Promise<ServiceRow[]> {
  const result = await sql<ServiceRow>`
    select ${COLUMNS}
      from public.services
     where business_id = ${ownedBusinessOf(scope.userId)}
     -- created_at breaks the tie, so a page of services is never in a
     -- different order between two reads that changed nothing.
     order by position asc, created_at asc
  `.execute(executor);

  return result.rows;
}

export async function insertService(
  executor: Executor,
  scope: OwnerScope,
  input: {
    readonly name: string;
    readonly durationMinutes: number;
    readonly priceKes: number;
    readonly position: number | undefined;
  },
): Promise<ServiceRow | undefined> {
  // `insert ... select` rather than `insert ... values`: the row can only be
  // built from a business the traversal produced, so a caller with no
  // membership inserts nothing rather than inserting somewhere.
  const result = await sql<ServiceRow>`
    insert into public.services (business_id, name, duration_minutes, price_kes, position)
    select
      ${ownedBusinessOf(scope.userId)},
      ${input.name},
      ${input.durationMinutes},
      ${input.priceKes},
      coalesce(${input.position ?? null}::int, 0)
    where ${ownedBusinessOf(scope.userId)} is not null
    returning ${COLUMNS}
  `.execute(executor);

  return result.rows[0];
}

export async function updateService(
  executor: Executor,
  scope: OwnerScope,
  serviceId: string,
  input: {
    readonly name: string | undefined;
    readonly durationMinutes: number | undefined;
    readonly priceKes: number | undefined;
    readonly position: number | undefined;
  },
): Promise<ServiceRow | undefined> {
  // `coalesce(param, column)` leaves an absent field untouched. The alternative
  // — building the SET list from whichever keys are present — is string
  // assembly around user-supplied names, which is how an update statement grows
  // a column nobody meant to expose.
  const result = await sql<ServiceRow>`
    update public.services
       set name = coalesce(${input.name ?? null}::text, name),
           duration_minutes = coalesce(${input.durationMinutes ?? null}::int, duration_minutes),
           price_kes = coalesce(${input.priceKes ?? null}::int, price_kes),
           position = coalesce(${input.position ?? null}::int, position)
     where id = ${serviceId}::uuid
       and business_id = ${ownedBusinessOf(scope.userId)}
    returning ${COLUMNS}
  `.execute(executor);

  return result.rows[0];
}

/** True if a row was removed. False means "not yours, or not there". */
export async function deleteService(
  executor: Executor,
  scope: OwnerScope,
  serviceId: string,
): Promise<boolean> {
  const result = await sql<{ id: string }>`
    delete from public.services
     where id = ${serviceId}::uuid
       and business_id = ${ownedBusinessOf(scope.userId)}
    returning id
  `.execute(executor);

  return result.rows.length > 0;
}

/** How many services the caller's business has. Used by the publish check. */
export async function countServices(
  executor: Executor,
  scope: OwnerScope,
): Promise<number> {
  const result = await sql<{ count: string }>`
    select count(*)::text as count
      from public.services
     where business_id = ${ownedBusinessOf(scope.userId)}
  `.execute(executor);

  return Number(result.rows[0]?.count ?? '0');
}
