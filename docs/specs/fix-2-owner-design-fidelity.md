# Fix 2 — Owner app matches the original designs

**Found by Dennis:** the owner app's screens drift from his original designs, for the same reason the web did (built from the lead's prose; see ADR 0009). This applies ADR 0009 to `apps/owner`.

**Process (ADR 0009, `CLAUDE.md` rule 11):** read `docs/design/screen-map.md` (owner section), then open **every** image in `design-ref/original-owner/` and `design-ref/live-owner/`. **For anything visual, the image wins; this spec only adds behaviour and capture rules.** The only allowed differences are the owner "Approved deviations" in the screen map.

**Branch:** `fix/owner-design-fidelity` → PR. Include the lead's uncommitted file (`docs/design/screen-map.md`, now with the owner section).

## Scope: screens that exist today
Copy these from the images in the screen map:
- Splash and welcome (`01`, `02`).
- Sign-in sheet and code (`03`/`05`, `04`).
- Create your salon.
- Today, empty (`12`), plus the tab bar.
- Account (`29`–`31`).
- My brand: view, edit and empty (`44`–`46`).
- My services: list, add/edit and empty (`47`–`49`).
- My team: list, add/edit, profile and empty (`50`–`53`).
- Opening hours: view and edit (`56`, `57`).
- Location: view and edit (`58`, `59`).

Keep all current behaviour, data and validation. Visible differences on Dennis's phone today include:
- Today is a lavender card with a purple button. The design has big title text, an illustration, the copy "Share your booking link on WhatsApp or Instagram…" and a blue "Share your booking link ›" pill.
- Account is a grey card list. The design has an avatar circle with initials, plus "General" and "Business Profile" sections with icons.
- My brand is one long form. The design has a **view** card (banner, name, tagline with the logo beside them, and an edit pencil) and a separate **edit** card.
- Services, team, hours and location are missing their view/empty cards, the illustrations and the round **+** buttons.

**Illustrations:** the empty states use the planet/screen illustrations in `44`, `47`, `50` and `54`. Draw our own simple SVGs in the same style and colours, without copying any third-party artwork exactly. Keep them in `apps/owner/src/ui/illustrations/`.

## How to capture the owner app for side-by-sides
The app is Android-only, so pick one, in this order:
1. **Preferred:** run the screens locally with Expo's web target, **only for capture**. Adding `react-dom` and `react-native-web` as **devDependencies** is approved. Don't add `web` to the shipped `platforms`; use a capture-only config or flag. Capture at 390×844 with fake seed data (as on the web) and build `design-ref/compare/owner-<nn>-<screen>.png` (design | live).
2. If the web target can't render a screen faithfully (a native-only module), say so, and capture that screen in an Android emulator **only if one is already installed**. Ask before installing the Android SDK.

Commit the live captures (fake data only) to `docs/portfolio/evidence/2026-10-04-owner-fidelity/`. **Dennis's phone is the final check after merge:** it's JS-only, so it ships as an over-the-air update. Say so in the report if anything needs a new APK.

## Acceptance criteria
- [ ] All existing tests pass; add your own render tests where logic changed; `pnpm check`, CI and `expo-doctor` green.
- [ ] A side-by-side for every in-scope screen, and a differences table in the PR (screen | found | fixed | remaining, each remaining one citing an approved deviation).
- [ ] No behaviour regressions: sign-in, create salon, publish, the brand/services/team/hours/location saves, and log out still work. List the manual steps you ran.
- [ ] Don't merge.

## Out of scope
Phase 4 screens (Today with bookings, booking actions, Calendar, Clients), Profile, Settings, delete account, feedback, help, portfolio, Google sign-in.
