import { describe, expect, it } from "vitest";

import { openStatus } from "./open-status";

// weekday: ISO day, 1 = Monday ... 7 = Sunday (same as opening_hours.weekday).
const weekdays = [1, 2, 3].map((weekday) => ({ weekday, opens: "09:00:00", closes: "18:00:00" }));
const split = [
  { weekday: 1, opens: "09:00", closes: "13:00" },
  { weekday: 1, opens: "14:00", closes: "18:00" },
];
const late = [{ weekday: 7, opens: "10:00", closes: "24:00" }];
const tz = "Africa/Nairobi"; // UTC+3, no daylight saving

describe("openStatus", () => {
  it("is open during opening hours", () => {
    // Monday 5 Oct 2026, 10:00 in Nairobi
    expect(openStatus(weekdays, new Date("2026-10-05T07:00:00Z"), tz)).toEqual({ open: true, until: "18:00" });
  });

  it("finds the next opening on a later day", () => {
    // Saturday 3 Oct 2026, 15:00 in Nairobi
    expect(openStatus(weekdays, new Date("2026-10-03T12:00:00Z"), tz)).toEqual({
      open: false,
      next: { weekday: 1, time: "09:00" },
    });
  });

  it("finds a later opening on the same day", () => {
    // Monday 08:30
    expect(openStatus(weekdays, new Date("2026-10-05T05:30:00Z"), tz)).toEqual({
      open: false,
      next: { weekday: 1, time: "09:00" },
    });
  });

  it("is closed at the exact closing time", () => {
    // Monday 18:00
    expect(openStatus(weekdays, new Date("2026-10-05T15:00:00Z"), tz)).toEqual({
      open: false,
      next: { weekday: 2, time: "09:00" },
    });
  });

  it("handles a lunch break", () => {
    expect(openStatus(split, new Date("2026-10-05T07:00:00Z"), tz)).toEqual({ open: true, until: "13:00" });
    // Monday 13:30
    expect(openStatus(split, new Date("2026-10-05T10:30:00Z"), tz)).toEqual({
      open: false,
      next: { weekday: 1, time: "14:00" },
    });
  });

  it("handles closing at midnight", () => {
    // Sunday 4 Oct 2026, 23:00
    expect(openStatus(late, new Date("2026-10-04T20:00:00Z"), tz)).toEqual({ open: true, until: "24:00" });
  });

  it("reports no opening when there are no hours", () => {
    expect(openStatus([], new Date("2026-10-05T07:00:00Z"), tz)).toEqual({ open: false, next: null });
  });
});
