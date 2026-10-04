# Release 0.4.0 — Owner app: splash, real map, Play internal testing

**Why a new APK:** these changes touch native code, so they can't ship over the air. Bump the owner app to **0.4.0**. That changes the runtime version, so later updates target 0.4.0 only, and Dennis must install 0.4.0 to keep receiving them.

**Branch:** `release/owner-0.4.0` → PR. Include the lead's uncommitted spec.

## 1. Splash matches the original (`design-ref/original-owner/01-splash.png`)
- Android 12+ only allows a **centred icon on a solid colour** for the system splash; a full-screen image isn't possible there. So the splash comes in two steps:
  1. **System splash:** the B logo, centred, on a solid colour from the darkest part of `01` (sample it, about `#2A1E8C`). Configure it through the `expo-splash-screen` config plugin: `image` from the B mark exported from `01`, at the size of the B in `01`, plus `backgroundColor` and `imageWidth`.
  2. **In-app splash:** straight after, show `01` itself, full screen (cover), until fonts and the session are ready (at least 600 ms), then fade into the first screen.
- The B mark and the full splash are Dennis's own artwork, so commit them under `apps/owner/assets/splash/`.
- In the report, say exactly what Dennis will see on Android 12+ versus older versions.

## 2. A real map in Location
- Add `react-native-webview` (approved), installed with `npx expo install` so the version matches the SDK.
- Location, pin set: replace the drawn map with a 180 px, radius 12, non-interactive WebView of Google's keyless embed (`mapsEmbedUrl(query)` from `@bookflow/shared`):
  - `query` = `"lat,lng"` if saved, else the place name from the link, else the address.
  - A transparent tap layer on top opens `maps_url` in Google Maps.
  - While it loads, and if it fails offline, show the current drawn map.
- Keep the WebView locked down:
  - JavaScript only as needed for the embed;
  - no file access;
  - `originWhitelist` limited to `https://maps.google.com` and `https://www.google.com`;
  - any other navigation opens in the browser, never inside the WebView.
- Add a short screen-map note: "Location shows a real map from 0.4.0 (Dennis, 2026-10-04)".

## 3. Builds for Play internal testing
- Add an EAS build profile `internal`: `android.buildType: app-bundle` (AAB), `channel: preview` (so the same over-the-air updates keep flowing during testing), `environment: preview`, with the version managed as now.
- Let the `eas-build.yml` workflow pick this profile. Keep `preview` (APK) for direct installs.
- **Don't add automatic Play submission yet.** Google requires the first upload of a new app to be manual in Play Console. Automated `eas submit` with a service account comes in a later task.
- In the report, give Dennis the exact steps to:
  1. trigger the `internal` build from GitHub Actions;
  2. download the `.aab` from the EAS build page;
  3. the Play Console steps for the first internal-testing release (create the app with package `com.mugulabs.bookflow`, then Internal testing → Create release → upload the AAB → add testers by email list → share the opt-in link).

  Flag anything Play Console will ask for before the release can go out (for example data safety or a privacy policy), so the lead can prepare it.

## Acceptance criteria
- [ ] `pnpm check`, CI and `expo-doctor` green; `app.json` version is `0.4.0`.
- [ ] A local Android build or prebuild check passes. If an emulator is already installed, attach screenshots of the splash and of the Location map; if not, say so (Dennis will check on the phone).
- [ ] The WebView only loads Google Maps embed URLs. Add a unit test for the URL guard.
- [ ] Don't merge. Don't start any EAS build: the build runs from GitHub after merge, when Dennis triggers it.

## Out of scope
Automated Play submission, Phase 3b, Phase 4, the Privacy Policy page (the lead prepares it if Play requires it).
