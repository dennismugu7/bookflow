# Release 1.0.0: icon, name, new address, Google sign-in fix

**Goal:** the first public version of the owner app. It carries the app's real icon and the name "Bookflow", the website moves to Mugu Labs' own domain, and Google sign-in works for brand-new accounts.

**Branch:** `release/1.0.0` → PR. Include the lead's uncommitted files:
- this spec;
- `docs/design/brand/` (the icon set);
- the updated acceptance test `packages/shared/src/slug.acceptance.test.ts`;
- the updated `docs/legal/`.

**Ships as a new APK and AAB, version 1.0.0** (native changes: icon and name). Bump `app.json` and `package.json` to 1.0.0; the runtime follows the version (1.0.0). The EAS `slug` (`bookflow-owner`), owner (`mugulabs`) and Android package (`com.mugulabs.bookflow`) **must not change**.

## 1. Icon (approved by Dennis, 2026-10-05)
The icon is made from original 01-splash: the B mark on deep purple. The files are in `docs/design/brand/`:
- `icon.png` (1024×1024): `expo.icon`.
- `android-icon-foreground.png` (512×512, transparent, mark inside the safe zone), `android-icon-background.png` (512×512) and `android-icon-monochrome.png` (432×432, white mark, for themed icons): the `android.adaptiveIcon` foreground, background and monochrome images. Remove the `backgroundColor` override if it fights the background image.
- `play-icon-512.png`: the Play Store icon. Not used by the app; keep it in `docs/design/brand/`.

Copy them over the files in `apps/owner/assets/images/` (same names). The notification icon (`expo-notifications`' `icon`) uses the new monochrome image.

## 2. Name
- `expo.name` = **"Bookflow"**: the launcher label under the icon.
- Change any remaining "Bookflow Owner" text the user can see to "Bookflow" (search the app and docs). The EAS project name and slug stay.

## 3. Website on `bookflow.mugu-labs.com` (domain connected in Vercel by Dennis, 2026-10-05)
- `WEB_BASE_URL` in `packages/shared/src/links.ts` = `https://bookflow.mugu-labs.com`. The lead has already updated the acceptance test. Every booking link, share text and share image, the delete-account and legal links, and the app's `webUrl()` follow from it. Update the unit tests that hard-code the old host.
- **Web metadata:** `metadataBase`, `og:url` and other absolute URLs come from `WEB_BASE_URL`.
- **`apps/web/src/lib/legal.ts`:** the plain-text site pattern recognises `bookflow.mugu-labs.com`. Keep the old host too, so old text still links.
- **Auth** (`.github/workflows/auth-config.yml` and `supabase/config.toml`, in step):
  - `site_url` = `https://bookflow.mugu-labs.com`;
  - add `https://bookflow.mugu-labs.com/**` to the allow list;
  - **keep** the old vercel.app entry, the preview wildcard, localhost and `bookflow://**`.
  - The workflow runs on merge; say so in the PR.
- **Email templates** (`supabase/templates/`): any link or text with the old host uses the new one.
- **Redirect the old address:**
  - in production, requests whose `Host` is `bookflow-web-pearl.vercel.app` get a **308** to the same path and query on `https://bookflow.mugu-labs.com`, using Next middleware or `next.config` `redirects` with a `has: host` condition;
  - **exceptions:** `/api/*`. Phones on 0.5.0 still call `/api/account/delete` on the old host until they update, so it must keep working there, and a POST must not be redirected;
  - preview deployments (`*-dennismugu7-6048s-projects.vercel.app`) are not redirected.
- **Owner app:**
  - the Terms and Privacy links, the delete-account API base and the share sheet all use `WEB_BASE_URL`;
  - the Google OAuth redirect (`bookflow://auth/callback`) is unchanged.
- Leave the old specs and journal entries as they are; they're history.

## 4. Bug: Google sign-in with a new account returns to Welcome
- **Reported by Dennis on the debug APK (0.5.0-debug · 98e551a):**
  1. "Continue with Google" with an account that has never used Bookflow;
  2. the Google pages work;
  3. the app comes back to **Welcome**, signed out, instead of "create your salon".
  - An existing account (dennismugu7) signed in fine with Google on the 0.5.0 preview APK.
- **Find the cause** before changing anything. Use the debug APK with `adb logcat` on Dennis's phone (USB debugging) and Supabase auth logs. Check both the create-account and sign-in entry points, and whether it also happens on a release (preview) build.
  - Likely places to look: the PKCE code verifier surviving the trip to the browser (storage key, or the activity being recreated), `+native-intent` routing `auth/callback` to `/` before `exchangeCodeForSession` finishes, and the root layout's redirect when the session has no salon membership yet.
- **Fix it**, and add a test for the part that's testable (e.g. the routing decision for "signed in, no salon yet" and "callback in progress").
- **In the PR,** state the cause in one or two sentences. Confirm on the phone with a brand-new Google account:
  - Welcome → Create for free → Google → **create your salon**;
  - Welcome → Sign in → Google with a new account → also **create your salon**.

## 5. Acceptance criteria
- [ ] All acceptance tests (SQL 01–19, all TS, including the updated `slug.acceptance.test.ts`) pass; `pnpm check`, CI and `expo-doctor` green.
- [ ] `npx expo config --type public` shows name Bookflow, version 1.0.0, the new icon paths, an unchanged slug and an unchanged package.
- [ ] The debug APK script still works: build `1.0.0-debug` and confirm the icon and the "Bookflow" label on the phone.
- [ ] After merge, prove with `curl -I`:
  - `https://bookflow.mugu-labs.com/s/<a published slug>` → 200;
  - the old host → 308 to the new one;
  - `POST` to the old `/api/account/delete` without auth → 401, not a redirect.
- [ ] The share image and the og tags use the new host.
- [ ] Don't merge.

## Out of scope
Google's consent-screen branding: Dennis does that in Google Cloud, with the lead's steps. Also out of scope: Play listing assets, and the staff phase (dropped).
