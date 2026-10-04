import { describe, expect, it } from "vitest";

import { areaLine } from "./index";

describe("areaLine", () => {
  it("prefers the address", () => {
    expect(areaLine("2nd floor, Galana Plaza, Kilimani, Nairobi", "Somewhere Else, Mombasa")).toBe("Kilimani, Nairobi");
  });
  it("falls back to the place name from the Maps link", () => {
    expect(areaLine(null, "Galito's Lusaka Road, Lusaka Road, Oil Libya, Nairobi")).toBe("Oil Libya, Nairobi");
    expect(areaLine("  ", "Westlands")).toBe("Westlands");
  });
  it("returns null when there is nothing to show", () => {
    expect(areaLine(null, null)).toBeNull();
  });
});
