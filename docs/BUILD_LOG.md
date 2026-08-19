# Build log

State and process. No rationale — that lives in `docs/decisions/`, linked below.

**This file holds nothing that can go stale without a decision changing.** Facts that change
on their own live elsewhere and are pointed at, never copied: toolchain and provisioning in
`docs/ENVIRONMENT.md`, open-item counts in `docs/analysis/05-triage.md`, the decision list in
`docs/decisions/` itself.

## 1. Where we are

Against `docs/source/Manual-Project-Scaffolding.md`:

| Phase | Status |
|---|---|
| 0 — Frame the app | **complete** — product framed, v1 boundary set, unknowns spiked |
| 1 — Foundational design | **complete** — domain, boundaries, API style, auth model, Do-Not-Vibe surface all decided |
| 2 — Repo, environment, tooling | **complete**, with one carried exception — seed tooling, below |
| 3 — Scaffold the vertical slice | **not started** ← next. Entry conditions in §7. |
| 4–6 — harden · quality gates · release | not started |

**Phase 2, done:** `main` renamed and pushed, GitHub default set (ADR-026) · `.gitattributes`
normalising to LF · npm workspace over `apps/api` and `packages/contracts`, Node pinned to the
24 line · `apps/api` Fastify skeleton with `GET /health` and the `modules/` + `platform/` shape
of `CLAUDE.md` §4 · strict `tsconfig` · ESLint 9 flat config, Prettier, `tsc --noEmit`, Vitest,
and a root `check` script running all four in sequence · `.env.example` (ADR-023).

Then: the local Supabase stack on Postgres 17.6 · one migration, extensions only · Kysely with
types generated from the live schema · root `db:*` scripts · fail-fast environment config ·
unit and integration test layers with a rollback-per-test harness · GitHub Actions running
`npm run verify` on every push and PR, observed both red and green.

Then: the Flutter skeleton in `apps/mobile` — package `com.mugulabs.bookflow`, no screens,
strict analysis options — with `flutter analyze` / `dart format` / `flutter test` / Android
debug build on Linux CI and an unsigned iOS build on macOS CI · a committed pre-push hook
running `npm run verify`.

Then: the contract pipeline — `/health` declared once as a Zod schema, OpenAPI 3.1 generated
from it into `packages/contracts/openapi.json`, the Dart client generated into
`packages/bookflow_api/` and depended on by path, and a CI job that regenerates both and fails
on any diff. Observed failing on deliberate drift and passing once corrected.

**Carried into Phase 3, not done: seed data tooling.** ADR-026 requires `supabase/seed.sql`
plus `npm run seed`, provisioning one demo salon with services, team members, opening hours
and bookings in every status, so that a fresh clone reaches a working state in one command.
**None of it exists**, and none of it could: every row it must insert needs a table, and the
database currently holds extensions and nothing else. It is not deferred for convenience and
it is not a decision anyone dodged — it is blocked on the schema.

**It belongs to Phase 3's first migration.** The moment auth tables and the placeholder domain
table land, the seed becomes writable, and it should be written then rather than after several
slices have accumulated tables it does not know about. Do not treat Phase 2 as owing this;
treat Phase 3's data layer as incomplete without it.

**Two things are accepted rather than done**, both in `docs/ENVIRONMENT.md` §3 with their
trigger conditions, neither a TODO:

- **`main` is unprotected**, and cannot be protected without buying GitHub Pro or making the
  repository public. Not being bought at this stage. The pre-push hook is the compensating
  control; it is weaker and says so when it blocks. Revisit when a second person commits, or
  before the first production release — whichever comes first.
- **iOS is unsigned.** K53 is still open; there is no Apple Developer account. The macOS job
  proves the target compiles and produces nothing installable.

**The API does nothing product-specific.** One static health route, no tables, no auth, no
tests. The database has extensions and nothing else — the domain schema belongs to the first
vertical slice, not to the foundation. `apps/mobile` holds a Flutter skeleton with no screens;
`apps/web` does not exist and must not, until the owner app can configure a real salon
(ADR-001).

## 2. What has been produced

