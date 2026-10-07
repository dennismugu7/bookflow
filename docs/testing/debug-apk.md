# Debug APK for testers

A **debug** build of Bookflow Owner that testers can inspect (logs, the React Native dev menu, `adb`). It's built on Dennis's laptop, without Expo's cloud, into one `.apk` file you can share (for example on MEGA). Spec: `docs/specs/ops-03-debug-apk.md`. For the signed release APK to share with real users, see `release-apk.md`.

- It talks to the **real** (production) Supabase project. Use test accounts and fake data.
- It gets **no over-the-air updates**. Each test round needs a fresh APK.
- Menu shows `Version 0.5.0-debug · <commit>` at the bottom. Testers quote it when they report a problem.

## Build it (Dennis)

You need the following on the laptop. The script checks all of them and says what's missing.
- JDK 17
- the Android SDK, with `ANDROID_HOME` set (here `C:\Android`)
- Node and pnpm
- `gh` signed in
- `C:\Users\denni\secrets\google-services.json`

From the repo root, in PowerShell:

```powershell
git checkout main; git pull
pnpm install
pnpm --filter owner build:debug-apk
```

The script ends by printing the file and its size, for example:

```
APK:  C:\Users\denni\builds\bookflow-owner-0.5.0-debug-20261006-0930-1a2b3c4.apk
Size: 160.2 MB
```

**Options:**
- `-GoogleServices <path>`, or the `BOOKFLOW_GOOGLE_SERVICES_JSON` environment variable: use another `google-services.json`. The file is never copied into the repo.
- `-SupabaseUrl` / `-SupabaseAnonKey`, or `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`: use other public Supabase values. By default they come from the GitHub repository variables (`gh variable get`).
- `-OutDir <folder>`, or `BOOKFLOW_BUILDS_DIR`: save the APK somewhere else.

To pass options, run the script directly: `powershell -File apps/owner/scripts/build-debug-apk.ps1 -OutDir D:\apks`.

**Notes:**
- A first build takes about 10–20 minutes (Gradle downloads). Later builds are faster.
- Build from a clean `main` checkout. Uncommitted changes in `apps/owner` are included, and the script warns you about them.

## Install it (testers)

1. **Uninstall every other Bookflow build first** (Play Store, internal or preview APKs). This APK has a different signature, so Android won't install it over another one. Uninstalling signs you out, which is fine.
2. Download the `.apk` onto the phone, and open it from Files or Downloads.
3. When Android asks, allow **Install unknown apps** for the app you opened it with (Chrome, Files or MEGA). Then tap **Install**.
4. If Play Protect warns about an unknown app, choose **More details → Install anyway**.
5. Open Bookflow. It starts at Welcome without a computer attached. Sign in as usual, and allow notifications when asked.

To move to a newer debug APK, uninstall the old one first, then install the new one.

From 1.0.0 the APK is signed with the builder's own debug key (`%USERPROFILE%\.android\debug.keystore`), not Expo's public one, so Google sign-in can recognise it. The script prints the key's SHA-1 at the end; it must be registered on the Android OAuth client for `com.mugulabs.bookflow`. Testers uninstall an older debug APK once before installing it.

## Collect logs

**On the phone:** shake it to open React Native's dev menu (debug builds only). Its tools that need a computer work when the phone is connected with `adb` as below.

**On a computer with `adb`** (Android platform-tools):
1. On the phone: Settings → About phone → tap **Build number** 7 times. Then Settings → Developer options → turn on **USB debugging**.
2. Connect the USB cable and accept the prompt on the phone. `adb devices` should list it.
3. Capture the app's logs while you reproduce the problem:

   ```powershell
   adb logcat -c
   adb logcat --pid=$(adb shell pidof -s com.mugulabs.bookflow) > bookflow-log.txt
   ```

   (Open the app first, so it has a process ID.) Stop with Ctrl+C.
4. For JavaScript messages only: `adb logcat ReactNativeJS:V *:S`.
5. Send `bookflow-log.txt` together with the version line from Menu.

**Before sharing logs:** they can contain booking details. Check them first, and share them only with the team.
