# Fix 3a — Client booking pages match the original designs; Urbanist font

**Found by Dennis** comparing the live pages with the original client designs. **Branch:** `fix/client-styling` → PR. Include the lead's uncommitted files (this spec and the `.gitignore` change).

**References (local only, never commit):** `design-ref/original-client/*.png` (the original designs, numbered by screen) and `design-ref/live-3a/*.jpg` (what 3a looks like on Dennis's phone). `/design-ref/` is git-ignored because the originals contain third-party photos. Look at every image before starting. Where this spec and an image disagree, **this spec wins**. Where the image and `docs/design/bookflow-design-system.png` disagree on colour, the design system wins.

## Decisions (lead)
- **Font: Urbanist** replaces Plus Jakarta Sans everywhere: on the web via `next/font/google`, and in the owner app via `@expo-google-fonts/urbanist` (approved; remove `@expo-google-fonts/plus-jakarta-sans`). Weights 400, 500, 600, 700. Add a note to `docs/design/README.md` (create it if missing): "2026-10-03: Urbanist replaces Plus Jakarta Sans; the design-system PNG still shows the old font." The owner-app change should ship as an over-the-air update. **Confirm** that the font package adds no native module, and if it does, say so instead of shipping.
- **Primary buttons are black** (ink `#16131F`, white text, pill radius on booking CTAs, height 48–52). Brand purple is only for links, selection, focus and small accents. Today, "Get directions" on the booked page is purple, which is wrong.
- **Selection colour** `#5B45E0`: a 2 px border on the selected card plus a 28 px filled circle with a white check, as in originals 09 and 12.
- **Icons:** `lucide-react` is approved (tree-shaken). No other new dependencies.
- **Hide what has no data yet:** ratings, reviews, portfolio, the photo counter ("1/6"), "View booking" and the feedback thumbs. They come in later phases. Don't add placeholder versions.

## 1. Salon page `/s/[slug]` (originals 01–07, live 1–3)
1. **Hero:** the banner full width at 4:3, `object-fit: cover`, plus a white 40 px circular **share** button top right. It uses the Web Share API and falls back to copying the link with a "Link copied" toast. No banner → a brand-tinted block with the salon initials.
2. **Info card** overlaps the hero by 24 px, with 24 px rounded top corners and a white background. Inside:
   - The salon **name** (24/700) with the **logo on the right** (64 px, radius 12). **Bug:** the logo is currently hidden behind the banner (live 1).
   - The **tagline** directly under the name (15/400 muted, 4 px gap). **Bug:** there's a large gap today.
   - The address on one line (13 muted, ellipsis).
   - An **open status** row with a clock icon: "**Open** · until 18:00" (Open in success green), or "Closed · opens Mon 09:00" ("Closed" in danger red). Use `openStatus()` (acceptance test below) in the salon's timezone, rendered on the client so it's correct despite page caching.
3. **About:** heading 18/700 and text clamped to 4 lines with a "Read more" toggle (only when longer).
4. **Sticky tab bar** (white, below the status bar when scrolled): **Services · Team · Hours & location**. Anchor scrolling with scroll-spy; the active tab gets an ink 2 px underline and 600 weight, others muted.
5. **Services** (originals 02–03): each card shows the name (16/600), the duration below (14 muted), then the price (16/600) below that. A **"Book" outline pill** sits on the right, vertically centred. **No checkboxes on this page.** "Book" opens the booking flow with that service preselected. Show the first 5, then a full-width outline pill **"See all services (n)"**.
6. **Team** (original 03): a horizontal scroll row of 72 px circular photos, name (14/600, one line) and title (12 muted). With no photo: initials on lavender `#EEEBFB` in brand text. Tapping one opens the **profile sheet** (original 11): a bottom sheet with a large photo, name, title and About. Close with ×, a swipe down or Esc.
7. **Opening hours** (original 07):
   - Compact 32 px rows with no dividers.
   - A dot before each day: success green when open, light grey when closed.
   - **Today in bold**, with no "Today" chip.
   - Times as "09:00 – 18:00"; "Closed" in muted.
8. **Location** (original 07): the map 160 px high with radius 12, then the address (14) with an inline **"Get directions"** brand link right after it. No big outlined button.
9. **Sticky bottom bar, always visible:**
   - Left: "Ready for a fresh look?" (14/600) over "Check out our N services" (13 muted).
   - Right: a black pill **"Book now"** → booking flow, no preselection.
   - White background, top hairline, safe-area padding.
   - Leave bottom padding on the page so the bar never covers the map.

## 2. Booking flow (originals 08–12)
**Every step:** a light grey page (`#F6F5FA`) with white cards. The header has a back arrow on the left and × on the right (× = back to the salon page, releasing any hold), then a large title (28/700). A **bottom bar** shows the total on the left ("KES 1,500", 18/700, with no "from", over "1 item · 30 mins" with a small cart icon) and a black pill **"Continue →"** on the right, disabled until a choice is made.
1. **Select services** (08–09): the same card content as on the salon page. On the right, a 32 px outlined circle with **+**; selected cards get the purple border and the filled purple check.
2. **Select professional** (10, 12):
   - First card **"Any professional"**: a shuffle icon in a 56 px lavender circle, with the subtitle "Maximum availability".
   - Then one card per staff member: 56 px photo, name (16/600), title (muted) and a **"View profile"** link that opens the same sheet. A **"Select"** outline pill on the right becomes the purple check when selected.
   - Skip this step when only one person qualifies (as now).
3. **Pick a time** (no original; keep the current behaviour, restyled):
   - Day chips 56×64 with radius 12, the weekday over the day number. Selected: ink background with white text. Days with no times: 40% opacity.
   - Time chips are outline pills; the selected one is filled purple.
   - The bar button reads **"Hold this time"**.

## 3. Confirm (originals 16, 18)
- **Salon header**: name (20/700), the address muted below, the logo on the right; back and × as above.
- **Hold banner**, full width:
  - A gradient from `#FBD34D` to `#F0A030`, ink text, with a clock icon.
  - Line 1: "Mon 5 Oct, 10:45 · held for **9:41**", with the live countdown inside the banner.
  - Line 2: "Silk press – KES 1,500".
  - At zero it turns into the existing expired state.
- **Sign-in:** keep the 3a layout from `docs/design/bookflow-client-signin.png`, restyled with the new font and buttons. The phone-code variant in original 16 is **not** used (ADR 0007).
- **Name and phone** (original 18): a white card titled "What should we call you?" with the helper "<Staff first name> will see this on the day." ("The salon will see this" for "Any professional" until a staff member is assigned), then the fields, then a black full-width **"Confirm booking"**.

## 4. You're booked `/b/[id]` (originals 20–21, live 4)
- The same salon header (without back or ×).
- An **inline SVG illustration** we draw ourselves: a calendar with a check, about 96 px, in brand colours. Then **"You're all set! 🎉"** (24/700) and "See you soon!" (16 muted).
- A **summary band**, full width on `#F6F5FA`:
  - "Mon 5 Oct, 10:45 – 11:15" (16/700)
  - "Silk press – with Salome"
  - "KES 1,500 · Pay at the salon" (muted)
- Two buttons side by side: **"Add to calendar"** (outline, calendar icon) and **"Get directions"** (black).
- A **share card** (original 20), a growth feature:
  - Title "Know someone who'd love <Salon>?", helper "Share the link. They can book in a minute, no app needed."
  - A read-only link field with **Copy**.
  - A green **WhatsApp** button (`#25D366`, white text) opening `https://wa.me/?text=<encoded message + booking link>`.
  - A square share-icon button (Web Share API).
- Keep "Back to <Salon>" as a link at the bottom.

## 5. Acceptance test (lead-owned: copy verbatim)

`apps/web/src/lib/open-status.acceptance.test.ts`
```ts
import { describe, expect, it } from "vitest";

import { openStatus } from "./open-status";

// weekday: ISO day, 1 = Monday ... 7 = Sunday (same as opening_hours.weekday).
const weekdays = [1, 2, 3].map((weekday) => ({ weekday, opens: "09:00:00", closes: "18:00:00" }));
const split = [
  { weekday: 1, opens: "09:00", closes: "13:00" },
  { weekday: 1, opens: "14:00", closes: "18:00" },
];
const late = [{ weekday: 7, opens: "10:00", closes: "24:00" }];
const tz = "Africa/Nairobi"; // UTC+3, no daylight saving

describe("openStatus", () => {
  it("is open during opening hours", () => {
    // Monday 5 Oct 2026, 10:00 in Nairobi
    expect(openStatus(weekdays, new Date("2026-10-05T07:00:00Z"), tz)).toEqual({ open: true, until: "18:00" });
  });

  it("finds the next opening on a later day", () => {
    // Saturday 3 Oct 2026, 15:00 in Nairobi
    expect(openStatus(weekdays, new Date("2026-10-03T12:00:00Z"), tz)).toEqual({
      open: false,
      next: { weekday: 1, time: "09:00" },
    });
  });

  it("finds a later opening on the same day", () => {
    // Monday 08:30
    expect(openStatus(weekdays, new Date("2026-10-05T05:30:00Z"), tz)).toEqual({
      open: false,
      next: { weekday: 1, time: "09:00" },
    });
  });

  it("is closed at the exact closing time", () => {
    // Monday 18:00
    expect(openStatus(weekdays, new Date("2026-10-05T15:00:00Z"), tz)).toEqual({
      open: false,
      next: { weekday: 2, time: "09:00" },
    });
  });

  it("handles a lunch break", () => {
    expect(openStatus(split, new Date("2026-10-05T07:00:00Z"), tz)).toEqual({ open: true, until: "13:00" });
    // Monday 13:30
    expect(openStatus(split, new Date("2026-10-05T10:30:00Z"), tz)).toEqual({
      open: false,
      next: { weekday: 1, time: "14:00" },
    });
  });

  it("handles closing at midnight", () => {
    // Sunday 4 Oct 2026, 23:00
    expect(openStatus(late, new Date("2026-10-04T20:00:00Z"), tz)).toEqual({ open: true, until: "24:00" });
  });

  it("reports no opening when there are no hours", () => {
    expect(openStatus([], new Date("2026-10-05T07:00:00Z"), tz)).toEqual({ open: false, next: null });
  });
});
```

## Acceptance criteria
- [ ] The acceptance test passes unmodified; all existing tests and Playwright pass (update selectors as needed, not behaviour); `pnpm check`, CI, `expo-doctor` green.
- [ ] Lighthouse mobile on a seeded local salon page: Accessibility ≥ 95; report Performance as well.
- [ ] **Screenshots for review:** with the local seed data (fake names only), capture each screen at 390×844 into `docs/portfolio/evidence/2026-10-03-restyle/` and commit them:
  - the salon page top, services, team and hours/location;
  - the profile sheet;
  - select services with one selected;
  - select professional with one selected;
  - pick a time;
  - the confirm banner with the sign-in step and with the name step;
  - you're booked.

  These are evidence and how the lead reviews the PR.
- [ ] The owner app uses Urbanist after the OTA update: say how Dennis gets it, or why a new APK is needed.
- [ ] Don't merge.

## Out of scope
Reviews, ratings, portfolio and the gallery (Phase 5 / 2c data); "View booking" and client cancel (3b); restyling owner-app screens beyond the font.