| Path | What it is |
|---|---|
| `CLAUDE.md` | Rules. Loaded every session. Cites ADRs, does not restate them. |
| `DEFINITION_OF_DONE.md` | Binary completion checklist for a slice. |
| `docs/source/` | **Read-only and authoritative.** The original manuals, style reference and design docs. Never edited. |
| `docs/designs/` | 28 native + 16 web screenshots, document order. Filenames are hints; the doc is authoritative. |
| `docs/analysis/` | Derived. 01 screen inventory · 02 backend capabilities · 03 flagged ambiguities · 04 unstated assumptions · 05 triage. |
| `docs/decisions/` | The only place a decision is recorded. One file per ADR; the directory listing is the count. |
| `docs/spikes/` | Executed spike write-ups. Code deleted, verdicts kept. Observations at a moment, never revised. |
| `apps/api/` | Fastify skeleton. `app.ts` builds the instance, `server.ts` listens, one `GET /health`. `src/modules/` and `src/platform/` exist empty, each with a README stating what belongs there. |
| `packages/contracts/` | `openapi.json`, generated from the Zod route schemas in `apps/api`. Committed, never hand-edited. |
| `packages/bookflow_api/` | The generated Dart client package. `apps/mobile` depends on it by path. Regenerated wholesale (ADR-025). |
| `apps/mobile/` | Flutter skeleton, package `com.mugulabs.bookflow`. Placeholder screen, no design system, no API calls yet. |
| `supabase/` | `config.toml` (generated, unmodified) and one migration: extensions only, no tables. Migrations are Do-Not-Vibe. |
| `.github/workflows/ci.yml` | ADR-024's gate. **STALE, CORRECTED 2026-08-19 — it said "four jobs" including `ios-build`.** There are **seven**, all Ubuntu: `verify`, `mobile` (including the Android build), `contracts`, `migrate-staging`, `deploy-staging`, `smoke-staging`, `e2e-staging`. **`ios-build` no longer exists** — ADR-043 makes Android the v1 target and puts iOS out of scope, ending the repository's only 10× runner. The count in that file's own header comment is its one home; this row should not restate it, and the line below is what to run instead: `grep -cE "^  [a-z-]+:$" .github/workflows/ci.yml`. *Original text follows.* ADR-024's gate: four jobs — `verify` (TypeScript), `mobile` (Dart on Linux), `ios-build` (unsigned, macOS, label-gated), `contracts` (drift check). **No deploy job yet** — that is Phase 3. |
| root tooling | `package.json` workspaces and `db:*` scripts · `.nvmrc` · `.editorconfig` · `.gitattributes` · `eslint.config.js` · `.prettierrc.json` · `vitest.config.ts` · `.env.example`. |
| `docs/ENVIRONMENT.md` | **Mutable.** What exists outside the repository — installed tools, remotes, hosted projects, deploy targets — each with the command that verifies it. |

## 3. Decisions so far

| ADR | Summary |
|---|---|
| 001 | Build order: backend → native owner app → client web app |
| 002 | Client reaches their booking by emailed magic link; no client accounts |
| 003 | One business per account, one seat, via a membership table |
| 004 | Business data is private until explicitly published |
| 005 | Kenya only; KES; Africa/Nairobi; Latin script |
| 006 | Bookings snapshot service values, carry line items and one named team member |
| 007 | Two schedule layers; DB exclusion constraint; unverified bookings expire |
| 008 | Contact is a first-class record keyed on normalised phone |
| 009 | Money is bigint minor units with one formatting helper |
| 010 | timestamptz instants vs day-of-week wall-clock, never interchanged |
| 011 | Public immutable asset bucket; private proofs behind an authorizing endpoint |
| 012 | Email only via transactional outbox, delivered by a worker |
| 013 | Postgres on Supabase behind a Fastify API; authz in the repository layer |
| 014 | REST/JSON `/v1`; OpenAPI generated from code; Dart client generated in CI |
| 015 | Flutter for the owner app; iOS builds require cloud CI |
| 016 | UUID primary keys; money asserted at the serialisation boundary |
| 017 | One-hour ES256 access tokens; refresh revoked on logout; no denylist |
| 018 | Social login links only on a provider-asserted verified email |
| 019 | Booking tokens are opaque stored values with time-gated capabilities |
| 020 | Public reads only from the `business_public` allowlist projection |
| 021 | Owner-chosen salon handle; retired handles redirect and are never reassigned |
| 022 | Docker + Supabase CLI locally; raw SQL migrations; Kysely; Vitest; Node 24.x |
| 023 | Three environments; two hosted Supabase projects; `.env.example`; no prod creds locally |
| 024 | GitHub Actions; macOS runner for iOS; Fly.io; staging on merge, production on tag |
| 025 | Zod → OpenAPI 3.1 → `dart-dio` client; both committed; CI fails on drift |
| 026 | `main` branch; trunk-based, squash-merge; no feature flags in v1; `seed.sql` |

