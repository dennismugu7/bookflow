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
| GitHub Actions secrets | staging/production credentials, Apple signing | ADR-023, ADR-024, ADR-038 | **COUNT CORRECTED 2026-08-18 — `gh secret list` returns NINE, not two.** The two below are the two this row originally knew about; the e2e and Render secrets are documented in their own rows in this section, and the two business-account secrets in the row added below. **Sentence corrected 2026-08-19 at the merge of PR #14:** it previously said the e2e and Render secrets "were added on `feat/phase3-e2e` and are documented in that branch's copy of this file". That branch is merged and deleted — **there is one copy of this file, and every secret is documented in it.** **A count in this column is exactly the thing that goes stale**, which is why the verify command is the authority. *Original text follows.* **two exist.** `STAGING_DATABASE_URL` — the **migration** credential, connects as `postgres`, used only by the `migrate-staging` job. `STAGING_APP_DATABASE_URL` — the **application** credential, connects as `bookflow_api` (CRUD, no DDL, `BYPASSRLS`), set 2026-08-11. Both generated at creation time, never displayed, never written to disk, never on a development machine. Apple signing secrets: still none. | `gh secret list` |
| Local Supabase stack | development database; integration tests | ADR-022, ADR-023 | **exists — 2026-08-10.** `supabase/config.toml` committed, Postgres **17.6** (the line spike 001 ran against), one migration applied. Endpoints: API `54321`, DB `54322`, Studio `54323`, Mailpit `54324`. | `npm run db:start` then `supabase status`; `docker ps` shows `supabase_db_bookflow` |
| Local stack credentials | — | ADR-023 | **not secrets.** The anon, service-role, publishable, secret and S3 keys the CLI prints are fixed, well-known development values, identical on every machine. They are not in `.env.example` and must never be reused for a hosted project. | `supabase status` reprints them at any time |
| Supabase organisation | owns the hosted projects | ADR-023 | **exists** — `mugu-labs` (`ggvjgvsymgczpyopnljp`), the only org on the account | `supabase orgs list` |
| Staging Supabase project | hosted staging (ADR-023) | ADR-023 | **exists — created 2026-08-11.** `bookflow-staging`, ref **`vvborjxraxdeflrllqwh`**, region `eu-central-1`, PostgreSQL 17.6, `ACTIVE_HEALTHY`. Migrations applied, including the `bookflow_api` application role (ADR-038) whose password is set out of band and held only in Actions secrets. The ref is an identifier, not a secret. | `supabase projects list` |
| Open sign-up on `bookflow-staging` | ADR-037 requires that **only our API** creates accounts | ADR-037 | **closed, and verified behaviourally — 2026-08-14.** Anon `POST /auth/v1/signup` returns **422 `signup_disabled`** ("Signups not allowed for this instance"). The distinction is the whole test: spike 002 (S1) saw **400 `email_address_invalid`** for the same undeliverable address, which *proved the flag was unset*, because address validation is only reached when `signup_disabled` has not already fired. Verified in the same run that the admin path is **not** locked out — see the row below. | `curl -s -o /dev/null -w '%{http_code}' -X POST "https://vvborjxraxdeflrllqwh.supabase.co/auth/v1/signup" -H "apikey: $ANON" -H 'Content-Type: application/json' -d '{"email":"probe@bookflow.test","password":"x"}'` → `422`, body `signup_disabled` |
| Service-role account creation on `bookflow-staging` | ADR-037's mechanism: our API creates users through the admin API | ADR-037 | **works — verified 2026-08-14.** Service-role `POST /auth/v1/admin/users` returned **200** and created the user while open sign-up was closed. Checked *before* the email test, because a lockout here makes mediated sign-up impossible and everything downstream moot. | `POST {project}/auth/v1/admin/users` with the service-role key → `200` |
| **The staging e2e BUSINESS account** | the credential the business-setup e2e journey signs in with — **the one account permitted to hold a membership** | ADR-033 amendment, ADR-037, K78 | **exists — 2026-08-18.** Address `e2e-owner-business@bookflow.test`, on `bookflow-staging`. **Admin-created with `email_confirmed_at` set at creation** (dashboard *Add user → Create new user* with **Auto Confirm User** ticked), for E14's reason: staging's sender is Resend's test address and reaches exactly one inbox, so an account that must click a link can never be used from CI. **Created through the admin path, never through `POST /v1/auth/signup`**, which compensates and deletes the user when the mail fails. **Why it exists at all: K78 forbids giving the ORIGINAL `e2e-owner@bookflow.test` a membership, and criteria 41 and 42 are precisely about an account acquiring one** — so they can be demonstrated only here. `auth.users` id **`e508f672-dd11-4150-b686-cc06a525f749`**, read from the admin API and checked against the first account's id before being written — see "The identity check" below. An id is an identifier, not a secret. **PASSWORD ROTATED 2026-08-18, and the reintroduction is recorded because a row saying only "rotated" would read as routine hygiene and this was not that.** The value first set on this account **was the string committed to `docs/spikes/001-platform.md` in August and rotated then** — recalled and typed rather than generated, which is the same failure mode as the original incident. It was **live again for under an hour**, and is **dead a second time**. The current password was produced by the dashboard's **Generate** control, **chosen by nobody**, and has a **single consumer: the Actions secret `E2E_BUSINESS_PASSWORD`** — no Render variable, no `.env`, no build artefact — so a future rotation has exactly one place to update. See the spike's 2026-08-18 amendment: a rotation ends a credential's use, not its existence. | `GET /auth/v1/admin/users` with the staging service-role key |
| **K78's rule, restated because two accounts is where it gets forgotten** | keeping the original e2e account's meaning intact | K78 | **`e2e-owner@bookflow.test` NEVER GETS A MEMBERSHIP.** Its whole value to the Phase 3 gate is that it is an owner with none; give it one and `profile_e2e_test.dart`'s premise changes silently and the redirect it exercises stops being the one it was written for. **The business account is the only one that may hold a membership, and this row exists so that a future session adding a membership "to the e2e account" has to notice there are two.** | the original's id must hold no row in `public.memberships` on staging |
| **Two Actions secrets carry the business account's credentials** | what a business-journey e2e job needs to sign in | ADR-023 | **exist — 2026-08-18.** `E2E_BUSINESS_EMAIL` and `E2E_BUSINESS_PASSWORD`, named to match the existing `E2E_STAGING_*` pair rather than reusing it: **a shared secret is how two accounts silently become one.** The password was generated in the dashboard, written to GitHub over stdin, and **is in no file, no log and no commit** — it cannot be read back, and **if CI cannot sign in the answer is rotation, not recovery.** | `gh secret list` shows both names; values are unreadable by design |
| Custom SMTP on `bookflow-staging` | GoTrue sends auth email (ADR-027); the built-in sender proved unusable | ADR-023, ADR-027 | **configured and verified — 2026-08-14.** Provider **Resend**, sender **`onboarding@resend.dev`**. Verified by delivery, not from the dashboard: admin-created a user, then **one** `POST /auth/v1/resend type=signup` returned **200** and `confirmation_sent_at` moved from absent to `2026-08-14T18:19:03Z`. Spike 002 (S5) got `429 over_email_send_rate_limit` on the *first* attempt from the built-in sender, with `confirmation_sent_at` staying null — so this row records a real change, not a re-test. **The sender is a Resend test address and delivers only to the account owner's own inbox.** That is sufficient for staging and **insufficient for real owners**: the domain-verified sender ADR-027 anticipates is still owed, before the first real owner signs up. **That message landed in Gmail's SPAM folder, not the inbox** — recorded because dispatch is not arrival, and the row would otherwise read as a clean pass. `onboarding@resend.dev` has **no SPF, DKIM or DMARC alignment with any domain we control**, so receiving servers distrust it by construction; this is structural, not a fault in Resend. Staging is unaffected and the mechanism is proved. For a real owner it is severe — an activation mail in spam is an owner who never finishes sign-up and never reports it, and the same sender would later carry booking confirmations to their clients. Evidence is recorded against **E2** in `docs/analysis/05-triage.md`. | `POST {project}/auth/v1/resend` `{"type":"signup","email":"<existing unconfirmed user>"}` with the anon key → `200`, and that user's `confirmation_sent_at` is non-null |
| Production Supabase project | hosted production (ADR-023) | ADR-023 | **not yet, and it does not fit.** The org is on the **free plan** — confirmed by the API refusing `--size` with *"Instance size cannot be specified for free plan organizations"* — which allows two active projects. `Dashboard X` and `bookflow-staging` occupy both. Production is a spend decision, not a provisioning step. | `supabase projects list` |
| `bookflow-spike` Supabase project (`iohxfurykkocqfagdkzy`) | spike 001's throwaway project; held credentials that appeared in a transcript | ADR-023 marks it for deletion | **deleted — verified 2026-08-10.** The ref is absent from the authenticated project list. Deleting it did **not** retire its password, contrary to ADR-023's expectation: that password was reused from other accounts rather than generated for this project, and was rotated separately on discovery. See the spike's Amendments. | `supabase projects list` — `iohxfurykkocqfagdkzy` must not appear |
| Unrelated project `Dashboard X` (`wpiaoskqljhrkpfzvmrp`) | **not a Bookflow resource.** Recorded because it occupies a hosted-project slot. | — | **exists**, `ACTIVE_HEALTHY`, eu-central-1, created 2026-07-11 | `supabase projects list` |
| ~~Fly.io app~~ | ~~deploy target~~ | ADR-024 | **Not used, and not signed up for.** The 2026-08-15 amendment to ADR-024 moved the deploy target to Render: Fly's free allowance no longer exists, and a card or $25 prepaid is required to deploy. No Fly account exists. | — |
| Render workspace | owns the staging service | ADR-024 amendment | **exists — 2026-08-15.** `My Workspace`, id `tea-da06ge3l550s73cohmr0`, account `dennismugu7@gmail.com`. Free instance type; no payment method on file. | `curl -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/owners` |
| Render Blueprint `bookflow-staging` | applies `render.yaml` | ADR-024 amendment | **exists — 2026-08-15.** Id **`exs-da06j761egvs73817n70`**, `autoSync: true`, path `render.yaml`. **DISPUTED: the API still reports `branch: feat/deploy-staging`**, a branch deleted at PR 4a, with `lastSync` unchanged at `2026-08-15T13:37:45Z` — its original creation sync. The owner reports repointing it to `main` by hand in the dashboard on 2026-08-15; **that is not visible through the API**, and only one Blueprint exists, so this is not a second record being read. Either the dashboard change did not take, or the API does not reflect it. **Unresolved, and PARKED as of 2026-08-15 — do not treat `render.yaml` as governing until a read shows `main`.** Parked because it changes no behaviour today: the service reads `main` and CI deploys through the API, not through a Blueprint sync. **Un-park at the next dashboard visit made for another reason, or before the next change to `render.yaml`, whichever comes first** — the second is the one that matters, because that is when someone will expect a `render.yaml` change to reach Render. Separately and firmly established: the branch is **not settable through the API** — `PATCH /v1/blueprints/{id}` returns 200 and ignores `branch` under every field name tried while accepting `autoSync`, so the endpoint works and that field is simply not writable. | `curl -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/blueprints` — `branch` currently reads `feat/deploy-staging` |
| Render web service `bookflow-api-staging` | the deployed staging API | ADR-024 amendment, ADR-034 | **exists and is live — 2026-08-15.** Id **`srv-da06mqvlk1mc73f98qv0`**, region **`frankfurt`** (= `eu-central-1`, same region as the staging database), plan `free`, runtime `docker`, health check `/health`, **`autoDeployTrigger: off`**. URL **`https://bookflow-api-staging-gabm.onrender.com`**. Ids and the URL are identifiers, not secrets. | `curl -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/services/srv-da06mqvlk1mc73f98qv0` · `curl -sf https://bookflow-api-staging-gabm.onrender.com/health` |
| Render service environment variables | the service's runtime configuration | ADR-023, ADR-038 | **five set, by NAME only in the repository** (`render.yaml`, all `sync: false`): `APP_ENV`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`. Four hold correct staging values, verified by comparison against the authenticated Supabase CLI. **`DATABASE_URL` is WRONG — see the row below.** `ADMIN_DATABASE_URL` is deliberately absent (ADR-034: a deployed API must not hold DDL rights). | `curl -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/services/srv-da06mqvlk1mc73f98qv0/env-vars` |
| **`DATABASE_URL` on the staging service** | the application role's connection (ADR-038) | ADR-038, ADR-023 | **correct as of 2026-08-15**, after the `bookflow_api` password was rotated (see the rule below). Connects through **Supavisor session mode** — `bookflow_api.<ref>@aws-0-eu-central-1.pooler.supabase.com:5432` — not the direct host, which is IPv6-only for this project while Render's egress is IPv4. Verified by a database-backed route on the deployed service, not by inspection. | `curl` `/v1/me` on the deployed service with a real token → 200 with a row |
| **`sslmode=no-verify` on that connection** | how the API reaches staging Postgres | ADR-023 | **A known, staging-only weakening, recorded rather than hidden.** Supabase's pooler presents a self-signed chain, and `sslmode=require` fails with *"self-signed certificate in certificate chain"* because `pg-connection-string` treats `require` as `verify-full`. The connection **is encrypted**; what is given up is authentication of the server — an active man-in-the-middle between Render and Supabase would not be detected. The fix is to bundle Supabase's CA and pass it as `ssl.ca`, which needs a change to `platform/db.ts` and a certificate in the image. **Production cannot start with it** — `platform/config.ts` refuses to boot when `APP_ENV=production` and `DATABASE_URL` does not carry `sslmode=verify-full` or `verify-ca`, naming the variable and citing **K76**, which tracks the proper fix. The position is now a condition rather than a comment. | the value ends `?sslmode=no-verify`; `APP_ENV=production` with it must fail at startup |
| Render API key | triggering and polling deploys; creating and inspecting the service | ADR-023, ADR-024 amendment | **exists — 2026-08-15.** Held locally as `RENDER_API_KEY` in the gitignored `.env`, **and in Actions secrets** as `RENDER_API_KEY`. **No deploy hook is used**: the deploy job triggers and polls with this one credential, so `RENDER_DEPLOY_HOOK_URL` does not exist and should not be created. | `gh secret list` |
| Render service id | which service the deploy job deploys | ADR-024 amendment | **in Actions secrets** as `RENDER_SERVICE_ID`. Not a secret in any real sense — it is in this file — but it lives beside the key so the workflow reads both the same way. | `gh secret list` |
| **The staging e2e account** | the only credential the Phase 3 e2e gate can sign in with | ADR-033 amendment, ADR-037 | **exists — 2026-08-15.** `auth.users` id **`9b5bdc22-4250-4213-88fd-08c519d5d53f`**, address `e2e-owner@bookflow.test`, **`email_confirmed_at` set at creation** through the GoTrue admin path — E14 means staging's sender reaches exactly one inbox, so an account that must click a link can never be used from CI. Its `user_profiles` row carries a deliberately random last name so the strings the screen renders exist in staging's database and nowhere else. **Created through the admin API, never through `POST /v1/auth/signup`** — that path would compensate and delete the user when the mail failed. | `GET /auth/v1/admin/users` with the staging service-role key |
| **Its password** | signing that account in from CI | ADR-023 | **exists only as the Actions secret `E2E_STAGING_PASSWORD`, and cannot be read back.** Generated in process memory, written to GitHub over stdin, and deleted from disk in the same operation — it was never printed, never placed in a process argument, and is in no file on this machine. **If CI cannot sign in, the answer is rotation, not recovery**: create a new password through the admin API and re-set the secret. **It is never compiled into a build** — CI performs the password grant in the workflow and passes only a one-hour `access_token` to the Flutter build, because `--dart-define-from-file` constant-folds its values into the binary (measured: `docs/analysis/10-e2e-credential-in-artefact.md`). **K78** is the tracking item. | `gh secret list` shows the name; the value is unreadable by design; `grep -c "eyJhbGciOi"` over a job log returns 0 |
| **Four Actions secrets carry the gate's inputs** | what the e2e job needs to reach staging | ADR-023 | `E2E_STAGING_EMAIL`, `E2E_STAGING_PASSWORD`, `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`. The last two are not secrets in the strict sense — the anon key is publishable (ADR-023) — but they are stored the same way so the workflow reads every input through one mechanism and no project reference lands in the repository. | `gh secret list` |
| Apple signing certificate + provisioning profile | iOS builds exist only via CI (ADR-015, ADR-024) | ADR-024 | **not yet** | `gh secret list` |

