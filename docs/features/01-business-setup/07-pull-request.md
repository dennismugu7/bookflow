# Business setup — the pull request description

> **This file is not the pull request.** It is the description, drafted at Phase 6 and pasted when
> the PR is opened. Opening a PR against `main` starts a CI run immediately (`ci.yml`,
> `pull_request: branches: [main]`), which is why it is not open yet — `docs/ENVIRONMENT.md` §6.
> Everything below the line is what gets pasted.

---

Phase 4's first feature slice: **an owner can create a business, and stops being routed to the
"finish setting up" stub forever.** 48 commits, 81 files, +10,779 / −128. A migration, three API
routes, three new screens and one widened, and six documents under
`docs/features/01-business-setup/`.

## Read it in this order

A diff this size has no useful entry point, so here is one. Each step makes the next readable.

1. **`docs/features/01-business-setup/00-frame.md` §4** — the twelve decisions. Everything below
   is downstream of these, and three of them are corrections to earlier reasoning that are worth
   reading as corrections.
2. **`02-design.md` §A.4 and §B** — the migration judgement, then the API contract. §B.5 maps
   every failure to a slug; §B.9 says what the contract cannot satisfy and why.
3. **`supabase/migrations/20260817160430_one_owner_membership_per_user.sql`** (`a94cfb0`) — one
   partial unique index. **Do-Not-Vibe; see below before reading it.**
4. **`apps/api/src/modules/businesses/`** — `schema` → `repository` → `service` → `routes`, in
   that order. The service is where the conflict decision lives (`bb54a7e`).
5. **`apps/mobile/lib/features/business/`, then `dashboard/`, then `account/`** — screen #5
   (`b502a23`), then #12 and #17 with the first push-navigation the app has ever had
   (`5ec5a0c`), then the membership status ceasing to be a constant (`410e2d4`).
6. **`05-phase4-close.md` and `06-phase6-close.md`** — what is proved, what is not, and what the
   self-review changed and deliberately did not.

## What it does

`POST /v1/businesses` creates a business and the caller's `owner` membership **in one statement**,
so neither can exist without the other. `GET /v1/me/business` answers "do I have one" without
needing an id. `PATCH /v1/businesses/{businessId}` renames — the name is the only editable field,
and there is no `DELETE` at all, which is how criterion 17 is satisfied.

On the client: screen #5 at `/setup`, screen #12 as the dashboard at `/home`, screen #17 as the
account menu, and screen #20 widened with a business section. `membership_repository.dart` stops
returning a constant.

## Why

`public.businesses` is the row every later feature hangs off, and until this slice **there was no
path by which an owner could come to have one** — through any screen or any endpoint. The app
already said so: `membership_repository.dart` returned `MembershipStatus.none` for every user and
recorded that this was the correct answer, not a placeholder. Criteria 41 and 42 are that sentence
made falsifiable.

## How to test it

**Reset the database first.** This branch carries **four** migrations; every other branch carries
three, and the local Postgres is shared across all of them. A suite run without this fails for the
right reason on the wrong branch — `03-environment.md` §E.6.

```
npm run db:reset          # applies THIS branch's four migrations, then seed.sql
npm run verify            # lint, format, typecheck, unit, then integration against real Postgres
npm run contracts:check   # OpenAPI + Dart client drift
cd apps/mobile && flutter analyze && dart format --set-exit-if-changed . && flutter test
```

Expected, and what was observed locally on `a04fafd`: **61 unit in 7 files**, **124 integration in
11 files**, `contracts: no drift`, `flutter analyze` — *No issues found!*, `dart format` 38 files
0 changed, `flutter test` **58 passed**.

Criteria coverage is derived, never maintained by hand:

```
grep -rhoE "'criterion [0-9]+(, [0-9]+)*" apps/api/src apps/api/test apps/mobile/test \
  | grep -oE "[0-9]+" | sort -n | uniq
```

**60 of 62.** The two unmapped are 48 and 49 — see below.

## CI HAS NEVER RUN ON THIS BRANCH

**Zero runs across all 48 commits.** Verified with the per-workflow query, paired with a control
so the zero means something:

