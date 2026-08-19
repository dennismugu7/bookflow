# Business setup — the Do-Not-Vibe review record

> **Drafted, not posted.** `DEFINITION_OF_DONE.md` requires this to exist as a comment on the pull
> request, posted before merge. This file is what gets posted to PR #15; until it is a comment
> there, **the gate is not met**, and a merged PR carrying no such comment did not have this gate.

## Who read it

**The second reader is the guiding session.** ADR-032's 2026-08-15 amendment names it in terms:

> Every Do-Not-Vibe surface was read line by line before merge **by a second reader** — the guiding
> session (`docs/GUIDE_HANDOFF.md`), which directs the work and checks what comes back. It did not
> rubber-stamp: it returned findings that changed the code in **every one of the four PRs**.

**The reader did not write the code.** That is the property the whole control rests on: the
findings below come from someone who met this code as text, without the author's memory of why
each line looked reasonable when it was written. It held again here — ten findings, seven of which
changed the code.

**It is still not a second contributor.** ADR-026's trigger — real review by a second *person* who
commits — remains unsatisfied, exactly as that amendment says.

## Three weaknesses in this review, disclosed here rather than in a footnote

**1. The reader read the two named Do-Not-Vibe surfaces in full. It did NOT read the whole diff.**
The PR is 89 files. Two were read line by line; the rest were not read by the second reader at
all. Findings in unread files would not have been caught, and none of the ten below came from
outside those two files.

