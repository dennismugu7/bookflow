import type { OpeningHours } from '../api/types';

/**
 * Time, in the salon's zone.
 *
 * ══ THE VISITOR'S CLOCK IS NOT THE SALON'S, AND THAT IS THE WHOLE POINT ═════
 *
 * This page is a public link. It gets opened from WhatsApp by someone in
 * Nairobi, and it gets opened by their cousin in London. "Open · until 17:00"
 * must mean the same thing to both — it is a fact about the salon, not about
 * the reader.
 *
 * So every computation here converts to Africa/Nairobi explicitly, and
 * `Date.getHours()` / `getDay()` are never used on a raw local date: both read
 * the DEVICE's zone, and both would be right on a laptop in Kenya and wrong
 * everywhere else. That is the failure mode where testing at home proves
 * nothing.
 *
 * ── A FIXED OFFSET, AND WHEN IT STOPS BEING TRUE ───────────────────────────
 *
 * ADR-005 makes Africa/Nairobi an application constant: v1 is Kenya, there is
 * no per-business timezone in the schema, and **Kenya has never observed
 * daylight saving — UTC+3 has not moved since 1960.** The API says the same in
 * `bookings.schema.ts` and delegates its own conversion to PostgreSQL.
 *
 * `Intl` is used rather than raw arithmetic where a calendar date is needed,
 * because it is correct by construction; the offset constant appears once, for
 * turning a salon-local wall clock back into an instant.
 */

const SALON_ZONE = 'Africa/Nairobi';

/** UTC+3, as an ISO 8601 offset. Never had another value. */
export const SALON_UTC_OFFSET = '+03:00';

/** Minutes past midnight, from `HH:MM`. `-1` for anything unparseable. */
export function minutesOf(wallClock: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(wallClock);
  if (match === null) return -1;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return -1;
  return hours * 60 + minutes;
}