**Every row above is now command-verified.** The Supabase CLI is authenticated, so the three
hosted-project rows are checked rather than assumed, and `bookflow-spike` is confirmed gone
rather than reported gone.

### Staging's `auth.users` is no longer expected to be empty — 2026-08-15

**One permanent row now lives there**, the e2e account above. This matters because a zero count
was used as evidence twice, and it will never read zero again.

`docs/analysis/09-phase3-close.md` §2 records the A15 accounting: `select count(*) from
auth.users` returned **0**, every probe account having been deleted by the script that created
it, and the counter itself proven honest by driving it 0 → 1 → 0 rather than trusting a number
that had only ever read zero. **That record was true when it was written and is not wrong now** —
it describes staging before this account existed. **It is not a check to re-run expecting the
same answer.** Anyone who does will read `1`, and the only sound conclusions from that are the
two below.

**The correct check now** is not a count but an identity — *are there any users other than the
one that is supposed to be there?*

> **SUPERSEDED 2026-08-19 — DO NOT RUN THE CHECK AS THIS SECTION STATES IT.** A second account
> exists, so the one-id allowlist and the expected total below are both false. **The live check is
> the next section, "The identity check on staging's `auth.users` — TWO accounts, both keyed by
> id": two ids, expected total 2.** This section is kept because its reasoning — that a count was
> standing in for an identity — is what the live check is built on, and because it records
> correctly what was true between 2026-08-15 and 2026-08-18. Its own closing sentence anticipated
> exactly this: *"If the e2e gate ever creates accounts of its own, this row is updated in the
> same commit, because a stale expected-count here silently destroys the check."*

