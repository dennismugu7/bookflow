# Fix 2-2 — Owner app polish, Menu tab, welcome animation

**From Dennis's phone test of PR #19** and the design pack he approved on 2026-10-04. The approved mockups are in `docs/design/owner-v2/` (fake data, committed with this spec):

- `01`–`08`: the screen mockups;
- `09-today-options.png`: the Today graphics; **option A** was chosen;
- `10-welcome-animation.mp4`, `.html` and `-frames.png`: the welcome animation.

**For these screens, the approved mockups replace the original designs** (the screen map now says so). ADR 0009 still applies: copy the mockup; this spec only adds behaviour.

Work in **two PRs, in order**. Each one ships as an over-the-air update, so don't bump the app version, and say so in the report if anything needs a new APK. Use the same web capture as fix 2, with side-by-sides `design-ref/compare/owner2-<nn>.png` (mockup | live) and a differences table in each PR.

## PR A — `fix/owner-polish`: shared pieces, business screens, Menu tab

### Shared pieces (use them everywhere in the owner app)
- **TopBar:** back arrow (44 px tap area) and the title (20/600) on a white bar with a hairline bottom border. It stays fixed while the content scrolls underneath. Nothing floats over the content: this fixes the back and ✓ buttons overlapping the content as you scroll.
- **Pages:** white background (no grey), with no framed outer "view cards".
- **Field:**
  - Label 15/600 in ink above the field. A red `*` marks required fields.
  - The field is 52 px high with radius 12.
  - At rest: 1 px `#DAD8E0` outline. While typing in it: 2 px `#1E7BF2`.
  - Multi-line variant: 120 px high, with a right-aligned counter (`84 / 500`).
- **Add button:** one `Fab` component, 60 px, `#1E7BF2`, a white +, a soft shadow, bottom right. The same on Services and Team, and on any future "add" screen.
- **Save button:** a black, full-width button in a fixed bottom bar where a screen saves a form. Disabled until something changes.

### Screens (copy the mockups)
- **My brand (`01`):** one screen, no separate view and edit modes.
  - The banner fills the width at 16:9, with a camera button that picks a new banner (same resize and upload as now).
  - The logo is a 96 px circle overlapping the banner's lower left, with a camera badge that picks a new logo.
  - Then Business name, Tagline, and About (multi-line, max 500, with the counter). **Save changes** at the bottom.
- **My services (`02`):** service cards with a pencil and the Fab. **Add/edit service (`03`):** the new field labels; the preview becomes one line under the form; same validation as now.
- **My team (`04`):** rows with clean rounded corners (no cropped edges), the "Working alone? Add me as a team member" link when relevant, and the Fab. Profile and edit screens get the TopBar.
- **Opening hours (`05`):** day rows with a dot, the hours and a ›, today in bold, and a hint line. **No pencil.** Tapping a day opens a day editor (a screen or bottom sheet):
  - a **Closed** switch;
  - one or more open–close ranges, with **Add a break** to add another;
  - Save.

  Saving uses the existing atomic `set_opening_hours` for the whole week; overlaps are rejected with a friendly message.
- **Location (`06`, `07`):** no pencil and no frame.
  - **No pin yet (`06`):**
    - the Address field;
    - a "Drop your pin" box with the three steps and an **Open Google Maps** button (opens `https://www.google.com/maps`);
    - a paste field checked with `inspectMapsLink`, with the existing messages ("✓ <place>", "Couldn't check that link…", "That doesn't look like a Google Maps link");
    - **Save location**.
  - **Pin set (`07`):** the drawn map (tap → opens `maps_url`), "✓ <place name>" with the hint, the Address field, and a **Change pin** button that switches to the paste field (cancel keeps the old pin). Saving or clearing keeps the current rules for `maps_url`, latitude and longitude.
- **Menu (`08`):**
  - **The Account tab becomes "Menu".** Its tab icon is a 28 px avatar circle (green `#3DBE29`, white initial), with a blue ring when active. The label is "Menu".
  - The screen has the avatar and email **centred**, and under them "<Salon> · Live" (or "Not live").
  - Then General (Booking link, Unpublish salon) and Business Profile (My brand, My services, My team, Opening hours, Location), each with an icon and ›. Then the outlined Log out, the confirm sheet, and the version line, as now.
- **Title style:** every screen title uses the TopBar title style. Today, "My Services" uses a different font: fix it.

### Acceptance test (lead-owned: copy verbatim)
`packages/shared/src/initials.acceptance.test.ts`
```ts
import { describe, expect, it } from "vitest";

import { initialsFor } from "./index";

describe("initialsFor", () => {
  it("uses the first letter of an email", () => {
    expect(initialsFor("dennis@example.com")).toBe("D");
  });
  it("uses up to two initials of a name", () => {
    expect(initialsFor("Salome Wanjiku")).toBe("SW");
    expect(initialsFor("  njeri  ")).toBe("N");
    expect(initialsFor("Mary Achieng Otieno")).toBe("MA");
  });
  it("falls back to a question mark", () => {
    expect(initialsFor("")).toBe("?");
    expect(initialsFor(null)).toBe("?");
  });
});
```

## PR B — `feat/owner-welcome`: welcome animation and the Today graphic
Start it after PR A is merged (Dennis will say so).
- **Welcome screen:** copy `10-welcome-frames.png` and the motion in `10-welcome-animation.mp4`/`.html`.
  - The light-blue gradient background, "Bookflow" in `#2A1E8C`, the subtitle "Share your link. Bookings land."
  - **Create for free:** green `#2FD573` with dark text `#0B2A17`. **Sign in:** in ink.
  - The 6-second loop has three beats:
    1. the WhatsApp-style link bubble with a tap ring;
    2. the time chips, where the middle one turns purple `#5B45E0` with a tap ring;
    3. the Today card, where a "New" booking drops in with a small pop.
  - Each loop cycles through three examples (hair, nails, barber), as in the HTML.
  - **Build it with React Native's built-in `Animated` API only:** no Reanimated, no Lottie, no new dependency, so it ships over the air.
  - If the phone has "Remove animations" turned on (`AccessibilityInfo.isReduceMotionEnabled`), show the final frame, still.
  - The animation pauses when the screen isn't focused.
- **Today, no bookings (option A from `09`):**
  - a 120 px light-blue `#EEF5FF` circle with a calendar-tick line icon in `#1E7BF2`;
  - "No bookings yet" (22/700);
  - "Share your link on WhatsApp or Instagram. New bookings show up here." in muted text;
  - the blue **Share your booking link ›** pill.

  It replaces the current illustration.

## Acceptance criteria (each PR)
- [ ] All tests pass (including the initials test in PR A); `pnpm check`, CI and `expo-doctor` green.
- [ ] A side-by-side for every changed screen, and the differences table in the PR.
- [ ] No regressions: sign-in, the saves for brand, services, team, hours and location, publish and unpublish, share and log out. List the manual steps you ran.
- [ ] Live captures (fake data) committed to `docs/portfolio/evidence/2026-10-04-owner-polish/`.
- [ ] Don't merge.

## Out of scope
The native splash and a real map (next APK, 0.4.0), Play internal testing, Phase 3b, Phase 4.