```
gh api "repos/dennismugu7/bookflow/actions/workflows/331331404/runs?branch=feat/business-setup-frame" --jq '.total_count'   # 0
gh api "repos/dennismugu7/bookflow/actions/workflows/331331404/runs?branch=feat/phase3-e2e" --jq '.total_count'            # 8
```

**This branch is green LOCALLY and has never been green in CI**, because those are different
claims. Actions minutes were exhausted 2026-08-16 and reset ~2026-08-31. Opening this PR is what
produces the first run, and `DEFINITION_OF_DONE.md` asks for it before human review.

## Five things the diff cannot show

Each of these reads as a defect without the explanation.

**1. The migration is PARTIAL, and that is the decision.** `create unique index … on
public.memberships (user_id) where role = 'owner'`. A plain `unique (user_id)` would cap a user at
one membership of any kind and **permanently forbid a stylist working at two salons** — which
ADR-003 does not forbid and explicitly anticipates. **And the thing it replaces is a belief:**
`uq_memberships_user_business` was recorded in three documents as enforcing ADR-003's
one-business-per-account rule. **It does not.** It forbids the same user joining the *same*
business twice; two concurrent creations produce `(U, B1)` and `(U, B2)`, the tuples differ, and
neither insert is rejected. **Nothing enforced that rule until this branch** — no trigger, no
policy, no check, no code. `00-frame.md` decision 10 carries the full correction.

**2. Criteria 48, 49 and 50 are uncovered for three different reasons, none of them "missed".**
48's concurrent half needs a second database connection; the harness gives one transaction per
test. 49's second clause cannot be observed at all — fault injection was attempted, and every
arrangement that lets you look has already destroyed the evidence via `rollback to savepoint`; the
property holds by construction because both inserts are one statement. 50 is behaviourally
unreachable while `ck_memberships_role` permits only `'owner'`, so it carries a **declared schema
proxy** whose own test name says so: `criterion 50 — the index is partial on role = owner (SCHEMA
proxy, not the behaviour)`. All three are recorded in `01-acceptance-criteria.md`'s notes.

**3. Seven design deviations — register entries 10–16, plus three rulings at 17–19.** A reviewer
comparing the build to `native-04` and `native-11` will find controls missing. They are decisions:
screen #5 ships one field of four and no back arrow, screen #12 omits the Bookings/Contacts/
Calendar tabs, screen #17 ships two rows of five, screen #5 gains a sign-out the design does not
draw. **Two of the seven lived only in Dart source comments until T11's reconciliation** — a count
taken from the documents was short by two and looked complete. `docs/analysis/08-design-deviations.md`.

**4. `businessExistsUnscoped` is the one unscoped read in a module where everything else traverses
membership.** It exists **solely so a log can record a distinction the response deliberately
hides** — whether a 404 was "not yours" or "no such business". It returns a boolean, never a row;
runs only after a scoped read has already failed; has one permitted caller, which returns
`Promise<void>`; and its answer never reaches a response. **Not enforced by a comment:**
`businesses.boundaries.test.ts` reads the source tree and fails if it gains a second caller, is
imported outside the module, or if that caller's signature changes. The guard was driven — the
call site was temporarily changed to assign the result and the assertion failed.

**5. Two facts about what has NOT happened.** The **seam is open**: every layer passes its own
gate and the two halves have never met in a running process. The Flutter widgets are proved
against stubbed repositories; the generated Dio client, the base URL, the auth interceptor on
these routes and the JSON actually deserialising have been exercised by nothing. **Nobody has
watched it run.** And, as above, **no commit here has been built by CI.**

## Do-Not-Vibe surfaces — two, both needing line-by-line human review before merge

**Migrations.** `20260817160430_one_owner_membership_per_user.sql`. Additive — it creates an
index, alters no column, rewrites no data. It fails to build if duplicate owner rows exist, which
is the correct behaviour; staging has none, because no code path has ever inserted a `memberships`
row.

**The membership scoping rule.** Twice over: the new repository applies `user → membership →
business` to every protected read and write, and the index constrains the very table that rule
traverses. **`businessExistsUnscoped` is the deliberate exception** and is named here rather than
left to be found.

