# Business setup — the e2e journey, designed

> **A design, not a test.** Nothing here is written yet, and `ci.yml` is untouched. This document
> exists so the decisions below are made before the code, not discovered inside it.
>
> **Business setup IS a critical journey — ruled by Dennis, 2026-08-19, recorded in ADR-033's
> amendment of that date.** An owner who cannot create a business cannot take a booking, which is
> ADR-033's own test applied; its in-scope list predates this slice and, being examples rather than
> an enumeration, does not narrow the test. **So `DEFINITION_OF_DONE.md` line 21 applies, ADR-040
> §4 makes this unbuilt rather than waivable, and the slice does not close until the test exists
> and passes.** This document designs a required test, not a possible one.

## 1. The once-only problem

**`uq_memberships_one_owner_per_user` means creation succeeds exactly once for a permanent
account.** The index is `unique (user_id) where role = 'owner'` — decision 10, the whole point of
which is that an account cannot acquire a second business.

**The staging business account is permanent.** `e2e-owner-business@bookflow.test`,
`e508f672-dd11-4150-b686-cc06a525f749`, admin-created and recorded in `docs/ENVIRONMENT.md` §3.
It is not created per run and must not be: E14 means an account that must click an activation
link cannot be made from CI at all.

**So the journey is not repeatable without help, and the cost of leaving that unsolved is
specific.** On run 1 the account has no business, `POST /v1/businesses` returns 201, and the
redirect carries the owner to `/home`. On run 2 the same account already has one, the same request
returns **409 `business-already-exists`**, and the screen shows an error.

**A test whose meaning changes between run 1 and run 2 is worse than a test that fails on run 2.**
A failure is a signal. A test that silently starts asserting the conflict path while its name still
says it asserts creation is a green light pointing at the wrong thing — and it would go green
again, permanently, on every run after the first. This project has the shape of that failure
already recorded: a count that had only ever been observed at one value.

## 2. The ruling — pre-test cleanup, not post

**Before the journey runs, delete the business account's membership and business.** Scoped to
`e508f672-dd11-4150-b686-cc06a525f749`, memberships first, then businesses.

### Why before, not after

**Because cleanup that runs after a failure does not run.** A test that crashes, times out, or is
cancelled mid-run leaves its rows behind, and the next run then starts from a state the previous
run was supposed to have cleared. Post-cleanup is correct exactly when nothing goes wrong, which
is the case that needed no cleanup.

**Pre-cleanup makes the starting state a precondition rather than a hope.** The run asserts what
it needs and creates it; it does not inherit whatever the last run happened to leave. Post-cleanup
may *also* be added as tidiness, but it may never be the thing the next run depends on.

### Why `STAGING_APP_DATABASE_URL` and not the service-role key

**The application credential, `bookflow_api` — CRUD, no DDL, `BYPASSRLS` (ADR-038).** It is
already an Actions secret and already used by the workflow.

**The service-role key is refused for two reasons.** It is a GoTrue/PostgREST credential that
bypasses RLS entirely (spike 001/C7) and reaches `auth.users`, and **this operation has no business
touching `auth.users`** — the account must survive; only its rows in `public` are cleared. Using a
credential whose reach exceeds the operation is how a scoped delete becomes an unscoped one after
a later edit.

**`STAGING_DATABASE_URL` — the `postgres` migration credential — is refused for the same reason,
more strongly.** It holds DDL. ADR-034 keeps it for `migrate-staging` alone, and a test harness
holding DDL rights on staging is a category error.

## 3. The guards, and what their removal would cost

**Two, both on the statement itself rather than on the caller.**

**Guard 1 — refuse to run on an empty or unset id.** If the id resolves to an empty string or is
unset, the step fails loudly and the run stops. It does not proceed with a default and it does not
warn.

**Guard 2 — every statement is scoped by `user_id`, never bare.** The deletes are
`delete from public.memberships where user_id = $1` and then `delete from public.businesses where
id in (select business_id from public.memberships where user_id = $1)` — with the business set
resolved *before* the membership rows are removed, since the membership row is the only thing
tying the business to the user.