/** `540` → `09:00`. Wraps past midnight rather than producing `25:00`. */
export function wallClockOf(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  return `${String(hours).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/**
 * Where the salon's clock is right now, as a calendar date and a wall time.
 *
 * ── `en-CA` IS THE TRICK, AND IT IS DELIBERATE ─────────────────────────────
 *
 * `Intl.DateTimeFormat('en-CA')` formats dates as `YYYY-MM-DD`, which is the
 * format the availability endpoint takes and the one every comparison here
 * needs. The alternative — `toISOString().slice(0, 10)` — reads UTC, and for
 * the three hours after midnight in Nairobi that is YESTERDAY. A "today" that
 * is a past date makes every slot on it unbookable.
 */
export function salonNow(now: Date = new Date()): {
  readonly date: string;
  readonly minutes: number;
  /** 0 = Monday, matching `OpeningHours.dayOfWeek`. */
  readonly dayOfWeek: number;
} {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  return {
    date,
    minutes: minutesOf(time),
    dayOfWeek: dayOfWeekOf(date),
  };
}

/**
 * `0 = Monday` for a `YYYY-MM-DD` date.
 *
 * **The one conversion between the two week conventions in this app.**
 * `Date.getUTCDay()` is `0 = Sunday`; `OpeningHours.dayOfWeek` is `0 = Monday`.
 * Parsed as UTC midnight so the device's zone cannot shift the day — a date
 * string has no time, and `new Date('2026-08-21')` is already UTC by spec.
 */
export function dayOfWeekOf(isoDate: string): number {
  const sundayFirst = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return (sundayFirst + 6) % 7;
}

/** The row for a day, or `undefined` — absence IS the closed state. */
export function hoursFor(
  hours: readonly OpeningHours[],
  dayOfWeek: number,
): OpeningHours | undefined {
  return hours.find((entry) => entry.dayOfWeek === dayOfWeek);
}

export type OpenState =
  | { readonly open: true; readonly until: string }
  | { readonly open: false; readonly opensAt: string | null };

/**
 * Whether the salon is open right now, and the time that matters.
 *
 * ── CLOSED HAS TWO SHAPES AND THEY READ DIFFERENTLY ────────────────────────
 *
 * "Closed · Opens at 9:00" tells a visitor to come back. Plain "Closed", with
 * `opensAt: null`, is what a salon that has no hours at all gets — and inventing
 * an opening time for it would be a promise nobody made.
 *
 * ── IT LOOKS FORWARD PAST TODAY, WHICH THE OBVIOUS VERSION DOES NOT ────────
 *
 * At 20:00 on a Sunday, "Opens at 9:00" is only true if the salon opens on
 * Monday. So the search walks up to seven days forward and reports the first
 * day with hours — a salon open only on Saturdays says the same thing on
 * Tuesday as it does on Friday, which is right.
 *
 * Before opening on a day the salon DOES open, today's own opening time is the
 * answer — the walk starts at today and the "already past closing" case falls
 * through to tomorrow.
 */
export function openState(
  hours: readonly OpeningHours[],
  now: Date = new Date(),
): OpenState {
  const { minutes, dayOfWeek } = salonNow(now);

  const today = hoursFor(hours, dayOfWeek);
  if (today !== undefined) {
    const opens = minutesOf(today.openTime);
    const closes = minutesOf(today.closeTime);

    if (minutes >= opens && minutes < closes) {
      return { open: true, until: today.closeTime };
    }
    if (minutes < opens) {
      return { open: false, opensAt: today.openTime };
    }
    // Past closing. Falls through to the forward walk, which starts tomorrow.
  }

  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const next = hoursFor(hours, (dayOfWeek + ahead) % 7);
    if (next !== undefined) return { open: false, opensAt: next.openTime };
  }

  // No hours on any day. The salon cannot be published without at least one, so
  // this is unreachable through the API — and it is handled rather than
  // asserted, because a page that throws on odd data shows nothing at all.
  return { open: false, opensAt: null };
}

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** `0` → `Monday`. Falls back rather than throwing on an out-of-range day. */
export function weekdayName(dayOfWeek: number): string {
  return WEEKDAY_NAMES[dayOfWeek] ?? '';
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** `2026-08-24` → `{ weekday: 'Monday', day: 24, month: 'August', ... }`. */
export function describeDate(isoDate: string): {
  readonly weekday: string;
  readonly weekdayShort: string;
  readonly day: number;
  readonly month: string;
  readonly monthShort: string;
  readonly year: number;
} {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  const month = MONTH_NAMES[parsed.getUTCMonth()] ?? '';
  const weekday = weekdayName(dayOfWeekOf(isoDate));

  return {
    weekday,
    weekdayShort: weekday.slice(0, 3),
    day: parsed.getUTCDate(),
    month,
    monthShort: month.slice(0, 3),
    year: parsed.getUTCFullYear(),
  };
}

/** `Monday 24 August` — the review card's spelled-out date. */
export function formatLongDate(isoDate: string): string {
  const { weekday, day, month } = describeDate(isoDate);
  return `${weekday} ${String(day)} ${month}`;
}

/** `2026-08-24` plus `n` days, staying a calendar date. */
export function addDays(isoDate: string, days: number): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/**
 * A salon-local date and wall time, as the instant the API stores.
 *
 * `2026-08-24` + `10:00` → `2026-08-24T10:00:00+03:00`. The offset is written
 * explicitly rather than computed, which is what makes this independent of the
 * device's zone — `new Date(2026, 7, 24, 10)` would mean ten o'clock wherever
 * the reader happens to be.
 */
export function toInstant(isoDate: string, wallClock: string): string {
  return `${isoDate}T${wallClock}:00${SALON_UTC_OFFSET}`;
}

/** `10:00` + 50 minutes → `10:50`. For the review card's start–end range. */
export function addMinutes(wallClock: string, minutes: number): string {
  return wallClockOf(minutesOf(wallClock) + minutes);
}
