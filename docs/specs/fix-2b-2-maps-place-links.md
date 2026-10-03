# Fix 2b-2 — Google Maps app links carry a place, not coordinates

**Found by Dennis on the phone; diagnosed by the lead.** The link `https://maps.app.goo.gl/ySvketsuMA7dAbvQ7` redirects to:

```
https://www.google.com/maps/place/Galito's+Lusaka+Road,+Lusaka+Road,+Oil+Libya,+Nairobi/data=!4m2!3m1!1s0x182f1110b46e6545:0xc63a20f498443fb2!18m1!1e1?coh=192189&entry=gps&skid=…
```

That URL has **no coordinates** (no `@lat,lng`, no `!3d!4d`), only a place name and a place ID. The previous fix assumed app links lead to coordinates; real data shows they don't. Our test fixtures encoded the wrong assumption.

**Decision (lead):** we don't need coordinates. Clients need (a) a **Get directions** link and (b) a small map preview. Both work from the owner's link and the place name, for free:
- Directions: open the owner's own link; it goes straight to that exact place.
- Preview (Phase 3 web): Google's keyless embed `https://maps.google.com/maps?q=<place or address>&output=embed`.
Coordinates stay optional (saved when a long link contains them).

**Branch:** `fix/maps-place-links` → PR.

## 1. Database (new migration)
- `salons.maps_url text null` with a check that it's an https Google Maps link. Allowed starts: `https://maps.app.goo.gl/`, `https://goo.gl/maps/`, `https://www.google.<tld>/maps`, `https://google.<tld>/maps`, `https://maps.google.<tld>/`. Regex up to you, but it must pass the acceptance test below.
- Owners set it through their normal update policy.

## 2. Shared code (`@bookflow/shared`)
- `inspectMapsLink(url, fetchImpl?) : Promise<{ mapsUrl: string; placeName: string | null; pin: { lat: number; lng: number } | null } | null>`
  - Non-Google or invalid URL → `null`, **no fetch**.
  - A long Google Maps URL → parse locally, no fetch.
  - A short link (`maps.app.goo.gl`, `goo.gl/maps`) → follow it as `resolveMapsLink` does, including the consent page `continue` parameter. A network failure returns `null`.
  - `placeName`: from the `/maps/place/<name>/` path segment of the final URL, decoded (`+` → space, percent-decoding).
  - `pin`: `parseGoogleMapsLink(finalUrl)`.
  - `mapsUrl`: **the link the owner pasted**, trimmed (short links are stable and open the exact place).
- `mapsEmbedUrl(query: string): string` → `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`.
- Keep `resolveMapsLink` and `parseGoogleMapsLink` and their tests unchanged.

## 3. Owner app: Location screen
- After paste, show "Checking link…", then:
  - **Place found:** "✓ Galito's Lusaka Road, Lusaka Road, Oil Libya, Nairobi", plus a second line "Clients will get directions to this place." This lets the owner confirm it's the right place.
  - **Only a pin:** "✓ Pin found".
  - **`null` after a network error:** "Couldn't check that link. Check your connection and try again." Don't save the link.
  - **`null` for a non-Google link:** "That doesn't look like a Google Maps link".
- **Save** stores `maps_url`, plus `latitude`/`longitude` when there's a pin. Clearing the field clears all three.
- JavaScript plus a migration only, so this ships as an over-the-air update. No version bump.

## 4. Acceptance tests (lead-owned: copy verbatim)

### `packages/shared/src/maps-inspect.acceptance.test.ts`
```ts
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
```

### `supabase/tests/acceptance/12_maps_url.sql`
```sql
begin;
select plan(3);

insert into auth.users (id, email) values ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test');
insert into public.salons (id, slug, name) values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A');
insert into public.salon_members (salon_id, user_id, role)
values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ update public.salons set maps_url = 'https://maps.app.goo.gl/ySvketsuMA7dAbvQ7'
  where id = 'a0000000-0000-4000-8000-000000000001' $$, 'an owner can save a Google Maps app link');
select lives_ok($$ update public.salons set maps_url = 'https://www.google.com/maps/place/Galana+Plaza/@-1.29,36.784,17z'
  where id = 'a0000000-0000-4000-8000-000000000001' $$, 'a long Google Maps link is accepted');
select throws_ok($$ update public.salons set maps_url = 'https://example.com/maps/abc'
  where id = 'a0000000-0000-4000-8000-000000000001' $$, '23514', null, 'other websites are rejected');
reset role;

select * from finish();
rollback;
```

## Acceptance criteria
- [ ] All acceptance tests (SQL 01–12, TS) pass unmodified; `pnpm check`, CI, `expo-doctor` green; types regenerated.
- [ ] After merge: the DB deploy applies the migration and the EAS update is published to `preview`. Report both links.
- [ ] Report the phone test steps.
