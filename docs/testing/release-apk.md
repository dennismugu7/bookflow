# Release APK

A **release** build of Bookflow Owner, built on Dennis's laptop without Expo's cloud and signed with Dennis's own release key. Share the `.apk` directly (MEGA, WhatsApp) with real users and testers. Spec: `docs/specs/ops-04-release-apk.md`. For the inspectable tester build, see `debug-apk.md`.

- Not debuggable, minified, JS bundle inside. No dev client and no dev menu.
- App `com.mugulabs.bookflow`, version `1.0.0`. Menu shows `Version 1.0.0`.
- **Over-the-air updates on**: runtime `1.0.0`, channel `preview`, the same as the EAS preview APK. Fixes published to `preview` reach it without reinstalling. Once it runs one, Menu shows `Version 1.0.0 · update 7 Oct` (the update's date) instead of `Version 1.0.0`.
- It talks to the **real** (production) Supabase project.

## Build it (Dennis)

You need the same things as for the debug APK (JDK 17, Android SDK with `ANDROID_HOME`, Node and pnpm, `gh` signed in, `C:\Users\denni\secrets\google-services.json`), plus the keystore `C:\Users\denni\secrets\bookflow-release.p12`.

From the repo root, in PowerShell:

```powershell
git checkout main; git pull
pnpm install
pnpm --filter owner build:release-apk
```

The script asks for the keystore password (nothing shows while you type). It checks the password and the key's SHA-1 before the build starts. It ends like this:

```
APK:  C:\Users\denni\builds\bookflow-1.0.0-release-20261006-0930-1a2b3c4.apk
Size: 70.2 MB
versionCode: 3
Signed with SHA-1: F2:D1:7D:B2:41:BC:67:03:8C:F9:1B:40:5B:C4:59:F6:EA:8F:97:69 (verified)
```

It stops with an error if the APK isn't signed with that SHA-1, is debuggable, or is missing the Google web client ID.

**Options** (run the script directly to pass them: `powershell -File apps/owner/scripts/build-release-apk.ps1 -VersionCode 4`):
- `-VersionCode <n>`: default `3` (the newest EAS build). Never lower: Android won't install a lower versionCode over a higher one. Raise it for each APK you hand out after the first.
- `-Keystore <path>`: default `C:\Users\denni\secrets\bookflow-release.p12`.
- `BOOKFLOW_KEYSTORE_PASSWORD`: instead of typing the password, set it yourself in that PowerShell window (PowerShell 7: `$env:BOOKFLOW_KEYSTORE_PASSWORD = Read-Host -MaskInput`). The script runs in its own process, so remove it from your window afterwards: `Remove-Item Env:BOOKFLOW_KEYSTORE_PASSWORD`.
- `-GoogleServices`, `-SupabaseUrl` / `-SupabaseAnonKey`, `-GoogleWebClientId`, `-OutDir`: as for the debug APK.

**How the password is handled:** it lives only in that build's process environment (Gradle reads it as `android.injected.signing.*` properties; Gradle runs with `--no-daemon`, so no process keeps it). It is never on a command line, in a file, in the logs or in the APK, and it is cleared at the end, even when the build fails.

## Back up the key

Keep the keystore file **and** its password in **two** safe places, for example a password manager plus an encrypted USB stick. Never in this repo, email or chat.

If you lose either one, no APK can ever update installed copies of Bookflow again: every user would have to uninstall (losing their sign-in) and install a new app.

## Install it

**People who have any other Bookflow** (a Play Store, EAS preview or debug build) must **uninstall it once** first. Those builds are signed with a different key, so Android refuses to install this one over them. Uninstalling signs you out, which is fine.

Then: download the `.apk` onto the phone, open it from Files or Downloads, allow **Install unknown apps** when asked, and tap **Install**. If Play Protect warns, choose **More details → Install anyway**.

Later release APKs (same key, higher versionCode) install over this one without uninstalling.

## Google Play bundle

For Google Play, the same script builds an **Android App Bundle** (`.aab`) instead, signed with the same laptop key. Spec: `docs/specs/ops-05-release-aab.md`. No Expo cloud build.

**The APK and the AAB are separate builds.** The APK is for sharing directly (MEGA, WhatsApp); the AAB is only for uploading to Play Console. Build each one when you need it.

From the repo root, in PowerShell:

```powershell
powershell -File apps/owner/scripts/build-release-apk.ps1 -Bundle -VersionCode 4
```

(or `pnpm --filter owner build:release-aab -VersionCode 4`). It asks for the keystore password like the APK build, and ends like this:

```
AAB:  C:\Users\denni\builds\bookflow-1.0.0-4-play-20261008-0930-1a2b3c4.aab
Size: 60.1 MB
versionCode: 4
Channel: production
Signed with SHA-1: F2:D1:7D:B2:41:BC:67:03:8C:F9:1B:40:5B:C4:59:F6:EA:8F:97:69 (verified)
Recorded versionCode 4 in release-versions.json.
```

It stops with an error if the AAB isn't signed with that SHA-1 (checked with `jarsigner` and `keytool`), is debuggable, has the wrong package, versionCode or update channel, or is missing the Google web client ID.

- Same app config as the release APK: `com.mugulabs.bookflow`, version `1.0.0`, not debuggable, JS bundle inside, push, Google sign-in.
- **Over-the-air updates on the `production` channel** (runtime `1.0.0`), not `preview`. Play installs get **only** updates published to `production`; fixes published to `preview` reach the shared APK and EAS preview builds, not Play users.

**The versionCode rule:** `-VersionCode` is required for an AAB, because Play rejects a number it has seen before. The script refuses a number lower than or equal to the highest in `apps/owner/release-versions.json` (EAS already used `3`, so the first AAB is `4`), and records the new number there after a successful build. Commit that file change through a PR so the number is never reused. Use the next free number every time, even if a build was never uploaded.

**Play App Signing:** on the first upload Play keeps its own app-signing key, and the laptop key (`F2:D1:…:97:69`) becomes the **upload key**. Play re-signs what it installs on phones with its own key. So:
- Play Console (**Test and release → App integrity → App signing**) shows an **app-signing key SHA-1**. That SHA-1 must be added in Google Cloud as an Android OAuth client for `com.mugulabs.bookflow`, or Google sign-in fails in apps installed from Play.
- A Play install and a shared APK are signed with different keys: a phone with one must uninstall it before installing the other.
- Keep backing up the laptop key: every future upload must be signed with it.
