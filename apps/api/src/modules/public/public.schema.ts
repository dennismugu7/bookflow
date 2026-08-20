import { z } from 'zod';

/**
 * The public booking page's contract — **the allowlist projection** that
 * `CLAUDE.md` §5 requires and `DEFINITION_OF_DONE.md` calls `business_public`.
 *
 * ══ ALLOWLIST, NEVER A DENYLIST ═════════════════════════════════════════════
 *
 * §5: *"Public unauthenticated reads come only from the `business_public`
 * allowlist projection. Public endpoints never read owner-scoped tables.
 * Allowlist, never denylist."*
 *
 * A denylist — select the row, delete the fields that must not go out — fails
 * OPEN. Every column added to `businesses` afterwards is published by default
 * until somebody remembers to exclude it, and nothing reports the omission.
 * This schema names each field it emits, so a new column is invisible here
 * until someone adds a line, and the repository selects exactly these columns
 * rather than `select *` filtered afterwards.
 *
 * ── WHAT IS DELIBERATELY ABSENT, AND WHY ────────────────────────────────────
 *
 * - **The business id.** The public page is addressed by handle. Publishing an
 *   internal id invites a client to build a URL out of it, and every
 *   owner-scoped route is keyed on exactly that value.
 * - **The owner.** No email, no name, no user id. `user_profiles` is not read
 *   by this module at all, and no join reaches it.
 * - **Timestamps.** `created_at` on a salon tells a competitor how new it is
 *   and tells nobody anything they need to book a haircut.
 * - **`published`.** Anything reachable here is published by construction; a
 *   field saying so is a field that can disagree with the filter that produced
 *   the row.
 *
 * ── WHAT IS PRESENT AND MIGHT LOOK LIKE A MISTAKE ───────────────────────────
 *
 * **Service ids and team-member ids.** They are here on purpose: booking will
 * reference them, and ADR-006 requires every booking to name a concrete team
 * member — "any professional" resolves at booking time and is never stored as
 * null. A booking flow that could not name what was booked would have to invent
 * an identifier, and the obvious inventions are the name and the position, both
 * of which change.
 */

export const publicServiceSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    durationMinutes: z.int(),
    priceKes: z.int().describe('Whole Kenyan shillings.'),
  })
  .describe('A bookable service, as a client sees it.')
  .meta({ id: 'PublicService' });

export const publicTeamMemberSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    role: z.string().nullable(),
    about: z.string().nullable(),
    photoUrl: z.string().nullable(),
  })
  .describe('Someone a client can book with.')
  .meta({ id: 'PublicTeamMember' });

export const publicOpeningHoursSchema = z
  .object({
    dayOfWeek: z.int().describe('0 = Monday.'),
    openTime: z.string().describe('HH:MM, Africa/Nairobi.'),
    closeTime: z.string().describe('HH:MM, Africa/Nairobi.'),
  })
  .describe('One day’s opening hours. An absent day is closed.')
  .meta({ id: 'PublicOpeningHours' });

export const publicSalonSchema = z
  .object({
    handle: z.string(),
    name: z.string(),
    tagline: z.string().nullable(),
    about: z.string().nullable(),
    category: z.string().nullable(),
    bannerUrl: z.string().nullable(),
    address: z.string().nullable(),
    mapsUrl: z.string().nullable(),
    services: z.array(publicServiceSchema),
    teamMembers: z.array(publicTeamMemberSchema),
    openingHours: z.array(publicOpeningHoursSchema),
    portfolioImageUrls: z.array(z.string()),
  })
  .describe('A published salon’s public booking page.')
  .meta({ id: 'PublicSalon' });
