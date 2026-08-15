> Derived record, not source. Written at PR 4b, the last PR of Phase 3. Records what was
> verified, what was not, and which `DEFINITION_OF_DONE.md` items do not hold.

# Phase 3 — close-out

**Date:** 2026-08-15 · **Slice:** ADR-032's Phase 3, PRs 1 → 4b

This file exists because `DEFINITION_OF_DONE.md` is satisfied **once, for the whole slice, at the
end** (ADR-032), and a checklist ticked in a commit message is not a record anybody can audit.
Every item below carries either its evidence or an explicit statement that it does not hold.

**Three items do not hold.** They are listed in full in §4 rather than buried: the e2e test, the
review-record requirement, and the acceptance-criteria mapping.

---

## 1. The Blueprint pointer

**Outcome: it cannot be repointed through the API. It is a dashboard-only change, and it has not
been made.**

`render.yaml` is applied to Render through a **Blueprint** — `bookflow-staging`,
`exs-da06j761egvs73817n70` — which tracks a branch and a path (`render.yaml`) and re-applies the
file when that branch changes. The service it created was repointed to `main` at PR 4a; **the
Blueprint was not**, and still reads `branch: feat/deploy-staging`, a branch deleted when PR 4a
merged.

**What the branch setting controls, and what it does not.** It governs only where Render reads
`render.yaml` from when it syncs. It does **not** control which branch the service builds — that
is the service's own `branch`, already `main`, and the post-merge deploy of `6d5989a` proves it.
So the consequence is narrow and real: **a future change to `render.yaml` on `main` will not be
picked up**, and `autoSync: true` points at a branch that no longer exists.

**Established by experiment, not by reading:**

| Request | Result |
|---|---|
| `PATCH /v1/blueprints/{id}` `{"branch":"main"}` | HTTP 200, response echoes `feat/deploy-staging` — ignored |
| `{"branchName":"main"}` | HTTP 200, unchanged |
| `{"branch":"main","autoSync":true}` | HTTP 200, unchanged |
| `{"path":"render.yaml","branch":"main"}` | HTTP 200, unchanged |
| `{"autoSync":false}` | HTTP 200, **changed to `false`** — so the endpoint works |

The `autoSync` toggle is the control: `PATCH` is functional and accepts writes, and `branch` is
simply not a settable field. It was restored to `true` immediately.

**What to do, in the dashboard.** Render's own documentation shows that a Blueprint has a Settings
page but does not name the field, and this session cannot see the dashboard — so the following is
navigation, not a claim about a control that was observed:

1. `dashboard.render.com` → **Blueprints** in the left nav → **bookflow-staging**
2. **Settings**
3. If a branch field is offered, set it to `main` and save.
4. If it is not, **disconnect the Blueprint and re-create it from `main`** (New + → Blueprint →
   the repo → branch `main`). This is safe: Render's docs state that *"Syncing a Blueprint never
   deletes an existing resource. This is true even if you remove a resource definition from your
   Blueprint file, or if you disconnect your Blueprint from Render entirely."* The running service
   and its environment variables survive.

**Until then, `render.yaml` is documentation rather than governing configuration** — the file and
the live service agree today, and nothing enforces that they continue to.

---

## 2. A15 — the created-but-unemailable compensation path

**Outcome: the compensation is verified against real GoTrue and staging Postgres. A15's stated
premise is wrong, and the trigger is a different one.**

### The premise does not hold

A15 says the trigger is that *"the admin API does not validate address deliverability and the
public endpoints do"* — spike 002's S2 finding, that `@bookflow.test` was accepted by
`POST /admin/users` and rejected by `POST /resend` with `email_address_invalid`.

**Re-measured on staging on 2026-08-15, after custom SMTP was configured:**

| Address suffix | `POST /admin/users` | `POST /resend` |
|---|---|---|
| `@bookflow.test` | 200 | **500 `unexpected_failure`** |
| `@localhost` | 200 | 500 `unexpected_failure` |
| `@a` | 200 | 500 `unexpected_failure` |
| `@invalid` | 200 | 500 `unexpected_failure` |
| `@example.invalid` | 200 | 500 `unexpected_failure` |
| `@test.test` | 200 | 500 `unexpected_failure` |
| `@nonexistent-tld-zzz` | 200 | 500 `unexpected_failure` |
| **`@example.com`** (control) | 200 | **500 `unexpected_failure`** |
| **`dennismugu7@gmail.com`** (account owner) | 200 | **200**, `confirmation_sent_at` set |

