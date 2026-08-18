# Business setup — Phase 3 close

> Derived record. What was built, what was proved, and what was **not**.

The feature manual's Phase 3 asks for *"a thin vertical slice that pierces every layer and works
end to end — one field, one row, one button"*. `02-design.md` §E.4 chose that pierce: **screen
#20's business section**, reading `GET /v1/me/business` and renaming through
`PATCH /v1/businesses/{businessId}`.

## 1. The pierce, layer by layer, and what each proof actually was

| Layer | Built | What the proof was |
|---|---|---|
| **1. Data** | Nothing. No migration. | The tables already exist and `seed.sql` supplies an owner with a business. Decision 10's index is thickening (T2), not this. Proved by the three existing migrations applying cleanly — `supabase migration list --local` shows every local version matched. |
| **2. Data-access** | `findBusinessOwnedBy`, `renameBusinessForUser` | Six integration tests against the **real local Postgres**, every one planting a business owned by somebody else. The method takes no business id, so a test where the caller's business is the only business would pass against a query with no `user_id` filter at all. |
| **3. Service** | `getMyBusiness`, `renameMyBusiness` | Pass-through, as the manual permits. Asserted `toEqual` the repository rather than merely defined — a pass-through that quietly reshaped the row would still be defined. |
| **4. API** | `GET /v1/me/business`, `PATCH /v1/businesses/:businessId` | Thirteen tests through the **real app with a real GoTrue token**. The read is driven **1 → 0 → 1** on one account inside a single test. Every trimming boundary is checked against the **column**, not the response. |
| **5. Frontend data** | `features/business/` — models, repository, providers | The 404-as-data rule implemented where §C.6 said it must be. A widget test pins that a failed **read** renders the shared `ErrorView` while a failed **submission** does not — the distinction the whole design rests on. |
| **6. Frontend UI** | Screen #20's business section | Four widget tests, each **driving** a state rather than catching it once: the spinner is asserted absent → present → absent, because one asserted only while loading passes against a spinner that never clears. |

## 2. THE SEAM GAP — the honest part

**Every layer passes its own gate. The seams are typed. The two halves have never met in a
running process.**

The API is proved against a real local Postgres and a real GoTrue token. The widgets are proved
against **stubbed repositories**. What connects them — the generated Dio client, the base URL,
the auth interceptor attaching a real token to these particular routes, the JSON actually
deserialising into `Business` — has been exercised by nothing.

**Nobody has watched it run.** `docs/ENVIRONMENT.md` records the Android toolchain as *"CI-only
for now — no local emulator or device has been used"*, and iOS is impossible on Windows (ADR-015).
There is no emulator and no device on this machine.

**The tests do not close this gap and must not be read as closing it.** "The pierce works" today
means every layer passes its own gate and the types line up across the seams — not that a person
has tapped Save and watched a name change.

**Three routes would close it. Dennis has not chosen one.**

1. **A physical Android phone over USB**, with the app pointed at the local API over the LAN.
   Needs the API bound beyond localhost and the phone on the same network. No CI, no minutes.
2. **A local Android emulator**, reaching the host API at **`10.0.2.2`**, which is the emulator's
   alias for the host loopback. Needs the Android SDK and an AVD, neither of which has been set
   up here. No CI, no minutes.
3. **`e2e-staging` after the reset**, which drives a real build on a real emulator against the
   deployed API. This is the one `DEFINITION_OF_DONE.md` actually asks for — and it needs Actions
   minutes, so it cannot happen before ~2026-08-31.

Routes 1 and 2 are available **now** and would answer the question days earlier than route 3.
Route 3 is the one that satisfies the gate. They are not substitutes for each other.

## 3. The first real number — criteria mapped to named tests

`00-frame.md` §7 said the one honest measurement at merge is **how many of the criteria map to a
named test**. This is the first moment that number can exist; Phase 3 had no criteria to count
against (ADR-040 §3.1, K77).

**Of 60 criteria: 17 mapped, 43 not.**

**Mapped, with the test that names each:**

