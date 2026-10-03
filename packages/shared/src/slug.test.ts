import { describe, expect, it } from "vitest";

import { toSalonSlug } from "./slug";

const DB_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("toSalonSlug (extra cases)", () => {
  it("drops curly apostrophes too", () => {
    expect(toSalonSlug("Wanjiru’s Place")).toBe("wanjirus-place");
  });

  it("does not leave a trailing hyphen when the cut lands on a separator", () => {
    // 39 letters, a space, then more: the cut at 40 lands on the hyphen.
    const slug = toSalonSlug(`${"a".repeat(39)} salon`);
    expect(slug).toBe("a".repeat(39));
  });

  it("drops characters it cannot transliterate", () => {
    expect(toSalonSlug("美容 Studio")).toBe("studio");
  });

  it.each([
    "Salome Salon",
    "--Glow--",
    "Ünïcödé Nails 2",
    "a b c d e f g h i j k l m n o p q r s t u v",
  ])("always matches the database rule for %j", (name) => {
    const slug = toSalonSlug(name);
    if (slug !== null) {
      expect(slug).toMatch(DB_SLUG);
      expect(slug.length).toBeGreaterThanOrEqual(3);
      expect(slug.length).toBeLessThanOrEqual(40);
    }
  });
});
