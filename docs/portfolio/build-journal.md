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

### First deploy to Vercel
- **Challenge:** the first build failed: `the installed pnpm wrapper is missing`. Vercel's bundled pnpm couldn't switch itself to the exact pnpm 12 version pinned in the repo.
- **What we did:** set `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel installs the pinned pnpm through Node's Corepack, then redeployed.
- **Outcome:** live at `bookflow-web-pearl.vercel.app`. Individual deployment links sit behind Vercel login, while the production domain stays public, as booking links need to.

### Connecting Supabase without creating a second project
- **Challenge:** the "Install Vercel integration" button opened Vercel's Marketplace product, which would have created a brand-new Supabase project billed through Vercel. That would have used up the free tier's 2-project limit.
- **What we did:** didn't install it. Added the two public keys (project URL and anon key) to Vercel by hand as **Config** variables. They ship to the browser anyway, so marking them Secret was wrong, which is what Vercel's warning was pointing out.
- **Outcome:** no extra project, no billing link, and secret keys never leave Supabase. → [ADR 0006](../adr/0006-secrets-in-dashboards.md)

---

## Evidence to capture as we go
- [ ] Screenshots: plan timeline, architecture diagram, first deploy, first booking, CI checks
- [ ] Short screen recording of each major flow (booking, owner setup, Today view)
- [ ] Numbers: test count, CI duration, web performance score, app bundle size, bugs found by tests before reaching Dennis
- [ ] Pilot salon quotes (with permission)