| # | Test |
|---|---|
| 9 | `accepts 200 non-whitespace characters carrying padding` |
| 10 | `rejects 201 characters` |
| 12 | `rejects a whitespace-only name` |
| 13 | `renames, and a subsequent read returns the new name` |
| 19 | `is 401 with no token` · `is 401 with no token, and nothing is written` |
| 20 | `gives the SAME response for "not yours" and "does not exist"` |
| 21 | `a non-member gets 404 AND the name is unchanged afterwards` |
| 24 | `two accounts may hold businesses with the identical name` |
| 31 | `carries no detail and no instance in its failure body` |
| 32 | `a validation failure body carries no detail and no instance` |
| 37 | `stores a padded name trimmed` |
| 38 | `accepts 200 non-whitespace characters carrying padding` |
| 39 | the trimming tests, which are all renames |
| 51 | `two accounts may hold businesses with the identical name` |
| 52 | `criterion 52 — the section shows the business name` |
| 53 | `criterion 53 — a rename in flight shows loading, which then clears` |
| 54 | `criterion 54 — a failed rename shows an error and stays submittable` |

**Unmapped, and the split matters more than the total.** Most of the 43 are unmapped because the
code does not exist yet — creation (1–7, 18, 22, 23, 33–36), the dashboard and account menu
(25–30, 43–47, 55–60), the concurrency index (48–50), the membership status (41, 42).

**But six are testable TODAY and are not tested**, which counting exposed and reading would not
have:

- **8** — a name of exactly one non-whitespace character is accepted. The boundary opposite 10,
  and only one end is covered.
- **11** — an empty name is rejected. It *is* asserted, inside the test named *"a validation
  failure body carries no detail and no instance"*. **That is not a test named after criterion
  11**, and the DoD asks for a named test, so it counts as unmapped rather than as a technicality.
- **14** — a rename changes the name and nothing else. Nothing asserts `id`, `published` and the
  membership row are unchanged afterwards.
- **16** — no field other than the name can be changed. No test attempts one.
- **17** — nothing an owner can do removes their business. Satisfied by the absence of a route,
  and absence is exactly what nobody writes a test for.
- **40** — two names differing only in surrounding whitespace are stored identically.

**No criterion is unnamed-because-untestable.** Every one of the 60 has an imaginable test; the
43 are blocked on code, not on being ill-posed. That is the check §3 of the criteria file exists
to make possible, and it passes.

**SUPERSEDED 2026-08-18 — 17 of 60 was true when written and is not the number now. The original
stands above deliberately**, because this section is the record of what was measured at Phase 3's
close and a point-in-time measurement that gets overwritten stops being one. **The number moved
because the code arrived, which is what it was measuring.**

**59 of 61 map to a named test.** Re-derived on 2026-08-18 by the criteria file's own command,
not by counting:

```
grep -rhoE "'criterion [0-9]+(, [0-9]+)*" apps/api/src apps/api/test apps/mobile/test \
  | grep -oE "[0-9]+" | sort -n | uniq
```

**The denominator moved too** — 60 at close, **61** now: criterion 61 was appended with T6, for
the half of sign-out that criterion 57 does not cover.

**UPDATED THE SAME DAY, which is the point rather than an embarrassment: 60 of 62.** T11's
reconciliation appended **criterion 62** — screen #17's return to screen #12 — and its named test
in the same commit. **A number written here goes stale the moment the next criterion lands**, and
this one lasted hours; the durable form is the command above, and the reason `00-frame.md` §7 was
corrected by deleting its totals rather than by replacing them.

**Unmapped: 48 and 49, and nothing else.** They are the two the criteria file already records as
**"UNPROVABLE IN THIS HARNESS, and that is a finding rather than work nobody got to"** — 48's
concurrent half needs a second connection the harness does not have, and 49's second clause
cannot be observed without destroying the evidence it would be read from. **So the derived gap
and the documented gap are the same two criteria; there is no unexplained shortfall.**

**The six that were testable-today-and-untested are all closed** — 8, 11, 14, 16, 17 and 40 each
carry a named test now. That list was the useful half of this section, and counting is what
produced it: reading would not have.