Per `DEFINITION_OF_DONE.md`, the record of that review is **a comment on this PR, posted before
merge, naming each surface read and who read it.** The owner's own review pass is a separate gate
and also required — this PR touches code, schema and CI-relevant configuration.

## Risks and follow-ups

**R1 — write grants on `businesses` and `memberships`** had never been exercised by any code path.
**Closed**: the integration fixtures insert into both as `bookflow_api` and pass.

**R2 — the first tap-driven route.** `router.dart`'s redirect was total; a pushed route is not the
destination the provider computes. **Closed by ADR-042** and a redirect test that needs no widget
tree.

**R3 — the staging e2e account.** K78 forbids giving the existing account a membership, and
criteria 41 and 42 are precisely about acquiring one. A second account now exists
(`e2e-owner-business@bookflow.test`, id `e508f672-dd11-4150-b686-cc06a525f749`). **Open**: the e2e
journey itself is not written, because `integration_test/profile_e2e_test.dart` arrives with
PR #14 and writing a rival copy here would conflict in the one file that defines the critical
journey.

**R4 — the §B.9 mapping drifts whenever criteria are appended.** It was wrong three times.
**Closed procedurally**: §B.9 now carries the rule that a criterion is classified in the same
commit that appends it.

**R5 — three screens and a widened fourth.** Managed by keeping T7+T8 atomic; between them,
sign-out is reachable through neither screen.

## Merge

**Squash-merge, per ADR-026** — *"short-lived `feat/`, `fix/` and `chore/` branches, squash-merged
to `main`"*, so `main`'s history is one commit per slice. **Delete the branch after.**

### Rebase risk — do not trust the "conflicts with nothing" claim

`GUIDE_HANDOFF.md` §5 records that this branch *"conflicts with nothing"*. **That was written when
it was ten commits of documents, and it is now 48 commits including code.** PR #14 merges first.
Both branches edit:

- **`docs/ENVIRONMENT.md`** — #14 adds the e2e account rows and the identity check; this branch
  adds the second account, its two secrets, and a two-id allowlist. **The identity check is the
  real conflict**: #14's says *"Expected total: 1"*, this branch's says 2, and after the merge the
  file would otherwise assert both.
- **`docs/analysis/05-triage.md`** — #14 adds K77 and K78; frame §5.1 owes K27 and K47 moving to
  Resolved on this side. Neither edit has been made here yet, deliberately.

Rebase on `main` after #14 lands, resolve both by hand, and re-run the gate — the local schema
will also need `npm run db:reset` on whichever branch you land on.

### Obligations that discharge at or after merge

| | What |
|---|---|
| **Frame §5.1** | K27 and K47 move to Resolved in `05-triage.md`. **The publishing slice's "at least one service" precondition travels on this and is lost if it does not happen.** |
| **Frame §5.4** | The index reaches staging only through `migrate-staging` on merge to `main` (ADR-034). Until then staging's schema lacks it. |
| **Frame §5.5** | `ENVIRONMENT.md` §4 is stale about `seed.sql`. |
| **The log-level item** | `app.ts` logs at `info` only when `APP_ENV=local`, so two of the three new events are dropped in staging and production. Pre-existing and project-wide. |
| **`04-phase3-close.md` §8** | Four queued items for the next handoff pass; two already flushed and marked. |

## Screenshots and recordings — DEFERRED, and here is why

**None. Gated on the seam.** The manual asks for screenshots or recordings for UI, and there is no
emulator and no device on this machine; iOS is impossible on Windows (ADR-015). Two local routes
were available and not taken, so the seam closes at `e2e-staging` after the reset —
`05-phase4-close.md` §5.1. **The one rendered artefact that does exist is
`docs/designs/built/native-20-profile.png`**, regenerated by the golden test, and it is
byte-identical before and after this branch's refactor of the avatar into `ui/`.

## Ticket

**There is no ticket system on this project, and this is not a dangling placeholder.** The
documents that serve that role are `docs/analysis/05-triage.md` (every open item, classified
F/S/D) and `docs/features/01-business-setup/` (this slice's frame, criteria, design and closes).
The nearest thing to a ticket for this work is `00-frame.md` §1.