*Superseded text, kept as the record of what was true from 2026-08-15:*

```
GET /auth/v1/admin/users
→ every row's id must be 9b5bdc22-4250-4213-88fd-08c519d5d53f
```

A row that is not that id is residue: a probe some script failed to delete, or a sign-up whose
compensation did not run — which is exactly what A15 exists to detect, and the property the count
was standing in for all along. **Expected total: 1.** If the e2e gate ever creates accounts of its
own, this row is updated in the same commit, because a stale expected-count here silently
destroys the check.

**The 2026-08-14 auth verification left no residue.** It created two users on staging — one
throwaway at `@bookflow.test` for the admin-path check, one at the account owner's own address
for the delivery check — and **both were deleted**. `DELETE /auth/v1/admin/users/:id` returned
`200` for each, a subsequent `GET` on each returned `404`, and the project's user list was back to
**zero users**, which is where it started — true as written on 2026-08-14, and superseded by the
section above on 2026-08-15. The activation link that was delivered belongs to a
user that no longer exists and is therefore dead. No credential was written to disk or displayed
at any point: both keys were read from `supabase projects api-keys` into process memory and used
there (ADR-023 — this is the failure mode that cost `bookflow-spike` its existence).

### The identity check on staging's `auth.users` — TWO accounts, both keyed by id

