# Release 0.5.1: salon photos, better link sharing, small fixes

**Goal:** clients swipe through a salon's photos, and a shared booking link arrives in WhatsApp as a proper card with the owner's own message. Also fixes four small things from Dennis's 0.5.0 testing.

**Branch:** `feat/photos-and-sharing` → PR. Include the lead's uncommitted files: this spec, `docs/design/owner-v6/`, the screen-map update and the two acceptance tests below.

**Designs (approved by Dennis, 2026-10-05):** `docs/design/owner-v6/01`–`05`. The mockups use plain colours instead of photos. ADR 0009: copy the mockups, use a fresh session (`/clear`) and make side-by-sides.

**Ships as an over-the-air update to 0.5.0 plus a web deploy.** There are no new native modules. Keep the version at 0.5.0, so the runtime stays the same and the update reaches installed phones.

## 1. Database (one new migration)
- **`public.salon_photos`** (`id uuid pk`, `salon_id` → salons, on delete cascade, `path text not null`, `position smallint not null check (position between 0 and 5)`, `created_at`):
  - unique `(salon_id, position)` and unique `(salon_id, path)`;
  - RLS: `select` for everyone when the salon is published, and for its members always; no direct writes for `anon` or `authenticated`.
- **Backfill:** each salon's current `banner_path` becomes its photo at position 0.
- **`public.set_salon_photos(p_salon_id uuid, p_paths text[]) returns void`** (`security definer`, `set search_path = ''`, authenticated only):
  - owners only, others `42501`;
  - more than 6 paths, a duplicate, or a path that doesn't start with `<p_salon_id>/` and end in `.jpg` → `BF400`;
  - replaces the salon's photos in the given order (positions 0…n-1) and sets `salons.banner_path` to the first path, or null when the list is empty.
  - An empty list is allowed. Publishing already checks for a banner, so that rule still holds.
- **`salons.share_message text`:** nullable, `check (char_length(share_message) <= 200)`. Owners save it with the existing owner update policy.
- Regenerate types.

## 2. Shared helpers (`packages/shared`)
- `defaultShareMessage(name)` → `Book your next visit at <name>. It takes less than a minute 👇`
- `shareText(message, link, salonName)` → the trimmed message, or the default when it's null or blank, then a newline and the link.

## 3. Owner app
- **My brand (`01`):**
  - **Top:** the banner area now shows the first photo with a "1/n" counter. Tapping the banner scrolls to Salon photos. The logo is unchanged.
  - **Salon photos:**
    - a "3 of 6" count and the hint text;
    - a 3-column grid with a "Banner" tag on the first photo, and an **Add photo** tile while there are fewer than 6;
    - adding uses the banner's picker and resize (1600 px wide) and uploads under `<salon_id>/banner/`.
  - **Tap a photo:** a bottom sheet with **Make banner** (moves it first) and **Remove**, then **Cancel**.
  - **Saving:** call `set_salon_photos` with the new order. Afterwards delete files that are no longer used from storage, as the brand screen already does for a replaced banner.
  - **Save button:** saving the form also saves the photos. Leaving with unsaved changes asks first, as the screen does now.
- **Booking link (`02`):** Menu → Booking link opens a sheet instead of the share sheet straight away.
  - **Link row:** the link (one line, cut off with "…") and **Copy** (toast "Link copied").
  - **Message:** a box prefilled with `share_message` or the default, with a counter out of 200 and **Reset to default**. Save the message when Share is tapped, only if it changed; store null when it equals the default.
  - **Share:** opens Android's share sheet with `shareText(...)`.
- **Small fixes (`05`):**
  - **Day view:** blocks shorter than 45 minutes show one line, "**Name** · service", cut off with "…". Longer blocks keep two lines. Week view is unchanged.
  - **Main buttons:** every primary filled button (Save changes, Mark done, Confirm on Log out, Create salon, Save booking, and so on) uses the app's blue, `#1E7BF2`, with white text. Destructive red and the amber No-show stay as they are. Make this change once, in `Button`'s primary variant, and list every screen it affects in the PR.
  - **Today:** an opened booking card's buttons are never covered by the **+**. Add bottom space to the list equal to the button's height plus its margin.

## 4. Client web
- **Photo slider (`04`, original 01):**
  - the hero is a horizontal scroll-snap slider of the salon's photos in order;
  - dots, plus a "1/n" counter at the bottom right;
  - swipe on phones; on wider screens, ‹ › buttons on hover and the arrow keys when the slider is focused;
  - no dots or counter with one photo, and the current placeholder with none;
  - the first image loads eagerly at high priority, the rest lazily;
  - alt text: "<salon name>, photo n of m".
  - Use no slider library.
- **WhatsApp preview (`03`):**
  - add a route `/s/[slug]/share-image` that returns a **1200×630 JPEG under 300 KB**: the banner as a centre-cropped cover, a soft dark gradient at the bottom, the logo circle (or the initial), the salon name and "<area> · Book online" in Urbanist;
  - render with `ImageResponse` and convert it to JPEG with `sharp`, or use any equivalent that meets the size;
  - cache it publicly for a day, with the salon's `updated_at` as a `?v=` on the URL;
  - with no banner, use a plain brand-blue background.
- **Page metadata:**
  - `og:image` points at the share image as an absolute URL, with `og:image:width` 1200, `og:image:height` 630 and `og:image:type` `image/jpeg`;
  - set `metadataBase` to the production URL;
  - `og:title` is "<name> · Book online", `og:description` is the tagline (or "Book an appointment at <name>."), `og:url` is absolute, and `twitter:card` is `summary_large_image`;
  - check that the page responds to a WhatsApp user agent (`WhatsApp/2.23.20.0 A`) with these tags in the first 32 KB of the HTML.

## 5. Acceptance tests (lead-owned: copy verbatim, already in the working tree)
- `supabase/tests/acceptance/18_salon_photos.sql`
- `packages/shared/src/share.acceptance.test.ts`

## Acceptance criteria
- [ ] All acceptance tests (SQL 01–18, all TS) pass unmodified; `pnpm check`, CI and `expo-doctor` green; types regenerated.
- [ ] Side-by-sides for `01`, `02`, `04` and `05` (mockup | live), plus the differences table (ADR 0009).
- [ ] The share image: its size in KB and a screenshot. Also a `curl -A "WhatsApp/2.23.20.0 A"` of the live preview deploy showing the og tags.
- [ ] An existing salon's banner shows as photo 1 after the migration.
- [ ] Tell Dennis in the PR: WhatsApp caches link previews, so the first test should use a fresh chat or add `?v=2` to the link.
- [ ] Don't merge.

## Out of scope
Portfolio grid (original 06), reordering by dragging, photo captions, cropping inside the app, a per-staff share link.
