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

/**
 * Renames the caller.
 *
 * Scoped by construction, like the read above: the key IS the caller's id. There
 * is no way to express "somebody else's profile" here, which is why this needs
 * no membership traversal.
 *
 * `avatar_path` is deliberately absent — screen #20 draws a pencil badge on the
 * avatar and that upload is not built. A column this route does not write is a
 * column an avatar feature can add a writer for; a column it writes as null
 * would erase one.
 *
 * The names arrive trimmed from `me.schema.ts`, so nothing here re-trims: two
 * places applying one rule is two places for it to drift.
 */
export async function updateProfile(
  executor: Executor,
  scope: { readonly userId: string },
  input: { readonly firstName: string; readonly lastName: string },
): Promise<ProfileRow | undefined> {
  return await executor
    .updateTable('user_profiles')
    .set({ first_name: input.firstName, last_name: input.lastName })
    .where('id', '=', sql<string>`${scope.userId}::uuid`)
    .returning(['id', 'first_name', 'last_name', 'avatar_path'])
    .executeTakeFirst();
}

/**
 * Every storage object belonging to the caller's business, and its id.
 *
 * ── READ BEFORE THE DELETE, BECAUSE AFTERWARDS THERE IS NOTHING TO READ ────
 *
 * Deleting the rows first and the objects second is the only workable order —
 * the objects are named by URLs held IN those rows. So the URLs are collected
 * while they still exist, and the storage cleanup runs from that list.
 *
 * If the process dies between the two, the objects are orphaned: they cost
 * storage and reference nothing. That is the failure this ordering chooses, and
 * it is the right one — the alternative loses the account's data while leaving
 * the account, which is the state a retry cannot fix.
 */
export async function findOwnedMedia(
  executor: Executor,
  scope: { readonly userId: string },
): Promise<{
  readonly businessId: string | null;
  readonly urls: readonly string[];
}> {
  const result = await sql<{ businessId: string; url: string | null }>`
    with owned as (
      select b.id, b.banner_url
        from public.businesses b
        join public.memberships m on m.business_id = b.id
       where m.user_id = ${scope.userId}::uuid
         and m.role = 'owner'
    )
    select id as "businessId", banner_url as url from owned
    union all
    select o.id, t.photo_url from owned o
      join public.team_members t on t.business_id = o.id
    union all
    select o.id, p.image_url from owned o
      join public.portfolio_images p on p.business_id = o.id
  `.execute(executor);

  const businessId = result.rows[0]?.businessId ?? null;
  const urls = result.rows
    .map((row) => row.url)
    .filter((url): url is string => url !== null && url !== '');

  return { businessId, urls };
}

/**
 * Deletes everything the caller's business owns, and the business.
 *
 * ══ ONE STATEMENT, FOR `createBusinessForUser`'S REASON ═════════════════════
 *
 * `Executor` is `Kysely | Transaction`, and in every integration test it is
 * already a transaction. Calling `.transaction()` here would issue `BEGIN`
 * inside an open one — which PostgreSQL warns about and ignores — then `COMMIT`,
 * **committing the test's transaction for real and leaving rows behind.**
 *
 * A single statement sidesteps it: PostgreSQL executes one statement atomically
 * by definition, inside a transaction or not, without either side knowing. Every
 * delete below lives in one CTE chain, so the whole cascade lands or none of it
 * does.
 *
 * ── THE ORDER INSIDE THE CTE IS NOT THE ORDER THEY RUN ─────────────────────
 *
 * Data-modifying CTEs execute in an UNSPECIFIED order and all see the same
 * snapshot — so this cannot rely on `bookings` going before `services`. It does
 * not have to: every delete is keyed on `business_id` independently, and none
 * reads a row another deletes. **`memberships` last in the text is a reading
 * aid, not a guarantee**, and the FK directions are what actually make this
 * safe.
 *
 * Returns the number of businesses removed, so the caller can tell "deleted a
 * business" from "there was none" without a second query.
 */
export async function deleteOwnedBusinessData(
  executor: Executor,
  scope: { readonly userId: string },
): Promise<number> {
  const result = await sql<{ id: string }>`
    with owned as (
      select b.id
        from public.businesses b
        join public.memberships m on m.business_id = b.id
       where m.user_id = ${scope.userId}::uuid
         and m.role = 'owner'
    ),
    -- Every child, keyed on the business. None of these reads another's rows.
    del_bookings as (
      delete from public.bookings
       where business_id in (select id from owned)
      returning id
    ),
    del_services as (
      delete from public.services
       where business_id in (select id from owned)
      returning id
    ),
    del_team as (
      delete from public.team_members
       where business_id in (select id from owned)
      returning id
    ),
    del_hours as (
      delete from public.opening_hours
       where business_id in (select id from owned)
      returning id
    ),
    del_portfolio as (
      delete from public.portfolio_images
       where business_id in (select id from owned)
      returning id
    ),
    -- EVERY membership of the business, not only the caller's. A business
    -- being deleted cannot leave a stylist's membership pointing at nothing,
    -- and once ck_memberships_role widens (I9) that is a real row.
    del_memberships as (
      delete from public.memberships
       where business_id in (select id from owned)
      returning id
    )
    delete from public.businesses
     where id in (select id from owned)
    returning id
  `.execute(executor);

  return result.rows.length;
}

/**
 * Deletes the caller's profile row.
 *
 * Separate from the cascade above because it is not conditional on owning a
 * business: an account that never created one still has a profile (ADR-037
 * writes it during sign-up), and that row must go either way.
 */
export async function deleteProfile(
  executor: Executor,
  scope: { readonly userId: string },
): Promise<void> {
  await sql`
    delete from public.user_profiles where id = ${scope.userId}::uuid
  `.execute(executor);
}