**Added 2026-08-18, with the business account. Read this before running any residue check.**

**The check is an identity, not a count.** Its purpose is to answer *are there any users other than
the ones that are supposed to be there* — a probe some script failed to delete, or a sign-up whose
compensation did not run.

```
GET /auth/v1/admin/users
→ every row's id must be one of:
    9b5bdc22-4250-4213-88fd-08c519d5d53f   e2e-owner@bookflow.test          (never a member, K78)
    e508f672-dd11-4150-b686-cc06a525f749   e2e-owner-business@bookflow.test (the only member)
```

**Expected total: 2.**

**Both entries are keyed by ID as of 2026-08-18, and the check is stronger for it.** An
address-keyed entry answers *"is there a row for that address"*, which any row claiming that
address satisfies — including a **replacement** account created after the original was deleted, or
one created by a script that reused the address. **An id cannot be re-created**: `auth.users` ids
are generated per row, so a row bearing this address and a different id is a different account, and
the check now says so. That is the case the weaker form could not see, and it is not hypothetical
here — this project has already deleted and recreated staging accounts during verification work.

**The first attempt to record this id supplied the WRONG one**, and the episode is left in place
rather than tidied away: the id first reported for the business account was
`9b5bdc22-4250-4213-88fd-08c519d5d53f`, **the first account's**, already recorded above. Two rows
cannot share an id, so it was a copy of the wrong row. **It was caught by comparing the two before
writing, which is the only reason this section does not now assert that two accounts share one
identity** — and a check asserting an impossibility would have been worse than the placeholder it
replaced. The correct id was read from `GET /auth/v1/admin/users` against `bookflow-staging`; it
could not be obtained on the development machine, where `.env` points `SUPABASE_URL` at
`http://127.0.0.1:54321` and no staging service-role key exists.

