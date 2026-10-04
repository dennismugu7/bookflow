import { describe, expect, it } from "vitest";

import { initialsFor } from "./index";

describe("initialsFor", () => {
  it("uses the first letter of an email", () => {
    expect(initialsFor("dennis@example.com")).toBe("D");
  });
  it("uses up to two initials of a name", () => {
    expect(initialsFor("Salome Wanjiku")).toBe("SW");
    expect(initialsFor("  njeri  ")).toBe("N");
    expect(initialsFor("Mary Achieng Otieno")).toBe("MA");
  });
  it("falls back to a question mark", () => {
    expect(initialsFor("")).toBe("?");
    expect(initialsFor(null)).toBe("?");
  });
});
