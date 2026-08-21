import { SLOT_MINUTES } from './bookings.schema.ts';

/**
 * The availability predicate — **DO-NOT-VIBE (`CLAUDE.md` §6)**.
 *
 * ══ THIS IS ONE HALF OF A PAIR AND MUST AGREE WITH THE OTHER ════════════════
 *
 * §6 names "the availability predicate and the exclusion constraint" as one
 * item, because they are two expressions of a single rule:
 *
 *   `ex_bookings_no_double_booking` decides what may be WRITTEN.
 *   This decides what is OFFERED.
 *
 * A disagreement is a defect either way, and the two failures are not equally
 * visible:
 *
 *   too permissive  → a slot is offered and the booking 409s. Annoying, loud,
 *                     and self-reporting.
 *   too restrictive → bookable slots quietly vanish. Nobody complains, because
 *                     nobody knows what they did not see.
 *
 * So this file is pure and separately tested, and the scoping — which salon,
 * which team member, which statuses count — lives in the repository query that
 * feeds it, mirroring the constraint's `WHERE` clause by clause.
 *
 * ── HALF-OPEN, LIKE `tstzrange` ────────────────────────────────────────────
 *
 * `&&` on `tstzrange` uses `[start, end)`, so a booking ending at 10:00 and one
 * starting at 10:00 do NOT overlap. `overlaps` below is `a.start < b.end &&
 * b.start < a.end` — the same rule, and the reason back-to-back appointments
 * are offered rather than being treated as a conflict.
 *
 * ── EVERYTHING HERE IS MINUTES-SINCE-MIDNIGHT, LOCAL ───────────────────────
 *
 * No `Date`, anywhere. `Date` carries the server's timezone, and a slot grid
 * computed in a container set to UTC would be three hours out from one set to
 * Africa/Nairobi. The repository converts instants to local wall-clock in
 * PostgreSQL (`at time zone`) and hands strings in; this arithmetic is on plain
 * integers and cannot be wrong about a zone it never sees.
 */

export interface Window {
  readonly openMinutes: number;
  readonly closeMinutes: number;
}

export interface Busy {
  readonly startMinutes: number;
  readonly endMinutes: number;
}

/** `09:30` → 570. */
export function minutesOf(wallClock: string): number {
  const [hours, minutes] = wallClock.split(':');
  return Number(hours ?? 0) * 60 + Number(minutes ?? 0);
}

/** 570 → `09:30`. */
export function wallClockOf(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function overlaps(a: Busy, b: Busy): boolean {
  // Half-open on both sides, matching `tstzrange`'s default. Touching is not
  // overlapping.
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

/**
 * The start times that can be booked.
 *
 * @param windows      the day's opening hours, local minutes
 * @param busy         occupied intervals, local minutes, already filtered to
 *                     this salon, this team member and non-cancelled bookings
 * @param durationMinutes the service's length
 * @param notBeforeMinutes  the earliest offerable start, for today; `undefined`
 *                     for a future date, where every slot is still ahead
 */
export function availableSlots(input: {
  readonly windows: readonly Window[];
  readonly busy: readonly Busy[];
  readonly durationMinutes: number;
  readonly notBeforeMinutes: number | undefined;
}): string[] {
  const slots: string[] = [];

  for (const window of input.windows) {
    // The grid is anchored to the OPENING TIME, not to the hour. A salon that
    // opens at 09:15 offers 09:15 and 09:45 rather than 09:30 and 10:00 —
    // otherwise the first quarter-hour of every such day is unbookable and
    // nobody would be able to say why.
    for (
      let start = window.openMinutes;
      // The service must FIT before closing. `+ duration <= close` rather than
      // `start < close`: offering a 09:45 slot for an hour-long service at a
      // salon closing at 10:00 books staff past the end of the day.
      start + input.durationMinutes <= window.closeMinutes;
      start += SLOT_MINUTES
    ) {
      if (
        input.notBeforeMinutes !== undefined &&
        start < input.notBeforeMinutes
      ) {
        continue;
      }

      const candidate: Busy = {
        startMinutes: start,
        endMinutes: start + input.durationMinutes,
      };

      if (input.busy.some((taken) => overlaps(candidate, taken))) continue;

      slots.push(wallClockOf(start));
    }
  }

  // Two opening windows on one day (a lunch break) can produce the same start
  // twice only if they overlap, which the schema does not prevent. Deduplicated
  // and sorted so the client renders a sane list either way.
  return [...new Set(slots)].sort();
}
