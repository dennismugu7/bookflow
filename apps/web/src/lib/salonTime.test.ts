import { describe, expect, it } from 'vitest';

import type { OpeningHours } from '../api/types';
import {
  addDays,
  addMinutes,
  dayOfWeekOf,
  formatLongDate,
  minutesOf,
  openState,
  salonNow,
  toInstant,
} from './salonTime';

/**
 * The salon's clock.
 *
 * ══ EVERY INSTANT HERE IS WRITTEN IN UTC, ON PURPOSE ════════════════════════
 *
 * A test that built a local `Date` would pass on a machine set to Nairobi and
 * fail everywhere else — which is the exact bug this module exists to prevent,
 * reproduced in the thing meant to catch it. `Date.UTC` has one meaning
 * everywhere.
 *
 * Africa/Nairobi is UTC+3 and has never observed daylight saving, so
 * `07:00Z` is `10:00` in the salon on every date in these tests.
 */

/** Monday 09:00–17:00, Tuesday 09:00–17:00. Closed the rest of the week. */
const MON_AND_TUE: readonly OpeningHours[] = [
  { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00' },
  { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00' },
];

/** 2026-08-24 is a Monday. Every date below is anchored to that week. */
const MONDAY = '2026-08-24';

describe('the week convention is 0 = Monday, not JavaScript’s 0 = Sunday', () => {
  it('maps a known Monday to 0 and the Sunday after it to 6', () => {
    // The single most likely thing to get wrong in this file. `getUTCDay()`
    // returns 1 for a Monday and 0 for a Sunday; `OpeningHours.dayOfWeek` is
    // the other convention, and a salon whose hours were off by a day would
    // show "Closed" on a day it is open.
    expect(dayOfWeekOf(MONDAY)).toBe(0);
    expect(dayOfWeekOf('2026-08-30')).toBe(6);
  });
});

describe('the salon’s clock is not the reader’s', () => {
  it('reads the date in Nairobi, not in UTC', () => {
    // ── THE THREE-HOUR WINDOW THAT BREAKS THE OBVIOUS VERSION ─────────────
    //
    // 22:30Z on Sunday the 23rd is 01:30 on MONDAY the 24th in Nairobi.
    // `toISOString().slice(0, 10)` would answer 2026-08-23 — a past date, on
    // which every slot is refused.
    const lateSundayUtc = new Date(Date.UTC(2026, 7, 23, 22, 30));

    expect(salonNow(lateSundayUtc).date).toBe(MONDAY);
    expect(salonNow(lateSundayUtc).dayOfWeek).toBe(0);
    expect(salonNow(lateSundayUtc).minutes).toBe(90);
  });
});

describe('open or closed, and the time that matters', () => {
  it('is open during hours, and names the closing time', () => {
    // Monday 12:00 Nairobi.
    const state = openState(MON_AND_TUE, new Date(Date.UTC(2026, 7, 24, 9)));
    expect(state).toEqual({ open: true, until: '17:00' });
  });

  it('is closed before opening, and names today’s opening time', () => {
    // Monday 07:00 Nairobi — before 09:00.
    const state = openState(MON_AND_TUE, new Date(Date.UTC(2026, 7, 24, 4)));
    expect(state).toEqual({ open: false, opensAt: '09:00' });
  });

  it('is closed at exactly the closing minute', () => {
    // 17:00 sharp. The salon shuts AT 17:00, so 17:00 is closed — the same
    // half-open convention the availability predicate and the exclusion
    // constraint use for a booking's end.
    const state = openState(MON_AND_TUE, new Date(Date.UTC(2026, 7, 24, 14)));
    expect(state).toEqual({ open: false, opensAt: '09:00' });
  });

  it('looks past today after closing, rather than repeating today’s time', () => {
    // ── THE CASE THE OBVIOUS VERSION GETS WRONG ───────────────────────────
    //
    // Tuesday 20:00, after closing. The next opening is not tomorrow —
    // Wednesday is closed — it is the Monday after. A version that only looked
    // at today or tomorrow would say "Opens at 09:00" on a salon that will not
    // open for six days, or would fall through to a bare "Closed" and lose the
    // information entirely.
    const state = openState(MON_AND_TUE, new Date(Date.UTC(2026, 7, 25, 17)));
    expect(state).toEqual({ open: false, opensAt: '09:00' });
  });

  it('says only “Closed” when the salon has no hours at all', () => {
    // Unreachable through the API — publishing requires an open day — and
    // handled anyway, because a page that throws on odd data shows nothing.
    const state = openState([], new Date(Date.UTC(2026, 7, 24, 9)));
    expect(state).toEqual({ open: false, opensAt: null });
  });
});

describe('the arithmetic the booking flow does', () => {
  it('turns a salon-local date and time into an instant with an explicit offset', () => {
    // The offset is written rather than computed, which is what makes the
    // booking land at ten o'clock in the SALON regardless of who booked it.
    expect(toInstant(MONDAY, '10:00')).toBe('2026-08-24T10:00:00+03:00');
  });

  it('computes an end time from a start and a duration', () => {
    expect(addMinutes('16:00', 10)).toBe('16:10');
    expect(addMinutes('09:30', 90)).toBe('11:00');
    // Past midnight wraps rather than producing `25:00`, which is not a time.
    expect(addMinutes('23:30', 60)).toBe('00:30');
  });

  it('steps calendar dates across a month boundary', () => {
    // The date strip is today plus thirteen days, so it crosses a month
    // roughly half the time.
    expect(addDays('2026-08-30', 3)).toBe('2026-09-02');
    expect(addDays(MONDAY, 0)).toBe(MONDAY);
  });

  it('spells a date out the way the review card shows it', () => {
    expect(formatLongDate(MONDAY)).toBe('Monday 24 August');
  });

  it('rejects a malformed wall clock rather than guessing', () => {
    expect(minutesOf('09:30')).toBe(570);
    expect(minutesOf('nonsense')).toBe(-1);
    expect(minutesOf('25:00')).toBe(-1);
  });
});