## 4. Open work

Open items live in `docs/analysis/05-triage.md`, in one of three classes:

- **`F`** — blocks the foundation. Settle it before writing code that depends on it; a wrong
  answer forces a migration, an auth rewrite, or a module-boundary change.
- **`S`** — blocks a specific slice. **Resolved during that slice's Phase 0, never during
  implementation.** If a slice hits an unresolved `S` item mid-build, stop and decide it — do
  not infer an answer.
- **`D`** — deferrable. Log it and ship without it.

**That file owns which items are open, and in which class. No count and no all-clear is copied
here** — a duplicated tally goes stale silently while still reading as current, and this
section previously carried one that did exactly that.

**Where the open items stand for the phase being entered** is §7, which lists them by class and
in the order they must be settled. That section is the answer; this one is the rule.

**Toolchain and provisioning are recorded elsewhere.** Toolchain installation and infrastructure
provisioning are recorded in `docs/ENVIRONMENT.md` — §2 for tools, §3 for what is provisioned,
§4 for what is missing and which phase each missing item blocks. Read it rather than this file;
any claim here about the machine or the hosted accounts would be stale by construction.

## 5. Screens that must be designed before they can be built

Referenced in the source docs but never specified (`docs/analysis/01-screen-inventory.md`):

- **Add/Edit Service form sheet** — reached from My Services; fields only guessed at.
- **Contact detail view** (`/contacts/:contact_id`) — "appointment history, total spent, notes".
- **Calendar booking detail** — the popover behind a tapped calendar block.
- **Reinstate confirmation** — the guard before re-activating a cancelled booking.

Created by decisions since:

- **Publish / unpublish surface, and the unpublished dashboard state** — ADR-004 (K47, K48).
- **Per-team-member schedule screen** — ADR-007 (K50); onboarding collects salon hours only.
- **Handle field in Business Branding onboarding, with live availability** — ADR-021 (K54).
- **Client booking page with cancel action** — ADR-002; a whole web page with no design.
- **Web "Select services" as multi-select** — ADR-006 (K49); the design specifies single-select.
- **Refused social-link state** on the sign-up and login sheets — ADR-018 (K56).
- **Zero-membership state** between sign-up and business creation — ADR-003 (I10).
- **Portfolio management** (replace, remove, reorder) — F6; onboarding is the only entry point.
- **Post-onboarding editing** for profile, team, portfolio and hours — K12; none exists.

## 6. How work proceeds

- **One vertical slice at a time.** Phase 3 of the feature manual: one folder under
  `apps/api/src/modules/`, pierced end to end, then thickened.
- **Phase 0 first**, including resolving that slice's `S` items and naming the Do-Not-Vibe
  surfaces it touches.
- **The plan is approved before implementation begins.**
- **`DEFINITION_OF_DONE.md` is satisfied before a slice is complete** — every box, including
  the human gate.
- **Do-Not-Vibe surfaces are named explicitly in the completion report**, or "none" is stated.
- **Context is cleared between slices.** The repository artifacts carry state, not the
  conversation. If something matters, it is in a file — an ADR, the triage, `ENVIRONMENT.md`,
  or this log. Nothing is remembered.

## 7. Phase 3 — entry conditions

Not a next action. Phase 3 is a phase, and it does not start cleanly until the things below
are decided and provisioned. Reading this section is how a session finds out whether it may
begin.

### What Phase 3 delivers

Per `docs/source/Manual-Project-Scaffolding.md`, a thin slice through **every layer of the
app** — not of any one feature:

- **Data layer.** Auth tables plus one placeholder domain table, migrated in every
  environment. **Plus `supabase/seed.sql` and `npm run seed` (ADR-026)** — carried from Phase 2
  and writable for the first time here.
- **Auth end to end.** Sign-up, login, session and token issuance (ADR-017), and one protected
  route that rejects an unauthenticated request. Proved by hand, deliberately, because every
  later feature assumes it works.
- **API layer.** The shared middleware stack — validation, RFC 9457 error handling,
  serialisation with ADR-016's safe-integer assertion, logging — wired once and applied
  everywhere, plus one real endpoint using it.
- **Frontend shell.** Routing, an auth-aware layout with logged-in and logged-out states, and
  the generated client (`packages/bookflow_api`) wired behind the loading and error
  conventions every screen will reuse.
- **One true page.** A single real screen through every layer above, on real data.
- **Deploy pipeline.** CI deploys to staging automatically on merge to `main` (ADR-024), and
  the live URL can be reached and logged into.

