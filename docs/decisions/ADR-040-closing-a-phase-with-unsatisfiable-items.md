# ADR-040 — Closing a phase with unsatisfiable Definition-of-Done items

**Status:** Proposed — **this ADR must not merge in this state.** It flips to *Accepted*, dated
and naming the PR, at the moment the owner's review record lands on PR 4c. A merged ADR that calls
itself a proposal is a document nobody can act on: a later reader cannot tell whether the rule
below is in force, and the safe reading — that it is not — silently unauthorises the close it
exists to authorise.

## Context

`DEFINITION_OF_DONE.md` opens by saying every item is binary: "if satisfying it requires an
opinion, it is written wrong." That is the right design, and it produces a question it does not
answer — **what happens when a binary item is unsatisfiable rather than merely unticked?**

Phase 3 arrives at exactly that. PR 4c makes the e2e item hold (ADR-033's 2026-08-15 amendment
defines the reduced journey; the gate exists and runs against deployed staging). Two items do not
hold and will not:

1. **"Every acceptance criterion from Phase 0 maps to a named test."** Phase 3's Phase 0 produced
   ADRs, a triage and a set of resolved items. It produced no acceptance criteria, so there is
   nothing to map from (`docs/analysis/09-phase3-close.md` §5.3).
2. **The review record and the owner's review pass, for PRs #4–#11.** They merged before either
   rule existed. The record rule dates from `442e138` and first ran on PR #8; the owner's pass was
   scoped on 2026-08-15 and first ran on PR #12 (`docs/analysis/09-phase3-close.md` §5.2, ADR-032's
   amendments).

