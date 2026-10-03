import { describe, expect, it } from "vitest";

import {
  hourRowsToWeek,
  hoursLabel,
  initials,
  minutesLabel,
  validateHourRows,
  weekToHourRows,
  weekdayIn,
} from "./display";

describe("initials", () => {
  it.each([
    ["Xenon Xavier", "XX"],
    ["Amani Beauty Studio", "AB"],
    ["njeri", "N"],
    ["amina.said@example.com", "AS"],
    ["owner@example.com", "O"],
    ["  ", "?"],
  ])("%j → %j", (text, expected) => {
    expect(initials(text)).toBe(expected);
  });
});

describe("minutesLabel", () => {
  it("writes minutes the way the service cards do", () => {
    expect(minutesLabel(20)).toBe("20 mins");
    expect(minutesLabel(90)).toBe("90 mins");
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

describe("hoursLabel", () => {
  it("joins ranges with a spaced hyphen, as in design 57", () => {
    expect(hoursLabel([{ opens: "10:00", closes: "24:00" }])).toBe("10:00 - 24:00");
    expect(
      hoursLabel([
        { opens: "09:00", closes: "13:00" },
        { opens: "14:00", closes: "18:00" },
      ]),
    ).toBe("09:00 - 13:00, 14:00 - 18:00");
    expect(hoursLabel([])).toBe("Closed");
  });
});

describe("hour rows", () => {
  const week = {
    1: [{ opens: "09:00", closes: "18:00" }],
    2: [],
    3: [
      { opens: "14:00", closes: "18:00" },
      { opens: "09:00", closes: "13:00" },
    ],
    4: [],
    5: [],
    6: [],
    7: [],
  };

  it("lists one row per range, by day then time", () => {
    expect(weekToHourRows(week)).toEqual([
      { day: 1, opens: "09:00", closes: "18:00" },
      { day: 3, opens: "09:00", closes: "13:00" },
      { day: 3, opens: "14:00", closes: "18:00" },
    ]);
  });

  it("round-trips back to a week, with days without rows closed", () => {
    expect(hourRowsToWeek(weekToHourRows(week))).toEqual({
      1: [{ opens: "09:00", closes: "18:00" }],
      2: [],
      3: [
        { opens: "09:00", closes: "13:00" },
        { opens: "14:00", closes: "18:00" },
      ],
      4: [],
      5: [],
      6: [],
      7: [],
    });
  });

  it("skips fully blank rows", () => {
    expect(validateHourRows([{ day: null, opens: "", closes: "" }])).toEqual({});
    expect(hourRowsToWeek([{ day: null, opens: "", closes: "" }])[1]).toEqual([]);
  });

  it("asks for a day when times are filled in", () => {
    expect(validateHourRows([{ day: null, opens: "09:00", closes: "18:00" }])).toEqual({
      0: "Pick a day.",
    });
  });

  it("puts each day's error on that day's rows", () => {
    expect(
      validateHourRows([
        { day: 1, opens: "09:00", closes: "18:00" },
        { day: 2, opens: "18:00", closes: "09:00" },
        { day: 3, opens: "09:00", closes: "13:00" },
        { day: 3, opens: "12:00", closes: "18:00" },
      ]),
    ).toEqual({
      1: "Closing time must be after opening time.",
      2: "These times overlap.",
      3: "These times overlap.",
    });
  });
});
