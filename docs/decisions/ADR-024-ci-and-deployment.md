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

**2026-08-15 — the deployment target is Render, not Fly.io. The premise the Fly
choice rested on no longer exists.**

The Decision above says "Deployment target is Fly.io", and ADR-034 justified it
in part as "**Fly.io — free allowance**". **That allowance is gone**, and the
decision changes rather than the budget.

**Verified against Fly's own documentation on 2026-08-15**, not from memory and
not from a summary:

- **A payment method is required to deploy.** Fly's billing page: *"We require
  an active, valid credit card on file for most Fly.io accounts to do things
  like deploying multiple apps and deploying public images."* The alternative is
  prepaid credits with a **$25 minimum**.
- **There is no ongoing free tier.** The only free thing on the pricing page is
  the first ten hostname certificates per organisation. What exists instead is a
  trial: **2 total VM hours or 7 days, whichever comes first**, after which
  *"your apps will stop running"* until billing is set up.
- **The smallest machine is not free.** `shared-cpu-1x` at 256MB is **$2.02/mo**
  and at 512MB **$3.32/mo**, plus $0.02/GB egress.
- **Autostop is real and does help.** It is on by default for apps created with
  `fly launch`, and *"you don't pay for their CPU and RAM when they're in a
  `stopped` or `suspended` state"* — but a stopped Machine still bills its root
  filesystem at **$0.15 per GB per 30 days**.

So an idle staging API on Fly would cost cents per month. **The blocker is not
the amount — it is that ADR-034 says free tiers, and Fly cannot be reached
without a card or $25 in advance.**

### The decision

**Staging deploys to Render's free instance type.** One web service, built from
`apps/api/Dockerfile`, declared in `render.yaml`, in **Frankfurt** — which is
`eu-central-1`, the same region as the staging Supabase project, so the API sits
beside its database instead of across an ocean.

**ADR-034's "Phase 3 runs on free tiers only" position HOLDS and needs no
amendment.** It was written as a budget position, not as an endorsement of a
particular vendor; Fly appears in it as an example of a free tier, and that
example stopped being true. The position is satisfied by this change rather than
strained by it, and nothing in ADR-034 requires revision. Its bullet naming Fly
should be read as superseded by this amendment.

### What it costs, stated plainly

- **Zero, with no payment method** — Render's free instance type, 512MB RAM and
  0.1 CPU, 750 instance-hours per month per workspace.
- **It sleeps.** A free web service spins down after **15 minutes without
  inbound traffic** and takes **about a minute** to wake, showing a loading page
  meanwhile. For staging — whose only traffic is a smoke test — that is a real
  cost paid by whoever runs the smoke test, and nothing else.
- **It would be indefensible for production**, and this amendment does not
  propose it there. Production is deployed on a tag (Decision above) and is
  neither built nor budgeted yet.

### What it gives up, and the trigger to revisit

**Background workers are not available on Render's free instance type.** Free
covers web services, Postgres, Key Value and static sites; *"Other service types
don't support Free instances"* (Render docs, read 2026-08-15). A worker on
Render is a paid instance.

**ADR-013 requires a worker** — the outbox and booking-expiry processor, running
from the same image as the API and sharing its service layer. The Decision above
describes exactly that: "two processes from one image".

**That is survivable now and not later.** ADR-027 resolved K60: the outbox and
its worker **do not ship in Phase 3**, because no domain email exists until a
domain record exists that someone needs telling about. So Phase 3 needs one
process, and Render's free tier serves one process.

**The trigger to revisit this decision is the booking slice** — specifically,
the moment the outbox worker is built. At that point one of three things has to
happen: pay Render for a background worker, move to a platform whose free or
cheap tier runs two processes, or run the worker some other way. **That is a new
ADR, and this one should be read as valid only until then.** It is named here so
the choice is made deliberately rather than discovered when the first booking
email fails to send.

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
