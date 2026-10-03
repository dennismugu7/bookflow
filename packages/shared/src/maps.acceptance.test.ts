import { describe, expect, it } from "vitest";

import { mediaUrl, parseGoogleMapsLink } from "./index";

describe("parseGoogleMapsLink", () => {
  it.each([
    ["https://www.google.com/maps/place/Kilimani/@-1.2921,36.7819,15z", { lat: -1.2921, lng: 36.7819 }],
    ["https://maps.google.com/?q=-1.2921,36.7819", { lat: -1.2921, lng: 36.7819 }],
    ["https://www.google.com/maps/search/?api=1&query=-1.30,36.80", { lat: -1.3, lng: 36.8 }],
    ["https://maps.google.com/maps?ll=-1.2921,36.7819&z=16", { lat: -1.2921, lng: 36.7819 }],
  ])("reads the pin from %s", (url, expected) => {
    expect(parseGoogleMapsLink(url)).toEqual(expected);
  });

  it.each([
    "https://maps.app.goo.gl/abc123",
    "Kilimani, Nairobi",
    "https://www.google.com/maps/@-95.0,36.0,15z",
    "",
  ])("returns null for %j", (url) => {
    expect(parseGoogleMapsLink(url)).toBeNull();
  });
});

describe("mediaUrl", () => {
  it("builds a public media URL", () => {
    expect(mediaUrl("https://abc.supabase.co", "salon-1/logo/x.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/salon-media/salon-1/logo/x.jpg",
    );
  });
});
