import { describe, expect, it } from "vitest";

import { formatKes } from "./money";

describe("formatKes", () => {
  it.each([
    [0, "KES 0"],
    [400, "KES 400"],
    [1200, "KES 1,200"],
    [1000000, "KES 1,000,000"],
  ])("formats %d as %s", (amount, expected) => {
    expect(formatKes(amount)).toBe(expected);
  });

  it("rejects negative amounts", () => {
    expect(() => formatKes(-1)).toThrow(RangeError);
  });

  it.each([1.5, 0.1, Number.NaN, Number.POSITIVE_INFINITY])("rejects non-integer %s", (amount) => {
    expect(() => formatKes(amount)).toThrow(RangeError);
  });
});
