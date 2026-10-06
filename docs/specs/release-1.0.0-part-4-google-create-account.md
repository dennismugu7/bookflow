# Release 1.0.0, part 4: Google "Create account" done properly (approved by Dennis, 2026-10-06)

Same branch and PR (#33). Add this spec and `docs/design/owner-v8/` to the PR.

**Scope: Create account with Google only.** Sign in with Google comes next, in a separate step, once this passes on the phone. Don't change the email-code flow.

## What's wrong today (Dennis, on the 1.0.0 debug APK)
After picking an account in Google's chooser, the screen **greys out, flashes, then jumps** to Create your salon. There is no sign that anything is happening, and the flash feels like the app is about to crash.

The cause is the legacy Google Sign-In API (`@react-native-google-signin/google-signin`, Original API): it opens its own invisible `SignInHubActivity` over the app, which is likely where the dim and the flash come from. It also skips Google's modern chooser and consent styling.

**Reference:** Dennis's monday.com screenshots, a Credential Manager "Sign in with Google" flow: chooser "to continue to monday", then "Allow Google to sign you in to monday", then into the app.

## The flow to build (copy `docs/design/owner-v8/01`–`05`)
1. **Tap Continue with Google.** The button **instantly** shows a white spinner in place of the G and label, at the same size and colour. It can't be tapped again. **Nothing else on the screen dims, moves or changes.**
2. **Google's account chooser** (Android Credential Manager, Sign in with Google button flow): "Choose an account **to continue to Bookflow**".
3. **First time for that account only:** Google's "**Allow Google to sign you in to Bookflow**" with Cancel / Agree and share. Returning accounts skip it.
4. **Back in Bookflow:**
   - the same sheet; the button keeps spinning and **"Signing you in…"** appears under it;
   - **no grey overlay, no flash, no blank frame, no remount of the sheet** while we exchange the token and load the account;
   - the email field and "Send me a code" are disabled meanwhile.
5. **Then:** a smooth transition (a slide or fade of about 200 ms, the same as the app's normal navigation) to **Create your salon** for a new account, or **Today** if the account already has a salon.

**Cancel** (back out of the chooser or the consent): the button returns to normal with no message. **Errors:**
- the button returns to normal and a short message appears under it: "Google sign-in didn't finish. Try again or use your email.";
- debug builds also show the raw code, as now.

## How
- **Replace** `@react-native-google-signin/google-signin` with **Android Credential Manager**:
  - `androidx.credentials` + `com.google.android.libraries.identity.googleid`;
  - use `GetSignInWithGoogleOption` (the button flow, which shows the chooser and the consent) with the **web client ID** as the server client ID.
- **Implementation options:**
  - a small **local Expo module** (Kotlin) in the repo, which is free and fully under our control; or
  - a free, maintained library, if one does exactly this with a config plugin.
  - **No paid libraries.** Say which you chose and why.
- **Nonce:**
  - generate a random nonce per attempt, give Google its SHA-256 and give Supabase the raw value (`signInWithIdToken({ provider: "google", token, nonce })`);
  - **turn `skip_nonce_check` back off** (`.github/workflows/auth-config.yml` and `supabase/config.toml`), and update the PR's trade-off note: it's now resolved.
- **Log out and after Delete account:** call `clearCredentialState`, so the next tap shows the chooser again.
- **No flash:**
  - keep the current screen mounted until the session **and** the membership (salon or none) are both loaded, then navigate once;
  - the root layout must not render a blank screen, a splash or a dimmed overlay during the auth state change. Find and remove whatever causes the grey frame today, and say what it was.
- **Tests (mocked):** the nonce hashing, the token → session step, the cancel and error mapping, and the single navigation after both loads.

## Phone checks (Dennis, by hand; the debug APK, same signing key)
1. Create your account → Continue with Google: the spinner appears instantly, nothing dims.
2. The chooser says "to continue to Bookflow".
3. Pick an account that has never used Bookflow (Dennis has several): the "Allow Google to sign you in to Bookflow" consent appears; Agree and share.
4. Back in the app: "Signing you in…" with a spinner, **no grey, no flash**, then a smooth move to Create your salon.
5. ← back (sign out), then Create your account → Google with the **same** account: no consent this time, straight to Create your salon, still with no flash.
6. Cancel in the chooser: the button goes back to normal, no message.

## Acceptance criteria
- [ ] `pnpm check`, CI and `expo-doctor` green; the tests above pass.
- [ ] Rebuild the debug APK and give Dennis the path.
- [ ] Phone checks 1–6 recorded in the PR after Dennis tests.
- [ ] Don't merge.
