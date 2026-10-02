import { describe, expect, it } from "vitest";

import { normalizeKenyanPhone } from "./phone";

describe("normalizeKenyanPhone", () => {
  it.each([
    ["0700 000 021", "+254700000021"],
    ["0110-000-021", "+254110000021"],
    ["254700000021", "+254700000021"],
    ["+254700000021", "+254700000021"],
    ["(0700) 000021", "+254700000021"],
  ])("normalises %s to %s", (input, expected) => {
    expect(normalizeKenyanPhone(input)).toBe(expected);
  });

  it.each(["12345", "", "07000", "phone", "+0700000021"])("rejects %s", (input) => {
    expect(normalizeKenyanPhone(input)).toBeNull();
  });
});
