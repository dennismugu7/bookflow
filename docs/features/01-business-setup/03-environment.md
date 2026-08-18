# Business setup — Phase 2 environment and branch setup

The feature manual's Phase 2 (`docs/source/Manual-Feature-Scaffolding.md:54-66`), whose stated
purpose is *"Housekeeping that prevents a whole class of 'works on my machine' pain."*

Five requirements. Four are recorded here; the fifth (fixtures) is a gap analysis only — nothing
is written, because the tables it would seed are not yet touched by any code.

## A. Sync with the mainline

**`main` has not moved. `origin/main` and local `main` are both `421dcc2`** — *"docs: the three
decisions taken at the merge of PR #12 (#13)"* — unchanged since this branch was cut. `git fetch
origin` on 2026-08-17 brought nothing down. **No rebase and no merge was performed**, because
there is nothing to take.

**And that is not the finding this step is actually about.** The manual asks for a sync *"so you
branch from current reality, not last week's."* **`main` is not current reality.** PR #14 is
`OPEN` and carries ADR-040, the `e2e-staging` job and Phase 3's close-out; `main` still records
Phase 3 as open and holds 39 ADRs where the true count across branches is 42.

**So this slice is branched from last week's reality in the only sense the manual means, and
nothing can be done about it until Actions minutes reset (~2026-08-31).** Syncing changes no
byte. Recording that is worth more than performing a no-op and marking the step done — the risk
the manual is guarding against is real here, it simply cannot be mitigated by pulling.

**What it means concretely for this slice:** `docs/analysis/05-triage.md` on this branch has no
K77 or K78; `docs/BUILD_LOG.md` has no §8; `docs/analysis/09-phase3-close.md` reads *Status:
OPEN*. None blocks Phase 2, and each will arrive by merge rather than by anything done here.

## B. The feature branch

**`feat/business-setup-frame`. Satisfied retrospectively, not performed now.**

The manual places branch creation at Phase 2, *"immediately before code"*. **This branch was cut
at Phase 0** and already holds eighteen commits of design documents — the frame, the acceptance
criteria, the design, ADR-041 and ADR-042. **That differs from the manual's assumption and is
recorded rather than glossed.**

Nothing is wrong with the result: the name follows ADR-026's *"short-lived `feat/`, `fix/` and
`chore/` branches, squash-merged to `main`"*, it is not the shared branch, and it branches from
`main`. But the step was met by something that had already happened, and a reader should know the
ordering was not the manual's.

**One consequence worth naming:** "short-lived" is under strain. The branch cannot merge until
the reset, so it will be long-lived by force. That is the same wall PR #14 is behind and not a
choice made here.

## C. The green baseline — established 2026-08-17, before any code

**The point of this step is attribution.** *"If it's broken before you start, you won't know
whether you broke it."* A baseline that says "it was green" is not a baseline; these numbers are.

### TypeScript — `npm run verify`, the full gate

| Gate | Result |
|---|---|
| `eslint .` | clean, zero warnings |
| `prettier --check .` | *"All matched files use Prettier code style!"* |
| `tsc --noEmit` | clean |
| **Unit tests** | **42 passed, in 3 files** — `node-version.test.ts` (5), `config.test.ts` (18), `jwt.test.ts` (19) |
| **Integration tests** | **72 passed, in 7 files** — `seed.integration.test.ts` (3), `harness.integration.test.ts` (4), `db.integration.test.ts` (5), `role.integration.test.ts` (19), `schema.integration.test.ts` (16), `routes.integration.test.ts` (14), `signup.integration.test.ts` (11) |

**The integration suite ran against the real local Supabase stack, not a mock**, which is what
`DEFINITION_OF_DONE.md` requires and why "0 integration tests" would be a failure rather than a
pass.

**Expect log noise on a green run.** `signup.integration.test.ts` deliberately drives failure
paths — an aborted transaction (`25P02`), a GoTrue 500, malformed bodies — and each logs at
`warn` or `info` while the test passes. **Noise in this baseline is not a defect; its absence
next time would be the surprise.**

### Dart

| Gate | Result |
|---|---|
| `flutter analyze` | **No issues found!** (76.7s) |
| `dart format --set-exit-if-changed` | **27 files, 0 changed** |
| `flutter test` | **28 passed**, across 6 test files plus a `golden/` directory |

### Migrations

**Three in the repository, three applied locally, no drift.** `supabase migration list --local`
reports every `local` version matched by a `remote` one:

| Version | File |
|---|---|
| `20260810163827` | `enable_extensions.sql` |
| `20260811164304` | `foundation_schema.sql` |
| `20260811180042` | `application_role.sql` |

**Nothing is pending.** Decision 10's partial unique index is **not** a pending migration — it is
unwritten work (task T2). The distinction matters: this step is satisfied by the existing three
applying cleanly, not by the new one existing.

### Verdict

**Everything is green. Nothing was found broken, so nothing had to be reported under the
manual's own stopping condition.** Any failure from here is attributable to this slice.

## D. Feature flag — CONSIDERED AND DECLINED

**The manual's only conditional step**: *"Set up a feature flag **if** the feature is large,
risky, or will ship in pieces."* This feature is large and risky, so the condition is arguably
met and the answer is still no. Three reasons:

1. **There is no production environment for a flag to be off in.** ADR-023 records that
   production has no Supabase slot; ADR-024 deploys production only on a tag that has never been
   cut. A flag's entire value — merge incomplete work that is dark in production — has no
   referent.
2. **The branch cannot merge before the reset**, so a flag buys no safe partial merge. The thing
   it would enable is the thing that is blocked for an unrelated reason.
3. **T7+T8 must land atomically regardless** (`02-design.md` §E). Between moving `/home` to the
   dashboard and building the account menu, sign-out is reachable through neither screen. **A
   flag would not make that separable — it would hide it**, shipping a state where the flag's
   off-path and on-path are both coherent and the transition is not.

**K58 is untouched.** ADR-026 deferred the feature-flag *system* with a named trigger — answer
before the first production release — and this declines a flag for one slice, which is not that
decision.

## E. Fixtures

### E.1 What already existed

**More than expected.** `supabase/seed.sql` exists — 144 lines seeding one owner, one business
and one membership at fixed ids, idempotent, local-only, applied by `supabase db reset` and
`npm run seed`. It is verified by `seed.integration.test.ts`, which **signs the seeded owner in
against real GoTrue** rather than counting rows. (`docs/ENVIRONMENT.md` §4 still says this file
does not exist — see `00-frame.md` §5.5.)

The harness supplies `db` (a per-test transaction as `bookflow_api`, rolled back after),
`asAdmin`, `asRole` and `expectDenied`.

### E.2 The gap, and what was built

The seed gives **one owner who already has a business** — the `member` path. It gives nothing
for the state every creation criterion starts from, nor for a second party.

**Three helpers, in `apps/api/test/integration/accounts.ts`. Helpers inside the transaction, not
seed rows** — `seed.sql` is a demo state, and a demo state cannot also be a test fixture without
every test inheriting whatever the demo needs next.

| Helper | Provides |
|---|---|
| `accountWithoutBusiness` | An `auth.users` row plus its `user_profiles` row, owning nothing |
| `accountWithBusiness` | The above, plus a business and one `owner` membership |
| `unrelatedAccountWithBusiness` | A second such account, **asserted** to share no id and no email with the first |

Ids are random rather than fixed: integration files run in parallel against one database, and two
files choosing the same constant would contend **across** transactions rather than within one —
the shape A14 describes for the booking slice, avoided by construction.

**`auth.users` is written through `asAdmin`; everything in `public` is written as the application
role, deliberately.** That second half is not incidental — see §E.4.

### E.3 How they are verified — driven, not counted

`accounts.integration.test.ts`, **6 tests**. The standard is the project's own: a fixture was once
verified by counting rows when the seeded user could never log in, and `seed.integration.test.ts`
is the correction. **A `select count(*)` proves the insert ran; it does not prove the fixture is
what the tests above it assume.**

So each helper is pushed through the production code that will consume it —
`findBusinessForUser`, which applies the membership scoping rule, and `findProfileByUserId`:

- **`accountWithoutBusiness` is usable** — its profile reads back through `GET /v1/me`'s own
  repository, not through a row check.
- **It genuinely owns nothing** — the scoping rule returns `undefined` for it **while a business
  owned by somebody else exists**. Without that second account the assertion would pass against
  an empty table and prove nothing.
- **`accountWithBusiness` owns exactly what it claims** — the business resolves *through
  membership*, with `published` asserted `false` per ADR-004.
- **`unrelatedAccountWithBusiness` is genuinely unrelated** — driven **both ways round**, because
  one direction passing is consistent with a scoping bug that favours whichever account was
  created first; **and** each account is shown to still reach its own business, because otherwise
  both isolation assertions are satisfied by a repository that finds nothing at all.
- **Two accounts may hold the identical business name** — decision 7, criterion 51.

### E.4 A risk closed as a side effect

**R1 said `bookflow_api`'s write grants on `businesses` and `memberships` had never been
exercised by any code path** — the only write the API performs today is to `user_profiles`, at
sign-up. **These fixtures insert into both tables as `bookflow_api`, and they pass.** The grants
work.

That is R1's early warning arriving earlier than planned: it was scheduled as task T1, and
building the fixtures discharged it. **It cost nothing and it fires on every future run** — a
revoked or missing grant now fails in seconds, locally, instead of in `migrate-staging`.

**No fixture for criterion 50**, and the reason is in the criteria file's notes: `ck_memberships_role`
permits only `'owner'`, so the row that would distinguish a partial unique index from a plain one
cannot be inserted at all. It is a schema limit, not a missing fixture.

### E.5 The seed contradicts a decision made after it — recorded, not fixed

`supabase/seed.sql`'s business has **`published = true` and zero services.** §5's K27 answer makes
that state **impossible** once the publishing slice enforces its precondition: a business may not
be published until it has at least one service.

**Nothing to fix now.** The seed is local-only — it writes to `auth.users` directly and its own
header says so — nothing in CI or on staging runs it, and it predates the decision by a fortnight.
Its comment already anticipates the shape of the problem: *"services, team members, opening hours
and bookings have no tables yet … This file seeds what exists — one owner, one business, one
membership — and grows with each slice that adds a table."*

**Recorded so the publishing slice does not inherit a fixture that contradicts it.** The moment
services exist, this row is either given one or its `published` flag comes off; leaving it as it
is would mean the first local test of the precondition fails against seed data rather than
against a bug, which is the most expensive kind of false positive.

### E.6 The local database is shared across branches; the code is not

**Found on 2026-08-17, by a pre-push hook refusing correctly.**

`supabase/migrations/` is per-branch. The **applied** schema is not — there is one local Postgres,
and whatever migration was last run stays run across every `git switch`.

**So a branch whose migration set differs from the applied one fails its own suite, and both
sides are right.** The concrete instance: this branch's fourth migration,
`20260817160430_one_owner_membership_per_user`, was applied locally. Switching to
`docs/guide-handoff-refresh` — which descends from `main` and carries three migrations — its
`schema.integration.test.ts` failed on *"allows the same user in a different business"* with
`duplicate key value violates unique constraint "uq_memberships_one_owner_per_user"`. **That
test is correct for its own code.** It failed against a database from somewhere else.

**The remedy is `npm run db:reset` on the branch you are on. Never `--no-verify`.** The reset
applies exactly the migrations that branch carries, which is the definition of matching. Bypassing
the hook would push code whose suite has not run against its own schema, and
`docs/ENVIRONMENT.md` is explicit that the hook "catches accidents, not intent" — using
`--no-verify` here would be intent.

**This matters on 2026-08-31 and is why it is written down.** The merge sequence involves checking
out `feat/phase3-e2e`, `ci/ios-build-cadence` and `docs/guide-handoff-refresh` — all carrying
**three** migrations — while this branch carries **four**. Every one of those switches will fail
its suite until the database is reset, and the failure will look like a defect in the branch being
merged rather than like an artefact of the machine. **Reset first, then read the failure.**

### E.7 `contracts:generate` is not reliably atomic on this machine

**Two failure modes, both seen on 2026-08-17, and neither reads as what it is.**

**It deletes every model `.g.dart` and may not re-emit them.** The generator wipes
`packages/bookflow_api/` and rebuilds; `build_runner` is supposed to follow. Once it did not, and
the symptom was `flutter analyze` failing on `Undefined class
'RenameBusinessRequestInputBuilder'` — which looks like a code error in `apps/mobile`, not a
generation failure two packages away. **Check for `.g.dart` files after regenerating**:
`find packages/bookflow_api -name "*.g.dart" | wc -l` should not be zero.

**It fails with `EPERM` on `rmSync` when a `build_runner` daemon holds the directory open**, and
`contracts:check` reports that as exit 1 — **indistinguishable from drift unless you read the
output.** `build_runner` leaves a daemon behind; Windows will not delete a directory a process
has open. **An exit 1 from `contracts:check` is not evidence of drift until the message has been
read.**

**The remedy for both, and the order matters:** stop stray `dart`/`build_runner` processes, then
regenerate through **`npm run contracts:generate`** — never `build_runner` on its own.

**Running `build_runner` directly skips the pipeline's final `dart format`**, and the difference
is not cosmetic: it produced **real drift across 46 files** that `contracts:check` correctly
refused, on trailing-newline differences alone. The manual command looks like a subset of the
pipeline and is not one.