At the end, the app does nothing product-specific but is fully wired. **Everything after this
is addition, not infrastructure.**

### Do-Not-Vibe surfaces this phase touches

Named now rather than discovered mid-implementation (`CLAUDE.md` §6). Phase 3 touches **auth**,
**migrations**, **the membership scoping rule**, and **production secrets**. Four of the nine,
in the first slice. Each is written deliberately, reviewed line by line by a human, and named in
the completion report.

**Password reset is *not* among them** — see the scope decision below.

### Scope, fixed by ADR-029

**Phase 3 delivers email-and-password authentication only** — sign-up, login, session and token
issuance, one protected route. **Social login and password reset are both out**, each its own
slice afterwards. Widening the foundation's thin slice into three auth journeys at once is the
opposite of thin, and both deferred journeys depend on what Phase 3 establishes rather than the
reverse.

**K56 is not a Phase 3 blocker**; it belongs to the social-login slice.

This was decided here first, in this file, which was the wrong home for a scope decision with
that reach. ADR-029 now holds it and this section cites it.

### The two `F` items are closed

A Phase 2 cold-start check reopened two foundation-level questions the earlier phases never
asked. **Both are now settled and neither blocks Phase 3.**

- **K59 → ADR-027.** Auth email is sent by Supabase Auth; the ADR-012 outbox carries email about
  records our own API owns. Three consequences land on this phase: **the outbox does not ship in
  Phase 3** (K60 resolved), **verification code rules become GoTrue configuration** rather than
  code (K7 substantially resolved), and **E1 and E2 leave Phase 3's critical path** — staging
  sends through Supabase's built-in SMTP, and choosing a provider, verifying a domain and
  spiking deliverability all move to the custom-SMTP cutover, triggered **before any real owner
  signs up**. That removes a purchase, a domain registration and an empirical spike from this
  phase's entry conditions.
- **K61 → ADR-028.** `go_router`, Riverpod for state and dependency injection as one concept
  with no service locator, exhaustive `AsyncValue` handling, and a repository per feature
  wrapping `packages/bookflow_api` so no screen imports it. `CLAUDE.md` §4 now carries the
  `apps/mobile` layout alongside the API's, and §5 carries the two rules a reviewer must be able
  to check without reading the ADR.

### Phase 0 is complete — and PR 1's two findings are closed

**No `F` and no `S` item blocks Phase 3.** Six ADRs closed the `S` list; ADR-027 and ADR-029
closed the two `F` items a cold-start check had reopened; and **ADR-037 and ADR-038 closed the
two the PR 1 migration review raised** — neither of which was visible from the ADRs alone.

- **K72 → ADR-037.** Sign-up is mediated by our API, which proxies to GoTrue server-side so the
  activation email still flows, then writes the profile with a **server-supplied** terms version
  and compensates with an admin delete if that write fails. The trigger-on-`auth.users`
  alternative was rejected: `raw_user_meta_data` is client-supplied, so a consent record the
  subject controls is not a consent record. **Open sign-up must be disabled on GoTrue**, and
  that must be verified on staging rather than assumed.
- **K73 → ADR-038.** The API connects as a dedicated non-owner role — CRUD, no DDL, no
  ownership, plus `BYPASSRLS` so that RLS-with-no-policies does not lock it out of its own
  tables. **Verified on the hosted project before the ADR claimed it works**, because
  `BYPASSRLS` normally needs a superuser and Supabase's `postgres` is not one. It holds
  `BYPASSRLS` and `CREATEROLE`, which is enough. ADR-013's model is unchanged.

**PR 2 has since run, and split into three.** Its obligations from these two were the no-orphan
test for the compensating delete, verification that `enable_signup = false` actually applies on
staging, a reproducible way to provision the application role in every environment, and grants
for tables future migrations create. Where each of them landed — and which are still open — is
"Where Phase 3 stands" below.

### Provision before starting — infrastructure that does not exist

None of this is repository work. All of it needs an account, a purchase or a decision.

