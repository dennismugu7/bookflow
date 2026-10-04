import { describe, expect, it } from "vitest";

import { formatKenyanPhone, normalizeKenyanPhone } from "./phone";

describe("normalizeKenyanPhone (extra cases)", () => {
  it("keeps a valid international number", () => {
    expect(normalizeKenyanPhone("+44 20 7946 0000")).toBe("+442079460000");
  });

  it("strips tabs and mixed separators", () => {
    expect(normalizeKenyanPhone("\t0700-000 (021) ")).toBe("+254700000021");
  });

  it.each(["0700 000 0211", "25470000002", "+254 700 000 021 0000", "0700.000.021", "+"])(
    "rejects %s",
    (input) => {
      expect(normalizeKenyanPhone(input)).toBeNull();
    },
  );
});

describe("formatKenyanPhone", () => {
  it("shows a Kenyan number in local format", () => {
    expect(formatKenyanPhone("+254700000041")).toBe("0700 000 041");
  });
  it("leaves other numbers alone", () => {
    expect(formatKenyanPhone("+442079460000")).toBe("+442079460000");
  });
});