**What happens if guard 1 is removed, stated so the guard survives a refactor:** an unset variable
interpolates as empty, `where user_id = ''` matches nothing on a well-typed uuid column and errors
or matches zero rows — but the same edit that drops the guard is the edit likely to drop the
`where` clause with it, and **`delete from public.businesses` unscoped removes every business on
staging.** The guard is not protecting against an empty id being harmless; it is protecting
against the class of change that produces both mistakes at once.

**What happens if guard 2 is removed:** the same, immediately, with no empty-string intermediate.
There is no state in which a bare delete against these two tables is correct on a shared
environment.

**Neither guard is a comment.** A comment asking for scoping is the thing that gets edited away;
the guard has to fail the run.

## 4. What the oracle is — and the honest limit

**`profile_e2e_test.dart`'s property is that two independent paths agree on a value neither knew
beforehand.** Its header says so: the expected strings are in no file in the repository, the test
fetches `GET /v1/me` over its own Dio client, and uses that as the expectation for what the app
renders. The account's surname carries a random token so coincidence is not available.

**The business journey has an equivalent, and it is stronger in one respect and weaker in
another.**

**Stronger:** the value is *created by the test through the UI*, not merely read by two paths. A
run-unique business name — a fixed prefix plus a random token — is typed into screen #5's field,
submitted, and then read back **over a second client that shares nothing with the app's graph**.
The reader never learns the name from the test's own assertion; it learns it from the API, which
learned it from the widget. Two paths, one value, neither knowing it beforehand — and the name
existed nowhere before the run began.

**CORRECTED 2026-08-19, WHILE BUILDING THE TEST. This section said the read-back was SQL, and it
cannot be.** It read: *"read back **over a separate connection**: the `STAGING_APP_DATABASE_URL`
already open for cleanup, selecting `name` from `public.businesses` for that user"*, and called the
reader "the database".

**Why that was wrong: it contradicted §8 of this same document.** §8 records that the Dart process
has **no Postgres driver** and **must hold no database URL**, because the only channel into the
build is `--dart-define-from-file`, which constant-folds its values into the binary — putting a
database URL there would compile a credential into an artefact, the exact defect
`docs/analysis/10-e2e-credential-in-artefact.md` measured. **§4 was written before §8 settled that
constraint, and the two sections shipped in the same file disagreeing.** The cleanup connection is
the *workflow's*, held on the runner; the test never has it.

**What the second path actually is: `GET /v1/me/business` over a bare Dio client**, opened by the
test, sharing no provider and not the generated client — the same shape `profile_e2e_test.dart`
uses for `GET /v1/me`.

**And the cost of that substitution, stated rather than glossed: it is independent of the app's
graph but NOT independent of the API.** SQL would have been independent of both. So a defect
living in the API — a route that echoed the request body rather than reading the row back — would
satisfy both paths here, where a SQL read-back would have caught it. **That is a real reduction in
what the oracle proves**, and it is accepted because the alternative is compiling a database
credential into a build artefact.

*The superseded wording is quoted above rather than deleted, on the same terms as `00-frame.md`
§5.2's correction: the record should show what was believed and why it was wrong, not only the
answer.*

**Weaker, and this is the part not to overstate:** the read-back path shares a *process* with the
test in a way `profile_e2e_test.dart`'s does not, because the same run both writes and verifies.
What it proves is that the value reached the database through the whole stack. What it does not
prove is that a *different* client would see it — which is what a second, genuinely independent
reader would add, and which no run of this shape provides.

**One property does NOT carry over and should not be claimed.** `profile_e2e_test.dart` asserts
against data it did not create, so a bug that made the app render its own input would fail it. A
test that types a name and then looks for that name is, in that narrow sense, checking its own
homework — the protection is the separate connection and the fact that the name must survive Zod
trimming, an insert, and a read, not independence of origin.

## 5. The override that goes away

**`profile_e2e_test.dart` overrides `membershipRepositoryProvider` to `member`.** Its header states
why: *"`apps/api` has no endpoint that answers 'does this user have a business'"*, so
`NoBusinessYetMembershipRepository` was a documented constant and the override *"supplies the one
answer no data source can yet give."*

**That reason has expired, and the business journey must not carry the override.** `GET
/v1/me/business` exists, `providers.dart` now wires `ApiMembershipRepository(ref.watch(
businessRepositoryProvider))`, and `membership_repository.dart` derives the status from the API
rather than returning a constant.

