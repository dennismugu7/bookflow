import { describe, expect, it } from "vitest";

import {
  addDays,
  ceilToMinutes,
  clockTime,
  isoWeekday,
  shortDate,
  zonedParts,
  zonedTime,
} from "./time";

const TZ = "Africa/Nairobi";

describe("salon time", () => {
  it("shows the salon's wall clock, 24-hour", () => {
    expect(clockTime("2026-10-03T06:05:00Z", TZ)).toBe("09:05");
    expect(clockTime("2026-10-03T21:30:00Z", TZ)).toBe("00:30");
    expect(shortDate("2026-10-03T07:30:00Z", TZ)).toBe("Sat 3 Oct");
    expect(zonedParts(new Date("2026-10-03T21:30:00Z"), TZ)).toEqual({
      date: "2026-10-04",
      time: "00:30",
    });
  });

  it("turns a salon date and time into an instant, also across DST", () => {
    expect(zonedTime("2026-10-03", "12:00", TZ).toISOString()).toBe("2026-10-03T09:00:00.000Z");
    expect(zonedTime("2026-03-29", "12:00", "Europe/London").toISOString()).toBe(
      "2026-03-29T11:00:00.000Z",
    );
  });

  it("rounds up to quarter hours and counts days", () => {
    expect(ceilToMinutes(new Date("2026-10-03T07:01:00Z"), 15).toISOString()).toBe(
      "2026-10-03T07:15:00.000Z",
    );
    expect(ceilToMinutes(new Date("2026-10-03T07:15:00Z"), 15).toISOString()).toBe(
      "2026-10-03T07:15:00.000Z",
    );
    expect(isoWeekday("2026-10-03")).toBe(6);
    expect(isoWeekday("2026-10-04")).toBe(7);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});