**One limitation of the number, stated because a bare 59/61 overstates it.** Criterion 50 is
mapped by a declared **schema proxy** — the test asserts `uq_memberships_one_owner_per_user`
exists, is unique and carries `where role = 'owner'`, and its own name says
`(SCHEMA proxy, not the behaviour)`. The behaviour it describes cannot be observed while
`ck_memberships_role` permits only `'owner'`. The criteria file carries the full reasoning; the
count cannot.

## 4. Still owed

**~~The ADR-039 classification.~~ NOT OWED — CORRECTED 2026-08-17.** This said a classification
was due at the first widget for screens #5, #12 or #17. **ADR-039 classifies all three by name**:
`native-04` and `native-11` are **Generation A**, `native-16` is **Generation B**, and the eight
genuinely unclassified are `native-12, 13, 14, 15, 17, 18, 21, 22`. Reading the Decision section
settles it in a minute; asserting it did not.

**What binds instead, and binds harder:** #5 and #12 are Generation A, so `tokens.dart` applies
directly — it was derived from Generation A screens. **#17 is Generation B, a structural
reference only**: layout, hierarchy and copy stand; colour and treatment come from the tokens and
are **never sampled from the screenshot**. See `02-design.md` §C.8.

**Outstanding obligations, by number** (`00-frame.md` §5):

- **§5.1** — the `05-triage.md` update moving K27 and K47 to Resolved. Waits on PR #14.
- **§5.2** — `business-already-exists` is not in `PROBLEM_TYPES`. Task T3.
- **§5.3** — **DISCHARGED** 2026-08-17 by decision 11.
- **§5.4** — decision 10's migration, and applying it via `migrate-staging`. Task T2, and it
  needs minutes.
- **§5.5** — `docs/ENVIRONMENT.md` §4 is stale about `seed.sql`. Waits on PR #14 with §5.1.

**CORRECTED 2026-08-18 — the §5.2 line above is wrong, and it contradicts `00-frame.md`.**
`business-already-exists` **is** in `PROBLEM_TYPES` (`apps/api/src/platform/problem.ts`, status
409), landed by T3 in `f0e950d`, and `00-frame.md` §5.2 has read **"Status: DISCHARGED
2026-08-17"** since that commit. This file was written before it and never revisited.

**The current state of the five, on 2026-08-18:**

| | State |
|---|---|
| §5.1 — triage update | **OUTSTANDING.** PR #14 is still `OPEN` |
| §5.2 — the conflict slug | **DISCHARGED**, verified in `problem.ts` |
| §5.3 — the rename surface | **DISCHARGED** by decision 11 |
| §5.4 — the migration on staging | **OUTSTANDING.** Written and applied locally; never applied to staging, and cannot be from here (ADR-034) |
| §5.5 — `ENVIRONMENT.md` §4 on `seed.sql` | **OUTSTANDING.** Still present; waits on PR #14 with §5.1 |

**Note which way the error ran.** It reported an obligation as owed that had been discharged —
the cheap direction, but not free: a session reading this list would have gone looking for work
that was done, and `00-frame.md` §5.2 is where the honest answer already sat. **The rule this
file's own §8 records applies to a status exactly as it applies to an obligation: check the
document that owns it rather than the summary of it.**

**R3's staging account** — the e2e account cannot demonstrate criteria 41 and 42 (K78), and E14
makes a replacement non-trivial. Still undecided, and it blocks the e2e gate if left.

## 5. Two things this pierce added that were not planned

**`BookflowSizes.inlineSpinner = 18` — an INVENTED token.** Recorded as such in `tokens.dart`,
alongside `avatarSmall`, with its justification: no screenshot shows an in-flight control, so
there is nothing to measure; 18 is what fits Material's default button height without changing
it, *which is the property that matters*. It is not a measurement pretending to be one.

**`_withRoboto` missed `textButtonTheme` — a pre-existing gap, found and fixed as a side effect.**
The golden's theme helper re-applies Roboto to `textTheme` and the app bar title, but
`textButtonTheme`'s style captured `labelLarge` when the theme was built, so the family never
reached it. The label fell back to the test font, which draws every glyph as a filled rectangle —
and the first regenerated golden showed **"Edit" as a solid blue block**.

