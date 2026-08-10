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
| Flutter | required (ADR-015) | **3.44.8** stable ✓ | `flutter --version` |
| Dart | ships with Flutter (ADR-015) | **3.12.2** ✓ | `dart --version` |
| Java runtime | needed by `openapi-generator` (ADR-025) | **openjdk 17.0.20** ✓ | `java --version` |
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
| Branch protection on `main` | enforce ADR-026's PR-then-squash-merge, and require CI green | ADR-026, ADR-024 | **BLOCKED BY PLAN — not configured, and not configurable.** Attempted 2026-08-10 via both mechanisms; both return `403 Upgrade to GitHub Pro or make this repository public to enable this feature`. This account is a free personal plan and the repository is private. **ADR-026's trunk-based, squash-merge, PR-first convention is therefore enforced by discipline alone — nothing mechanical stops a direct push to `main`, including a red one.** | `gh api repos/dennismugu7/bookflow/branches/main/protection` · `gh api repos/dennismugu7/bookflow/rulesets` |
| GitHub Actions workflows | ADR-024's CI | ADR-024 | **exists — 2026-08-10.** `.github/workflows/ci.yml`, job `verify`, on push to `main` and on PRs targeting it. Runs `npm run verify` against a real Supabase stack (database + gotrue only). ~2m40s. Observed failing and passing, deliberately. **Not yet covered:** the Flutter job, the iOS macOS-runner job, the contract drift check and the Fly.io deploy — all of ADR-024, none of them possible yet. | `gh run list --branch main` · `gh workflow view CI` |
| GitHub Actions secrets | staging/production credentials, Apple signing | ADR-023, ADR-024 | **not yet** | `gh secret list` |
| Local Supabase stack | development database; integration tests | ADR-022, ADR-023 | **exists — 2026-08-10.** `supabase/config.toml` committed, Postgres **17.6** (the line spike 001 ran against), one migration applied. Endpoints: API `54321`, DB `54322`, Studio `54323`, Mailpit `54324`. | `npm run db:start` then `supabase status`; `docker ps` shows `supabase_db_bookflow` |
| Local stack credentials | — | ADR-023 | **not secrets.** The anon, service-role, publishable, secret and S3 keys the CLI prints are fixed, well-known development values, identical on every machine. They are not in `.env.example` and must never be reused for a hosted project. | `supabase status` reprints them at any time |
| Supabase organisation | owns the hosted projects | ADR-023 | **exists** — `mugu-labs` (`ggvjgvsymgczpyopnljp`), the only org on the account | `supabase orgs list` |
| Staging Supabase project | hosted staging (ADR-023) | ADR-023 | **not yet.** Confirmed: no bookflow project of any kind exists. | `supabase projects list` |
| Production Supabase project | hosted production (ADR-023) | ADR-023 | **not yet.** Same. | `supabase projects list` |
| `bookflow-spike` Supabase project (`iohxfurykkocqfagdkzy`) | spike 001's throwaway project; held credentials that appeared in a transcript | ADR-023 marks it for deletion | **deleted — verified 2026-08-10.** The ref is absent from the authenticated project list. Deleting it did **not** retire its password, contrary to ADR-023's expectation: that password was reused from other accounts rather than generated for this project, and was rotated separately on discovery. See the spike's Amendments. | `supabase projects list` — `iohxfurykkocqfagdkzy` must not appear |
| Unrelated project `Dashboard X` (`wpiaoskqljhrkpfzvmrp`) | **not a Bookflow resource.** Recorded because it occupies a hosted-project slot. | — | **exists**, `ACTIVE_HEALTHY`, eu-central-1, created 2026-07-11 | `supabase projects list` |
| Fly.io app (API + worker, one image, two processes) | deploy target | ADR-024, ADR-013 | **not yet.** `flyctl` is also not installed. | `flyctl apps list` |
| Fly.io secrets | staging/production runtime secrets | ADR-023 | **not yet** | `flyctl secrets list -a <app>` |
| Apple signing certificate + provisioning profile | iOS builds exist only via CI (ADR-015, ADR-024) | ADR-024 | **not yet** | `gh secret list` |

**Every row above is now command-verified.** The Supabase CLI is authenticated, so the three
hosted-project rows are checked rather than assumed, and `bookflow-spike` is confirmed gone
rather than reported gone.

**One thing to settle before provisioning.** ADR-023 chose two hosted projects partly because
"two is exactly the free tier's allowance". The account currently holds one project already —
`Dashboard X`, unrelated to Bookflow. If that allowance is per-organisation and still two,
staging and production do not both fit alongside it. Check the current limit against
`mugu-labs` before creating either, rather than discovering it at creation time. This does not
change ADR-023; it is the kind of plan change ADR-023's last consequence anticipated.

---

## 4. Not yet provisioned, and when it is needed

### Blocks Phase 2 — repo, environment, tooling

| Missing | Why it blocks |
|---|---|
| Flutter project in `apps/mobile` | ADR-015, ADR-022. `dart format`, `flutter analyze` and `flutter test` are Definition-of-Done gates with nothing to run against, and ADR-024's Flutter and iOS jobs have nothing to build. |
| `supabase/seed.sql` | ADR-026. `db reset` warns `no files matched pattern: supabase/seed.sql` on every run. Not writable yet — ADR-026 wants one demo salon with bookings in every status, which needs tables, which are Phase 3. |

**Done since this file was written:** the `master` → `main` rename and the first push
(ADR-026); `.env.example` (ADR-023); the npm workspace, the `apps/api` Fastify skeleton and
the lint / format / type-check / test gates (ADR-022); the local Supabase stack, the
extensions migration and Kysely with generated types (ADR-022); the config module and the
unit/integration test layering; and GitHub Actions running `npm run verify` on every push and
PR (ADR-024). See `docs/BUILD_LOG.md` §1.

Both remaining items are repository work plus the already-installed toolchain. **No purchase,
no signup and no external provisioning is required to finish Phase 2** — with the one
exception recorded in §3: branch protection cannot be configured on this plan at all, and no
amount of repository work changes that.

### Does not block Phase 2 — Phase 3 and later

| Missing | Needed by | Note |
|---|---|---|
| Staging Supabase project | **Phase 3** | ADR-023. `DEFINITION_OF_DONE.md` requires deploy-and-smoke-test on staging, which first binds when a slice is completed. |
| Production Supabase project | **Phase 3** (later than staging) | ADR-023. Deploys on a tag only (ADR-024). |
| Fly.io app + `flyctl` + Fly secrets | **Phase 3** | ADR-024. The Actions workflow can be authored in Phase 2 with its deploy job inert until the target exists. |
| Confirmation of the hosted-project allowance for `mugu-labs` | **before creating staging** | See the note under §3. One slot is already occupied by an unrelated project. |
| Apple signing credentials | **first iOS build** — Phase 5 of the feature loop (ADR-015) | macOS runner minutes are billable on a private repo (ADR-024); scoping which pushes run the iOS job is a Phase 2 detail with a standing cost consequence. |
