# Ops 04: a release APK built on Dennis's laptop, signed with his own key

**Goal:** one PowerShell command builds a **release** (non-debug) APK of the owner app on the laptop, with no Expo cloud build. It is signed with Dennis's own release key, so he can share it directly (MEGA, WhatsApp) with real users and testers.

**Branch:** `ops/release-apk` → PR. Include this spec.

## The key (created by Dennis, 2026-10-06)
- **Keystore:** `C:\Users\denni\secrets\bookflow-release.p12` (PKCS12), alias `bookflow`.
- **SHA-1:** `F2:D1:7D:B2:41:BC:67:03:8C:F9:1B:40:5B:C4:59:F6:EA:8F:97:69`. It's public; Dennis is registering it as an Android OAuth client in Google Cloud.
- **Hard rules:**
  - never read, print, copy, move or commit the keystore or its passwords;
  - the script asks for the password at run time with `Read-Host -AsSecureString` (or reads it from an environment variable Dennis sets himself in that window);
  - it passes the password to Gradle without echoing it, and clears it afterwards;
  - nothing secret goes into the repo, the logs or the APK;
  - `*.p12`, `*.jks` and `*.keystore` must be in `.gitignore` (add them if missing).

## What the APK must be
- **Release build:**
  - `assembleRelease`, not debuggable, minified as the release config already does;
  - the JS bundle embedded;
  - no dev client and no dev menu.
- **Same app:** `com.mugulabs.bookflow`, version **1.0.0**, versionCode from `app.json`/EAS. Pick a versionCode at least as high as the newest EAS build (3), and print it.
- **Signed with the key above.** The script verifies with `apksigner verify --print-certs` and stops unless the SHA-1 equals `F2:D1:7D:B2:41:BC:67:03:8C:F9:1B:40:5B:C4:59:F6:EA:8F:97:69`.
- **Works like a store build:**
  - push (`google-services.json` from `C:\Users\denni\secrets\`, as in the debug script);
  - the Google web client ID (via `gh variable get GOOGLE_WEB_CLIENT_ID` when not passed);
  - the Supabase public values as in the debug script;
  - the script stops if the client ID isn't in the bundle (reuse the debug script's check, and clear the Metro cache first).
- **Over-the-air updates ON:** runtime `1.0.0`, channel `preview`, the same as the EAS preview APK, so testers get fixes without reinstalling.
- **Menu version line:** plain `1.0.0` (no "debug").

## How
- `apps/owner/scripts/build-release-apk.ps1`, plus `pnpm --filter owner build:release-apk`.
  - Share the common parts with `build-debug-apk.ps1` (a small shared module is fine) instead of copying them.
  - It restores `package.json` after prebuild, as the debug script does.
- **Output:** `C:\Users\denni\builds\bookflow-1.0.0-release-<yyyyMMdd-HHmm>-<sha>.apk`, printing the path, size, versionCode and verified SHA-1.
- **Inject signing through Gradle properties** at build time (`android.injected.signing.*`), or a small config plugin behind an environment flag. Nothing about the key may land in the repo, and `apps/owner/android/` stays git-ignored.
- The EAS profiles stay exactly as they are; prove it with `npx expo config --type public` with and without the flag.

## Docs
- Add a "Release APK" section to `docs/testing/debug-apk.md` (or a new `docs/testing/release-apk.md`):
  - how to run the script;
  - the **backup rule** (keystore plus password in two safe places; losing either means no more updates);
  - that people with an Expo-built or debug Bookflow must uninstall once before installing this one, because of the different signing key.

## Acceptance criteria
- [ ] `pnpm check` and CI green.
- [ ] Dennis runs the script once (Claude Code can't type the password), and the APK verifies with the SHA-1 above.
- [ ] On the phone: install (after uninstalling the debug app), Google sign-in works, Menu shows 1.0.0, and a web booking push arrives with the white B.
- [ ] Don't merge.
