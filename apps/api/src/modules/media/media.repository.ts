import { sql } from 'kysely';

import type { Executor } from '../../platform/db.ts';
import { ownedBusinessOf, type OwnerScope } from '../scope.ts';

/**
 * Knows the database. Applies the membership scoping rule (`CLAUDE.md` §4, §5).
 */

export interface PortfolioImageRow {
  readonly id: string;
  readonly imageUrl: string;
  readonly position: number;
}

const COLUMNS = sql`
  id,
  image_url as "imageUrl",
  position
`;

export async function listPortfolioImages(
  executor: Executor,
  scope: OwnerScope,
): Promise<PortfolioImageRow[]> {
  const result = await sql<PortfolioImageRow>`
    select ${COLUMNS}
      from public.portfolio_images
     where business_id = ${ownedBusinessOf(scope.userId)}
     order by position asc, created_at asc
  `.execute(executor);

  return result.rows;
}

export async function insertPortfolioImage(
  executor: Executor,
  scope: OwnerScope,
  imageUrl: string,
): Promise<PortfolioImageRow | undefined> {
  const result = await sql<PortfolioImageRow>`
    insert into public.portfolio_images (business_id, image_url, position)
    select
      ${ownedBusinessOf(scope.userId)},
      ${imageUrl},
      -- Appended, not prepended. A new photo goes at the end of the gallery
      -- unless the owner reorders it; the coalesce covers the first one, where
      -- max over no rows is null.
      coalesce(
        (select max(position) + 1
           from public.portfolio_images
          where business_id = ${ownedBusinessOf(scope.userId)}),
        0
      )
    where ${ownedBusinessOf(scope.userId)} is not null
    returning ${COLUMNS}
  `.execute(executor);

  return result.rows[0];
}

/**
 * Removes the row and hands back the URL it held.
 *
 * ── THE URL COMES BACK BECAUSE THE OBJECT OUTLIVES THE ROW ──────────────────
 *
 * Deleting a gallery image is two deletes in two systems, and only one of them
 * is transactional. The caller needs the URL to do the second, and it must come
 * from the `returning` of the delete that authorised it rather than from a read
 * beforehand — otherwise a caller could read one row's URL and delete another.
 */
export async function deletePortfolioImage(
  executor: Executor,
  scope: OwnerScope,
  imageId: string,
): Promise<{ readonly imageUrl: string } | undefined> {
  const result = await sql<{ imageUrl: string }>`
    delete from public.portfolio_images
     where id = ${imageId}::uuid
       and business_id = ${ownedBusinessOf(scope.userId)}
    returning image_url as "imageUrl"
  `.execute(executor);

  return result.rows[0];
}

/** Sets the banner on the caller's business. Returns false if they have none. */
export async function setBannerUrl(
  executor: Executor,
  scope: OwnerScope,
  bannerUrl: string,
): Promise<boolean> {
  const result = await sql<{ id: string }>`
    update public.businesses
       set banner_url = ${bannerUrl}
     where id = ${ownedBusinessOf(scope.userId)}
    returning id
  `.execute(executor);

  return result.rows.length > 0;
}

/**
 * The caller's business id, for building an object key.
 *
 * ── THE ONE PLACE THE ID LEAVES THE SQL, AND WHY IT IS ALLOWED TO ───────────
 *
 * `../scope.ts` argues that resolving an id and then filtering by it is weaker
 * than inlining the traversal, and every statement above inlines it. This does
 * not, because the id is not being used to authorise anything — it is a path
 * segment in an object key, `{businessId}/{purpose}/{uuid}.{ext}`.
 *
 * Nothing is read or written by this value. If it were wrong the upload would
 * land under the wrong prefix, which is a tidiness bug; the DATABASE writes
 * that follow all re-derive the scope for themselves.
 */
export async function ownedBusinessIdOf(
  executor: Executor,
  scope: OwnerScope,
): Promise<string | undefined> {
  const result = await sql<{ businessId: string }>`
    select ${ownedBusinessOf(scope.userId)} as "businessId"
  `.execute(executor);

  return result.rows[0]?.businessId ?? undefined;
}
