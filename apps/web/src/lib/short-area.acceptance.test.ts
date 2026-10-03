import { describe, expect, it } from "vitest";

import { shortArea } from "./short-area";

describe("shortArea", () => {
  it("keeps the last two parts of an address", () => {
    expect(shortArea("2nd floor, Galana Plaza, Kilimani, Nairobi")).toBe("Kilimani, Nairobi");
    expect(shortArea(" Galana Plaza ,  Kilimani , Nairobi ")).toBe("Kilimani, Nairobi");
  });

  it("keeps short addresses as they are", () => {
    expect(shortArea("Kilimani, Nairobi")).toBe("Kilimani, Nairobi");
    expect(shortArea("Westlands")).toBe("Westlands");
  });

  it("returns null when there is no address", () => {
    expect(shortArea(null)).toBeNull();
    expect(shortArea("")).toBeNull();
    expect(shortArea("  ,  ")).toBeNull();
  });
});
