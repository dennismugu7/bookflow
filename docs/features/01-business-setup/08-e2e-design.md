# Business setup — the e2e journey, designed

> **A design, not a test.** Nothing here is written yet, and `ci.yml` is untouched. This document
> exists so the decisions below are made before the code, not discovered inside it.
>
> **It does not rule on whether business setup is a critical journey.** ADR-033 defines one as
> *"one whose failure prevents an owner from taking a booking, or a client from making one"*, and
> this slice's documents are silent on the question. That ruling is Dennis's; this design says
> what the test would be if it is written.

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
submitted, and then read back **over a separate connection**: the `STAGING_APP_DATABASE_URL`
already open for cleanup, selecting `name` from `public.businesses` for that user. The database
never learns the name from the test's own assertion; it learns it from the API, which learned it
from the widget. Two paths, one value, neither knowing it beforehand — and the name existed nowhere
before the run began.

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

## 8. What this document does not do

It does not write the test, touch `ci.yml`, or decide whether business setup is a critical
journey. It also does not settle **where the cleanup runs** — a workflow step before the Flutter
build, or a `setUpAll` inside the test — which is an implementation question with one real
constraint: the Dart test process has no database driver and no `STAGING_APP_DATABASE_URL`, so
today the answer is a workflow step.
