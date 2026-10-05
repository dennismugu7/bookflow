# Ops 03: a debug APK for testers, built on Dennis's laptop

**Goal:** Dennis's testers get a **debug** build of the owner app, so they can inspect everything (logs, layout and network inspectors, `adb` debugging). It is built locally on the laptop (Windows, PowerShell) with one command, without Expo's cloud, and the result is a single `.apk` file Dennis can share (for example on MEGA).

**Branch:** `ops/debug-apk` → PR. Include this spec.

## What the APK must be
- **Debuggable:** `android:debuggable="true"`, signed with the standard Android debug key. No release keystore and no Expo credentials are involved.
- **Standalone:**
  - the JavaScript bundle and assets are **embedded**, so it opens without Metro, a dev server or the Expo dev-client launcher;
  - `expo-dev-client` must not be active in this build;
  - React Native's in-app dev menu may stay available.
- **Same app ID** `com.mugulabs.bookflow`, so push notifications work with the existing Firebase app. Testers uninstall any other Bookflow Owner build first; the different signature means it can't install over one.
- **Push works:** the build uses `google-services.json` from a path outside the repo, given as an argument or an environment variable. Default: `C:\Users\denni\secrets\google-services.json`. Never copy it into the repo, and never print its contents.
- **No over-the-air updates:** a debug build doesn't take them. Each tester round gets a fresh APK. The version line in Menu shows `0.5.0-debug · <git short sha>`, so testers can report which build they have.
- **Supabase values:** the public `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are passed in by the script (from arguments, environment variables, or the GitHub repository variables via `gh variable get`). Don't read or create `.env` files.

## How
- A script, `apps/owner/scripts/build-debug-apk.ps1` (plus `pnpm --filter owner build:debug-apk` calling it), that:
  1. checks the prerequisites (JDK 17, Android SDK, `ANDROID_HOME`) and says clearly what's missing;
  2. runs `expo prebuild --platform android --clean` with whatever configuration the debug build needs;
  3. runs `gradlew assembleDebug`;
  4. copies the result to `C:\Users\denni\builds\bookflow-owner-<version>-debug-<yyyyMMdd-HHmm>-<sha>.apk` and prints the path and size.
- Anything the debug build needs goes behind an environment flag in `app.config.js` or a small local config plugin. Examples: embedding the bundle (React Native's `debuggableVariants`) and leaving out `expo-dev-client`.
- **Hard rule:** the preview, internal, production and development EAS builds must not change. Prove it in the PR: `npx expo config --type public` (and the prebuild output if relevant) are identical with and without the flag unset.
- `apps/owner/android/` stays git-ignored, as now.

## Acceptance criteria
- [ ] `pnpm check` and CI green.
- [ ] The script runs end to end on the laptop and produces the APK.
- [ ] Prove these about the APK:
  - `aapt dump badging` (or `apkanalyzer`) shows the package `com.mugulabs.bookflow`, debuggable and version 0.5.0;
  - `assets/index.android.bundle` is inside the APK;
  - nothing secret is inside it beyond what any Android app with Firebase contains.
- [ ] If an emulator or USB device is available: it installs, opens to Welcome without Metro, signs in, and receives a test push. Otherwise say what couldn't be checked.
- [ ] A short `docs/testing/debug-apk.md` for Dennis:
  - how to run the script;
  - how testers install it (uninstall other Bookflow Owner builds first, allow installs from unknown sources);
  - how to collect logs (`adb logcat`, or the dev menu).
- [ ] Don't merge.