**2. It read them as text pasted through this session, not in the review UI.** There is no
guarantee at the tooling level that what the reader saw is what is committed — so the two files
were pinned by measurement instead. The migration: **74 lines**, SHA-256
`a04b306db70431fa70b1992560dac38f792d73dd9eaff534c4946bbe0011b23e`. The repository: **309 lines**,
SHA-256 `8cca7eadfbd30ae2e363772be4ecaaf9719106d5b5ee126031f4badbe22838e3`, sent in two halves with
the split point stated (after line 154, before `createBusinessForUser`'s doc comment) so a
truncated paste would be visible rather than silent. **Both files have since grown** — the
migration to 83 lines and the repository to 370 — because of the fixes below.

**3. This record is composed by the session that wrote the code**, from the guiding session's
findings, and is posted under the owner's GitHub account because that is the only credential
available. **The same disclosure PR #14's record carried, for the same reason**: a reader
otherwise has no way to tell an independent record from an author's account of being reviewed. The
findings are the reader's; the prose is the author's.

## Do-Not-Vibe surfaces read, line by line

| Surface | File | Lines as read |
|---|---|---|
| **Migrations** | `supabase/migrations/20260817160430_one_owner_membership_per_user.sql` | 74 |
| **The membership scoping rule**, including `businessExistsUnscoped` as its named exception | `apps/api/src/modules/businesses/businesses.repository.ts` | 309 |

`CLAUDE.md` §6 names both. No other Do-Not-Vibe surface is touched by this PR — checked against
that list rather than from memory: no payment math, no webhooks, no auth or password-reset path,
no production secrets, no availability predicate or exclusion constraint, no booking statuses, no
public projection, no booking tokens, no payment-proof path, no handle assignment, no outbox
boundary.

## Findings

| # | Finding | Outcome |
|---|---|---|
| 1 | The migration called its `uq_` name "a gap in ADR-036, not a departure from it" | **FIXED** (`8c404e3`) — it departs, deliberately, on ADR-036's public-interface rationale |
| 2 | "Worth a ruling before a second one is written" had no carrier outside the migration | **FIXED** (`8c404e3`) — ADR-036 amended with a row for partial unique indexes |
| 3 | "Staging has none: no code path has ever inserted a `memberships` row" was unverified | **VERIFIED by the owner** against staging: count 0, no duplicate owner rows |
| 4 | `findBusinessOwnedBy`'s caveat said "until the partial unique index lands" — it lands in this PR | **FIXED** (`8c404e3`) — cardinality is now a schema guarantee; ordering is defensive |
| 5 | `findBusinessOwnedBy` did not filter `memberships.role = 'owner'` | **FIXED** (`8c404e3`) — filter added while provably inert |
| 6 | `createBusinessForUser` inherited `role` from the column default | **FIXED** (`8c404e3`) — `'owner'` stated in the insert |
| 7 | `isSecondBusinessConflict` was tested only against synthetic errors | **SUPERSEDED by 10** |
| 8 | `renameBusinessForUser` does not filter role; the behaviour is undecided | **DEFERRED — K80**, trigger `ck_memberships_role` widening |
| 9 | The `new_membership` CTE is unreferenced and deletable by mistake | **FIXED** (`8c404e3`) — commented as unreferenced by design |
| 10 | The real `23505` and the real predicate had never met | **FIXED** (`d307075`) — asserted in the integration test, and **proved able to fail** |

### The three that were not simply fixed

**3 — verified by the owner, not by this session, and it could not have been.** The staging
database credential exists only as an Actions secret; ADR-023 forbids it on a development machine
and ADR-034's rationale is that the rule only means something if nothing requires it to be there.
So the session supplied the queries and the owner ran them. **The session did not observe the
result** and records it on the owner's report.

**8 — deferred deliberately, not overlooked.** Adding `role = 'owner'` to the rename path would
decide, by implementation, that a non-owner may not rename a business. Nobody has made that
decision. It is unreachable today because `ck_memberships_role` permits only `'owner'`, and K80's
trigger is the same event that makes it reachable.

**10 — the one finding with a red proof.** The predicate's constraint name was temporarily changed
to `…_WRONG`; the new test failed with its own message and the other four passed. Reverted before
committing. A test that has only been observed passing has not been observed.

## Which findings a green CI run could not have caught

**Seven of the ten. This is the argument for the control, and it is checkable rather than
asserted** — CI was green on every commit these findings were made against.

| # | Why CI is blind to it |
|---|---|
| 1 | A comment's characterisation of an ADR. No test asserts prose. |
| 2 | A missing record in a different document. Nothing links a migration comment to an ADR's table. |
| 3 | A claim about **staging's data**, which the suite never queries — it runs against a local or CI database. |
| 4 | A stale comment. Green either way. |
| 5 | **The suite passes with and without the filter**, because `ck_memberships_role` permits only `'owner'` — every row is an owner row, so the queries return identically. It becomes a behavioural difference only when I9 widens the vocabulary, which is precisely when the bug would ship. |
| 6 | Same shape: the default supplies `'owner'`, so the inserted row is identical. The defect is a dependency on a default, not a wrong value. |
| 8 | Unreachable today for the same reason as 5. A test asserting it would have nothing to assert against. |

**Three CI could in principle have caught, and did not, because no test existed:** 7 and 10 (the
predicate was only ever tested against errors the project constructed — CI cannot notice a missing
test), and 9 (deleting the CTE would have failed the suite loudly; the finding is that nothing
*said* so, which is a comment).

**The pattern worth naming: THREE of the seven — 5, 6 and 8 — are correct-today, wrong-later.**
The criterion is exact and worth stating, because the first draft of this line said *five* and was
miscounted: **the code behaves identically until `ck_memberships_role` widens.** Findings 1, 2, 3
and 4 do not qualify — a mischaracterised ADR reference, an absent carrier, an unverified claim
and a stale caveat are all wrong **now**, not later. They are CI-invisible for a different reason:
no test asserts prose or cross-document records.

**A green suite is evidence about the present.** It is not evidence about the change that has
already been decided and not yet made — which is what makes 5, 6 and 8 the ones a review had to
catch, because nothing else would until the day the vocabulary widens and they ship as bugs.

## Also found during review — `03-environment.md` §E.7 gains a third instance

`contracts:check` reported `CONTRACT DRIFT` on `packages/bookflow_api/.openapi-generator/FILES`
when nothing had drifted. The blob hash is **identical** to `HEAD` —
`a99b6a53d9e492e53ce899413beb866fb3f85774`, from `git hash-object` against
`git rev-parse HEAD:<path>`. The generator rewrites that manifest with LF; `.gitattributes` marks
it `text=auto`, so a Windows checkout expects CRLF; `git status` reports a line-ending-only
difference and `contracts:check` reads `git status`.

**The mechanism's prediction was tested, not just stated.** The append claims CI on Linux cannot
reproduce it. Run `32260974201` on the same commit is that test: **`contracts` green**. Two
instances is a pattern; one was an anecdote.

## What this record does not cover

- **The other 87 files**, per disclosure 1.
- **The owner's own review pass**, which `DEFINITION_OF_DONE.md` makes a separate gate. A
  correctness reviewer asks whether the code does what it says; the owner asks whether what it
  says is what they wanted, and only the owner can reject a premise. **Still owed for this PR.**
- **The e2e gate.** `DEFINITION_OF_DONE.md` line 21 is unmet and this PR does not close the slice
  — ADR-033's 2026-08-19 amendment rules business setup a critical journey, and
  `feat/business-setup-e2e` carries the test.
