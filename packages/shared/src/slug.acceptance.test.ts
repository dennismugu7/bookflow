import { describe, expect, it } from "vitest";

import { WEB_BASE_URL, bookingLink, toSalonSlug } from "./index";

describe("toSalonSlug", () => {
  it.each([
    ["Salome Salon", "salome-salon"],
    ["Njeri's Beauty & Spa", "njeris-beauty-spa"],
    ["  Glow   Studio!! ", "glow-studio"],
    ["Café Crème", "cafe-creme"],
    ["Kinyozi 254", "kinyozi-254"],
  ])("turns %s into %s", (name, slug) => {
    expect(toSalonSlug(name)).toBe(slug);
  });

  it.each(["", "AB", "!!", "  -  "])("returns null for %j", (name) => {
    expect(toSalonSlug(name)).toBeNull();
  });

  it("keeps long names within 40 characters without a trailing hyphen", () => {
    const slug = toSalonSlug("The Very Long Name Of A Beautiful Salon In Kilimani Nairobi");
    expect(slug).not.toBeNull();
    expect(slug!.length).toBeLessThanOrEqual(40);
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe("bookingLink", () => {
  it("builds the public booking link", () => {
    expect(WEB_BASE_URL).toBe("https://bookflow.mugu-labs.com");
    expect(bookingLink("salome-salon")).toBe("https://bookflow.mugu-labs.com/s/salome-salon");
  });
});
