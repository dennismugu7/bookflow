# Environment

**Current state of everything outside the repository.** Installed tools, git remotes, hosted
projects, deployed apps.

This is the **mutable** document. The others are not:

| File | Nature |
|---|---|
| `docs/decisions/` | Append-only. Context, Decision and Consequences are never rewritten; a dated `## Amendments` section may be appended. A reversal is a new ADR. (`CLAUDE.md` §3) |
| `docs/analysis/` | Derived from the source docs; updated as decisions land. |
| `docs/spikes/` | Observations at a moment in time. Verdicts never revised; amendable by the same convention. |
| **this file** | **Current state of the world. Expected to change. Revised in place.** |

`docs/BUILD_LOG.md` states phase status and process; it deliberately holds **no** fact that
belongs here.

---

## 1. How to use this file

- **Update it in the same commit as the change.** Anything created, installed, provisioned or
  destroyed outside the repository is recorded here, in the commit that does it. Not
  afterwards, not in a follow-up.
- **A stale entry here is a defect, not untidiness.** This file exists because
  `docs/BUILD_LOG.md` carried machine-state claims that were false within a day of being
  written, and a session that trusted them would have planned work that was already done.
- **Every claim is verifiable by a command, and the command is given.** A row without a
  verification command is not a record, it is a memory. If a claim cannot be checked from a
  terminal, say who asserted it and when, and mark it unverified.
- **"Not yet" is a real status and is worth writing down.** Most of §3 is `not yet`. Recording
  that is the point — it is the difference between "nobody provisioned this" and "nobody
  wrote down whether this was provisioned".

**Observations below were taken 2026-08-10** on the primary development machine
(Windows 11 Pro 10.0.26200).

---

## 2. Local toolchain

Required-version column cites the ADR that imposes it. "—" means no ADR pins a version.

| Tool | Required | Observed | Verify |
|---|---|---|---|
| Node.js | 24.x line (ADR-022) | **24.19.0** ✓ | `node --version` |
| npm | bundled with Node 24.x; workspaces (ADR-022) | **11.17.0** ✓ | `npm --version` |
| Docker Desktop | required (ADR-022) | **29.6.2** ✓ | `docker --version` |
| Docker daemon | must be running for the local stack (ADR-022) | **running** ✓ | `docker info` |
| Docker WSL2 backend | required explicitly (ADR-022) | **confirmed** ✓ — kernel `6.18.33.2-microsoft-standard-WSL2`, `OSType=linux`, `OperatingSystem=Docker Desktop` | `docker info --format '{{.OSType}} {{.KernelVersion}} {{.OperatingSystem}}'` |
| Docker Compose | implied by the local stack | **v5.3.1** ✓ | `docker compose version` |
| Supabase CLI | required (ADR-022) | **2.113.0** ✓ | `supabase --version` |
| Supabase CLI auth | needed to manage hosted projects (ADR-023) | **logged in** ✓ — org `mugu-labs` | `supabase orgs list` |
| Flutter | required (ADR-015); CI pins the same 3.44.8 | **3.44.8** stable ✓ | `flutter --version` |
| Android toolchain | `flutter build apk` in CI; local Android builds optional | CI-only for now — no local emulator or device has been used | `flutter doctor` |
| Xcode / iOS toolchain | **impossible locally.** The development machine is Windows (ADR-015). iOS exists only through the macOS CI job. | not applicable | — |
| Dart | ships with Flutter (ADR-015) | **3.12.2** ✓ | `dart --version` |
| Java runtime | **only** for Gradle / Android builds. Not for `openapi-generator` — that runs as a container (ADR-025 amendment). | **openjdk 17.0.20** ✓ | `java --version` |
| openapi-generator | generates the Dart client (ADR-025) | **container**, `openapitools/openapi-generator-cli:v7.16.0` — pinned, pulled on demand, no local JDK | `docker image ls openapitools/openapi-generator-cli` |
| Pre-push hook | runs `npm run verify` before a push leaves the machine | **installed** ✓ — `core.hooksPath` = `.githooks`, wired by npm's `prepare` on install | `git config --local --get core.hooksPath` |
| TypeScript | `tsc --noEmit` is a hard gate (ADR-022) | **5.9.x** ✓ — root devDependency | `npx tsc --version` |
| ESLint | 9, flat config (ADR-022) | **9.x** ✓ — root devDependency, `eslint.config.js` | `npx eslint --version` |
| Prettier | formatting gate (ADR-022) | **3.x** ✓ — root devDependency | `npx prettier --version` |
| Vitest | API unit and integration tests (ADR-022) | **3.x** ✓ — root devDependency, no tests yet | `npx vitest --version` |
| Fastify | the API framework (ADR-013) | **5.x** ✓ — `apps/api` dependency | `npm ls fastify` |
| Kysely + `pg` | typed queries, no ORM (ADR-022) | **0.29.x / 8.x** ✓ — `apps/api` dependencies | `npm ls kysely pg` |
| kysely-codegen | generates types *from* the live schema (ADR-022) | **0.20.x** ✓ — `apps/api` devDependency | `npm ls kysely-codegen` |
| git | — | **2.55.0.windows.3** ✓ | `git --version` |
| GitHub CLI | not required by any ADR; used to administer ADR-024's Actions and secrets | **2.97.0**, authenticated as `dennismugu7` ✓ | `gh --version`, `gh auth status` |
| `flyctl` | needed to operate ADR-024's deploy target | **absent** ✗ | `command -v flyctl` |
| `psql` | **not required.** The Supabase CLI is the migration runner (ADR-022) | absent — no action needed | `command -v psql` |

