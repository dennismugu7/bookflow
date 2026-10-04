# Release 0.5.0 — Owner app: Google sign-in and push notifications

**Goal:** owners sign in with one tap through Google (or the email code as now), and their phone tells them the moment a client books or cancels online.

**Branch:** `feat/owner-google-and-push` → PR. Include the lead's uncommitted files: this spec, `docs/design/owner-v5/`, the screen-map update and the two acceptance tests below.

**Designs (approved by Dennis, 2026-10-04):** `docs/design/owner-v5/01`–`05`. ADR 0009: copy the mockups; use a fresh session (`/clear`) and side-by-sides.

**Ships as a new APK, version 0.5.0** (new native modules: `expo-notifications`, `expo-web-browser`). Bump `app.json` and `package.json` to 0.5.0. Updates for 0.4.0 phones stop at the 0.4.0 runtime, as before.

## 1. Google sign-in (mockups `01`, `02`)
- **Sign in / Create account sheet:** keep the `AuthSheet` layout (original 05) and back button. From the top:
  - Google's official button ("Continue with Google": blue `#4285F4`, white square with the four-colour G);
  - an "or use your email" divider;
  - the email field;
  - a blue **Send me a code** button;
  - the line "We'll email you a 6-digit code. No password needed.";
  - in create mode, the Terms and Privacy line at the bottom. The links point to `https://bookflow-web-pearl.vercel.app/terms` and `/privacy`; the pages come with release prep, so a 404 is fine for now.
  - The code screen (04) is unchanged.
- **Flow (no new Google Cloud client):**
  1. Set the Supabase client to `flowType: "pkce"`. Email codes keep working.
  2. Call `signInWithOAuth({ provider: "google", options: { redirectTo: "bookflow://auth/callback", skipBrowserRedirect: true } })`, then `WebBrowser.openAuthSessionAsync(url, redirectTo)`.
  3. On success, `exchangeCodeForSession(code)`, then the same routing as after a code: onboarding if the person has no salon, otherwise the tabs.
  4. If the person cancels or closes the browser, stay on the sheet silently. Errors use the sheet's error style: "Google sign-in didn't finish. Try again or use your email."
