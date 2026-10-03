import { describe, expect, it, vi } from "vitest";

import { inspectMapsLink, isGoogleMapsUrl } from "./maps";

const fetchTo = (finalUrl: string) =>
  vi.fn(async () => ({ ok: true, url: finalUrl }) as unknown as Response);

describe("isGoogleMapsUrl", () => {
  it.each([
    "https://maps.app.goo.gl/ySvketsuMA7dAbvQ7",
    "https://goo.gl/maps/abc",
    "https://www.google.com/maps/place/X",
    "https://google.co.ke/maps/@-1.29,36.78,17z",
    "https://maps.google.com/?q=-1.29,36.78",
    "  https://www.google.com/maps  ",
  ])("accepts %j", (url) => {
    expect(isGoogleMapsUrl(url)).toBe(true);
  });

  it.each([
    "http://maps.app.goo.gl/abc",
    "https://maps.app.goo.gl.evil.example/abc",
    "https://goo.gl/abc",
    "https://www.google.com/search?q=salon",
    "https://www.google.com.evil.example/maps",
    "https://example.com/maps/abc",
    "Kilimani, Nairobi",
  ])("rejects %j", (url) => {
    expect(isGoogleMapsUrl(url)).toBe(false);
  });
});

describe("inspectMapsLink (extra cases)", () => {
  it("percent-decodes the place name", async () => {
    await expect(
      inspectMapsLink(
        "https://www.google.com/maps/place/Caf%C3%A9+Cr%C3%A8me,+Westlands/data=!4m2",
        fetchTo(""),
      ),
    ).resolves.toMatchObject({ placeName: "Café Crème, Westlands", pin: null });
  });

  it("reads the place through a consent page", async () => {
    const target = "https://www.google.com/maps/place/Galana+Plaza/data=!3d-1.2901!4d36.7842";
    const f = fetchTo(`https://consent.google.com/ml?continue=${encodeURIComponent(target)}&gl=KE`);
    await expect(inspectMapsLink("https://maps.app.goo.gl/abc", f)).resolves.toEqual({
      mapsUrl: "https://maps.app.goo.gl/abc",
      placeName: "Galana Plaza",
      pin: { lat: -1.2901, lng: 36.7842 },
    });
  });

  it("accepts a Google Maps link with neither a place nor a pin", async () => {
    await expect(inspectMapsLink("https://www.google.com/maps", fetchTo(""))).resolves.toEqual({
      mapsUrl: "https://www.google.com/maps",
      placeName: null,
      pin: null,
    });
  });

  it("treats a short link that lands nowhere as uncheckable", async () => {
    await expect(inspectMapsLink("https://maps.app.goo.gl/abc", fetchTo(""))).resolves.toBeNull();
  });
});