**PR #12 already tried to close Phase 3 with those two outstanding, and the owner's review pass
rejected it** — comment
[`5303325013`](https://github.com/dennismugu7/bookflow/pull/12#issuecomment-5303325013): *"section
4 of the brief is correct — Phase 3 does not satisfy DEFINITION_OF_DONE and this PR closed it
anyway, with no ADR authorising that. Outcome: rejected."*

The objection was not that the items were outstanding. It was that **the close-out authorised its
own close.** A document that both reports the state and grants the exception is self-certifying,
and the exception is then invisible to anyone who reads the checklist rather than the essay. So
the authorisation has to be a decision, made before the close, in the place decisions live.

## Decision

### 1. Unfinished and unsatisfiable are different, and the test is not cost

> **An item is *unfinished* if an action exists that would satisfy it and produce a true
> artefact.** It is ***unsatisfiable*** **if the only remaining action would produce a *false*
> one** — an artefact asserting something that did not happen, or that happened in the wrong
> order.

**Cost, effort and inconvenience never make an item unsatisfiable.** An unfinished item is done,
however tedious. The distinction is about truth, not price, and it is deliberately hard to reach:
an item becomes unsatisfiable only when satisfying it would *destroy the property the item exists
to protect*. A checklist that can be escaped by finding something difficult is not a checklist.

### 2. A phase may close with unsatisfiable items, under four conditions

All four, or the phase does not close:

- **Named individually**, item by item, with the reasoning for each. "Some process items are
  outstanding" is not a naming.
- **In an ADR, before the close** — not in the close-out, not in a PR description, not in a
  completion report. The document reporting the state must not be the document granting the
  exception.
- **Each carries the root-cause fix**, so the same item cannot be unsatisfiable twice for the same
  reason. An exception without a fix is a precedent.
- **The owner's review pass approves it.** This is the class of judgement ADR-032 reserves to the
  owner: whether a premise is acceptable, not whether an implementation is correct.

**Condition 4 is satisfied by the owner's review record on the PR, and by nothing else.** Not by
direction given in conversation, not by an instruction to proceed, not by this session reporting
that approval was given — including the instruction that produced this very paragraph. **Those are
all indistinguishable, to a later reader, from an author who decided alone.** The record is the
artefact; everything else is a memory of one.

This is not a general principle borrowed from somewhere. **It is the specific failure PR #12
exposed**: a close-out asserted a phase complete on its own authority, and what caught it was the
owner's pass leaving a comment that could be read afterwards. An ADR whose whole subject is
"when may a gate be waived" is the last document that may accept a weaker form of its own gate.

**Operationally: the Status line above stays *Proposed* until the record exists on PR 4c, and the
commit that flips it to *Accepted* cites that comment.** If the phase is closed while this ADR
still reads *Proposed*, the close is unauthorised by its own terms.

### 3. Applied to Phase 3 — the two items, individually

#### 3.1 Acceptance criteria mapped to named tests — unsatisfiable

**Why not merely unfinished.** The only way to satisfy it now is to write acceptance criteria for
work that is already built and tested. Those criteria would be derived *from the tests that exist*,
and the mapping would then be green by construction — every criterion matched by the test it was
copied from. That inverts the direction the item exists to enforce: **criteria constrain tests;
tests must never author criteria.** The artefact would be real as a file and false as evidence,
which is the definition above.

**The `DEFINITION_OF_DONE.md` item is not miswritten, and is not amended.** It was tempting to
call it so — it assumes a Phase 0 output this project never defined — but that diagnosis puts the
defect in the wrong place. The requirement is sound and worth keeping; **what was missing is its
input.** Deleting or weakening the item would trade a process gap for a permanent capability loss,
and would do it quietly.

**Root-cause fix, in this PR:** `CLAUDE.md` §7 now requires Phase 0 to produce the written
acceptance criteria for the slice. From Phase 4 onward the input exists, and this item is
**unfinished-and-blocking** rather than unsatisfiable — the exception is not available again.

**Carried forward:** **K77** — Phase 4's Phase 0 produces acceptance criteria before design.
Trigger: the first Phase 0 after this ADR.

#### 3.2 Review records and the owner's pass, PRs #4–#11 — unsatisfiable

**Why not merely unfinished.** The action available is reconstruction: writing today, from the
diffs, a record of a review that happened weeks ago. **A record assembled after the fact to fill a
gap is precisely the artefact both rules exist to make impossible** — this is ADR-032's own
reasoning for PRs 1, 2a and 2b, applied to the same facts. The reviews were real. Their
attestation is ADR-032's amendment table, and that is a weaker claim than a contemporaneous
record, stated as weaker rather than dressed up as one.

**Root-cause fix, already in force before this ADR** — which is why nothing more is required here:
the record rule from `442e138`, running since PR #8; the owner's-pass scope dated 2026-08-15,
running since PR #12. Every PR from #8 onward carries a record; #12 and #13 carry the owner's pass
or state why it does not apply.

**Carried forward:** nothing. There is no future action that improves this, and inventing one
would be theatre.

### 4. What would make this authorisation wrong to reuse

Every line below is a way this ADR could be misused by someone citing it in good faith. If a
future close matches any of them, **this ADR does not authorise it**:

- **The item is expensive, not unsatisfiable.** The test is whether the remaining action produces a
  false artefact — never whether it is slow, dull, or arrives at a bad moment.
- **The gap was created after the rule closing it existed.** This authorisation covers work done
  *under a process gap that is now closed*. Once the process exists, the same item is unfinished
  by definition, because the input it needed was available and was skipped.
- **The same item is claimed twice.** A second phase closing with the same unsatisfiable item means
  the root-cause fix did not work. That is a signal to fix the process or the item — not to grant
  the exception again. **Acceptance criteria in particular are spent: §3.1 may not be re-used.**
- **The item protects a runtime property rather than process evidence.** Both items here cost a
  *record*. An item about a test passing, a migration applying, a public endpoint not reading an
  owner-scoped table, or a secret not being committed **cannot** be unsatisfiable — there is no
  such thing as an unsatisfiable behaviour, only an unbuilt one. This ADR is about evidence of
  process, and does not extend one inch past it.
- **It is invoked prospectively.** Deciding during Phase 0 that a phase will close with items
  waived is planning to fail the gate. This is retrospective only, for work already built.
- **It is invoked without the owner's pass**, or by the author of the work alone. Condition 4 of §2
  is not a formality; it is the whole reason PR #12 did not close this phase.

### 5. Scope

**This ADR authorises the close of Phase 3 and nothing else.** It does not travel to Phase 4, and
it does not create a standing waiver. The general rule in §1, §2 and §4 does stand for future use —
that is why it is written as a rule rather than as a one-off — but each use needs its own ADR
naming its own items.

## Rationale

**Why not simply leave Phase 3 open.** Considered seriously, because it is the honest-looking
option. It fails on inspection: the two items can never be satisfied, so "open" is not a state the
phase can ever leave. A phase boundary that cannot be crossed stops carrying information — the
next slice starts anyway, and the marker just goes stale. Worse, it teaches that the checklist is
decorative, which is the exact failure the checklist exists to prevent.

**Why not amend `DEFINITION_OF_DONE.md` instead.** This was the live alternative and it is
addressed in §3.1. Briefly: the acceptance-criteria item is a good requirement whose input this
project never produced. Amending the *requirement* to match the *failure* is how a standard erodes
— it would close Phase 3 by lowering the bar rather than by naming the miss, and every later phase
would inherit the lower bar silently. Fixing Phase 0 keeps the bar and closes the gap.

**Why an ADR and not a section in the close-out.** PR #12 ran that experiment. The close-out
asserted the phase complete on its own authority, the owner's pass caught it, and the correction
took two PRs. Decisions and reports have different jobs: a report describes what happened, a
decision says what is permitted. When one document does both, the permission inherits the report's
audience — people reading for status, not for authorisation.

**Why the truth test rather than a list of allowed exceptions.** A list gets extended. A test —
*would the remaining action produce a false artefact?* — has to be argued against the specific
item each time, in writing, in front of the owner. §4 exists because a test with no stated misuses
is a test everyone passes.

## Consequences

- **Phase 3 closes with two exceptions that stay visible permanently**, in this ADR and in
  `docs/analysis/09-phase3-close.md`, rather than as an unticked box nobody can explain later.
- **A new failure mode is created**: someone will eventually reach for "unsatisfiable" to escape an
  item that is merely hard. §1 and §4 are the guard, and they are only as good as the owner's
  willingness to reject a bad invocation — as happened on #12.
- **Phase 4 inherits a stricter Phase 0.** Acceptance criteria are now an input to design, and the
  first Phase 4 slice will feel that as extra work before code.
- **PRs #4–#11 remain attested only by ADR-032's table**, permanently. Anyone auditing this
  repository against `DEFINITION_OF_DONE.md` will find those PRs short of the human gate, and this
  ADR is the explanation rather than the excuse.
- **The reduced e2e gate is what makes this ADR small.** Had the e2e item also been waived, this
  would be a decision to close a phase on process paperwork alone, and it should have been refused.
  Two evidence items and zero behaviour items is the boundary this ADR promises not to cross.

## Items resolved

- The question left open by `docs/analysis/09-phase3-close.md` §5 and by the owner's review of
  PR #12: **what authorises closing Phase 3.**

## Items created

- **K77** — Phase 4's Phase 0 produces a written list of acceptance criteria per slice, and
  `DEFINITION_OF_DONE.md`'s mapping item is then satisfiable. Trigger: the first Phase 0 after this
  ADR. Blocking, not deferrable — §4 makes the exception unavailable a second time.