- **Redirect allow-list:** add `bookflow://**` to `uri_allow_list` in `.github/workflows/auth-config.yml` and to `additional_redirect_urls` in `supabase/config.toml` (keep the two in step).
- Google sign-ups of an email that already has a code account link to the same user (Supabase's default). Don't change it.

## 2. Push notifications

### Database (one new migration). Functions are `security definer` with `set search_path = ''`.
- **`private.push_tokens`** (`token text primary key`, `user_id uuid not null references auth.users on delete cascade`, `updated_at`). No direct access for `anon` or `authenticated`.
- **`public.register_push_token(p_token text) returns void`** (authenticated):
  - The token must match `^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$`, else `BF400`.
  - Upsert by token, moving it to the caller if another user had it (a shared phone).
- **`public.unregister_push_token(p_token text) returns void`** (authenticated): deletes the caller's row for that token.
- **Preferences:**
  - Store them in **`private.notification_prefs`** (`user_id` primary key; `new_bookings`, `cancellations`, `morning_summary` booleans with defaults true, true, false).
  - **`public.get_notification_prefs() returns jsonb`** returns the defaults when the caller has no row.
  - **`public.set_notification_prefs(p_new_bookings boolean, p_cancellations boolean, p_morning_summary boolean) returns jsonb`** upserts the row and returns the new values.
  - The JSON shape is exactly `{"new_bookings":…,"cancellations":…,"morning_summary":…}`.
- **`private.push_outbox`** (`id bigint identity`, `user_id`, `kind` in `new_booking | cancellation | morning_summary`, `booking_id` nullable, `salon_id`, `title`, `body`, `data jsonb`, `created_at`, `sent_at`, `error text`).
- **Triggers on `public.bookings`** queue one outbox row per member of the salon (`salon_members`) whose matching preference is on:
  - **New booking:** a `source = 'web'` booking becomes `confirmed`, whether by an insert or by an update from `held`. Bookings with `source = 'owner'` never notify.
    - Title: `New booking · <client full name>`.
    - Body: `<service names, comma-separated, by position> · <when> · with <staff display name>`.
  - **Cancellation:** a `confirmed` booking becomes `cancelled` and the acting user (`auth.uid()`) is not a member of that salon (in practice the client, through `cancel_my_booking`).
    - Title: `Booking cancelled · <client full name>`.
    - Body: `<services> · <when>`, plus `· "<reason>"` when there is a cancel reason.
  - **`<when>`** is in the salon's timezone, relative to the salon's local date at that moment: `Today, 14:00`, `Tomorrow, 10:30`, otherwise `Mon 5 Oct, 10:30`.
  - **`data`** = `{"kind", "booking_id", "date"}`, where `date` is the booking's local date as `YYYY-MM-DD`.
  - Read service names when the trigger fires (a web hold already has its services).
- **Morning summary:** `public.queue_morning_summaries(p_at timestamptz default now()) returns int`, with execute revoked from `public`, `anon` and `authenticated`.
  - For each member with `morning_summary` on, whose salon's local time at `p_at` is between 07:00 and 07:59, and who has no `morning_summary` row for that salon on that local date yet, it queues a row and returns the count.
  - It only sends when the day has at least one confirmed or completed booking.
  - Title: `Today at <salon name>`.
  - Body: `<n> booking(s) · first at <HH:MM> with <staff>`, using "booking" for 1.
  - `data` = `{"kind":"morning_summary","date"}`.
  - Schedule it with **pg_cron** every 15 minutes (enable the extension in the migration).
- **Delivery:**
  - An `after insert` trigger on `push_outbox` sends with **pg_net** (`net.http_post`) to `https://exp.host/--/api/v2/push/send`. Send one message per token of that user: `title`, `body`, `data`, `sound: "default"`, `channelId: "bookings"`, `priority: "high"`.
  - Mark `sent_at` when queued to pg_net. Rows for users with no tokens stay unsent, which is harmless.
  - No secrets are needed: Expo's push "enhanced security" stays off. Note this in the PR.
  - Removing tokens Expo reports as `DeviceNotRegistered` is out of scope; tokens are refreshed on every app start.
- Regenerate types.

### Owner app
- **Permission screen (`03`):** shown once, the first time a signed-in owner with a salon reaches the tabs and Android's permission isn't granted yet. Remember that it was shown in SecureStore.
  - **Turn on notifications** → Android's own prompt → if granted, register the token.
  - **Not now** → the tabs.
  - Either way, never show the screen again automatically.
- **Token:** while signed in with permission granted, get `getExpoPushTokenAsync({ projectId })` on each app start and call `register_push_token`. On log out, call `unregister_push_token` before signing out.
- **Android channel** `bookings` (name "Bookings", high importance), created at start-up. Foreground notifications show as a banner too.
- **Tap (`04`):** implement `src/lib/notification-target.ts` (the acceptance test fixes its behaviour). A target for today opens Today; another day opens Calendar → Day on that date. Then open that booking's sheet if it's in the list; a cancelled booking just shows the day. Handle taps that start the app as well as taps while it's running.
- **Menu → Notifications (`05`):** a bell row in the Menu's General section, opening a screen with ← and three switches.
  - The switches are New bookings ("When a client books online"), Cancellations ("When a client cancels") and Morning summary ("Today's bookings at 07:00").
  - They load from `get_notification_prefs` and save immediately with `set_notification_prefs`. Saves are optimistic; on failure, revert and show the error.
  - When Android's permission isn't granted, show "Notifications are off on this phone? **Open phone settings**" (`Linking.openSettings()`), or a **Turn on notifications** button if Android can still ask.
- **Firebase file:** read Android's `google-services.json` from the EAS file environment variable `GOOGLE_SERVICES_JSON` in `app.config.js` (`android.googleServicesFile`). Never commit the file; add `google-services.json` to `.gitignore`. Dennis creates the Firebase project and uploads the file and the FCM key after the PR; local runs without it must still build and start, with push simply unavailable.
- **Permissions:** only add what notifications need (`POST_NOTIFICATIONS` and what FCM merges in). Keep the existing blocked list, and list the final merged manifest permissions in the PR.

## 3. Acceptance tests (lead-owned: copy verbatim, already in the working tree)
- `supabase/tests/acceptance/17_notifications.sql`
- `apps/owner/src/lib/notification-target.acceptance.test.ts`

## Acceptance criteria
- [ ] All acceptance tests (SQL 01–17, all TS) pass unmodified; `pnpm check`, CI and `expo-doctor` green; types regenerated.
- [ ] Side-by-sides for `01`, `02`, `03` and `05` (mockup | live) and the differences table (ADR 0009). For `04`, a screenshot from an emulator or a description.
- [ ] Google sign-in tested on a web or dev build as far as possible without the APK. Say what couldn't be tested.
- [ ] A local run showing outbox rows for a web booking and a client cancellation, and none for an owner booking.
- [ ] The PR lists Dennis's steps, one per line: Firebase project, the `GOOGLE_SERVICES_JSON` EAS variable, the FCM V1 key upload, then the build.
- [ ] Don't merge.

## Out of scope
iOS, staff-only alerts and per-staff routing (2c), email or SMS alerts, reminders to clients, notification history inside the app, cleaning up dead tokens.
