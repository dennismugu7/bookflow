import { describe, expect, it } from "vitest";

import { areaLine, shortArea } from "./area";

describe("shortArea", () => {
  it("ignores blank parts", () => {
    expect(shortArea(" , Kilimani, , Nairobi ,")).toBe("Kilimani, Nairobi");
  });
});

describe("areaLine", () => {
  it("uses the place name when the address is empty", () => {
    expect(areaLine("", "Yaya Centre, Nairobi")).toBe("Yaya Centre, Nairobi");
  });
  it("returns null when both are blank", () => {
    expect(areaLine(" , ", "  ")).toBeNull();
  });
});
