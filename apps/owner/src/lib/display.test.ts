import { describe, expect, it } from "vitest";

import {
  addBreak,
  applyDayDraft,
  avatarTint,
  dayDraft,
  dayDraftError,
  minutesLabel,
  weekdayIn,
} from "./display";
import type { Week } from "./setup";

describe("minutesLabel", () => {
  it("writes minutes the way the service cards do (owner-v2 02)", () => {
    expect(minutesLabel(30)).toBe("30 min");
    expect(minutesLabel(180)).toBe("180 min");
    expect(minutesLabel(1)).toBe("1 min");
  });
});

describe("weekdayIn", () => {
  it("uses the salon's zone, Monday = 1", () => {
    // Sunday 23:30 UTC is already Monday in Nairobi (UTC+3).
    const date = new Date("2026-10-04T23:30:00Z");
    expect(weekdayIn("UTC", date)).toBe(7);
    expect(weekdayIn("Africa/Nairobi", date)).toBe(1);
  });
});

describe("avatarTint", () => {
  it("gives the same name the same colour", () => {
    expect(avatarTint("Njeri Kamau")).toBe(avatarTint("Njeri Kamau"));
    expect(avatarTint("Njeri Kamau")).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("spreads names over the palette", () => {
    const tints = new Set(
      ["Njeri Kamau", "Achieng Ouma", "Wanjiru Mwangi", "Amina Said", "Grace Ochieng"].map(
        avatarTint,
      ),
    );
    expect(tints.size).toBeGreaterThan(1);
  });
});

describe("day editor", () => {
  const week: Week = {
    1: [{ opens: "09:00", closes: "18:00" }],
    2: [],
    3: [],
    4: [
      { opens: "09:00", closes: "13:00" },
      { opens: "14:00", closes: "18:00" },
    ],
    5: [],
    6: [],
    7: [],
  };

  it("opens an open day with its ranges", () => {
    expect(dayDraft(week[4]!)).toEqual({ closed: false, ranges: week[4] });
  });

  it("opens a closed day switched to Closed, with a usable range ready", () => {
    expect(dayDraft([])).toEqual({ closed: true, ranges: [{ opens: "09:00", closes: "18:00" }] });
  });

  it("replaces only that day in the week", () => {
    const next = applyDayDraft(week, 2, {
      closed: false,
      ranges: [{ opens: "10:00", closes: "16:00" }],
    });
    expect(next[2]).toEqual([{ opens: "10:00", closes: "16:00" }]);
    expect(next[1]).toEqual(week[1]);
    expect(next[4]).toEqual(week[4]);
    expect(week[2]).toEqual([]);
  });

  it("drops the ranges when the day is closed", () => {
    expect(applyDayDraft(week, 1, { closed: true, ranges: week[1]! })[1]).toEqual([]);
  });

  it("adds a break as a new empty range", () => {
    expect(addBreak([{ opens: "09:00", closes: "13:00" }])).toEqual([
      { opens: "09:00", closes: "13:00" },
      { opens: "", closes: "" },
    ]);
  });

  it("rejects overlaps and bad times with a friendly message", () => {
    expect(
      dayDraftError(week, 1, {
        closed: false,
        ranges: [
          { opens: "09:00", closes: "13:00" },
          { opens: "12:00", closes: "18:00" },
        ],
      }),
    ).toBe("These times overlap.");
    expect(
      dayDraftError(week, 1, { closed: false, ranges: [{ opens: "18:00", closes: "09:00" }] }),
    ).toBe("Closing time must be after opening time.");
    expect(
      dayDraftError(week, 1, {
        closed: false,
        ranges: [
          { opens: "09:00", closes: "13:00" },
          { opens: "", closes: "" },
        ],
      }),
    ).toBe("Use times like 09:00 or 18:30.");
  });

  it("accepts a valid day, and any closed day", () => {
    expect(dayDraftError(week, 1, dayDraft(week[4]!))).toBeUndefined();
    expect(
      dayDraftError(week, 1, { closed: true, ranges: [{ opens: "x", closes: "y" }] }),
    ).toBeUndefined();
  });
});
