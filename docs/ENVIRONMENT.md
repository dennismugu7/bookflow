# Environment

**Current state of everything outside the repository.** Installed tools, git remotes, hosted
projects, deployed apps.

This is the **mutable** document. The others are not:

| File | Nature |
|---|---|
| `docs/decisions/` | Immutable decisions. A decision changes by adding an ADR, never by editing one. |
| `docs/analysis/` | Immutable derivation from the source docs. |
| `docs/spikes/` | Observations at a moment in time. Never revised afterwards. |
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
| Supabase CLI auth | needed to manage hosted projects (ADR-023) | **not logged in** ✗ | `supabase projects list` — currently errors `LegacyPlatformAuthRequiredError` |
| Flutter | required (ADR-015) | **3.44.8** stable ✓ | `flutter --version` |
| Dart | ships with Flutter (ADR-015) | **3.12.2** ✓ | `dart --version` |
| Java runtime | needed by `openapi-generator` (ADR-025) | **openjdk 17.0.20** ✓ | `java --version` |
| git | — | **2.55.0.windows.3** ✓ | `git --version` |
| GitHub CLI | not required by any ADR; used to administer ADR-024's Actions and secrets | **2.97.0**, authenticated as `dennismugu7` ✓ | `gh --version`, `gh auth status` |
| `flyctl` | needed to operate ADR-024's deploy target | **absent** ✗ | `command -v flyctl` |
| `psql` | **not required.** The Supabase CLI is the migration runner (ADR-022) | absent — no action needed | `command -v psql` |

**Everything ADR-022 requires for Phase 2 is installed.** Docker Desktop and the Supabase CLI
were absent when spike 001 ran and are present now; `docs/spikes/001-platform.md` and ADR-022
both record the earlier absence and are correct as historical statements. This table, not
those, is the current fact.

`flyctl` is missing and does not block Phase 2 — see §4.

---

## 3. Provisioned infrastructure

| Resource | Purpose | ADR | Status | Verify |
|---|---|---|---|---|
| git remote `origin` | pushes to GitHub | ADR-026 | **exists** — `https://github.com/dennismugu7/bookflow.git` | `git remote -v` |
| GitHub repository `dennismugu7/bookflow` | code host; runs Actions | ADR-024, ADR-026 | **exists, private — but empty.** Zero refs on the remote; no default branch. The 9 local commits have never been pushed. | `gh repo view dennismugu7/bookflow --json visibility,defaultBranchRef` · `git ls-remote --heads origin` (returns 0 lines) |
| Default branch `main` | trunk; ADR-024 deploys staging on merge to it | ADR-026 | **not yet.** Local branch is `master`; the remote has no branches at all, so the rename is local-then-push, not a remote rename. | `git branch --show-current` |
| GitHub Actions workflows | lint · type-check · tests · drift check · build · iOS | ADR-024 | **not yet** — no `.github/` directory | `ls .github/workflows` |
| GitHub Actions secrets | staging/production credentials, Apple signing | ADR-023, ADR-024 | **not yet** | `gh secret list` |
| Local Supabase stack | development database; integration tests | ADR-022, ADR-023 | **not yet** — no `supabase/` directory, no containers | `supabase status` — currently errors `No such container: supabase_db_bookflow` |
| Staging Supabase project | hosted staging (ADR-023) | ADR-023 | **not yet** | `supabase projects list` (requires `supabase login`) |
| Production Supabase project | hosted production (ADR-023) | ADR-023 | **not yet** | `supabase projects list` (requires `supabase login`) |
| `bookflow-spike` Supabase project | spike 001's throwaway project; held credentials that appeared in a transcript | ADR-023 marks it for deletion | **deleted.** Reported by the project owner on 2026-08-10. **Not independently verified** — the Supabase CLI is not authenticated on this machine. | `supabase projects list` after `supabase login`; the project must not appear |
| Fly.io app (API + worker, one image, two processes) | deploy target | ADR-024, ADR-013 | **not yet.** `flyctl` is also not installed. | `flyctl apps list` |
| Fly.io secrets | staging/production runtime secrets | ADR-023 | **not yet** | `flyctl secrets list -a <app>` |
| Apple signing certificate + provisioning profile | iOS builds exist only via CI (ADR-015, ADR-024) | ADR-024 | **not yet** | `gh secret list` |

**The one unverified row is `bookflow-spike`.** It is recorded as deleted on the owner's
report. Authenticating the Supabase CLI (`supabase login`) closes the gap and simultaneously
makes the two "not yet" hosted-project rows checkable rather than assumed.

---

## 4. Not yet provisioned, and when it is needed

### Blocks Phase 2 — repo, environment, tooling

| Missing | Why it blocks |
|---|---|
| Default branch `main` | ADR-026's rename, and ADR-024's deploy-on-merge trigger names `main`. |
| First push to the remote | The repository exists but is empty; nothing can run in CI until refs exist. |
| GitHub Actions workflows | ADR-024. `DEFINITION_OF_DONE.md` makes "CI is green end to end" a hard gate. |
| Local Supabase stack (`supabase/` + `supabase init`) | ADR-022. Phase 2 ends with an empty migration applying cleanly. |
| `.env.example` | ADR-023 requires it committed, listing every variable name and shape, never a value. |

All of these are repository work plus the already-installed toolchain. **No purchase, no
signup and no external provisioning is required to finish Phase 2.**

### Does not block Phase 2 — Phase 3 and later

| Missing | Needed by | Note |
|---|---|---|
| Staging Supabase project | **Phase 3** | ADR-023. `DEFINITION_OF_DONE.md` requires deploy-and-smoke-test on staging, which first binds when a slice is completed. |
| Production Supabase project | **Phase 3** (later than staging) | ADR-023. Deploys on a tag only (ADR-024). |
| Fly.io app + `flyctl` + Fly secrets | **Phase 3** | ADR-024. The Actions workflow can be authored in Phase 2 with its deploy job inert until the target exists. |
| Supabase CLI authentication | whenever a hosted project is created or verified | Also what would confirm the `bookflow-spike` deletion. |
| Apple signing credentials | **first iOS build** — Phase 5 of the feature loop (ADR-015) | macOS runner minutes are billable on a private repo (ADR-024); scoping which pushes run the iOS job is a Phase 2 detail with a standing cost consequence. |