| Needed | For | Recorded |
|---|---|---|
| ~~Staging Supabase project~~ | **Done 2026-08-11.** `bookflow-staging`, ref `vvborjxraxdeflrllqwh`, `eu-central-1`. Migrations applied and verified on the hosted project | ADR-023 |
| **Fly.io account, app and `flyctl`** | The deploy target. `flyctl` is not installed | ADR-024 |
| **A deployable image** | ADR-024 runs the API and the worker as two processes from one image. No Dockerfile or `fly.toml` exists | ADR-013, ADR-024 |
| **The deploy job in `.github/workflows/ci.yml`** | Staging deploys automatically on merge to `main`. **The migration job now exists** (`migrate-staging`, push to `main` only, gated on `verify` and `contracts`); the deploy job does not | ADR-024, ADR-034 |
| **Fly.io secrets and GitHub Actions secrets** | **`STAGING_DATABASE_URL` exists**; the Fly.io secrets and the app's own runtime config do not. No hosted credential is on a development machine | ADR-023 |
| **Custom SMTP for staging** | **Phase 3 after all, and it blocks PR 2c.** ADR-027 put staging on Supabase's built-in SMTP; spike 002 found that sender returns `429 over_email_send_rate_limit` on the *first* activation email, so it is not a usable sender. Being configured now | ADR-023, ADR-027 |
| ~~A domain name~~ | **No longer Phase 3** for the sender identity. Still needed for `PUBLIC_WEB_ORIGIN` when `apps/web` exists, which is after the owner app | ADR-002, ADR-027 |

**The free-tier constraint bites here.** `docs/ENVIRONMENT.md` §4 records it: ADR-023 chose two
hosted Supabase projects partly because two is the free allowance, and the account already
holds one unrelated project (`Dashboard X`). Confirm the current per-organisation limit against
`mugu-labs` **before** creating staging, rather than discovering it at creation time.

Production Supabase is **not** required for Phase 3 — this phase deploys to staging only, and
ADR-024 deploys production on a tag.

**Budget: free tiers only** (ADR-034). Fly.io's free allowance, staging Supabase on the free
tier. The first real cost is the custom-SMTP cutover, triggered before any real owner signs up.

### Where Phase 3 stands

Phase 0 is done and Phase 3 is under way. ADR-032 delivers it as four sequential pull requests,
each leaving the application runnable. **PR 2 split into three parts as it was built** — a
delivery detail, not a change to ADR-032's decision.

| PR | What | Status |
|---|---|---|
| 1 | Data layer — the three tables of ADR-031, migrations applying cleanly | **merged** — `f5df0aa` (#4); review findings in `f750923` |
| 2a | The `bookflow_api` application role — CRUD, no DDL, no ownership (ADR-038) | **merged** — `c4a7d41` (#5) |
| 2b | JWT verification, protected routes, the membership scoping rule in the repository layer | **merged** — `785e91e` (#6), hardened by `f3bcb3d` (#7) |
| 2c | Mediated sign-up — `POST /v1/auth/signup` per ADR-037 | **not started, and blocked.** Two reasons below |
| 3 | Client — Flutter shell per ADR-028, routing, generated-client wiring, screen #20, the zero-membership stub | not started |
| 4 | Deploy — the pipeline to staging per ADR-024 and ADR-034 | not started |

**PR 2c is blocked on custom SMTP for staging, which is being configured now.** Spike 002
established why: mediated sign-up requires GoTrue to send its own activation email, and staging's
built-in sender returned `429 over_email_send_rate_limit` on the first attempt, leaving
`confirmation_sent_at` null. Until a real sender exists the endpoint cannot be exercised anywhere
but locally. ADR-027 anticipated this cutover but placed it "before any real owner signs up"; it
has arrived earlier, as a prerequisite to the endpoint rather than to the first user.

**Spike 002 also found ADR-037 wrong on a point of fact, and the amendment is not yet written.**
ADR-037 states that the server-side admin call keeps the activation email flowing from GoTrue. It
does not — `POST /admin/users` creates the user silently, with `confirmation_sent_at` null and no
mail sent, with or without `email_confirm`. The working mechanism is **two** GoTrue calls: admin
create, then `POST /resend type=signup`, which delivers GoTrue's own confirmation template and
token. ADR-027 is untouched by this; ADR-037's decision stands and only its stated mechanism is
wrong. **The amendment is written before PR 2c, not alongside it** — otherwise the endpoint
absorbs a correction that belongs in the record, which is the one outcome the spike's own
conclusion rules out. `docs/spikes/002-account-creation.md` holds the observations.

A third obligation is open and blocked by nothing: **open sign-up is still enabled on staging**
(spike 002, S1), which ADR-037 requires to be off. It cannot be closed by pushing this
repository's `config.toml` — that push is whole-file and would overwrite staging's `site_url`,
redirect URLs and rate limits with local development values.

`DEFINITION_OF_DONE.md` governs completion of the whole slice at PR 4, including the human gate
under ADR-032's constraints.
