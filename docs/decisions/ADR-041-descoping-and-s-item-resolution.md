# ADR-041 — When descoping resolves an S item, and when it does not

**Status:** Accepted

## Context

`CLAUDE.md` §7 requires that "any `S`-classified triage item **touching this slice** is resolved
*here*, before design. Not during implementation. Record the answer." `DEFINITION_OF_DONE.md`
consumes that: the item must be "move[d] to Resolved, citing the ADR or recording the decision",
and no open item may be "answered by implementation instead of by decision".

**Nothing defines what makes an item touch a slice**, and the first feature slice found the gap.
Business setup's Phase 0 swept 59 `S` items and produced ten touching the slice, of which seven
were disposed of by writing a non-goal. Two readings of §7 were available and the text chose
neither:

- **A non-goal removes the item from the sweep.** §8 makes `S` mean "blocks a specific slice",
  and an item a slice does not touch cannot block it.
- **A non-goal is not an answer.** "We are not building handles" does not answer *what the
  reserved-word list contains*. §7 says "Record the answer", and the Resolved table's columns
  are `Was` and `Resolved by` — there is no column for *descoped*.

Left unsettled, the first reading wins by default every time, because it is the one that lets
Phase 0 finish. That converts a gate into a formality: any item can be escaped by adding a line
to the non-goals, and the escape looks identical to a decision.

## Decision

**"Touching this slice" is decided by a created-condition test.**

> **Descoping resolves an `S` item only where the slice cannot produce the state that item asks
> about. Where the slice does create that state and does not answer the item, the item must be
> answered in Phase 0 — or waived explicitly and on the record.**

The question is never "did we build the feature the item names". It is **"does this slice bring
into existence the situation the item is about"**. A slice that creates the condition owns the
question, whether or not it builds the surface that would display it.

### Worked examples, from the sweep that produced this ADR

**K54 — the salon handle field, its availability check, its reserved-word list. Genuinely
resolved by exclusion.** No handle table exists; the foundation migration excluded it on
purpose. Business setup cannot create a handle, a collision, or a reserved-word case. The state
K54 asks about is unreachable from this slice, so the non-goal is a complete answer and K54
moves on untouched.

**K27 — what the client webapp shows for a salon with zero services, zero team members, zero
portfolio images. Caught by the test.** Decision 3 of the business-setup frame rules that a
name-only business **is** a real business. That makes a zero-services, zero-team, zero-portfolio
salon the *normal* output of onboarding rather than an edge case — precisely the population K27
asks about. The slice builds no web page, so a scope-based reading discharges it; the
created-condition test does not, because the rows K27 is about are the rows this slice creates.

The difference between them is not how much was built. It is that one slice can produce the
condition and the other cannot.

### The waiver path

An item may be caught by the test and still be genuinely unanswerable in this Phase 0 — the
answer may depend on a client that does not exist, or a decision that belongs to another slice.
**That is permitted, and it is not silent.** A waiver:

1. Names the item and states that the created-condition test caught it.
2. States why it cannot be answered now — what is missing, not that it is inconvenient.
3. Names the slice or trigger that will answer it.
4. Is recorded in the slice's Phase 0 document, before design, and repeated in the completion
   report.

**A waiver is a decision to proceed without an answer. A non-goal is a claim that no answer is
owed.** Conflating them is what this ADR exists to stop.

**ADR-040 is the precedent** — arriving with PR #14, it establishes when a phase may close with
`DEFINITION_OF_DONE.md` items that cannot be satisfied, and requires that an authorised miss be
written down and bounded rather than absorbed. This is the same shape applied one level down, to
a single triage item inside a single Phase 0.

## Rationale

**The failure mode being prevented is invisible, which is why it needs a rule.** A non-goal that
escapes a real question reads exactly like a non-goal that legitimately excludes one. Both are a
bullet in the same list, written in the same voice. Nothing downstream distinguishes them: the
triage still shows the item open, and the slice's completion report shows a clean Phase 0.

**The test is cheap because it asks about rows, not about intent.** "Does this slice create the
state?" is answerable from the schema and the decisions, by someone who did not write them —
unlike "is this in scope?", which is answerable only by the person who drew the scope.

**It does not enlarge slices.** K27 being caught does not mean business setup builds a web page.
It means someone decides, on the record, what an empty published salon does — or waives it
naming the slice that will. The build stays the size it was; only the thinking moves earlier,
which is the whole purpose of Phase 0.

**Rejected: requiring every touching item to be answered outright.** Some genuinely cannot be,
and a rule that forbids the honest answer produces dishonest ones. The waiver path keeps the
record truthful.

## Consequences

- **Phase 0 costs more, and the cost is the point.** Every slice from Phase 4 onward runs the
  created-condition test over its S sweep, not a scope check.
- **Non-goals are no longer self-certifying.** A reviewer may ask, of any non-goal that disposes
  of an S item, whether the slice creates the state anyway.
- **Waivers accumulate and must stay visible.** A waiver that is written once and never revisited
  is the failure this ADR imports from ADR-040; the naming of a trigger in point 3 is what makes
  it re-findable.
- **This ADR does not re-open Phase 3.** It applies from the first Phase 0 after it lands, which
  is business setup's.
- **Nothing enforces it.** No test, no lint, no CI job. It holds by review, like the schema
  conventions in ADR-036 and for the same reason.

## Items resolved

**None in the triage.** This settles an ambiguity in `CLAUDE.md` §7 that the triage never
tracked — the same situation as ADR-036, and recorded here so the gap closes explicitly rather
than by whichever reading the first slice happened to take.

## Items created

None. It changes how existing items are dispositioned, not what is open.