**Could it affect any golden other than `native-20`?** **No — because `native-20` is the only
golden there is.** `apps/mobile/test/golden/` contains one test and
`docs/designs/built/` one image. The gap was invisible for as long as no golden screen had a
button, and decision 11 put the first one on this screen. **Every future golden inherits the fix**,
which is the reason it was fixed in the helper rather than worked around in this test.

## 6. What remains of §E

**T1 discharged** (the grant probe, closed as a side effect of building the fixtures — see
`03-environment.md` §E.4). **Remaining: T2, T3, T6, T7+T8, T9, T10, T11.**

Everything from here is **thickening rather than construction**, which is the manual's own test
for having finished this phase.

**CORRECTED 2026-08-18. The list above was true at Phase 3's close and is now stale by six
tasks. Only T11 remains, and it is being written in the commit that carries this correction.**

| Task | State | Landed as |
|---|---|---|
| T2 — the partial unique index | **done locally**, not on staging | `a94cfb0`, `supabase/migrations/20260817160430_one_owner_membership_per_user.sql` |
| T3 — the conflict slug | **done** | `f0e950d`, `business-already-exists` in `PROBLEM_TYPES` |
| T4 — the API vertical | **done** | `bb54a7e`, spec and Dart client regenerated in `642aeb0` |
| T5 — ADR-042's redirect | **done** | `d940d89` |
| T6 — screen #5 | **done** | `b502a23` |
| T7+T8 — dashboard, account menu, navigation chain | **done** | `5ec5a0c` |
| T9 — membership status | **done** | `410e2d4` |
| T10 — screen #20's business section | **done by the pierce**, recorded in `3cc935c` | `02-design.md` §E.5 |
| T11 — the deviation records | **in the commit carrying this correction** | `docs/analysis/08-design-deviations.md` entries 10–16 |

**T2 keeps a residual half that is not a task and must not be read as one:** the index exists in
the repository and is applied to the **local** database, and it has never been applied to staging.
That is `00-frame.md` §5.4, it goes through ADR-034's `migrate-staging` job, and it waits on
Actions minutes. **A green local suite is not evidence about staging's schema.**

**Why the list went stale is the ordinary reason and worth naming:** it is a hand-maintained
enumeration in a point-in-time document, read by later sessions as current state. The same shape
as `02-design.md` §B.9's mapping (R4) and `00-frame.md` §7's criteria count, both corrected in
the same pass. **The count that cannot go stale is the one a command derives** — for tasks there
is no such command, which is why this table cites the commit for each.

## 7. Counts at close

| Gate | Count |
|---|---|
| TypeScript unit | **42**, in 3 files |
| TypeScript integration | **97**, in 10 files — against the real local Supabase stack |
| Dart | **32** |
| `flutter analyze` | clean |
| `dart format` | 27 files, 0 changed |
| Contract drift | `contracts:check` exits 0 |

**See also `03-environment.md` §E.5**: `seed.sql`'s business is `published = true` with zero
services, which §5's K27 answer makes impossible once the publishing slice enforces its
precondition. Local-only and predating the decision — recorded there so the publishing slice does
not inherit a fixture that contradicts it.

## 8. Pending handoff lessons

**A queue, so handoff updates batch.** Writing to `docs/GUIDE_HANDOFF.md` costs a branch switch
*and* a database reset in each direction (`03-environment.md` §E.6) — a real cost that has already
been paid three times for one lesson each. **Entries accumulate here and go over in one pass.**

**Clear this list at the next handoff update**, and delete each entry as it lands rather than
leaving a copy in two places.

### Pending

**Two entries below are FLUSHED and one is not. They are struck rather than deleted:** a queue
that silently empties cannot be audited, and "this was carried over" and "this was never written
down" look identical once the line is gone.