**Everything ADR-022 requires for Phase 2 is installed.** Docker Desktop and the Supabase CLI
were absent when spike 001 ran and are present now.

**That conflict is resolved at the source, not by precedence.** ADR-022 and
`docs/spikes/001-platform.md` each now carry a dated `## Amendments` entry recording the
change, per the append-only convention in `CLAUDE.md` §3. Neither file's original text was
altered — both were true when written — and neither now reads as a present-tense claim that
this table has to override. Those amendments name no version numbers and point here; this
table remains the only place a version is stated.

`flyctl` is missing and does not block Phase 2 — see §4.

**The last five rows are repository-declared, not machine state.** They are listed because
"is the toolchain present" is the question this section answers, but their versions are pinned
in `package.json` and `package-lock.json`, which are the authority. Only the major line is
given here, deliberately, so this table cannot drift from the lockfile.

---

## 3. Provisioned infrastructure

| Resource | Purpose | ADR | Status | Verify |
|---|---|---|---|---|
| git remote `origin` | pushes to GitHub | ADR-026 | **exists** — `https://github.com/dennismugu7/bookflow.git` | `git remote -v` |
| GitHub repository `dennismugu7/bookflow` | code host; runs Actions | ADR-024, ADR-026 | **exists, private, populated.** History pushed 2026-08-10; the remote is no longer empty. | `gh repo view dennismugu7/bookflow --json visibility,defaultBranchRef` · `git ls-remote --heads origin` |
| Default branch `main` | trunk; ADR-024 deploys staging on merge to it | ADR-026 | **exists — renamed from `master` and set as the GitHub default, 2026-08-10.** Local `main` tracks `origin/main`. | `git branch --show-current` · `gh repo view dennismugu7/bookflow --json defaultBranchRef --jq '.defaultBranchRef.name'` |
| Branch protection on `main` | enforce ADR-026's PR-then-squash-merge, and require CI green | ADR-026, ADR-024 | **DEFERRED, DELIBERATELY — see "Accepted risk" below.** Attempted 2026-08-10 via both mechanisms; both return `403 Upgrade to GitHub Pro or make this repository public to enable this feature`. Free personal plan, private repository. Not a TODO: GitHub Pro is not being bought at this stage, and the pre-push hook is the compensating control. | `gh api repos/dennismugu7/bookflow/branches/main/protection` · `gh api repos/dennismugu7/bookflow/rulesets` |
| GitHub Actions workflows | ADR-024's CI | ADR-024 | **exists — 2026-08-10.** `.github/workflows/ci.yml`, job `verify`, on push to `main` and on PRs targeting it. Runs `npm run verify` against a real Supabase stack (database + gotrue only). ~2m40s. Observed failing and passing, deliberately. Four jobs: `verify` (TypeScript), `mobile` (Dart on Linux), `ios-build` (unsigned, macOS, runs only on `main`, `workflow_dispatch`, or a PR labelled `ios`), and `contracts` (regenerates the spec and Dart client, fails on drift). A fifth job, `migrate-staging`, applies migrations to staging on push to `main` only, gated on `verify` and `contracts` (ADR-034). **Not yet covered:** the Fly.io deploy — Phase 3. | `gh run list --branch main` · `gh workflow view CI` |
| GitHub Actions secrets | staging/production credentials, Apple signing | ADR-023, ADR-024, ADR-038 | **two exist.** `STAGING_DATABASE_URL` — the **migration** credential, connects as `postgres`, used only by the `migrate-staging` job. `STAGING_APP_DATABASE_URL` — the **application** credential, connects as `bookflow_api` (CRUD, no DDL, `BYPASSRLS`), set 2026-08-11. Both generated at creation time, never displayed, never written to disk, never on a development machine. Apple signing secrets: still none. | `gh secret list` |
| Local Supabase stack | development database; integration tests | ADR-022, ADR-023 | **exists — 2026-08-10.** `supabase/config.toml` committed, Postgres **17.6** (the line spike 001 ran against), one migration applied. Endpoints: API `54321`, DB `54322`, Studio `54323`, Mailpit `54324`. | `npm run db:start` then `supabase status`; `docker ps` shows `supabase_db_bookflow` |
| Local stack credentials | — | ADR-023 | **not secrets.** The anon, service-role, publishable, secret and S3 keys the CLI prints are fixed, well-known development values, identical on every machine. They are not in `.env.example` and must never be reused for a hosted project. | `supabase status` reprints them at any time |
| Supabase organisation | owns the hosted projects | ADR-023 | **exists** — `mugu-labs` (`ggvjgvsymgczpyopnljp`), the only org on the account | `supabase orgs list` |
| Staging Supabase project | hosted staging (ADR-023) | ADR-023 | **exists — created 2026-08-11.** `bookflow-staging`, ref **`vvborjxraxdeflrllqwh`**, region `eu-central-1`, PostgreSQL 17.6, `ACTIVE_HEALTHY`. Migrations applied, including the `bookflow_api` application role (ADR-038) whose password is set out of band and held only in Actions secrets. The ref is an identifier, not a secret. | `supabase projects list` |
| Open sign-up on `bookflow-staging` | ADR-037 requires that **only our API** creates accounts | ADR-037 | **closed, and verified behaviourally — 2026-08-14.** Anon `POST /auth/v1/signup` returns **422 `signup_disabled`** ("Signups not allowed for this instance"). The distinction is the whole test: spike 002 (S1) saw **400 `email_address_invalid`** for the same undeliverable address, which *proved the flag was unset*, because address validation is only reached when `signup_disabled` has not already fired. Verified in the same run that the admin path is **not** locked out — see the row below. | `curl -s -o /dev/null -w '%{http_code}' -X POST "https://vvborjxraxdeflrllqwh.supabase.co/auth/v1/signup" -H "apikey: $ANON" -H 'Content-Type: application/json' -d '{"email":"probe@bookflow.test","password":"x"}'` → `422`, body `signup_disabled` |
| Service-role account creation on `bookflow-staging` | ADR-037's mechanism: our API creates users through the admin API | ADR-037 | **works — verified 2026-08-14.** Service-role `POST /auth/v1/admin/users` returned **200** and created the user while open sign-up was closed. Checked *before* the email test, because a lockout here makes mediated sign-up impossible and everything downstream moot. | `POST {project}/auth/v1/admin/users` with the service-role key → `200` |
| Custom SMTP on `bookflow-staging` | GoTrue sends auth email (ADR-027); the built-in sender proved unusable | ADR-023, ADR-027 | **configured and verified — 2026-08-14.** Provider **Resend**, sender **`onboarding@resend.dev`**. Verified by delivery, not from the dashboard: admin-created a user, then **one** `POST /auth/v1/resend type=signup` returned **200** and `confirmation_sent_at` moved from absent to `2026-08-14T18:19:03Z`. Spike 002 (S5) got `429 over_email_send_rate_limit` on the *first* attempt from the built-in sender, with `confirmation_sent_at` staying null — so this row records a real change, not a re-test. **The sender is a Resend test address and delivers only to the account owner's own inbox.** That is sufficient for staging and **insufficient for real owners**: the domain-verified sender ADR-027 anticipates is still owed, before the first real owner signs up. | `POST {project}/auth/v1/resend` `{"type":"signup","email":"<existing unconfirmed user>"}` with the anon key → `200`, and that user's `confirmation_sent_at` is non-null |
| Production Supabase project | hosted production (ADR-023) | ADR-023 | **not yet, and it does not fit.** The org is on the **free plan** — confirmed by the API refusing `--size` with *"Instance size cannot be specified for free plan organizations"* — which allows two active projects. `Dashboard X` and `bookflow-staging` occupy both. Production is a spend decision, not a provisioning step. | `supabase projects list` |
| `bookflow-spike` Supabase project (`iohxfurykkocqfagdkzy`) | spike 001's throwaway project; held credentials that appeared in a transcript | ADR-023 marks it for deletion | **deleted — verified 2026-08-10.** The ref is absent from the authenticated project list. Deleting it did **not** retire its password, contrary to ADR-023's expectation: that password was reused from other accounts rather than generated for this project, and was rotated separately on discovery. See the spike's Amendments. | `supabase projects list` — `iohxfurykkocqfagdkzy` must not appear |
| Unrelated project `Dashboard X` (`wpiaoskqljhrkpfzvmrp`) | **not a Bookflow resource.** Recorded because it occupies a hosted-project slot. | — | **exists**, `ACTIVE_HEALTHY`, eu-central-1, created 2026-07-11 | `supabase projects list` |
| Fly.io app (API + worker, one image, two processes) | deploy target | ADR-024, ADR-013 | **not yet.** `flyctl` is also not installed. | `flyctl apps list` |
| Fly.io secrets | staging/production runtime secrets | ADR-023 | **not yet** | `flyctl secrets list -a <app>` |
| Apple signing certificate + provisioning profile | iOS builds exist only via CI (ADR-015, ADR-024) | ADR-024 | **not yet** | `gh secret list` |

