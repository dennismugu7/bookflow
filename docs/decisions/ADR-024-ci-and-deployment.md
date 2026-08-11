# ADR-024 — CI and deployment

**Status:** Accepted

## Context

K53 asked which cloud CI provider builds and signs iOS, and how signing credentials are
managed given no local macOS. It was created by ADR-015 (Flutter on a Windows development
machine) and classified S, blocking Phase 2 — the project manual stands CI up before feature
work, not after.

The broader CI provider was never chosen either, and `DEFINITION_OF_DONE.md` already makes
"CI is green end to end" and "regenerated client shows no uncommitted diff" hard gates. Those
gates need somewhere to run.

## Decision

**GitHub Actions. One CI system for everything.**

**On every push:** install → lint → type-check → unit tests → integration tests against a
Postgres service container → contract regeneration drift check → build. **A drift in the
regenerated OpenAPI spec or Dart client fails the build.**

**Flutter job:** `flutter analyze`, `flutter test`, Android build.

**iOS:** a **macOS runner**, with signing credentials supplied as encrypted secrets and
imported at build time.

**Deployment target is Fly.io.** The API and the worker are **two processes from one image**,
per ADR-013. **Staging deploys automatically on merge to `main`; production deploys on a tag.**

## Consequences

- **CI is the only mechanism by which an iOS artifact can exist.** The development machine is
  Windows; there is no local fallback, no "just build it manually" path, and a broken iOS job
  means no iOS build at all rather than a slower one.
- **macOS runner minutes are billable on private repositories** and cost several times what
  Linux minutes do. The iOS job should not run on every push to every branch; that scoping is
  a Phase 2 implementation detail, but the cost is a standing constraint, not a surprise.
- Signing credentials in encrypted secrets means the certificate and provisioning profile
  exist in exactly one place, and rotating them is a secrets change rather than a machine
  visit.
- The drift check is what makes ADR-014's "hand-written Dart models are prohibited"
  enforceable. Without it the prohibition is a convention; with it, it is a build failure.
- Integration tests against a service container rather than a shared database means CI runs
  are isolated and parallel-safe.
- One image with two processes keeps the worker and the API on identical code, which is what
  ADR-013 requires when the worker shares the service layer.
- Deploy-on-tag for production means releases are deliberate acts, and the tag is the record
  of what shipped.

## Items resolved

K53 (iOS CI provider and signing credential management). It was S, and it was the only item
blocking Phase 2.

## Items created

None.

## Amendments

**2026-08-11 — the CI database is the Supabase stack, not a plain Postgres service container.**

The Decision above specifies "integration tests against a Postgres service container".
`.github/workflows/ci.yml` does not do that, and has not since the workflow was written. **This
records the divergence rather than leaving the ADR and the workflow to contradict each other.**

What CI actually runs: `supabase start` with **eleven services excluded** — `kong`, `postgrest`,
`storage-api`, `imgproxy`, `realtime`, `mailpit`, `postgres-meta`, `studio`, `edge-runtime`,
`logflare`, `vector`, `supavisor` — leaving the database and **`gotrue`**.

Why, in one sentence: **stock Postgres does not have the `auth` schema.** ADR-013 puts Supabase
Auth in the stack and ADR-027 now makes GoTrue the owner of every auth record and every auth
email, so the schema an integration test runs against has to include `auth` or the test stops
being evidence about the system that ships. `gotrue` is retained specifically because it is what
creates and owns that schema; verified locally that with those eleven exclusions `auth` still
has its full set of tables.

The exclusions are a speed measure and nothing more — every excluded service is unused by a
suite that speaks SQL through Kysely and nothing else. The verified job runs in about 2m45s.

**2026-08-11 — the iOS job's trigger conditions.**

The Decision above says the iOS job runs on a macOS runner and notes that macOS minutes are
billable on private repositories, calling the scoping "a Phase 2 implementation detail". This
records what that detail turned out to be.

**`ios-build` runs on push to `main`, on `workflow_dispatch`, and on a pull request only when
the PR carries the `ios` label.** It does not run on every push.

**Rationale, measured rather than estimated:** macOS bills at **ten times** the Linux rate
against the included allowance. The job's observed wall time is 1m44s, which GitHub rounds up
to 2 minutes, giving **20 billable minutes per run** — about 1% of the 2,000-minute monthly
free-tier allowance for a private repository. The two Linux jobs on the same run cost roughly
10 billable minutes together. Running iOS on every push to every branch would therefore cost
several times what the rest of CI does, to re-prove a compile that changes only when
`apps/mobile` does.

The label makes the expensive job **opt-in per pull request**, so a change that touches iOS can
still be proven before merge without every unrelated PR paying for it. `main` and
`workflow_dispatch` cover the cases where the result matters regardless.