| Entry | State |
|---|---|
| Quote the obligation or it is not one | **FLUSHED 2026-08-18** to `docs/GUIDE_HANDOFF.md` §2, on `docs/guide-handoff-refresh` |
| An affordance held by a framework default | **FLUSHED 2026-08-18** to `docs/GUIDE_HANDOFF.md` §2, same pass |
| The log level silences the events | **STILL QUEUED.** Not a lesson — a triage item for the §5.1 pass, deliberately left here |
| A redaction is not a rotation; a rotation is not a retirement | **QUEUED 2026-08-18** for §2 of the handoff |
| A credential is never chosen, only generated | **QUEUED 2026-08-18** as a triage-item candidate for the §5.1 pass |
| A gate whose result was never reported is a gate that did not run | **QUEUED 2026-08-18** for §2 of the handoff |

---

**~~PENDING~~ — FLUSHED 2026-08-18. An obligation attributed to a document must be QUOTED from
it, or it is not an obligation.**

Three instances on 2026-08-17, all in this slice, all by the same session:

- **ADR-003** was said to be enforced by `uq_memberships_user_business`. That constraint forbids a
  repeat join to the *same* business and enforces nothing about the rule. Nothing enforced it.
- **ADR-014** was said to enumerate the problem-type slugs, making an addition a contract change
  needing an amendment. It enumerates none — it states a property, and `problem.ts` is the
  registry, which sanctions addition explicitly.
- **ADR-039** was said to leave screens #5, #12 and #17 unclassified, and a classification was
  recorded as owed before their widgets. It classifies all three **by name**.

**Each was settled in about a minute by reading the Decision section.** None of the three needed
research, a spike, or a judgement call — only reading the document being cited, which is the step
that was skipped every time.

**The propagation is the part that matters.** All three reached documents the guiding session
relies on, and two of them shaped work: the ADR-014 misreading made a routine slug addition look
like an ADR-level event for a day, and the ADR-039 one deferred a live constraint — *"Generation B
is a structural reference; colour is never sampled"* — behind a step that did not exist. **A false
obligation is more expensive than a missed one, because nobody audits work that looks careful.**

---

**~~PENDING~~ — FLUSHED 2026-08-18. An affordance can be held in place by a framework default
rather than by a decision, and a test that never drives it will not notice when the default stops
applying.**

Screen #17's back arrow came from `AppBar.automaticallyImplyLeading` and existed only because
`/account` was reached by `push`; routing it with `go` would have removed the only way back with
nothing failing.

**Third instance of the same family in this slice**, after the orphaned screen #20 and screen #5's
missing exit — **the first two were absences, this was an unchosen presence.** That is what makes
it the hardest of the three to find: an absence is discoverable by asking what is missing, and a
presence that nobody chose answers that question with a yes.

*Found 2026-08-18, while ruling on whether screen #17 needs the design's Home button. Pinned by
criterion 62; the affordance is now explicit in `account_menu_screen.dart`.*

---

**QUEUED 2026-08-18, for §2 — a redaction is not a rotation; a rotation is not a retirement.**

A credential committed in August, redacted the same day and rotated on discovery, was **chosen
again** as the first password for the second staging e2e account on 2026-08-18. It was live for
under an hour and is rotated again.

**The lesson is not "do not commit secrets", which was already learned.** It is that **a rotation
ends a credential's use, not its existence.** The string stayed recoverable from seven pushed
commit trees the whole time, and its inertness was never a property of the string — only of
nothing currently accepting it. **The moment it was selected for a new account, every one of those
trees became a live credential store**, with no commit, no diff and no alert to mark the change.

The decision to leave published history unrewritten — argued in `docs/spikes/001-platform.md` and
still correct — is therefore **conditional on nobody re-selecting the value**, which is a human
commitment rather than a control. Full reasoning in that file's 2026-08-18 amendment.

---

**QUEUED 2026-08-18, for §2 — a gate whose RESULT was never reported is a gate that did not run.**

A response reporting a batch of work was swallowed by a duplicated paste. **The work in it had
landed and been pushed**, so nothing was lost and nothing was wrong — but one of the four checks
that response was going to report, **re-deriving the criteria mapping after a `git mv`**, had
never actually been run. The renames were of files rather than of test names, so the mapping was
intact; **that is luck, not process.** A rename that moved a test name would have broken the
grep-derived coverage silently, and the gate that would have caught it did not exist as a run.

