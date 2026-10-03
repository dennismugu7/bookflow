import { describe, expect, it } from "vitest";

import { mediaUrl, parseGoogleMapsLink } from "./maps";

describe("parseGoogleMapsLink (extra cases)", () => {
  it("reads an encoded comma", () => {
    expect(
      parseGoogleMapsLink("https://www.google.com/maps/search/?api=1&query=-1.30%2C36.80"),
    ).toEqual({
      lat: -1.3,
      lng: 36.8,
    });
  });

  it("prefers the @ pin of a place link over later parameters", () => {
    expect(
      parseGoogleMapsLink("https://www.google.com/maps/place/X/@-1.29,36.78,17z/data=!3m1?q=1,2"),
    ).toEqual({
      lat: -1.29,
      lng: 36.78,
    });
  });

  it.each([
    "https://maps.google.com/?q=Kilimani+Nairobi",
    "https://maps.google.com/?q=-1.29,200",
    "https://maps.google.com/?q=-1.29,36.78abc",
    "https://maps.google.com/?xq=-1.29,36.78",
  ])("returns null for %j", (url) => {
    expect(parseGoogleMapsLink(url)).toBeNull();
  });
});

describe("mediaUrl (extra cases)", () => {
  it("ignores a trailing slash on the project URL", () => {
    expect(mediaUrl("https://abc.supabase.co/", "s/logo/x.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/salon-media/s/logo/x.jpg",
    );
  });
});
