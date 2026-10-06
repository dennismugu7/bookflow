# Release 1.0.0, part 2: Dennis's phone findings (2026-10-06)

Same branch and PR as `release-1.0.0.md` (`release/1.0.0`, PR #33). Add this spec to the PR. These items join 1.0.0; nothing ships until all are done and tested on the phone.

## A. Native Google sign-in (replaces the Chrome tab)
**Why:** Dennis compared Bookflow's sign-in with another app's. The other app shows Google's native account chooser as a small popup over the app; Bookflow opens a full Chrome tab that loads slowly and feels like a spammy redirect. The Chrome tab is also the root of the memory-kill bug fixed in part 1, and of "continue to eqhsg…supabase.co".
- Use `@react-native-google-signin/google-signin` (free "Original" API; config plugin, so new native code; 1.0.0 is a new build anyway).
  - `GoogleSignin.configure({ webClientId: <Google web client ID> })`;
  - `GoogleSignin.signIn()` → ID token → `supabase.auth.signInWithIdToken({ provider: "google", token })`;
  - sign out of `GoogleSignin` on Log out and after Delete account, so the next sign-in shows the chooser again.
- **Web client ID:** the existing web OAuth client that Supabase already uses. It is public (not a secret). Read it from `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: an EAS environment variable (plaintext) for builds, and an argument or environment variable for the debug-APK script. Dennis adds the value; don't read `.env` files.
- **Supabase:** the native token has no nonce we control, so enable `skip_nonce_check` for Google:
  - in `.github/workflows/auth-config.yml` (`external_google_skip_nonce_check: true`);
  - and in `supabase/config.toml`.
  - Note the trade-off in the PR.
- **Google Cloud** (Dennis, guided by the lead, in parallel): an **Android** OAuth client for `com.mugulabs.bookflow` for each signing key: EAS release, Android debug, and later Play App Signing. Print the **SHA-1 of the debug keystore** the APK script uses (`keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android`) and put it in the PR, so Dennis can register it.
- **Errors:**
  - cancel → stay silently;
  - `DEVELOPER_ERROR` (SHA-1 not registered yet) → "Google sign-in isn't set up on this build yet. Use your email." Log the code;
  - no Play Services → the same message.
- **Remove** the Chrome-tab Google flow and its link handling (`+native-intent`, the newest-link plugin, `prompt=select_account`) if nothing else needs them. If you keep any of it, say why. Email code sign-in is unchanged.
- **Tests:** the token-to-session step and the error mapping, mocked.

## B. Bookings don't appear on Today (bug, high priority)
**Reported:**
- In Xenon Saloon (a fresh salon, created with the xenon Google account on 6 Oct), Dennis added a booking from Today (+), which saved;
- a client then booked from the web, and the **New booking notification arrived**;
- **neither booking appeared on Today**, even after closing and reopening the app.

**What to do:**
- **Find the cause first.** Use the debug APK and logcat; with Dennis's OK, read Xenon Saloon's rows (bookings, staff, opening hours). Do **not** read the auth user list. Candidates:
  - the date or timezone used by Today versus the booking's date;
  - Today filtering by staff or opening hours that a fresh salon doesn't have;
  - the agenda query failing silently (an error swallowed into "No bookings yet");
  - a realtime subscription not set up for a salon created in the same session.
- **Fix it**, and add a regression test at the right level: SQL acceptance-style if it's the database, unit if it's the app.
- An agenda load error must show an error state with **Try again**, never "No bookings yet".
- **Pull to refresh** on Today, Calendar (all views) and Clients, using the platform's standard pull-down spinner, as a backup to live updates.

## C. Bottom sheets close by dragging the handle down
Every bottom sheet in the owner app:
- booking card;
- share sheet;
- date picker;
- cancel, no-show and log out sheets;
- photo actions;
- the "When" picker in New booking;
- and any others.

All of them close with a **downward drag** on the handle or sheet (with a threshold and a spring back if it isn't dragged far enough), as well as on a tap outside. Fix it once in the shared `BottomSheet`. List every sheet in the PR, and confirm each on the phone.

## D. "Changes saved" confirmation
After a successful save on any edit screen, show a small **toast**: a green check with "Changes saved", green text on a light-green fill with a green border.
- **Edit screens:** My brand, My services (add/edit), My team (add/edit), Opening hours, Location, Notifications, Booking link message, client edit, and New booking ("Booking saved").
- **Placement:** top right, below the status bar. Fade in, stay ~2 s, fade out. Not covered by the keyboard. Announced to screen readers.
- One shared `Toast` component and hook, used everywhere.
- **Errors** keep their current inline red style.

## E. Friendlier phone error
- Replace "Enter a phone number like 0712 345 678, or leave it empty." with **"Enter a valid phone number"** everywhere it appears (New booking, Add client, Edit client, salon phone).
- A shared constant, so it can't drift.

## F. Notification icon
- The notification's small icon still shows Expo's default. Use the white B (`assets/images/android-icon-monochrome.png`, or a dedicated 96×96 white-on-transparent `notification-icon.png` made from it) and colour `#221671`, through the `expo-notifications` plugin config.
- Confirm with a real push on the phone.

## Acceptance criteria (in addition to part 1)
- [ ] All tests green, `pnpm check`, CI, `expo-doctor`.
- [ ] On the phone (debug APK):
  - Google sign-in shows the native chooser popup; a new account → create your salon; an existing one → Today;
  - Log out, then sign in again shows the chooser.
- [ ] Bookings added in the app and from the web appear on Today straight away; pull to refresh works; the cause is written in the PR.
- [ ] Every bottom sheet closes by dragging down, checked one by one.
- [ ] "Changes saved" appears on each listed screen.
- [ ] The new phone error text, and the B notification icon.
- [ ] Don't merge.