**It surfaced only because a later session died and forced a status recovery** — which is to say,
by accident. Nothing in the workflow would have raised it.

**So the rule is about completion, not about diligence:** a step is not complete when its work is
done, it is complete when its gate's **result has been read**. An unreported gate is
indistinguishable from an unrun one, and this project already holds the same shape in three other
places — the scripted replacement that exits zero, `gh run list`'s 404 that reads as "no runs",
and a count that has only ever been observed at one value.

**AND THE SAME FAILURE HAS A SECOND MECHANISM, which is harder to see because the result IS
produced.** It is produced into a channel the reader cannot reach. **Tool-output panels are
visible to the operator and invisible to the guiding session**, which reads only the text of a
message — so a result shown in a panel has been generated and not delivered, and the session that
generated it has no signal that anything is missing. **A report is text in a message. It is not a
rendered artefact.** Three instances on 2026-08-18: `STAT` and `LOG` emitted into fenced blocks
that arrived empty, and two "verbatim" sections printed by pointing at the `Read` tool's display
rather than transcribed into the reply. **The verbatim rule already says a quote must be copied
from the artefact rather than re-rendered — this is its other half: copied INTO the report, where
the reader is.**

---

**QUEUED 2026-08-18, as a TRIAGE-ITEM CANDIDATE for the §5.1 pass — a credential is never chosen,
only generated.**

The procedure written for this account said to use the dashboard's **Generate a password** control.
**That step was skipped, under fatigue, and the password was typed from memory instead** — which is
how the August value came back. The procedure was not unclear and was not disputed; it was one
step in a list at the end of a long session.

**So the requirement is that this control be harder to skip, not stated more loudly.** Restating an
instruction that was read and skipped produces a longer instruction that is read and skipped.

**The durable form of the rule, which is what the triage item should carry:**

> **A credential is never CHOSEN, only GENERATED. Anything typed, recalled, or recognised is wrong
> by definition — not weak, wrong** — because the property that matters is not strength but never
> having existed anywhere before.

**The fix is deliberately not invented here.** Whether it is a generator step in the procedure, a
refusal to accept a pasted value, a check against known-committed strings, or something else is a
decision for whoever takes the triage item — and inventing one now would be the same shape of
error as answering an open triage item by implementation.

---

**STILL QUEUED — the log level silences the events in every environment where real users exist.
This becomes a triage item the moment `05-triage.md` is editable.** Deliberately not flushed to
`GUIDE_HANDOFF.md` in the 2026-08-18 pass: it is a defect awaiting a decision, not a lesson about
how to verify things, and putting it in §2 would have filed it where nobody would act on it.

`app.ts` sets the logger level to `info` only when `APP_ENV === 'local'`, and `warn` everywhere
else. So of the three events the businesses module now emits, **`business.conflict_precheck` and
`business.scoped_miss` are dropped in staging and production**, and only
`business.conflict_constraint` survives. **The events written for production debugging are the
ones production will not have.**

**Pre-existing and project-wide, not introduced here.** `signup.password_breached` is `info` and
has exactly the same fate, and it has since PR 2c. The pattern is that every event describing an
*expected refusal* is filtered out, and only faults survive — which is a defensible logging
policy and an indefensible observability one, because the refusal rate is the number that says
whether a control is working.

**Relabelling refusals as warnings to defeat the filter was considered and REJECTED.** It would
make the two events visible tomorrow at the cost of making `warn` meaningless: a level that
contains both "an owner tapped Create twice" and "the pre-check lost a race" cannot be alerted on,
and the second event's entire value is that it is rare. The honest fix is a decision about levels
per environment — most likely `info` in staging, where there are no real users and the volume is
ours — and that is a decision, not an implementation detail.

*Found 2026-08-18, while adding the events. Not fixed here; `05-triage.md` cannot be edited on
this branch without conflicting with PR #14, which is `00-frame.md` §5.1's whole reason for
deferring.*
