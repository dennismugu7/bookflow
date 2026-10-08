# Release 1.0.1: a reviewer login for Google Play

**Goal:** Google Play's reviewers can sign in to the owner app with a fixed email and password and find a demo salon full of fake data. Play requires this ("We can't create new accounts"), and Play Console won't open the Target audience form until Sign in details are filled in.

**Branch:** `feat/reviewer-login` → PR. Include this spec and the mockups.

**Mockups (approved by Dennis):** `docs/design/owner-v9/01-review-password.png`, `02-wrong-password.png`. Copy them 1:1.

## Hard rules
- **The review email is `support@mugu-labs.com`.** It's a real Zoho mailbox Dennis owns, and it's already public in the privacy policy.
- **The password is never in the repo, chat, logs or test output.** It lives only in the Vercel environment variable `REVIEW_PASSWORD`, which Dennis sets himself. Tests use a fake one.
- **Only fake data in the demo salon:**
  - phone numbers `+2547000000xx`;
  - client emails `@example.com`;
  - made-up names.
- **Every other email keeps working exactly as today** (Google, or the 6-digit code).
- The usual rules apply:
  - don't read .env files or the auth user list;
  - don't touch Dennis's real account or salon;
  - don't touch the keystore;
  - don't add `design-ref/` or `Claude outputs/`.

## What to build

### 1. Owner app: the sign-in sheet (`apps/owner/src/app/(auth)/sign-in.tsx`)
- A constant `REVIEW_EMAIL = "support@mugu-labs.com"` in a small `lib/review-login.ts`.
- **When the trimmed, lower-cased email equals `REVIEW_EMAIL`:**
  - a **Password** field appears under Email (secure entry with a Show/Hide toggle);
  - "Send me a code" becomes **"Sign in"**;
  - the "We'll email you a 6-digit code" note is hidden.
- This applies on both "Sign in to Bookflow" and "Create your account".
- **Sign in:**
  - POST `{ email, password }` to `${webBaseUrl}/api/review-sign-in`, reusing the base URL that account deletion uses;
  - the server returns `{ token_hash }`;
  - the app calls `supabase.auth.verifyOtp({ token_hash, type: "magiclink" })`;
  - the root layout then routes as usual, to Today.
- **Messages** (red, under the Password field, as in mockup 02):
  - wrong password: "That password isn't right. Try again.";
  - too many tries (429): "Too many tries. Wait 15 minutes and try again.";
  - not configured (503): "Signing in is unavailable. Try again later.";
  - 500 or any other unexpected status: "Something went wrong. Try again.";
  - verifyOtp fails after a 200: "Couldn't finish signing in. Try again.";
  - real network error (the request never gets an answer): the existing connection message.
- The button shows a spinner while busy and can't be tapped twice.

### 2. Web: `POST /api/review-sign-in` (`apps/web`)
- `runtime = "nodejs"`, `Cache-Control: no-store`.
- **Not configured:** if `REVIEW_PASSWORD` is missing or shorter than 24 characters, or `SUPABASE_SECRET_KEY` is missing, return 503 and log which check failed, never the value or its length: "[review] not configured: REVIEW_PASSWORD missing" / "[review] not configured: REVIEW_PASSWORD under 24 characters" / "[review] not configured: SUPABASE_SECRET_KEY missing".
- **Checks:**
  - reject any email except `support@mugu-labs.com` with the same 401 "wrong" answer;
  - compare the password with `crypto.timingSafeEqual` on SHA-256 digests.
- **Rate limit, global (not per instance):**
  - count failed attempts in a new table `private.review_sign_in_attempts (id, created_at)`, which only the service role can use;
  - after **5 failures in 15 minutes**, return 429 without checking the password.
- **On success** (all through the existing admin client, `SUPABASE_SECRET_KEY`):
  1. **Ensure the user exists:** look it up by email with a targeted query/RPC, never by listing all users. If it's missing, create it with `email_confirm: true`.
  2. **Ensure the demo salon** (idempotent; see 3).
  3. Get a token: `auth.admin.generateLink({ type: "magiclink", email })` and return only `properties.hashed_token` as `token_hash`. No email is sent.
- **Never log the password or the token.**

### 3. The demo salon (refreshed on every review sign-in)
- **If the review user has no salon, create one:**
  - **"Demo Salon"**, slug `demo-salon`, tagline "Look your best, feel your best";
  - area "Kilimani, Nairobi";
  - opening hours Mon–Sat 08:00–18:00;
  - **5 services** with prices in KES;
  - **8 fake clients**.
- **Bookings, on every sign-in:** make sure there are bookings
  - **today**: at least 3 (one in progress, one later today, one marked served earlier);
  - **tomorrow**: 2;
  - **in 3 days**: 1.
- **Without piling up:** only add what's missing, and delete demo bookings older than 14 days.
- **Times are Nairobi time** (Africa/Nairobi).
- **If a reviewer deletes the account** (Play reviewers often test this), the next sign-in simply recreates the user and the salon.
- Put the seed in one SQL function, for example `private.ensure_review_demo(owner uuid)`, called by the route with the service role. Then it's testable in pgTAP and runs in a single round trip.

### 4. Version
- App version stays 1.0.0 (runtime 1.0.0).
- Dennis builds a new Play bundle with **`-VersionCode 5`** after the merge.

## Acceptance tests (write these first)
- **pgTAP** `supabase/tests/acceptance/20_review_login.sql`:
  - `ensure_review_demo` creates exactly one salon, with 5 services and 8 clients;
  - calling it twice adds no duplicates;
  - bookings exist for today, tomorrow and in 3 days (Nairobi);
  - all phones match `+2547000000__` and all emails end with `@example.com`;
  - `anon`/`authenticated` can't use `private.review_sign_in_attempts` or the function.
- **Route unit tests** (fake `REVIEW_PASSWORD`, mocked admin client):
  - 503 when not configured;
  - 401 for a wrong password;
  - 401 for any other email;
  - 429 after 5 failures;
  - 200 returns `token_hash` only;
  - the password never appears in any log call.
- **Owner unit tests:**
  - the password field shows only for `support@mugu-labs.com` (case and spaces ignored);
  - the button label switches;
  - each error maps to its message.
- **`pnpm check` and CI green.**

## Docs
- `docs/testing/review-login.md`:
  - how Dennis sets `REVIEW_PASSWORD` in Vercel (Production; a random password of 32+ characters from a password manager), then redeploys;
  - what Google's reviewers see;
  - how to change the password.
- Don't merge. Dennis approves with `approved: merge PR #<n>`.
