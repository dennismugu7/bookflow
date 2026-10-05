# Bookflow — Build Journal

A running record of how Bookflow was built: what we did, what went wrong, and how we fixed it. It is the raw material for the final case study.

**Team:** Dennis (product owner, tester, final merge approval) · Claude in Cowork (tech lead: specs, designs, code review) · Claude Code (builder, on Dennis's laptop, driven over remote control from a phone).

Entry format: **Context → Challenge → What we did → Outcome.** Decisions with lasting impact also get an ADR in [`docs/adr/`](../adr/).

---

## 2026-10-02 — Day 1: plan, foundations, first deploy

### Choosing the stack
- **Context:** Android-only owner app + public booking web app; goal is a reliable SaaS and a portfolio piece.
- **Challenge:** Kotlin (native Android) versus Expo (React Native).
- **What we did:** compared reliability, testing speed over remote control, code sharing with the web app, and portfolio value. Reliability is the same either way because it comes from the backend. Expo won on iteration speed (instant updates to a phone, no reinstalls) and shared TypeScript with the web app. → [ADR 0001](../adr/0001-expo-for-owner-app.md)
- **Outcome:** Expo + Next.js + Supabase in one monorepo, with every business rule enforced in Postgres. → [ADR 0002](../adr/0002-monorepo-thin-clients-supabase.md)

### Getting a second opinion on the plan
- **Context:** the first plan estimated about 11 weeks of build.
- **Challenge:** an independent review found real gaps: conflicting dates, time savings that were counted twice, a hidden dependency (phone login needed SMS, scheduled 3 phases later), and the risk of the builder writing tests that confirm its own misunderstandings.
- **What we did:** fixed the dates; moved SMS login to phase 1 on test numbers; planned the Play Store closed test for early November so it runs alongside the build; made v1 launch without deposits so payments can't block launch; made the lead own the acceptance tests. We also pushed back where the review overreached, for example on how much the early closed test saves (about 3 days, not 2 weeks).
- **Outcome:** a plan with one consistent timeline and an explicit risk register. → [ADR 0004](../adr/0004-v1-without-deposits.md), [ADR 0005](../adr/0005-lead-owned-tests-human-merge.md)

### Working remotely from a phone
- **Context:** Dennis had 10 minutes at the laptop before switching to remote control.
- **What we did:** used those minutes only for things that need a person at the laptop: GitHub login, git setup, disabling sleep on AC power, pre-approving routine commands so remote sessions don't stall.
- **Lesson:** Dennis asked for **one instruction at a time**. Mixing a GitHub task and a Claude Code prompt in one message led to a missed step (a merge that never happened). Since then every message carries exactly one action.

### Scaffold (PR #1)
- **What we did:** pnpm + Turborepo monorepo; Next.js 16 web app; Expo SDK 57 Android app; shared package with tests; CI on every pull request.
- **Challenge 1:** pnpm 12 silently ignored `node-linker=hoisted` in `.npmrc`, which React Native needs. **Fix:** Claude Code noticed the install layout was wrong, found that pnpm 12 reads the setting from `pnpm-workspace.yaml`, and moved it there.
- **Challenge 2:** TypeScript 7 was out, but typescript-eslint and Expo didn't support it yet. **Fix:** pinned TypeScript 6.0.3 across the repo.
- **Challenge 3:** a placeholder screen string didn't appear in the Android dev bundle. **Fix:** it was lazy-loaded. A production export confirmed the shared code really reached Android.
- **Outcome:** `pnpm check` green from a fresh clone; CI green.

### Making the repo public, safely
- **What we did:** before switching to public, scanned the full git history for env files, private keys, tokens and passwords (0 real hits). Added an "all rights reserved" notice, protected `main` (PR plus passing checks required, admins included), and enabled secret scanning and push protection. Verified by attempting a direct push to `main`, which was rejected. → [ADR 0003](../adr/0003-public-repo.md)
- **Challenge:** Claude Code's own safety check refused to merge a PR without human review.
- **Outcome:** we kept it that way. Dennis is the only one who merges, so a human signs off on every change that reaches `main`.
- **Lead's mistake:** a read-only `git status` run from the lead's sandbox left a stale `index.lock` that would have blocked Claude Code. Caught immediately and moved aside; the lead now uses `--no-optional-locks` for repo reads.
- **Later the same day:** to keep Dennis working from one app, merges moved to Claude Code, but only on the exact phrase "approved: merge PR #<n>" from Dennis himself. The sign-off stays explicit and auditable; GitHub still blocks merges without green checks.

### First deploy to Vercel
- **Challenge:** the first build failed: `the installed pnpm wrapper is missing`. Vercel's bundled pnpm couldn't switch itself to the exact pnpm 12 version pinned in the repo.
- **What we did:** set `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel installs the pinned pnpm through Node's Corepack, then redeployed.
- **Outcome:** live at `bookflow-web-pearl.vercel.app`. Individual deployment links sit behind Vercel login, while the production domain stays public, as booking links need to.

### Connecting Supabase without creating a second project
- **Challenge:** the "Install Vercel integration" button opened Vercel's Marketplace product, which would have created a brand-new Supabase project billed through Vercel. That would have used up the free tier's 2-project limit.
- **What we did:** didn't install it. Added the two public keys (project URL and anon key) to Vercel by hand as **Config** variables. They ship to the browser anyway, so marking them Secret was wrong, which is what Vercel's warning was pointing out.
- **Outcome:** no extra project, no billing link, and secret keys never leave Supabase. → [ADR 0006](../adr/0006-secrets-in-dashboards.md)

### Phase 0b: Supabase, Vercel and Expo wired up (PR #2)
- **What we did:** connected the web app to Supabase with a public `/api/health` endpoint; Vercel now skips web builds when only the owner app changes; the owner app gets builds and over-the-air updates entirely from GitHub Actions, so the laptop never logs in to Expo.
- **Challenge 1:** the first `eas update` run failed because it tries to export iOS as well, and the app is Android-only. **Fix:** `--platform android` on every update command.
- **Challenge 2:** the build-info line couldn't tell the APK's built-in bundle apart from an over-the-air update, because both have an ID. **Fix:** check whether the running bundle is the embedded one, not whether an ID exists; covered by unit tests.
- **Challenge 3:** Vercel preview links are behind login, so the health check couldn't be verified on the PR. **Fix:** verified on production right after merge: `{"status":"ok","supabase":"ok","commit":"d1f126e"}`.
- **Process change (PR #3):** merges moved to Claude Code on Dennis's exact phrase `approved: merge PR #<n>`.

### First build on a real phone
- **What we did:** Claude Code started the EAS build from the command line through the GitHub workflow; Expo built it in about 20 minutes; Dennis installed the APK on his phone.
- **Outcome:** the app runs on a real device, showing the shared `formatKes` output and the build channel. Evidence: [`evidence/2026-10-02-first-apk.jpg`](evidence/2026-10-02-first-apk.jpg).
- **Milestone:** Phase 0 complete on day 1. Code goes from commit to CI, to the web in production, and to an installable phone app, all driven from a phone.

### Phase 1a: the database enforces the rules (PR #4)
- **What we did:** 12 tables; double bookings blocked by a Postgres exclusion constraint; cross-salon links made impossible with composite foreign keys; row-level security on every table; `create_salon()` as the only way to create a salon. The lead wrote 5 acceptance test files (55 assertions), Claude Code added 17 of its own (72 in total), and they run in CI against a fresh local Supabase on every database change.
- **Challenge 1:** the lead's tests count rows, so they failed once demo data was loaded. **Fix:** CI runs the tests on an empty database first, then loads the seed separately. The tests stayed unchanged, as the rules require.
- **Challenge 2:** a phone screenshot headed for the public repo. **Fix:** Claude Code checked its hidden metadata (location data, device info) before committing it.
- **Challenge 3:** the first automatic deploy to Supabase failed: `Invalid access token format`. Claude Code read the CLI source to rule out a version problem (the token pattern is `^sbp_(oauth_|v0_)?[a-f0-9]{40}$` and values aren't trimmed), which narrowed it to the stored secret. **Fix:** a fresh token, pasted with the copy button. The deploy then applied all 4 migrations.
- **Outcome:** any migration merged to `main` now deploys itself; `db` is a required check alongside `check`.

### Phase 1b: the booking engine (PR #5)
- **What we did:** availability, 10-minute holds, confirmation and staff/owner booking actions, all as Postgres functions. 148 database assertions, including a real two-session race in which the second visitor correctly gets "slot not available".
- **Challenge:** Claude Code spotted that the per-IP rate limit trusted a header the visitor can fake. **Decision:** in Phase 3, holds go through a Next.js route that runs a Cloudflare Turnstile bot check and uses Vercel's trusted IP; `create_hold` becomes server-only.
- **Other catches:** the database linter flagged a helper wrongly marked `IMMUTABLE`; a secret-scan hit on `sbp_` turned out to be the regex text in this journal.

### Choosing how clients prove who they are (ADR 0007)
- **Context:** the designs used SMS codes, about KES 2.40 per booking at roughly KES 0.80 per SMS.
- **Research:** WhatsApp's pricing changed on 2026-10-01; every outbound business message is now charged, including replies inside the 24-hour window. Receiving messages is still free.
- **First choice:** a zero-cost "Verify with WhatsApp" flow where the client sends us a pre-filled code. Meta developer sign-up failed, which would have blocked the schedule.
- **Decision:** Google sign-in or an email code (free); the phone is collected but marked unverified. The design keeps a slot for WhatsApp verification later.
- **Lesson:** don't let an external approval sit on the critical path; design the seam so it can be added later.

### Hardware break
- The laptop was shut down for a RAM upgrade (16 GB to 32 GB), which ended the Claude Code session. Nothing was lost: the rules live in `CLAUDE.md`, each task lives in a spec in `docs/specs/`, and the state lives in git. A fresh session picked up from the repo alone.

### Phase 1c: client sign-in, zero cost per booking (PRs #6 to #9)
- **What we did:** clients confirm with Google or a 6-digit email code; the phone they type is stored as unverified, and a database guard means only the confirm functions can ever mark a phone verified. 182 database assertions.
- **Challenge 1:** `supabase config push` would have overwritten dozens of settings we never chose (MFA, pooler, storage). **Fix:** a workflow that sends only the fields we manage to the Management API.
- **Challenge 2:** Supabase's free plan rejects custom email templates without your own email sender, and the default email sends a link, which breaks the booking flow on phones. Creating a dedicated Gmail failed ("phone number used too many times").
- **Fix:** reused the `mugu-labs.com` domain, already verified in Resend. Codes now come from `support@mugu-labs.com` on Resend's free tier. Evidence: [`evidence/2026-10-03-first-code-email.png`](evidence/2026-10-03-first-code-email.png).
- **Pattern worth noting:** three external sign-ups failed in one day (Meta, a Google account, the free email limits). Each time the fix was to find a route that didn't depend on that approval, rather than wait.
- **Milestone:** Phase 1 complete on day 2 (planned for 12 to 23 Oct).

### Phase 2a: owner sign-in and the app shell (PRs #10 and #11)
- **What we did:** owners sign in with a 6-digit email code (no passwords to leak or reset), create their salon with a live preview of its booking link, and share it from the phone's share sheet. The theme comes straight from the design system; the session is stored in Android's secure storage, split into chunks because each item holds at most 2 KB.
- **Challenge:** the first over-the-air update was published before the Supabase settings reached EAS, so the app opened unconfigured. The settings-sync workflow had also skipped installing dependencies. **Fix:** PR #11, then the update was re-published.
- **Lesson:** configuration should be a precondition the pipeline checks, not an order of steps someone has to remember. The workflows now fail with a clear message when a value is missing.

### Phase 2b: set up the salon and go live (PR #12)
- **What we did:** brand (logo and banner, resized on the phone before upload), services, team, opening hours and location. **Publishing is checked by the database:** `set_salon_published` refuses a salon without bookable services, a team and hours, and a trigger blocks any direct change to `is_published`, so no screen can skip the checks. Photos go into a public bucket where each salon's folder is writable only by its owner.
- **Testing on the phone found two bugs** that the automated tests couldn't: a picked image stayed grey until you left the screen, and links shared from the Google Maps app weren't understood.

### Fix 1: image previews and short Maps links (PR #13)
- **Images:** the slot only rendered the uploaded file. **Fix:** show the local file at once, then switch to the uploaded one with a cache-busting version so a replaced logo never shows the old copy.
- **Maps:** we followed the short `maps.app.goo.gl` link and read coordinates from where it led. All tests passed.

### Fix 2: Google Maps links point to a place, not coordinates (PR #14)
- **What happened:** Dennis pasted a real link from his phone and it still failed. The real redirect goes to `/maps/place/<name>/data=…` with a place ID and **no coordinates at all**. Fix 1's tests passed because their sample URLs had coordinates, so the tests encoded our assumption rather than Google's behaviour.
- **Decision:** we don't need coordinates. We store the owner's own link (it opens the exact place for directions), show the place name so the owner can confirm it's right, and the web page uses Google's keyless map embed. Free, and simpler than what we had.
- **Lesson:** a test fixture is a claim about the outside world. Capture a real sample before writing one. The acceptance test now uses the actual redirect captured from Dennis's phone.
- **Milestone:** Phase 2b complete and verified on the phone on day 2 (3 Oct), about 10 days ahead of plan.

### Phase 3a: clients book online (PR #15)
- **What we did:** the public salon page and the booking flow: services → team member → time → a short hold → sign in → confirmed. **Holds are created only on the server (ADR 0008):** behind Cloudflare Turnstile, with the client's IP read from Vercel's headers and an httpOnly cookie, so a script can't block a salon's diary.

### Design fidelity: the build must look like the designs (PRs #16 to #22, ADR 0009)
- **What happened:** Dennis compared the live screens with his original designs and the drift was obvious: wrong font, grey tints, cropped cards, missing back buttons.
- **Root cause:** specs described screens in words, and words leave room for interpretation.
- **Fix (ADR 0009):**
  - the design images win over the spec text;
  - `docs/design/screen-map.md` names the image each screen copies, and lists approved deviations;
  - every UI PR includes side-by-sides (mockup | live) and a differences table;
  - UI work starts in a fresh Claude Code session.
- **Also:** switched to Urbanist, the owner app redesign (Menu tab, white pages, a one-time welcome animation) and a single splash screen.
- **Lesson:** "make it match" is not a spec. A picture plus a rule that the picture wins is.

### Release 0.4.0 and installing builds (PR #23)
- **Challenge:** after the version bump, updates stopped reaching the phone. That's by design: an update only applies to the same runtime version, and the phone still had 0.3.0. Play Protect then blocked the correct APK.
- **Fix:** install 0.4.0 ("More details → Install anyway") and identify builds by their git ref.
- **Lesson:** say in the release note when a new APK is required.

### Phases 3b, 4a, 4b and 4c: the core product (PRs #24 to #27)
- **3b:** clients see their bookings, rebook, and cancel up to 2 hours before.
- **4a:** Today shows the real day: stats, next up, free gaps you can fill, and walk-in bookings. It updates live.
- **4b/4c:**
  - Calendar has Day (a column per team member, with time off), Week and List views.
  - Clients has search and segments (new, regular, lapsed), defined in SQL so the app and the tests agree.
  - The client profile has stats and private notes.

### Release 0.5.0: Google sign-in and push notifications (PR #28)
- **Google:** the web OAuth flow (PKCE) through Supabase, so no new Google client was needed.
- **Notifications:**
  - database triggers queue an alert for each new web booking and each client cancellation;
  - `pg_net` sends it to Expo's push service, and `pg_cron` sends a 07:00 morning summary;
  - no server code and no secrets.
- **Firebase:** the file comes from an EAS file variable, so it's never committed.
- **Tested on the phone end to end:** both alerts arrived within seconds, and tapping one opened the booking.
- **Incident:** a cleanup command in the build session damaged the lead's mockups. They were restored byte for byte, and nothing damaged was committed.

### Release 0.5.1: salon photos and link sharing (PRs #29 and #30)
- **What we did:**
  - up to 6 salon photos (the first is the banner) with a swipeable slider on the salon page;
  - an owner-editable share message;
  - a 1200×630 JPEG preview card made for WhatsApp, about 97 KB.
- **Why:** Dennis noticed the shared link arrived in WhatsApp as a bare URL. The page already pointed to the banner, but WhatsApp skips large images.
- **Lesson:** platform limits (here, the size WhatsApp accepts) belong in the spec as numbers.
- **Milestone:** owner app at feature parity with the plan's core scope on day 5 (5 Oct).

---

## Evidence to capture as we go
- [ ] Screenshots: plan timeline, architecture diagram, first deploy, first booking, CI checks
- [x] First APK running on a phone (2026-10-02)
- [ ] Short screen recording of each major flow (booking, owner setup, Today view)
- [ ] Numbers: test count, CI duration, web performance score, app bundle size, bugs found by tests before reaching Dennis
- [ ] Pilot salon quotes (with permission)