**The control is what settles it.** A perfectly ordinary `@example.com` address fails exactly like
`@a` does, and the only address that succeeds is the Resend account owner's own. So this is **not
address validation** — it is the Resend **test sender**, `onboarding@resend.dev`, which delivers
only to the account owner's inbox and returns a server error for everyone else.

Two differences from what A15 recorded, and both matter:

- **The failure is a 500, not a 4xx.** S2 saw `email_address_invalid`; staging now returns
  `unexpected_failure`. Our GoTrue client classifies `status >= 500` as `unavailable`, so the
  endpoint answers **503 `auth-unavailable`**, not the 400 `validation-failed` that an address
  rejection would produce.
- **Every address is affected, not a class of them.** The trigger is not "some addresses are
  unemailable" but "no address except one is emailable", which is a property of the sender and
  will disappear the moment a domain-verified sender is configured. **Tracked in its own right as
  E14** — it is a concrete staging defect with a known fix, not a footnote to A15.

### The compensation itself is verified

Driven through the **deployed** staging API with nothing injected:

```
POST https://bookflow-api-staging-gabm.onrender.com/v1/auth/signup
  -> 503 {"type":"/problems/auth-unavailable","title":"Authentication service unavailable"}

OK  no auth.users row survives for that address
OK  no user_profiles row survives for that address
OK  auth.users is back to its baseline count
OK  user_profiles is back to its baseline count
```

**Classification received: `auth-unavailable` (503).** A15 asked specifically whether the real
failure would be classified as anything other than `unavailable`. It is not — and now the reason
is known, which is that the failure arrives as a 500 rather than as an address rejection.

**What is still unproven.** The `invalid-email` branch of `sendProblem` — the one that answers 400
when `/resend` rejects an address as malformed — **has never run against real GoTrue**. It is
covered by the local injected-500 test only in the sense that both branches share the
compensation; the classification itself is untested in production conditions. That is a narrower
gap than A15 described, and it should be re-checked when the sender changes.

**A15 can be closed with a correction**, not with a clean pass. The compensation works; the
premise was wrong.

---

## 3. The staging smoke test

**Built, in CI, and proven red before being accepted green.**

`scripts/smoke-staging.mjs`, run by the `smoke-staging` job on push to `main`, gated on
`deploy-staging` so it tests the build that push produced. It uses **no credentials** — every
assertion is a public endpoint.

What it asserts on the deployed service: `/health` returns the contract body; `/v1/me` and
`/v1/businesses/:id` are 401 with RFC 9457 problem documents (default-deny survived the deploy);
a malformed id without a token is 401 rather than 400 (authentication before validation); an empty
sign-up body is 400 `validation-failed`; and a real sign-up reaches the database and compensates.

**Why the last one proves the database is reachable without a credential.** A sign-up runs the
breach check, creates the GoTrue user, **inserts into `user_profiles` on staging Postgres**, then
fails at `resend`. A 503 therefore proves the insert succeeded — if Postgres were unreachable the
insert would fail first and the answer would be 500 `internal-error`. The compensation removes both
rows, so the probe leaves nothing behind.

### The coupling is declared, and the test announces its own obsolescence

This assertion infers a working database from a **failing** mailer (**E14**). That is acceptable
only because it fails loudly the moment the premise dies: when staging's sender is fixed, sign-up
returns 202, and the check reports

> `PREMISE GONE: staging's sender now delivers to arbitrary recipients, so sign-up SUCCEEDS`

names the address of the account the run left behind — **compensation does not remove it on the
success path** — says the assertion must be rewritten rather than re-run, and exits 1.

**Forced and observed**, against a stub returning 202 while every other endpoint answered exactly
what the real service answers: nine assertions green, that one red, exit 1. **Fixing E14 turning
this red is the intended proof that the fix landed.**

### Proven red, twice

**1. Service suspended** → 10 assertions failed, exit 1. **This found a real flaw in the test**: a
suspended Render service answers 503 to everything, and the database assertion — which checked
only the status — reported success for a service that was not running. Status and problem type are
now a single assertion, because the platform does not emit RFC 9457 and that is what distinguishes
our 503 from its own. Resumed, re-run, green.