*Superseded note, kept because the reasoning still applies to any entry recorded by address:*
until an id lands, an address-keyed allowlist still detects a third row and still detects a
stranger — it is weaker only in that it cannot detect the business account
being replaced by a different account at the same address.

**RESOLVED AT THE MERGE, 2026-08-19.** This paragraph used to say that the original identity
check — *"every row's id must be `9b5bdc22-…`"* and **"Expected total: 1"** — existed only on
`feat/phase3-e2e`, so there was no "Expected total: 1" in this file to rewrite, and that the
inversion risk would go live the moment PR #14 merged.

**#14 merged, and the risk went live exactly as described.** Git auto-merged this file **without
a conflict** — the two sections were written in different regions, so nothing forced a choice —
and for one commit the file asserted both totals. **A clean merge is not a correct merge**, which
is why this was checked line by line rather than trusted. The older section above is now marked
superseded in place; this one is the live check.

### This is a deliberate exception to `00-frame.md` §5.5's deferral, and the reason is the direction of the failure

§5.5 defers this file's corrections until PR #14 merges, because #14 also edits it and a conflict
in the one document whose whole value is being readable about the state of the world is worse than
a fortnight of staleness. **That reasoning holds for a stale entry and does not hold for this one.**

**A stale `seed.sql` entry degrades the check: it describes a file as unwritable that is written,
and a reader loses information. A stale expected-total INVERTS it: it reports a legitimate account
as residue.** The A15 accounting exists to catch leftover users, and after today it would flag the
business account as exactly that — so the next person to run it either chases a ghost or, worse,
deletes the account the e2e business journey depends on. **A check that reports the wrong answer
confidently is more dangerous than no check**, and that is the whole reason this file's own rule
says a new account's row is written *in the same commit that creates the account*.

