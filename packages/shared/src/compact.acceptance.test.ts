import { describe, expect, it } from "vitest";

import { compactKes, formatMinutes } from "./index";

describe("compactKes", () => {
  it("keeps small amounts whole and shortens thousands", () => {
    expect(compactKes(800)).toBe("800");
    expect(compactKes(9300)).toBe("9.3k");
    expect(compactKes(23000)).toBe("23k");
    expect(compactKes(1250000)).toBe("1.3M");
  });
});

describe("formatMinutes", () => {
  it("formats durations the way the Today screen shows them", () => {
    expect(formatMinutes(30)).toBe("30m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(150)).toBe("2h 30m");
    expect(formatMinutes(0)).toBe("0m");
  });
});
