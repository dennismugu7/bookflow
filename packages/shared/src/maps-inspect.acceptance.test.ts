import { describe, expect, it, vi } from "vitest";

import { inspectMapsLink, mapsEmbedUrl } from "./index";

const fetchTo = (finalUrl: string) =>
  vi.fn(async () => ({ ok: true, url: finalUrl }) as unknown as Response);

// Real redirect target of a link shared from the Google Maps app (captured 2026-10-03).
const APP_LINK_TARGET =
  "https://www.google.com/maps/place/Galito's+Lusaka+Road,+Lusaka+Road,+Oil+Libya,+Nairobi/data=!4m2!3m1!1s0x182f1110b46e6545:0xc63a20f498443fb2!18m1!1e1?coh=192189&entry=gps";

describe("inspectMapsLink", () => {
  it("reads the place name from a Google Maps app link that has no coordinates", async () => {
    const f = fetchTo(APP_LINK_TARGET);
    await expect(inspectMapsLink("  https://maps.app.goo.gl/ySvketsuMA7dAbvQ7 ", f)).resolves.toEqual({
      mapsUrl: "https://maps.app.goo.gl/ySvketsuMA7dAbvQ7",
      placeName: "Galito's Lusaka Road, Lusaka Road, Oil Libya, Nairobi",
      pin: null,
    });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("reads place and pin from a long link without fetching", async () => {
    const f = fetchTo("https://example.com");
    await expect(
      inspectMapsLink("https://www.google.com/maps/place/Galana+Plaza/@-1.29,36.784,17z", f),
    ).resolves.toEqual({
      mapsUrl: "https://www.google.com/maps/place/Galana+Plaza/@-1.29,36.784,17z",
      placeName: "Galana Plaza",
      pin: { lat: -1.29, lng: 36.784 },
    });
    expect(f).not.toHaveBeenCalled();
  });

  it("returns null for links that are not Google Maps, without fetching", async () => {
    const f = fetchTo(APP_LINK_TARGET);
    await expect(inspectMapsLink("https://example.com/place", f)).resolves.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("returns null when a short link cannot be checked", async () => {
    const f = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(inspectMapsLink("https://maps.app.goo.gl/abc", f as unknown as typeof fetch)).resolves.toBeNull();
  });
});

describe("mapsEmbedUrl", () => {
  it("builds a keyless Google Maps embed URL", () => {
    expect(mapsEmbedUrl("Galana Plaza, Kilimani")).toBe(
      "https://maps.google.com/maps?q=Galana%20Plaza%2C%20Kilimani&output=embed",
    );
  });
});
