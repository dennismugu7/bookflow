import { describe, expect, it, vi } from "vitest";

import { parseGoogleMapsLink, resolveMapsLink } from "./index";

const fetchTo = (finalUrl: string) =>
  vi.fn(async () => ({ ok: true, url: finalUrl }) as unknown as Response);

describe("parseGoogleMapsLink exact pin", () => {
  it("prefers the exact pin over the map centre", () => {
    expect(
      parseGoogleMapsLink(
        "https://www.google.com/maps/place/Galana+Plaza/@-1.2950,36.7800,17z/data=!3m1!4b1!4m6!3m5!8m2!3d-1.2901!4d36.7842",
      ),
    ).toEqual({ lat: -1.2901, lng: 36.7842 });
  });
});

describe("resolveMapsLink", () => {
  it("follows a short link from the Google Maps app", async () => {
    const f = fetchTo("https://www.google.com/maps/place/Galana+Plaza/@-1.29,36.784,17z");
    await expect(resolveMapsLink("https://maps.app.goo.gl/NNv9X548zyY", f)).resolves.toEqual({ lat: -1.29, lng: 36.784 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when the link already contains a pin", async () => {
    const f = fetchTo("https://example.com");
    await expect(resolveMapsLink("https://maps.google.com/?q=-1.2921,36.7819", f)).resolves.toEqual({ lat: -1.2921, lng: 36.7819 });
    expect(f).not.toHaveBeenCalled();
  });

  it("reads the pin through a Google consent page", async () => {
    const target = "https://www.google.com/maps/place/X/@-1.29,36.78,17z";
    const f = fetchTo(`https://consent.google.com/ml?continue=${encodeURIComponent(target)}&gl=KE`);
    await expect(resolveMapsLink("https://maps.app.goo.gl/abc", f)).resolves.toEqual({ lat: -1.29, lng: 36.78 });
  });

  it("never fetches hosts other than Google short links", async () => {
    const f = fetchTo("https://www.google.com/maps/@-1.29,36.78,17z");
    await expect(resolveMapsLink("https://example.com/maps/abc", f)).resolves.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("returns null when the network fails", async () => {
    const f = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(resolveMapsLink("https://maps.app.goo.gl/abc", f as unknown as typeof fetch)).resolves.toBeNull();
  });
});
