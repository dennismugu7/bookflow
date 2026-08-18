# Business setup — Phase 4 close

> Derived record. What the implementation loop produced, what is proved, and what is **not**.

Phase 4 is the feature manual's *"Flesh out the slice (the implementation loop)"*
(`Manual-Feature-Scaffolding.md:104-128`). **It is closed against the manual's seven requirements,
not against `02-design.md` §E's task list** — §E emptied two commits before the phase was
actually complete, and an empty task list turned out to be the wrong instrument for the question.
Two requirements were unmet at that point and neither was a task: logging, and an authorization
check that watched the route table rather than three remembered routes.

## 1. The manual's seven requirements, each with its evidence

| Requirement | Verdict | Evidence |
|---|---|---|
| **Every acceptance criterion turned into real behaviour** | **MET**, with two named exceptions | 60 of 62 map to a named test. 48 and 49 are unprovable in this harness and recorded as such; see §3 |
| **Input validation at the boundary** | **MET** | One shared `businessName` Zod chain — `.trim().min(1).max(200)` — on both write routes, so the service never sees an untrimmed value. Criteria 8–12, 37–40. `routes.integration.test.ts` proves a non-UUID param is 400, not 500 |
| **Edge cases and the unhappy path** | **MET** within the harness | Both length boundaries, whitespace-only, padded-200, duplicate names across accounts, the second-business conflict, non-member read and rename. The gap is concurrency, and it is the instrument (§3) |
| **Error handling** | **MET** | Every failure is `problemBody`'s `{type, title, status}` — no `detail`, no `instance`, no echo. Criteria 31, 32, and a test asserting nothing leaks about what was wrong |
| **Authorization on every protected path** | **MET, and now swept** | `routes.integration.test.ts` reads the built app's route table and asserts every route answers 401 without a token, excepting three declared public. Driven by a second app carrying one deliberately-public route, which the sweep must report |
| **Logging and observability** | **MET, with a filed defect** | Three events following `auth.service.ts`'s convention — §2. Two are asserted against a captured log stream. The level gap is queued in `04-phase3-close.md` §8 |
| **Performance considerations** | **MET** | §A.3 mapped Q1–Q6 to indexes before the code existed; T2 added `uq_memberships_one_owner_per_user`, which serves the conflict check directly. No list endpoint exists in this slice, so no pagination and no N+1 |

## 2. What the module logs, and the one unscoped read it needed

| Event | Level | Fires when |
|---|---|---|
| `business.conflict_precheck` | info | an account that has a business posts again |
| `business.conflict_constraint` | **warn** | the pre-check **lost a race** and the partial unique index refused the insert |
| `business.scoped_miss` | info | a 404, carrying `outcome: not-yours \| no-such-business` |

**No submitted name appears in any event.** `problem.ts` argues a reflected value is how an error
response becomes a probe; a log line is a reflected value with a longer life. A test asserts the
rejected name is in no field of any event.

**`business.scoped_miss` required the module's one unscoped read**, `businessExistsUnscoped` —
the scoped read deliberately cannot tell "not yours" from "no such id", which is right for the
response and leaves the server unable to tell an operator. **DO-NOT-VIBE: the membership scoping
rule.** It returns a boolean, never a row; runs only after a scoped read has failed; and has one
permitted caller, which returns `Promise<void>`. `businesses.boundaries.test.ts` enforces all of
that by reading the source tree, and was driven by introducing the violation and watching it fail.

## 3. The count, as a command rather than a number

```
grep -rhoE "'criterion [0-9]+(, [0-9]+)*" apps/api/src apps/api/test apps/mobile/test \
  | grep -oE "[0-9]+" | sort -n | uniq
```

**A number written here goes stale the moment the next criterion lands** — `04-phase3-close.md`
§3's did, twice, the second time within hours. The command cannot.

**What is NOT proved, and none of it is work nobody got to:**

- **48 and 49 — the concurrency pair.** The harness gives one transaction per test, so the
  interleaving cannot be produced; 49's second clause cannot be observed at all, because every
  arrangement that lets you look has already destroyed the evidence. The property holds by
  construction — both inserts are one statement.
- **Criterion 50 — a declared schema proxy.** The test asserts the index exists, is unique and
  carries `where role = 'owner'`. It does **not** assert the behaviour the criterion describes,
  because `ck_memberships_role` permits no second role for the row that would show it.
- **The seam.** Every layer passes its own gate and the two halves have never met in a running
  process. The Flutter widgets are proved against stubbed repositories; the generated Dio client,
  the base URL, the auth interceptor on these routes and the JSON actually deserialising have
  been exercised by nothing. **Nobody has watched it run.** Three routes would close it and
  Dennis has not chosen one; two need no CI minutes.

## 4. The seven design deviations, by register entry

All seven are in `docs/analysis/08-design-deviations.md`. **Five were recorded in this slice's
Phase 0 and Phase 1 documents; two were decided at the code and lived only in a Dart source
comment until T11 reconciled them.**

| Entry | What |
|---|---|
| 10 | Screen #5 ships one field of four |
| 11 | Screen #5 has no back arrow |
| 12 | The dashboard's setup-continuation state replaces the bookings empty state |
| 13 | Screen #20 gains an editable business section beside a read-only personal one |
| 14 | Screen #17 ships two rows, not five |
| 15 | Screen #5 keeps a sign-out control the design does not draw — *was code-only* |
| 16 | Screen #12 omits the Bookings / Contacts / Calendar tabs — *was code-only* |

Entries **17–19** are three further differences the same reconciliation found, decided by nobody
until Dennis ruled on them the following day: screen #5 as a full-screen route rather than a
sheet, Log out without a confirmation, and no bottom global navigation. **Criterion 62 came out
of entry 19's ruling** — its reason rested on a back path that existed only as an
`AppBar.automaticallyImplyLeading` default.

## 5. Obligations still open, and what each waits on

| | Waits on |
|---|---|
| **§5.1** — move K27 and K47 to Resolved in `05-triage.md` | PR #14 merging |
| **§5.4** — decision 10's index applied to staging | Actions minutes (~2026-08-31); ADR-034 forbids applying from a development machine |
| **§5.5** — `ENVIRONMENT.md` §4 is stale about `seed.sql` | PR #14, same pass as §5.1 |
| **R3** — the staging account criteria 41 and 42 need | A decision. K78 forbids using the e2e account; E14 means a replacement must be admin-created |
| **The log-level gap** | `05-triage.md` being editable — queued in `04-phase3-close.md` §8 |
| **The seam** | Dennis choosing one of the three routes |
| **The Do-Not-Vibe review** | A human reading the migration and the membership-scoping surfaces line by line, recorded as a PR comment before merge |

**§5.2 and §5.3 are discharged.** The conflict slug is in `PROBLEM_TYPES`; the rename surface is
screen #20 by decision 11.

## 6. What Phase 4 does not close

**Phase 5 is testing's own phase, and three of its four layers are untouched here.** Unit and
integration are green and local. **End-to-end needs CI minutes and R3's account.** **Manual QA
needs a device or an emulator, and this machine has neither** — which is the seam gap wearing the
manual's vocabulary, and the reason it is listed above as an obligation rather than as a nicety.
