# Fix 3a-2 — Client web matches the original designs; sticky tabs; instant taps

**Process:** this is the first task under **ADR 0009**. Read `docs/adr/0009-design-fidelity.md` and `docs/design/screen-map.md` first, then open **every** image in `design-ref/original-client/`. **For anything visual, the image wins; this spec only adds behaviour and the bugs below.** The only allowed differences are the "Approved deviations" in the screen map.

**Branch:** `fix/client-design-fidelity` → PR. Include the lead's uncommitted files (this spec, ADR 0009, `docs/design/screen-map.md`, `docs/design/README.md`, `CLAUDE.md`).

## Bugs found by Dennis on the phone

### 1. The tabs don't stay at the top
**Seen:** Services · Team · Hours & location scroll away with the page, so the underline never moves to Team.

**Cause (lead):** the `<nav className="sticky top-0 …">` in `salon-client.tsx` sits inside its own wrapper `<div className="mt-6">` in `page.tsx`. A sticky element only sticks within its parent, and that parent is just as tall as the nav.

**Fix:** make the nav a direct child of the container that holds all the sections. Check that no ancestor has `overflow: hidden/auto`.

**Test:** add a Playwright test. Scroll to `#team`, then expect the nav's `getBoundingClientRect().top` to be `0` and the **Team** tab to have `aria-current="true"`. Same for Hours & location.

### 2. Back, ×, Book and Book now feel dead for a moment
**Seen:** on Select services, back and × take long enough that Dennis thought they weren't working. Same with **Book now** and **Book**.

**Cause (lead):** step changes call `router.replace`/`router.push` with a new query string, so each one re-runs the server page (`book/page.tsx`) and waits for the network. There's no pressed state or loading screen in between.

**Fix:**
- **Steps switch in the browser:** keep the step in client state and mirror it to the URL with `window.history.pushState` or `replaceState`, which Next keeps in sync with `useSearchParams`. No server round-trip between Services → Professional → Time, or back.
  - The phone's back button and the back arrow both go to the previous step.
  - × goes to the salon page (releasing a hold, as now).
- **Salon page → booking:** prefetch `/s/[slug]/book` (`<Link prefetch>` or `router.prefetch` on mount). Add `loading.tsx` skeletons for `book` and `confirm` that copy the layouts of `08` and `16`.
- **Every button and card gives feedback within 100 ms:** an `active:` pressed state (slight darken or scale 0.98).
- **Test:** with Playwright CPU throttling ×4, a step change must render in **under 300 ms**. Assert on timing around the click and report the measured numbers.

### 3. The salon header on confirm and "You're all set" doesn't match `16`/`18`/`21`
**Seen (Dennis's screenshots):** only the name and logo show; the tagline and area are missing, the name sits too low, and the logo is pushed far right. In `16`/`18`, the back arrow, header and × share one row. The name, tagline and area are stacked tightly, with the logo right next to that block.

**Fix:** copy `16`, `18` and `21` exactly.
- **Confirm (`16`, `18`):** back arrow (top left), × (top right) and the header block all sit in the **same top row**.
  - The header block holds: name, then tagline, then the area line (small, muted, slightly letter-spaced).
  - The logo sits **immediately right of the text block**, as in the image, not pinned to the screen edge.
- **"You're all set" (`21`):** the same header without back and ×.
- **Salon page (`01`):** same principle for the info block. Name, tagline and area are stacked as in `01`, with the logo beside them, followed by the open-status row.
- **Area line:** use `shortArea(address)` (acceptance test below).

## Full fidelity pass
After the three fixes, go through **every row of the screen map**. For each screen:
1. Capture it at 390×844 from the local seed (fake data).
2. Build a side-by-side image `design-ref/compare/<nn>-<screen>.png`: the design on the left, live on the right, same height. A small script (sharp is already in the tree via Next, or use Playwright) is fine; ask before adding a dependency.
3. List every difference in layout, spacing, size, weight, colour, radius, icon or copy, fix it, and recapture.

   Two examples to check:
   - The **Book now** bar in `01`–`07` is italic two-line text, with a pill whose style comes from the image.
   - The service cards in `02` have a "Book" outline pill with its own height and radius.
4. Repeat until only approved deviations remain.

In the PR description, include a table: screen | differences found | fixed | remaining (each remaining one must cite an approved deviation).

## Acceptance test (lead-owned: copy verbatim)

`apps/web/src/lib/short-area.acceptance.test.ts`
```ts
import { describe, expect, it } from "vitest";

import { shortArea } from "./short-area";

describe("shortArea", () => {
  it("keeps the last two parts of an address", () => {
    expect(shortArea("2nd floor, Galana Plaza, Kilimani, Nairobi")).toBe("Kilimani, Nairobi");
    expect(shortArea(" Galana Plaza ,  Kilimani , Nairobi ")).toBe("Kilimani, Nairobi");
  });

  it("keeps short addresses as they are", () => {
    expect(shortArea("Kilimani, Nairobi")).toBe("Kilimani, Nairobi");
    expect(shortArea("Westlands")).toBe("Westlands");
  });

  it("returns null when there is no address", () => {
    expect(shortArea(null)).toBeNull();
    expect(shortArea("")).toBeNull();
    expect(shortArea("  ,  ")).toBeNull();
  });
});
```

## Acceptance criteria
- [ ] The acceptance test passes unmodified; the new sticky-tab and timing tests pass; all existing tests pass; `pnpm check`, CI and the Vercel preview are green.
- [ ] Every screen in the map has a side-by-side in `design-ref/compare/` (local, not committed), and the PR's difference table is filled in.
- [ ] The live screenshots (fake data only) are committed to `docs/portfolio/evidence/2026-10-03-fidelity/`.
- [ ] Lighthouse mobile Accessibility stays ≥ 95.
- [ ] Don't merge.

## Out of scope
The owner app (its originals aren't in `design-ref/` yet); new features.