The conflict cost is accepted and bounded: #14 edits §4 about `seed.sql`, this edits §3's table and
adds this section. They are different regions of the file and a hand resolution is cheap.

### The write-only-secret rule — write a credential to every consumer at the moment you generate it

**Learned the expensive way on 2026-08-15, and it will recur.**

Every secret store this project uses is **write-only**: GitHub Actions secrets, Render environment
variables and Supabase's generated passwords can all be *set* and none can be *read back*. That
has a consequence which is obvious afterwards and easy to miss in the moment:

> **A credential that is not written to every consumer at the moment it is generated cannot be
> added to a new consumer later. The only options are to rotate it, or to be unable to set it.**

What happened: `bookflow_api`'s staging password was generated in an earlier session and piped
into the Actions secret `STAGING_APP_DATABASE_URL` without ever being displayed — correct
handling, and exactly what ADR-023 asks for. When Render later became a second consumer of the
same credential, there was no way to read it back, and the staging service sat with a local
development connection string in it. **Rotation was the only path**, and it was safe here only
because nothing consumed the secret yet: `migrate-staging` uses `STAGING_DATABASE_URL`, the
`postgres` credential, which is a different secret.

**The rule, going forward: when a credential is generated, enumerate its consumers first and write
it to all of them in one operation.** If a consumer is added afterwards, rotating is not a failure
— it is the designed path — but it must be done deliberately, with every existing consumer
updated in the same operation, or the ones that are missed break at a time nobody connects to the
change.

**Which credentials this now applies to:**

| Credential | Consumers today | If a consumer is added |
|---|---|---|
| `bookflow_api` staging password | Actions `STAGING_APP_DATABASE_URL` · Render `DATABASE_URL` | rotate and write to all three |
| `postgres` staging password | Actions `STAGING_DATABASE_URL` | not readable; rotating it means resetting the project database password in Supabase |
| Supabase `service_role` / `anon` keys | Render env vars · local `.env` | **exempt** — re-readable at any time via `supabase projects api-keys`, so a new consumer is just another read |
| Render API key | local `.env` · Actions `RENDER_API_KEY` | re-issue from the Render dashboard; the old one keeps working until deleted |
| Resend API key | Supabase staging SMTP settings | not readable; a new consumer means a new key |

The Supabase API keys are the useful contrast: they are the one credential here that is **not**
write-only, which is why nothing above worries about them.

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