**Carrying it would destroy the test's whole subject.** The journey's most important assertion is
that the redirect moves the owner off `/setup` **because the membership status changed** — an
override pins that status and asserts it against itself. Criteria 41 and 42 are precisely the
claim that the answer comes from the API, and an override answers it locally.

**`profile_e2e_test.dart` keeps its override**, correctly: it runs on the *other* account, which
K78 forbids giving a membership.

## 6. What it still gives up

**The session is still injected. There is no login screen in this journey.** CI performs the
password grant and hands the test a one-hour access token; the test starts signed in.

Stated as plainly as ADR-033's amendment stated it for Phase 3 — *"What is skipped is a screen
that does not exist, not a layer that does"* — with one difference worth naming: for Phase 3 that
was literally true, because no login screen was built. **Here it is still true, and it is now true
for a different reason** — a login screen is a later slice's work, and E14's one-inbox sender means
an account that must verify an email cannot be driven from CI regardless.

**Also given up:** the account is not new. A genuinely first-time owner — sign-up through
verification through first login — remains untestable from CI for E14's reason, and this journey
simulates the *state* of a new owner by clearing rows rather than by being one.

## 7. Criteria this maps to

Per the naming rule in `01-acceptance-criteria.md`, a test naming a criterion claims to exercise
it, and a false claim is worse than no mapping. **Proposed names, one test each:**

| Criterion | What the test would assert |
|---|---|
| **41** | After creating a business through screen #5, the membership status reports that business — observed as the redirect leaving `/setup`, with no provider override |
| **42** | The status survives a restart: the app is rebuilt on the same injected session and the owner is not returned to `/setup` |
| **1** | The business is afterwards readable by the account that created it |
| **3** | The stored name is the name submitted — the run-unique value, read back over the separate connection |
| **25** | The owner is no longer routed to the "finish setting up" screen |

**41 and 42 are the reason to write this at all.** They are the frame's own solved-signal —
`membership_repository.dart` *"becomes a lie the moment business creation ships"* — and they are
currently mapped only to `apps/mobile/test/membership_status_test.dart`, which drives them against
**stubbed repositories**. That test is honest about what it is; it is not evidence that the
deployed API answers the question.

**Not claimed:** 2, 4, 5, 6, 7 and everything in the validation, conflict and trimming groups.
They are API-observable and already covered by the integration suite against a real database.
Naming them here would be the false mapping the criteria file warns about.

## 8. Where the cleanup runs — settled, and what would reopen it

**A workflow step, before the Flutter build. Not `setUpAll`.**

**The constraint, which is the reason and not a preference:** the Dart test process has **no
database driver** — `apps/mobile`'s `pubspec.yaml` carries `dio`, `flutter_riverpod`, `go_router`,
`supabase_flutter` and `flutter_secure_storage`, and nothing that speaks Postgres — and **no
`STAGING_APP_DATABASE_URL`**, because the only values reaching the build arrive through
`--dart-define-from-file`, which constant-folds them into the binary. Putting a database URL there
would compile a credential into an artefact, which is the exact defect
`docs/analysis/10-e2e-credential-in-artefact.md` measured and K78 exists to prevent.

**So `setUpAll` cannot do it today, and the workflow can:** the step runs on the runner, holds the
secret in the environment for the length of one command, and never enters the build.

**What would have to change for `setUpAll` to become viable — written down so this is not
reopened from scratch.** All three, not any one:

1. **`apps/mobile` gains a Postgres driver as a dev dependency**, which puts a database client in
   the mobile package's dependency graph for the sake of a test.
2. **A safe channel for the credential that is not `--dart-define-from-file`.** Compiling it in is
   refused; an environment variable read at runtime by the test process is the plausible route,
   and it would need to be proven absent from the artefact the same way the token was.
3. **A reason to prefer it**, which does not currently exist. The workflow step is visible in the
   run log, ordered before the build by the workflow rather than by test-framework lifecycle, and
   fails the job loudly if the guards refuse.

**Absent all three, this is settled.** A future session finding this section should re-open it only
by satisfying the list, not by re-arguing the convenience.

## 9. What this document still does not do

It does not write the test and does not touch `ci.yml`.