**Every row above is now command-verified.** The Supabase CLI is authenticated, so the three
hosted-project rows are checked rather than assumed, and `bookflow-spike` is confirmed gone
rather than reported gone.

**The 2026-08-14 auth verification left no residue.** It created two users on staging — one
throwaway at `@bookflow.test` for the admin-path check, one at the account owner's own address
for the delivery check — and **both were deleted**. `DELETE /auth/v1/admin/users/:id` returned
`200` for each, a subsequent `GET` on each returned `404`, and the project's user list is back to
**zero users**, which is where it started. The activation link that was delivered belongs to a
user that no longer exists and is therefore dead. No credential was written to disk or displayed
at any point: both keys were read from `supabase projects api-keys` into process memory and used
there (ADR-023 — this is the failure mode that cost `bookflow-spike` its existence).

### Accepted risk — `main` is unprotected

**Position, not oversight.** GitHub Pro is not being purchased at this stage. The repository
is private on a free personal plan, and both branch protection and rulesets are gated behind
Pro; there is no configuration that achieves this and none is being sought.

**What is actually true, stated without softening.** Nothing on the server refuses a direct
push to `main`. Nothing refuses a *red* push to `main`. CI runs and reports afterwards, which
is a notification, not a gate. ADR-026's PR-first, squash-merge convention is enforced by
discipline alone.

