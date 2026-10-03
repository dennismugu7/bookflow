import { describe, expect, it } from "vitest";

import {
  describeDay,
  diffIds,
  formatDuration,
  isSetupComplete,
  mediaPath,
  normalizeTime,
  parsePriceKes,
  publishErrorMessage,
  resizeFor,
  rowsToWeek,
  serviceSaveError,
  validateBrand,
  validateService,
  validateStaff,
  validateWeek,
  weekToRows,
} from "./setup";

describe("services", () => {
  const valid = { name: "Braids", duration: "60", price: "2,500", isBookable: true };

  it("accepts a valid service", () => {
    expect(validateService(valid)).toEqual({});
  });
  it.each([
    ["", "60", "1000", "name"],
    ["Braids", "0", "1000", "duration"],
    ["Braids", "605", "1000", "duration"],
    ["Braids", "42", "1000", "duration"],
    ["Braids", "abc", "1000", "duration"],
    ["Braids", "60", "12.50", "price"],
    ["Braids", "60", "-5", "price"],
    ["Braids", "60", "", "price"],
  ])("flags %j / %j / %j on %s", (name, duration, price, field) => {
    expect(validateService({ name, duration, price, isBookable: true })).toHaveProperty(field);
  });
  it("reads prices in whole shillings", () => {
    expect(parsePriceKes("2,500")).toBe(2500);
    expect(parsePriceKes("1 200")).toBe(1200);
    expect(parsePriceKes("0")).toBe(0);
    expect(parsePriceKes("1e3")).toBeNull();
  });
  it("maps database errors to fields", () => {
    expect(
      serviceSaveError({
        code: "23514",
        message: 'violates check constraint "services_duration_min_check"',
      }).field,
    ).toBe("duration");
    expect(
      serviceSaveError({
        code: "23514",
        message: 'violates check constraint "services_price_kes_check"',
      }).field,
    ).toBe("price");
    expect(serviceSaveError({ code: "23503" }).message).toMatch(/Bookable by clients/);
    expect(serviceSaveError(null).field).toBe("form");
  });
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(135)).toBe("2h 15m");
  });
});

describe("team", () => {
  it("needs a name and at least one service", () => {
    expect(validateStaff({ name: " ", title: "", about: "", serviceIds: [] })).toEqual({
      name: expect.any(String),
      services: expect.any(String),
    });
    expect(
      validateStaff({ name: "Njeri", title: "Stylist", about: "", serviceIds: ["s1"] }),
    ).toEqual({});
  });
  it("diffs offered services", () => {
    expect(diffIds(["a", "b"], ["b", "c"])).toEqual({ add: ["c"], remove: ["a"] });
    expect(diffIds([], [])).toEqual({ add: [], remove: [] });
  });
});

describe("brand", () => {
  it("validates lengths", () => {
    expect(validateBrand({ name: "Salome Salon", tagline: "", about: "" })).toEqual({});
    expect(validateBrand({ name: "", tagline: "x".repeat(81), about: "x".repeat(601) })).toEqual({
      name: expect.any(String),
      tagline: expect.any(String),
      about: expect.any(String),
    });
  });
});

describe("image sizing", () => {
  it("limits logos and staff photos by their longest edge", () => {
    expect(resizeFor("logo", 2000, 1000)).toEqual({ width: 512 });
    expect(resizeFor("logo", 1000, 3000)).toEqual({ height: 512 });
    expect(resizeFor("staff", 400, 300)).toBeNull();
  });
  it("limits banners by width only", () => {
    expect(resizeFor("banner", 4000, 3000)).toEqual({ width: 1600 });
    expect(resizeFor("banner", 1200, 4000)).toBeNull();
  });
  it("never upscales", () => {
    expect(resizeFor("banner", 1600, 900)).toBeNull();
    expect(resizeFor("logo", 512, 512)).toBeNull();
  });
  it("builds storage paths the policies accept", () => {
    expect(mediaPath("salon-1", "logo", "abc")).toBe("salon-1/logo/abc.jpg");
  });
});

describe("opening hours", () => {
  it.each([
    ["9", "09:00"],
    ["930", "09:30"],
    ["9.30", "09:30"],
    ["09:30", "09:30"],
    ["1800", "18:00"],
    ["24:00", "24:00"],
    [" 7:05 ", "07:05"],
  ])("normalises %j to %j", (input, expected) => {
    expect(normalizeTime(input)).toBe(expected);
  });
  it.each(["", "25", "24:30", "9:60", "nine", "12345"])("rejects %j", (input) => {
    expect(normalizeTime(input)).toBeNull();
  });

  it("accepts split days, a midnight close and closed days", () => {
    expect(
      validateWeek({
        1: [
          { opens: "14:00", closes: "24:00" },
          { opens: "10:00", closes: "13:00" },
        ],
        2: [],
      }),
    ).toEqual({});
  });
  it("flags bad days", () => {
    const errors = validateWeek({
      1: [{ opens: "18:00", closes: "10:00" }],
      2: [
        { opens: "10:00", closes: "14:00" },
        { opens: "13:00", closes: "18:00" },
      ],
      3: [{ opens: "24:00", closes: "24:00" }],
      4: [{ opens: "ten", closes: "18:00" }],
    });
    expect(Object.keys(errors).map(Number)).toEqual([1, 2, 3, 4]);
    expect(errors[2]).toBe("These times overlap.");
  });
  it("round-trips database rows", () => {
    const week = rowsToWeek([
      { weekday: 1, opens: "14:00:00", closes: "24:00:00" },
      { weekday: 1, opens: "10:00:00", closes: "13:00:00" },
    ]);
    expect(week[1]).toEqual([
      { opens: "10:00", closes: "13:00" },
      { opens: "14:00", closes: "24:00" },
    ]);
    expect(week[7]).toEqual([]);
    expect(weekToRows({ ...week, 2: [{ opens: "9", closes: "1730" }] })).toEqual([
      { weekday: 1, opens: "10:00", closes: "13:00" },
      { weekday: 1, opens: "14:00", closes: "24:00" },
      { weekday: 2, opens: "09:00", closes: "17:30" },
    ]);
  });
  it("describes a day", () => {
    expect(describeDay([])).toBe("Closed");
    expect(describeDay([{ opens: "10:00", closes: "18:00" }])).toBe("10:00 – 18:00");
  });
});

describe("publishing", () => {
  it("needs all three ticks", () => {
    expect(isSetupComplete({ services: true, team: true, hours: true })).toBe(true);
    expect(isSetupComplete({ services: true, team: false, hours: true })).toBe(false);
    expect(isSetupComplete(null)).toBe(false);
  });
  it("explains a refused publish", () => {
    expect(publishErrorMessage({ code: "BF422" })).toMatch(/checklist/);
  });
});