**2. Deploy broken** → `APP_ENV=production` was set on the service, which makes the new
configuration guard refuse to start (staging's `DATABASE_URL` carries `sslmode=no-verify`). The
deploy finished **`update_failed`**; restoring `APP_ENV=staging` returned it to **`live`**. Render's
log API returned nothing for the failed container, so the guard's message was confirmed directly
instead:

```
Invalid environment configuration:
  - DATABASE_URL must verify the database server in production: set sslmode=verify-full …
    tracked as K76 in docs/analysis/05-triage.md
exit=1
```

That is two properties proven at once: the smoke test detects a broken deployment, and **K76's
guard blocks a production start on real infrastructure**, not only in unit tests.

---

## 4. `DEFINITION_OF_DONE.md`, item by item

### Automated gates

| Item | Holds? | Evidence |
|---|---|---|
| `npm run verify` exits zero | **yes** | Green on this branch and on `main`; CI's `verify` job is the same command |
| The integration suite ran | **yes** | 7 integration files; the suite fails rather than skipping when the database is unreachable, and that behaviour was observed on 2026-08-12 when Docker's port proxy was down |
| Every acceptance criterion maps to a named test | **NO — see §5** | Phase 0 produced ADRs, not a written acceptance-criteria list, so there is nothing to map from |
| Dart: `flutter analyze`, `dart format`, `flutter test` | **yes** | CI `mobile` job, green; 27 tests |
| e2e test for critical journeys | **NO — see §5** | The journey cannot be driven: the client has no sign-up or login UI |
| Migration applies to a **fresh** database | **yes** | `supabase db reset` locally on every stack restart; CI runs `supabase start` from empty on every push |
| Migration applies to a **copy of the current** schema | **yes** | `migrate-staging` applies to the live staging database on every push to `main`; last run reported `Remote database is up to date` |
| OpenAPI spec regenerated, no uncommitted diff | **yes** | CI `contracts` job fails on drift; green |
| Dart client regenerated, no uncommitted diff | **yes** | same job |
| CI green end to end, including the build | **yes** | The `main` run for `6d5989a`: `verify`, `contracts`, `mobile`, `ios-build`, `migrate-staging`, `deploy-staging` — all green. `ios-build` compiles the app unsigned on macOS |

### Self-review

| Item | Holds? | Evidence |
|---|---|---|
| Full diff read in the review UI | **yes** | Every PR reviewed before merge by the guiding session; records on PRs #8–#11 |
| Zero dead code, commented-out experiments, stray debug logs, `TODO`s | **yes** | `analysis_options.yaml` sets `todo: ignore` but no `TODO` was added; ESLint and `flutter analyze --fatal-infos` are clean |
| Every new screen implements loading, empty and error | **yes** | `AsyncValueView` makes it exhaustive by construction (ADR-028); screen #20's three states are individually tested |
| No route handler contains business logic | **yes** | `auth.routes.ts` calls `signUp` and serialises; the service holds the mechanism |
| No public endpoint reads an owner-scoped table | **yes** | The only public routes are `/health` and `POST /v1/auth/signup`; the latter writes `user_profiles` for the caller being created and reads nothing owner-scoped |
| Every new money value passes the safe-integer assertion | **n/a** | Phase 3 introduced no money value |
| Every new protected query goes through the membership scoping rule | **yes** | `businesses.repository.ts` joins through `memberships`; `me`/`profile` are keyed by the caller's own id, and both files state why that is not an exception |
| No booking-conflict check duplicates the exclusion constraint | **n/a** | No booking code in Phase 3 |
| No email dispatched inside a request transaction | **yes** | ADR-027 puts auth email in GoTrue; no outbox exists yet, and no mail provider is called from a request |
| Every new public field is in the `business_public` allowlist deliberately | **n/a** | The projection does not exist yet (K71) |

### Human gate

| Item | Holds? | Evidence |
|---|---|---|
| The completion report names every Do-Not-Vibe surface | **yes** | Each PR's review record names them, or states which of the nine are untouched |
| Each named surface reviewed line by line by a human, recorded on the PR | **PARTIAL — see §5** | Reviewed by a second reader on every PR; recorded on PRs #8–#11 only. PRs #4–#7 have no record |
| Every `S` item touching the slice resolved in Phase 0, triage updated | **yes** | K72, K73 (ADR-037, ADR-038), K61 (ADR-028), K62 (ADR-033), K63/K10 (ADR-031), K67/K68 (ADR-034), J3 (ADR-035). K74 was raised and closed within the slice; K75 and K76 are recorded as deferred with their triggers |
| No open triage item answered by implementation instead of by decision | **yes** | K74 was closed by a decision recorded in the triage before the code shipped; K75 and K76 are open and explicitly not implemented |
| A foundation-level change has a new ADR; no ADR was edited to say something different | **yes** | ADR-037, ADR-038, ADR-039 added; ADR-024, ADR-028, ADR-030, ADR-032 amended by dated append-only entries |
| PR description states what changed, why, how to test, risks | **yes** | PRs #8–#11 |
| Deployed to staging and smoke-tested there | **yes** | §3 |
| Tech debt written down, not remembered | **yes** | K75 (profile editing), K76 (CA verification), A15's correction, the Blueprint pointer, the eight unclassified screenshots in ADR-039 |

---

## 5. The three items that do not hold

### 5.1 The e2e test — does not hold, and could not

**ADR-033 already defines a critical journey**, and this document does not redefine it. It is
*"one whose failure prevents an owner from taking a booking, or a client from making one"*, and
Phase 3's e2e is specified as *"sign-up, verification, login, and reaching screen #20 as an
authenticated user"*, driven by Flutter's `integration_test`, with an exclusivity clause: *"An API
integration test is not an e2e test, however end-to-end it feels."*

**Three of that journey's four steps have no user interface.** Verified by reading the client:

- `apps/mobile/lib/features/` contains `startup`, `signed_out`, `setup`, `profile`, `membership`.
  **There is no sign-up screen and no login screen.**
- The welcome screen's two buttons — "Create for free" and "Sign in" — are `onPressed: null`.
  PR 3a rendered them inert deliberately and said so.
- **No sign-in call exists anywhere in the client**; a search for `signIn`/`signUp` against the
  client returns nothing outside documentation comments.
- `integration_test` is not a dependency of `apps/mobile`.

This is not a matter of effort. ADR-032 scoped the client to the shell (3a) and screen #20 (3b) and
excluded the sign-up UI and the login sheet as later slices, so **the journey ADR-033 names cannot
be driven through the product as it exists.** ADR-033 anticipated part of this — it flagged
automated email verification as unsolved and possibly *"the most expensive single piece of
Phase 3"* — but not that the client would lack the screens entirely.

**What was built instead**, and named honestly as not being the same thing: the staging smoke test
in §3. It ticks the *staging* box and does not tick the *e2e* box.

**This item cannot be satisfied until the sign-up and login screens exist.** It belongs to whichever
slice builds them, and the e2e suite should land with them rather than being retro-fitted.

### 5.2 The review record — a standing exception, stated as one

ADR-032's 2026-08-15 amendment records that **the review protocol the ADR specifies has never
run**: no separate sitting, no written checklist prepared before reading, no review recorded as a
PR comment — not once across PRs 1, 2a, 2b and 2c.

What did happen is stronger in one dimension and weaker in another. **Every Do-Not-Vibe surface was
read line by line before merge by a second reader** — the guiding session — which returned findings
that changed the code in every PR. The Rationale's objection to self-review, that the author reads
what they meant rather than what is there, does not apply to a reader who never intended anything.

But: **the second reader is not a second contributor**, so ADR-026's replacement trigger is
unsatisfied; and **PRs #4–#7 left no record at all**, so their reviews are real and unprovable. The
rule requiring a record was created *after* them (`442e138`), and reconstructing records now would
be exactly the after-the-fact artefact the rule exists to prevent. PRs #8, #9, #10 and #11 each
carry one.

**And the owner's own pass has not happened on any PR.** It is not a duplicate of the second
reader's: a correctness reviewer asks whether the code does what it says; the owner asks whether
what it says is what they wanted, and can reject a premise rather than an implementation. It is
outstanding for the whole of Phase 3.

### 5.3 Acceptance criteria mapped to named tests — nothing to map from

The item assumes Phase 0 produced a written list of acceptance criteria per slice. **It did not.**
Phase 0 produced ADRs, a triage and a set of resolved items; the closest thing to acceptance
criteria is ADR-032's description of what each PR delivers, which is prose about scope rather than
a list of assertions.

**So this item is unsatisfiable as written for Phase 3**, and saying "yes" would mean pointing at
tests that were not derived from any criterion. Coverage is nonetheless specific rather than
incidental — 25 unit and 62 integration assertions on the API, 27 on the client, each named after
the behaviour it protects — but that is coverage, not a mapping.

**This is a defect in the process, not in the slice**, and it belongs to whoever next writes a
Phase 0: either produce acceptance criteria the item can map to, or amend
`DEFINITION_OF_DONE.md` to ask for something that exists.

---

## 6. What Phase 3 leaves behind

| Item | Where | Trigger |
|---|---|---|
| **K75** — profile editing | triage | the profile-editing slice |
| **K76** — verify the database certificate | triage | production; the guard blocks a production start until then |
| **A15** — needs correcting, not closing clean | triage | this document |
| **The Blueprint pointer** | §1 | a dashboard visit; before the next `render.yaml` change |
| **The e2e suite** | §5.1 | the slice that builds sign-up and login |
| **The owner's review pass** | §5.2 | outstanding now |
| **Eight unclassified screenshots** | ADR-039 | as each screen is built |
| **E14** — staging's sender reaches one inbox | triage | before any multi-user testing on staging; fixing it turns the smoke test red on purpose |