**Compensating control.** The committed pre-push hook (`.githooks/pre-push`, installed by
npm's `prepare`) runs `npm run verify` and refuses the push on failure. It is genuinely
weaker than branch protection and says so when it blocks: it runs only on machines that
installed it, and `git push --no-verify` walks straight past it. It catches accidents, not
intent.

**Buy Pro, or make the repository public, when either becomes true:**

1. **A second person commits.** Discipline is a property of a person, not of a repository;
   one shared convention with no enforcement stops being a convention as soon as it is shared.
2. **Before the first production release.** ADR-024 deploys production on a tag from `main`.
   An unprotected `main` at that point means an unreviewed commit can reach production
   without anything having refused it.

Whichever comes first. Until then this row stays as it is, and it is not a gap to be closed
quietly — closing it costs money and that is the owner's call.

**Settled 2026-08-11, and the answer is the unwelcome one.** `mugu-labs` is on the **free plan**
— established before creating anything, by the API rejecting an instance-size flag with
*"Instance size cannot be specified for free plan organizations."* The free allowance is **two
active projects per organisation**, and both are now used: `Dashboard X`, which is not a Bookflow
resource, and `bookflow-staging`.

**Production therefore has no slot.** ADR-023 assumed two projects would fit because two was the
allowance; it did not account for one already being occupied. The options when production is
needed are to pay, or to retire `Dashboard X`. Neither is a provisioning step and neither is
being decided here — it is the plan change ADR-023's last consequence anticipated, and it is now
a spend decision with a name.

---

## 4. Not yet provisioned, and when it is needed

### Blocks Phase 2 — repo, environment, tooling

| Missing | Why it blocks |
|---|---|
| Apple Developer account and signing credentials | **K53, still open.** ADR-024 imports them as encrypted secrets at build time. Until then the iOS job runs `--no-codesign`, which proves the target compiles and nothing more — no installable artifact, no TestFlight, no device. |
| `supabase/seed.sql` | ADR-026. `db reset` warns `no files matched pattern: supabase/seed.sql` on every run. Not writable yet — ADR-026 wants one demo salon with bookings in every status, which needs tables, which are Phase 3. |

**Done since this file was written:** the `master` → `main` rename and the first push
(ADR-026); `.env.example` (ADR-023); the npm workspace, the `apps/api` Fastify skeleton and
the lint / format / type-check / test gates (ADR-022); the local Supabase stack, the
extensions migration and Kysely with generated types (ADR-022); the config module and the
unit/integration test layering; GitHub Actions running `npm run verify` on every push and PR
(ADR-024); and the Flutter skeleton in `apps/mobile` with its analyze / format / test / build
jobs on Linux and an unsigned iOS build on macOS. See `docs/BUILD_LOG.md` §1.

The remaining items need a decision or an account, not repository work: `seed.sql` waits on
tables, signing waits on an Apple Developer account (K53), and branch protection waits on a
purchase that is deliberately not being made yet — see the accepted risk in §3.

### Does not block Phase 2 — Phase 3 and later

| Missing | Needed by | Note |
|---|---|---|
| ~~Staging Supabase project~~ | ~~**Phase 3**~~ | **Provisioned 2026-08-11 — see §3.** Its custom SMTP and closed sign-up were verified 2026-08-14, also §3. |
| Domain-verified email sender | **before the first real owner signs up** | ADR-027. Staging now sends through Resend, but from `onboarding@resend.dev`, a test address that reaches only the account owner's own inbox. Enough to prove the mechanism; it cannot mail a customer. |
| Production Supabase project | **Phase 3** (later than staging) | ADR-023. Deploys on a tag only (ADR-024). |
| Fly.io app + `flyctl` + Fly secrets | **Phase 3** | ADR-024. The Actions workflow can be authored in Phase 2 with its deploy job inert until the target exists. |
| Confirmation of the hosted-project allowance for `mugu-labs` | **before creating staging** | See the note under §3. One slot is already occupied by an unrelated project. |
| Apple signing credentials | **first iOS build** — Phase 5 of the feature loop (ADR-015) | macOS runner minutes are billable on a private repo (ADR-024); scoping which pushes run the iOS job is a Phase 2 detail with a standing cost consequence. |
