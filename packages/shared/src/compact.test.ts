import { describe, expect, it } from "vitest";

import { compactKes, formatMinutes } from "./compact";

describe("compactKes, edges", () => {
  it("switches to k at 1,000 and to M before 1000k", () => {
    expect(compactKes(0)).toBe("0");
    expect(compactKes(999)).toBe("999");
    expect(compactKes(1000)).toBe("1k");
    expect(compactKes(1050)).toBe("1.1k");
    expect(compactKes(999_949)).toBe("999.9k");
    expect(compactKes(999_950)).toBe("1M");
    expect(compactKes(2_000_000)).toBe("2M");
  });

  it("rejects fractions and negatives", () => {
    expect(() => compactKes(1.5)).toThrow(RangeError);
    expect(() => compactKes(-1)).toThrow(RangeError);
  });
});

describe("formatMinutes, edges", () => {
  it("handles long days and rejects bad input", () => {
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(90)).toBe("1h 30m");
    expect(formatMinutes(600)).toBe("10h");
    expect(() => formatMinutes(-5)).toThrow(RangeError);
  });
});
