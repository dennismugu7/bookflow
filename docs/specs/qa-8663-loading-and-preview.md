# QA report 8663, part 1: loading states and booking-link preview

From the lead, 2026-10-13. Source: PrimeTestLab report Nº 8663 (Google Play closed testing, build
1.0.0 / versionCode 5, POCO X3 Pro, Android 12). The report found no critical issues, one minor
issue (M-01) and four suggestions (S-01 to S-04).

Branch `fix/qa-8663-loading`, **cut from an up-to-date `main`** (not from `feat/splash-animation`).
One PR. Add this spec to the PR. Owner app only: no database change, no new dependency, no native
code, no version bump.

| Report item | Where it is handled |
| --- | --- |
| M-01 Clients briefly appears empty while loading | **A** below |
| S-04 Preview action on Share your booking link | **B** below |
| S-03 Confirm private-note autosaves | **C** below (check only; it already exists) |
| S-01 Reschedule a booking | `qa-8663-reschedule.md` (separate branch and PR, starts on Dennis's word) |
| S-02 Light / Dark / System appearance | Not now. See "Out of scope" |

## A. No list is ever blank while it loads (M-01)

**Reported:** opening Clients straight after launch shows only the "Clients" title and the + button
for a few seconds, then the search field, segment chips and rows appear. Nothing says the list is
loading, so an owner can think their clients are gone.

**Cause (confirmed in the code):** `apps/owner/src/app/(app)/(tabs)/clients.tsx` renders
`!list ? null` until `get_clients` answers. The same pattern is on Today
(`(tabs)/index.tsx`: `!agenda ? null`) and the Calendar's List view
(`(tabs)/calendar.tsx`: `!list.agenda || list.agenda.date !== date ? null`). The client profile
(`clients/[id].tsx`) shows an empty title and an empty page until `get_client_profile` answers.

**What to build**

1. `apps/owner/src/lib/list-phase.ts`, plain TypeScript (no React Native imports):
   - `type ListPhase = "loading" | "error" | "empty" | "ready"`
   - `listPhase<T>(data: T | undefined, error: string | undefined, isEmpty: (data: T) => boolean): ListPhase`
     - an error wins, with or without data (today's behaviour: a failed load shows the reason and
       **Try again**, never an empty state);
     - no data and no error is `"loading"`, and `isEmpty` is not called;
     - otherwise `"empty"` or `"ready"`.
   - `SKELETON_DELAY_MS = 200` and `skeletonVisible(phase: ListPhase, elapsedMs: number): boolean`:
     true only while loading, once 200 ms have passed, so a fast load doesn't flash a placeholder.
2. One shared placeholder, `apps/owner/src/ui/ListSkeleton.tsx`, exported from `src/ui/index.ts`:
   - variant `"rows"`: 6 rows with the Clients row geometry (row min-height 69, left padding 20,
     a 44 px circle, then two rounded bars: 140×12 and 200×10, 8 px apart, 12 px gap from the circle);
   - variant `"cards"`: 3 blocks with the outer size, radius and margins of a **closed**
     `BookingCard` (take the numbers from that component, don't invent them);
   - fill `colors.softFill`, no border, bars with 6 px corners;
   - a gentle pulse: opacity 1 → 0.5 → 1 over 1.2 s, looping, `Animated` with
     `useNativeDriver: true`. No pulse when the phone's "remove animations" setting is on
     (`AccessibilityInfo.isReduceMotionEnabled`);
   - the container is one accessibility element: `accessibilityRole="progressbar"`, a label passed
     in (`"Loading clients"`, `"Loading bookings"`), `accessibilityLiveRegion="polite"`. The bars
     themselves are hidden from screen readers;
   - no new dependency.
3. Use them:
   - **Clients:** title row and + stay as they are. While loading: `ListSkeleton` rows in place of
     the search field, chips and rows. Then exactly today's screens (empty state 03, or list 04).
   - **Today:** header stays. While loading: `ListSkeleton` cards where the stat tiles and
     cards go.
   - **Calendar, List view:** `ListSkeleton` cards while that day's agenda is loading (including
     after changing the day, where today it goes blank).
   - **Calendar, Day and Week:** check what shows before the first `get_range_agenda` answer. If
     the grid draws empty with no cue, show a small centred `ActivityIndicator`
     (`colors.action`) over the grid until the first answer. Don't hide the grid.
   - **Client profile:** while loading, a centred `ActivityIndicator` (`colors.action`) under the
     top bar, with `accessibilityLabel="Loading client"`.
   - Then search the owner app for any other screen that renders nothing while its **first** load
     is in flight, and list what you find in the PR. Fix the ones that are a list or a detail page
     the same way; ask before touching anything else.
4. Keep everything else as it is: pull to refresh, **Try again**, realtime reloads, and the
   existing rule that the previous list stays on screen while a search or segment change loads.

**Not part of this:** making `get_clients` faster, caching lists between app launches, or any
change to the loaded, empty or error screens.

**Design (ADR 0009):** there is no design for a loading state. This section is the spec for it.
In the same PR, add one line to "Approved deviations (owner app)" in `docs/design/screen-map.md`:

> Loading (QA 8663, Dennis 2026-10-13): lists show grey placeholder rows or cards
> (`ListSkeleton`) while their first load is in flight, and detail pages a small spinner. No design.

## B. Preview on "Share your booking link" (S-04)

In `apps/owner/src/ui/ShareLinkSheet.tsx`:

- Under the link row (link box + Copy) and above the "Message" label, a text link
  **"Preview your page"** with Feather `arrow-up-right` (13 px) after the text. Style as
  "Reset to default" on the same sheet (`fonts.medium`, 13, `colors.action`), left-aligned,
  `accessibilityRole="link"`, at least 44 px tall to touch (use `hitSlop` rather than extra
  height, so the sheet doesn't grow more than about 26 px).
- It opens `bookingLink(salon.slug)` in an in-app browser tab with `expo-web-browser`
  (already a dependency; check the SDK 57 docs for the call, per `apps/owner/AGENTS.md`), so
  closing the tab returns to the sheet. If the tab can't open, fall back to `Linking.openURL`.
- **Unpublished salon:** the public page is not reachable until the salon is published. If the
  sheet can be opened for an unpublished salon, show grey text "Publish your salon to preview
  the page." (`colors.subtle`, same size) instead of the link. Pass what the sheet needs
  (`isPublished` is already on `membership.salon`).
- Staff see the link too (it only opens a public page).
- Copy, Message, Reset, the counter, the help text and Share don't change.

Add to `docs/design/screen-map.md`, same list:

> Booking link sheet has a "Preview your page" link under the link row (QA 8663, Dennis 2026-10-13).

## C. Notes "Saved" status (S-03): check, don't rebuild

`clients/[id].tsx` already shows "Saving…", then "Saved" (green) or "Couldn't save" (red) at the
right of the "Notes (only you see these)" heading, and saves what is pending when the screen
closes. The tester didn't notice it.

- On the emulator or debug APK, type a note with the keyboard open and report in the PR whether
  "Saved" is **visible above the keyboard** on a 1080×2400 phone.
- If it is visible: no code change. Say so in the PR.
- If the keyboard or scrolling hides it: make the page scroll so the Notes heading stays visible
  while the notes field has focus. Nothing else.
- Don't restyle it and don't add a toast.

## Out of scope: appearance choices (S-02)

No dark mode in this work. The app is light-only on purpose (`userInterfaceStyle: "light"`),
`theme.ts` is one fixed palette used by every screen, and ADR 0009 needs a dark design for every
screen before any of it could be built. It is recorded as a possible later phase; Dennis decides.
Don't add a setting, a toggle or dark tokens.

## Tests

- Copy the acceptance tests below verbatim into
  `apps/owner/src/lib/list-phase.acceptance.test.ts`.
- Your own unit tests for anything else you add in `src/lib`.
- Vitest here is Node-only (`apps/owner/vitest.config.ts`): keep `list-phase.ts` free of
  React Native imports.

### Acceptance tests

```ts
import { describe, expect, it, vi } from "vitest";

import { SKELETON_DELAY_MS, listPhase, skeletonVisible } from "./list-phase";

const isEmpty = (list: string[]) => list.length === 0;

describe("listPhase (QA report 8663, M-01)", () => {
  it("is loading until the first answer arrives, never empty", () => {
    expect(listPhase<string[]>(undefined, undefined, isEmpty)).toBe("loading");
  });

  it("does not ask whether missing data is empty", () => {
    const spy = vi.fn(() => true);
    expect(listPhase<string[]>(undefined, undefined, spy)).toBe("loading");
    expect(spy).not.toHaveBeenCalled();
  });

  it("is an error when the first load fails", () => {
    expect(listPhase<string[]>(undefined, "Couldn't load", isEmpty)).toBe("error");
  });

  it("is an error when a later load fails, even with data on screen", () => {
    expect(listPhase(["Elena Brooks"], "Couldn't load", isEmpty)).toBe("error");
  });

  it("is empty only once the server says there is nothing", () => {
    expect(listPhase<string[]>([], undefined, isEmpty)).toBe("empty");
  });

  it("is ready when there is something to show", () => {
    expect(listPhase(["Elena Brooks"], undefined, isEmpty)).toBe("ready");
  });
});

describe("skeletonVisible", () => {
  it("waits 200 ms, so a fast load doesn't flash", () => {
    expect(SKELETON_DELAY_MS).toBe(200);
    expect(skeletonVisible("loading", 0)).toBe(false);
    expect(skeletonVisible("loading", 199)).toBe(false);
    expect(skeletonVisible("loading", 200)).toBe(true);
    expect(skeletonVisible("loading", 5000)).toBe(true);
  });

  it("never shows once loading is over", () => {
    expect(skeletonVisible("ready", 5000)).toBe(false);
    expect(skeletonVisible("empty", 5000)).toBe(false);
    expect(skeletonVisible("error", 5000)).toBe(false);
  });
});
```

## Acceptance criteria

- [ ] `pnpm check` and CI green. The acceptance tests are in the PR unchanged.
- [ ] Clients, Today, Calendar (List, Day, Week) and a client profile never show a blank body
      while the first load is in flight. To prove it, slow the network (emulator network
      throttling, or a temporary local delay that is **not** committed) and capture each screen
      mid-load at 390×844 with fake seed data.
- [ ] With a fast network, no placeholder flashes.
- [ ] A failed first load still shows the reason and **Try again**; an empty salon still shows
      the 03 empty state; a loaded list is pixel-for-pixel what it is on `main`.
- [ ] TalkBack announces "Loading clients" / "Loading bookings".
- [ ] "Preview your page" opens the salon's public page and comes back to the sheet; the
      unpublished case is handled.
- [ ] The PR says what you saw for C (Saved visible above the keyboard, or the fix).
- [ ] The PR has: the list of screens audited for A, before/after captures (in git-ignored
      `design-ref/compare/`, attached to the PR, not committed), and the two screen-map lines.
- [ ] No dependency added, no file under `supabase/` changed, no version or versionCode change.
- [ ] Don't merge.
