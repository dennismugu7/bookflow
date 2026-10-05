# Release prep 1: privacy policy, terms, and deleting an account

**Goal:** Bookflow meets Google Play's policy requirements before closed testing.
- A privacy policy and terms at public URLs.
- Owners can delete their account inside the app.
- Anyone (owner or client) can delete their account from a web page, without the app.

**Branch:** `feat/legal-and-delete-account` → PR. Include the lead's uncommitted files: this spec, `docs/design/owner-v7/`, `docs/legal/`, the screen-map update and the acceptance test.

**Designs (approved by Dennis, 2026-10-06):** `docs/design/owner-v7/01`–`07`. They are adapted from originals 29, 33 and 35–38; app blue replaces the originals' black and purple (approved). ADR 0009 applies: copy the mockups, use a fresh session (`/clear`) and make side-by-sides.

**Ships as an over-the-air update to 0.5.0 plus a web deploy.** There are no new native modules.

## 1. Database (one new migration)
- **`private.deletion_feedback`:** `id`, `reason text not null check (reason in ('accident','other_app','too_complicated','other'))`, `details text check (char_length(details) <= 300)`, `role text check (role in ('owner','client'))`, `created_at`. It has **no user column**. No access for `anon` or `authenticated`.
- **`public.get_account_deletion_summary() returns jsonb`** (authenticated; `security definer`, `stable`, `set search_path = ''`):
  - shape: `{"email": "...", "salons": [{"id", "name", "upcoming"}]}`;
  - `salons` lists only salons where the caller is the **only** owner (those are deleted with them);
  - `upcoming` = the salon's confirmed bookings that start after now.
- **`public.delete_account_data(p_user_id uuid, p_reason text, p_details text) returns void`** (`security definer`; execute for **`service_role` only**, revoked from `public`, `anon`, `authenticated`):
  - an unknown reason, or details longer than 300 characters → `BF400`;
  - inserts the feedback row (role is `owner` if the person is a member of any salon, else `client`; details are trimmed, empty → null);
  - deletes every salon where the person is the only owner (the cascade takes its bookings, clients, staff, services, hours, photos rows and so on);
  - sets `email = null` on every `clients` row linked to the person. The salon keeps the visit record;
  - it does **not** delete the auth user: the server does that next. Memberships in shared salons, push tokens and preferences go with the auth user (existing cascades), and `clients.user_id` becomes null (existing `on delete set null`).
- Regenerate types.

## 2. Server: `POST /api/account/delete` (web app, Node runtime)
- **Auth:** an `Authorization: Bearer <access token>` header (the owner app) or the signed-in web session (the web page). Verify it with `auth.getUser(token)`; otherwise `401`.
- **Body:** `{ "reason": "accident" | "other_app" | "too_complicated" | "other", "details"?: string }`, validated with zod (`400` on bad input).
- **Steps, in this order:**
  1. As the user, call `get_account_deletion_summary` to get the salon IDs.
  2. With the service role, delete every storage object under `salon-media/<salon_id>/` for those salons (list recursively, remove in batches of 100). If this fails, return `500` and change nothing else.
  3. With the service role, call `delete_account_data`.
  4. `auth.admin.deleteUser(user_id)`.
  5. Return `{ "deleted": true }`. On the web, also clear the session cookies.
- **Abuse protection:** at most 5 attempts per user per hour (a simple in-memory or table-based limit is fine). Never log the token or the details text.
- **Tests:** unit-test the body validation and the order of steps with the Supabase calls mocked.

## 3. Owner app
- **Menu (`01`):** a **Settings** row (Feather `settings`) in General, below Notifications.
- **Settings (`02`, original 33):**
  - a top bar with ←, then the large "Settings" title;
  - **Privacy policy** and **Terms of service** (Feather `arrow-up-right` on the left, chevron on the right) open `/privacy` and `/terms` in the in-app browser (`expo-web-browser`, already installed);
  - the outlined red **Delete account** pill at the bottom.
- **Reasons (`03`, originals 35/36):**
  - × closes the flow and goes back to Settings;
  - four radio options; **Something else** shows a text box (max 300, with a counter when close to the limit);
  - **Continue →** is disabled until a reason is chosen (and some text, for Something else).
- **Confirm (`04`, original 37):**
  - ← goes back to reasons, × closes;
  - the text names the salon(s) from `get_account_deletion_summary` (no salon: just "your account");
  - the warning appears only when `upcoming > 0`;
  - the tick box enables the red **Delete account** button.
  - On tap: show a spinner, then call `/api/account/delete` with the access token. On success, unregister the push token, clear local storage and the session, then go to `05`. On error, show it under the button and stay.
- **Deleted (`05`, original 38):** the screen with **Done**, which goes to Welcome. Back must not return into the app.
- **Links:** the Create account sheet's "Terms" and "Privacy Policy" links (owner-v5 02) open the same pages.

## 4. Web
- **`/privacy` and `/terms` (`07`):**
  - render `docs/legal/privacy.md` and `terms.md` at build time (copy them into the web app, or import them; keep one source of truth);
  - the site's header, Urbanist, max width 680 px, readable line length, headings with anchors;
  - footer links to both pages on the salon page, My bookings and the sign-in pages.
- **`/delete-account` (`06`):**
  1. email → the 6-digit code (the existing sign-in components) → the same reasons and confirm steps as the app (`03`, `04`, web layout);
  2. → `POST /api/account/delete` → the deleted message (`05`).
  - If the visitor is already signed in, skip to the reasons.
  - The page works without JavaScript errors on a basic Android browser.
- **Robots:** all three pages are indexable. Add them to the sitemap if there is one.

## 5. Acceptance test (lead-owned: copy verbatim, already in the working tree)
- `supabase/tests/acceptance/19_account_deletion.sql`

## Acceptance criteria
- [ ] All acceptance tests (SQL 01–19, all TS) pass unmodified; `pnpm check`, CI and `expo-doctor` green; types regenerated.
- [ ] Side-by-sides for `01`–`07` and the differences table (ADR 0009).
- [ ] A local end-to-end run on fake data:
  - an owner deletes from the app, and their salon, its photos in storage and their auth user are gone, while a co-owned salon remains;
  - a client deletes from `/delete-account`, and their visit rows remain with email and user_id cleared.
- [ ] The production URLs for `/privacy`, `/terms` and `/delete-account` are listed in the PR (Dennis needs them for the Play Console).
- [ ] Don't merge.

## Out of scope
Data export (download my data), changing the email address, reactivating a deleted account, notifying clients of a deleted salon.
