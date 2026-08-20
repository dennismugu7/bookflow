import { sql } from 'kysely';

import type { Executor } from '../../platform/db.ts';

/**
 * Knows the database. **The only repository in this codebase that does NOT
 * apply the membership scoping rule**, because there is no member — the caller
 * is an unauthenticated visitor to a public booking page.
 *
 * ══ WHAT REPLACES THE SCOPING RULE HERE ═════════════════════════════════════
 *
 * Two things, and both are in every statement below:
 *
 *   1. **`published = true`.** ADR-004: business data is private until
 *      explicitly published, and every public read filters on it. An
 *      unpublished salon is not "hidden" here — it does not match.
 *   2. **The columns are named.** `CLAUDE.md` §5's allowlist rule, enforced by
 *      the `select` list rather than by a filter applied afterwards. There is
 *      no `select *` in this file and there must not be: a denylist fails open,
 *      and a column added to `businesses` next month would publish itself.
 *
 * The child rows are reached through the business id this query resolved from
 * the handle, so they inherit the `published` filter by construction.
 */

export interface PublicSalonRow {
  readonly handle: string;
  readonly name: string;
  readonly tagline: string | null;
  readonly about: string | null;
  readonly category: string | null;
  readonly bannerUrl: string | null;
  readonly address: string | null;
  readonly mapsUrl: string | null;
}

export interface PublicServiceRow {
  readonly id: string;
  readonly name: string;
  readonly durationMinutes: number;
  readonly priceKes: number;
}

export interface PublicTeamMemberRow {
  readonly id: string;
  readonly name: string;
  readonly role: string | null;
  readonly about: string | null;
  readonly photoUrl: string | null;
}

export interface PublicOpeningHoursRow {
  readonly dayOfWeek: number;
  readonly openTime: string;
  readonly closeTime: string;
}

export interface PublicSalonAggregate extends PublicSalonRow {
  readonly services: PublicServiceRow[];
  readonly teamMembers: PublicTeamMemberRow[];
  readonly openingHours: PublicOpeningHoursRow[];
  readonly portfolioImageUrls: string[];
}

/**
 * The whole public page, or `undefined`.
 *
 * ── ONE STATEMENT, AND NOT FOR PERFORMANCE ──────────────────────────────────
 *
 * Five reads would each see their own snapshot, so a page could be assembled
 * from a salon that was published when the first ran and unpublished by the
 * fifth — emitting services belonging to a salon whose header says nothing.
 * One statement sees one snapshot, and the `published` filter therefore applies
 * to the entire page rather than to the part of it that was read first.
 *
 * The lateral sub-selects build JSON arrays server-side. Each names its columns
 * for the same allowlist reason as the outer select.
 *
 * `undefined` covers "no such handle" AND "not published", conflated
 * deliberately: a public 404 that distinguished them would confirm which
 * unpublished salons exist and let anyone enumerate drafts by name.
 */
export async function findPublishedSalon(
  executor: Executor,
  handle: string,
): Promise<PublicSalonAggregate | undefined> {
  const result = await sql<PublicSalonAggregate>`
    select
      b.handle,
      b.name,
      b.tagline,
      b.about,
      b.category,
      b.banner_url as "bannerUrl",
      b.address,
      b.maps_url as "mapsUrl",
      coalesce(services.rows, '[]'::json) as services,
      coalesce(team.rows, '[]'::json) as "teamMembers",
      coalesce(hours.rows, '[]'::json) as "openingHours",
      coalesce(gallery.urls, '[]'::json) as "portfolioImageUrls"
      from public.businesses b
      left join lateral (
        select json_agg(
                 json_build_object(
                   'id', s.id,
                   'name', s.name,
                   'durationMinutes', s.duration_minutes,
                   'priceKes', s.price_kes
                 ) order by s.position asc, s.created_at asc
               ) as rows
          from public.services s
         where s.business_id = b.id
      ) as services on true
      left join lateral (
        select json_agg(
                 json_build_object(
                   'id', t.id,
                   'name', t.name,
                   'role', t.role,
                   'about', t.about,
                   'photoUrl', t.photo_url
                 ) order by t.position asc, t.created_at asc
               ) as rows
          from public.team_members t
         where t.business_id = b.id
      ) as team on true
      left join lateral (
        select json_agg(
                 json_build_object(
                   'dayOfWeek', h.day_of_week,
                   'openTime', to_char(h.open_time, 'HH24:MI'),
                   'closeTime', to_char(h.close_time, 'HH24:MI')
                 ) order by h.day_of_week asc
               ) as rows
          from public.opening_hours h
         where h.business_id = b.id
      ) as hours on true
      left join lateral (
        select json_agg(p.image_url order by p.position asc, p.created_at asc)
                 as urls
          from public.portfolio_images p
         where p.business_id = b.id
      ) as gallery on true
     where b.handle = ${handle}
       -- ADR-004. Not a convenience filter: without it this endpoint publishes
       -- every draft that has ever been given a handle.
       and b.published = true
  `.execute(executor);

  return result.rows[0];
}
