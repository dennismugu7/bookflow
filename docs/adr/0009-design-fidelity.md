# ADR 0009: Dennis's original designs are the source of truth for how screens look

**Status:** accepted (2026-10-03).

## Context
After Phase 3a, the client pages drifted noticeably from Dennis's original designs. In a side experiment, Claude Code sessions given only the design images produced near-identical screens. Our drift had five causes:
1. The lead translated images into written specs, and detail was lost at each step.
2. Specs said "this spec wins over the image", so the lead's approximations overrode the real layouts.
3. For Phase 3a, the original client screens weren't available to Claude Code at all.
4. Tests checked behaviour, never looks, and the lead reviewed screenshots against the spec rather than the design.
5. One long session carrying the database, auth and deploys gave the UI less attention.

## Decision
- **For anything visual, the design image wins:** layout, spacing, sizes, type hierarchy, colours and copy. Specs describe behaviour, data and an explicit **"Approved deviations"** list with a reason for each. Anything not on that list is copied from the image.
- **`docs/design/screen-map.md`** maps every route or step to its design images. The images live in `design-ref/`, which is git-ignored because they contain third-party photos.
- **Visual check before every UI PR:**
  - Capture each screen at 390×844 with fake seed data.
  - Build a side-by-side image (design | live) in `design-ref/compare/`.
  - Fix every difference not on the deviations list, and report anything left.
  - Commit the live screenshots (fake data only) under `docs/portfolio/evidence/`.
- **UI tasks start in a fresh Claude Code session** (`/clear`), so the design and the UI code get the full attention, as in the experiment. Database and API work stays in specs as before; one repo keeps the schema shared.
- **Small UI PRs,** one screen or flow at a time.

## Consequences
- The lead's design-system PNG becomes a token reference only (colours, radius), and Urbanist is the font (Dennis's choice).
- Reviews compare against Dennis's designs, not the spec text.
- UI PRs take a little longer to prepare, and far fewer rounds of fixes.
