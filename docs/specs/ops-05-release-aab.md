# Ops 05: a Google Play bundle (AAB) from the laptop, signed with Dennis's key

**Goal:** the release script can also build an **Android App Bundle (.aab)** for uploading to Google Play, signed with the same laptop key as the release APK (ops 04). No Expo cloud build is needed.

**Branch:** `ops/release-aab` → PR. Include this spec.

## Context
- Dennis has a Play developer account. The Bookflow app is being created in Play Console now and has no uploads yet.
- On the first upload, Play enrols the app in **Play App Signing**:
  - Google keeps its own app-signing key;
  - Dennis's laptop key (`F2:D1:7D:B2:41:BC:67:03:8C:F9:1B:40:5B:C4:59:F6:EA:8F:97:69`) becomes the **upload key**;
  - Play then shows an **app-signing SHA-1**, which Dennis registers in Google Cloud so Google sign-in works for Play installs. That's a lead-guided step, not code.
- The same hard rules as ops 04 apply: never read, print, copy or commit the keystore or its password; the password is typed by Dennis at run time.

## What to build
- A **`-Bundle`** switch on `build-release-apk.ps1` (or a sibling `build-release-aab.ps1` sharing the module), plus `pnpm --filter owner build:release-aab`.
- **`bundleRelease`**, with the same app config as the release APK:
  - package `com.mugulabs.bookflow`, version 1.0.0, release (not debuggable), bundle embedded;
  - push via `google-services.json` from secrets;
  - the Google web client ID check;
  - over-the-air updates on: runtime 1.0.0, channel **`production`** for Play builds, not `preview`. Say in the PR what this means: Play installs get only updates published to `production`.
- **versionCode:**
  - **required** for AABs (`-VersionCode N`), because Play rejects a repeated number;
  - the script refuses a number lower than or equal to the highest in a small, committed `apps/owner/release-versions.json`, then records the new one there after a successful build;
  - start at **4**, because EAS already used 3.
- **Signing:** the same Gradle injection as the APK. Verify the bundle's signature (`jarsigner -verify -verbose -certs` or `bundletool`) and stop unless the certificate SHA-1 is `F2:D1:…:97:69`.
- **Output:** `C:\Users\denni\builds\bookflow-1.0.0-<versionCode>-play-<yyyyMMdd-HHmm>-<sha>.aab`, printing the path, size, versionCode, channel and the verified SHA-1.

## Docs
- Add "Google Play bundle" to `docs/testing/release-apk.md`:
  - how to run it;
  - the versionCode rule;
  - that the APK (for sharing directly) and the AAB (for Play) are separate builds;
  - and that **Play App Signing** means Play re-signs installs. The Play app-signing SHA-1 must be added in Google Cloud for Google sign-in.

## Acceptance criteria
- [ ] `pnpm check` and CI green; the APK flow is unchanged (prove the config is identical when building without `-Bundle`).
- [ ] An end-to-end run with a throwaway key. Then Dennis runs it once with the real key and `-VersionCode 4`, and the AAB verifies.
- [ ] Don't merge.
