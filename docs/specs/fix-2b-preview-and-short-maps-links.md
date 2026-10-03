# Fix 2b — Image previews and short Google Maps links

Found by Dennis on the 0.3.0 APK. **Branch:** `fix/media-preview-maps-links` → PR.

## Bug 1: picked images don't preview
**Seen:** on My brand (logo, banner) and the team member photo, picking an image leaves a grey box. The image only appears after leaving the screen and coming back.
**Expected:** the picked image shows **immediately**, from the local file, before and while it uploads, with a small uploading indicator on the slot. On failure, keep the previous image and show an error.
**Likely cause to check:** the slot renders only from the saved remote path or URL, and/or the image cache keeps the old empty state. Render from local state first; when the upload finishes, switch to the remote URL with a cache-busting query (`?v=<updated_at or timestamp>`) so a replaced logo doesn't show the old cached file.
Add a unit test for whatever pure logic decides which source to show (local vs remote vs empty).

## Bug 2: links shared from the Google Maps app aren't understood
**Seen:** "Share" in the Google Maps app gives `https://maps.app.goo.gl/…`, so the pin isn't found. This is the main way owners will copy a location, so it has to work.
**Fix:** a shared async resolver that follows the short link's redirect and reads the pin from the final URL. It only ever fetches known Google short-link hosts. Also read the exact pin (`!3d<lat>!4d<lng>`) when present, in preference to the map centre (`@lat,lng`).

### Shared code (`@bookflow/shared`)
- Extend `parseGoogleMapsLink`: if the URL contains `!3d<lat>!4d<lng>`, return that pair, preferring it over `@…`. Keep every existing behaviour (the 2b acceptance test must still pass unchanged).
- New `resolveMapsLink(url: string, fetchImpl?: typeof fetch): Promise<{ lat: number; lng: number } | null>`:
  1. If `parseGoogleMapsLink(url)` finds a pin → return it **without fetching**.
  2. If the host is `maps.app.goo.gl`, or `goo.gl` with a path starting `/maps` → `fetchImpl(url, { redirect: "follow" })` and parse `response.url`. If that URL is a Google consent page, also try its `continue` query parameter.
  3. Any other host, any network error, or no pin → `null`. Never fetch other hosts.
- The owner app's Location screen uses it with a short "Checking link…" state, and keeps the current friendly fallback message on `null`.

### Acceptance tests (lead-owned: copy verbatim to `packages/shared/src/maps-resolve.acceptance.test.ts`)
```ts
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
```

## Release
JavaScript only, with no new native modules, so ship it as an **over-the-air update** to the 0.3.0 APK (the merge publishes to the `preview` channel). Don't bump the app version. Say in the report how Dennis gets it: close and reopen the app, twice if needed.
