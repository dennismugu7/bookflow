import { z } from 'zod';

/**
 * The opening-hours contract (ADR-014, ADR-025).
 *
 * ══ RECURRING WALL-CLOCK, NEVER AN INSTANT ══════════════════════════════════
 *
 * `CLAUDE.md` §5 and ADR-010: a booking's start and end are `timestamptz` in
 * UTC; opening hours are a day-of-week plus a plain local time, and **the two
 * are never interchanged.** So these are `HH:MM` strings, not ISO timestamps,
 * and there is no date and no offset anywhere in this file. A timezone field
 * would be the same mistake wearing a helpful face — Africa/Nairobi is an
 * application constant (ADR-005), not a stored column.
 */

/**
 * `HH:MM`, 24-hour.
 *
 * A regex rather than a looser string: PostgreSQL's `time` will happily parse
 * `4 PM`, `16:00:00.5` and `24:00`, and each of those comes back out formatted
 * differently. Pinning the wire format means what a client sends is what it
 * reads back, and it makes the seconds question moot rather than answered
 * inconsistently.
 *
 * `24:00` is deliberately NOT accepted. A10 — whether a day may run to
 * midnight or past it — is undecided, and `ck_opening_hours_close_after_open`
 * plus two plain times cannot represent a crossing anyway. Accepting `24:00`
 * here would invent an answer at the boundary.
 */
const wallClock = z
  .string()
  .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'must be HH:MM, 24-hour')
  .describe('Local wall-clock time, HH:MM, 24-hour. Africa/Nairobi (ADR-005).');

/**
 * 0 = Monday.
 *
 * Stated on the wire as well as in the column comment, because PostgreSQL's own
 * `extract(dow)` is 0 = Sunday and ISO 8601 is 1 = Monday — every reader
 * arrives with a different prior and one of them is wrong by a day.
 */
const dayOfWeek = z
  .int()
  .min(0)
  .max(6)
  .describe('0 = Monday, 6 = Sunday. NOT PostgreSQL extract(dow).');

export const openingHoursEntrySchema = z
  .object({
    dayOfWeek,
    openTime: wallClock,
    closeTime: wallClock,
  })
  .describe('One day’s opening hours.')
  .meta({ id: 'OpeningHoursEntry' });

export const openingHoursSchema = z
  .array(openingHoursEntrySchema)
  .describe(
    'The week’s opening hours, ascending by day. An absent day is CLOSED (A6) — not a row with equal times.',
  );

/**
 * The whole week, replaced.
 *
 * ══ WHY A PUT OF THE WHOLE WEEK AND NOT PER-DAY CRUD ════════════════════════
 *
 * The screen edits a week and saves a week. Per-day routes would make the
 * client issue up to seven requests to express one intent, with no way to fail
 * as a unit — a half-applied week is a salon that is open at hours nobody
 * chose, and it would be visible on the public page the moment the third
 * request landed.
 *
 * So this is a replace: what arrives IS the week afterwards, and a day that is
 * absent is closed. That also makes "close on Sundays" expressible, which a
 * per-day PATCH surface cannot do without a delete.
 */
export const replaceOpeningHoursRequestSchema = z
  .object({
    days: z
      .array(openingHoursEntrySchema)
      .max(7)
      // ── ONE ROW PER DAY, REFUSED HERE AS WELL AS AT THE INDEX ─────────────
      //
      // `uq_opening_hours_business_day` would catch it, and would surface as a
      // 500 rather than as the 400 this is: two rows for Tuesday is a malformed
      // request, not a conflict with anything the caller could look up.
      .refine(
        (days) =>
          new Set(days.map((day) => day.dayOfWeek)).size === days.length,
        { message: 'each day may appear at most once' },
      )
      // Checked here rather than left to the check constraint for the same
      // reason: it is a property of the submitted value.
      .refine((days) => days.every((day) => day.closeTime > day.openTime), {
        message: 'closeTime must be after openTime',
      }),
  })
  .describe('The week’s opening hours. Replaces whatever is there.')
  .meta({ id: 'ReplaceOpeningHoursRequest' });
