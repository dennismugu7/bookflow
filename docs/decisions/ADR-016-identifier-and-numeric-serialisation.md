# ADR-016 — Identifier and numeric serialisation strategy

**Status:** Accepted · **Amends:** ADR-009

## Context

The Project-Scaffolding manual's Phase 1 requires an ID strategy decided once — "UUID vs
auto-increment" — "so every future migration doesn't relitigate them." The triage never
captured this as an item, which is a gap in the analysis rather than in the source documents:
neither design doc mentions identifiers at all, so nothing prompted the question.

It becomes pressing because identifiers surface publicly. ADR-002 emails a per-booking link.
I4 concerns a salon's public identifier appearing in shared links and QR codes. Sequential
integers in those positions are enumerable, which turns a share link into a directory of every
salon and booking on the platform.

Spike 001's C2 verdict is the second input. Recorded verbatim from
`docs/spikes/001-platform.md`:

> **REST, `select=amount_minor`** → `9007199254740992` — **drifted by 1**
> REST, `select=amount_minor::text` → `"9007199254740993"` — exact

`bigint` is exact in Postgres and over the Postgres driver; PostgREST's JSON serialisation
loses precision above 2⁵³. ADR-013 removes PostgREST from the client path, but the same
ceiling applies to any JSON encoder, including our own.

## Decision

**Primary keys are UUIDs**, not bigint sequences.

**Money remains `bigint` minor units** per ADR-009. **Money crosses the wire as a JSON
integer.** The API **asserts that any money value is within the safe integer range at the
serialisation boundary and fails loudly rather than silently truncating.**

## Consequences

- UUIDs are non-enumerable, which is what makes them safe in the public positions ADR-002 and
  I4 create. Nothing can be walked by incrementing.
- UUIDs sidestep the 2⁵³ ceiling entirely for identifiers, because they serialise as strings
  rather than numbers. The C2 finding therefore applies only to money.
- Money stays a JSON integer rather than a string. In KES minor units the safe ceiling is
  ~90 trillion shillings, so no real value approaches it — but "no real value approaches it"
  is an assumption, and the assertion converts a silent wrong number into a loud failure.
  A silently truncated money value is exactly the class of bug both manuals put behind the
  Do-Not-Vibe line.
- The assertion belongs at the ADR-014 serialisation boundary, so it is written once rather
  than per-endpoint.
- UUID primary keys are wider and non-sequential, with the usual index-locality cost. Accepted:
  this product's volumes make it irrelevant, and the public-exposure argument does not.
- I4 is narrowed but not resolved. A UUID primary key is a plausible public identifier, but
  a primary key cannot be rotated, and I4 asks whether the salon's identifier can be rotated
  or revoked. If it must be, the public identifier is a separate column from the PK.

## Items resolved

None in the triage. This settles the ID strategy, which the triage never captured — recorded
here so the gap is closed explicitly rather than silently. It also records spike C2's PARTIAL
verdict and fixes the mitigation, amending ADR-009.

## Items created

None. I4 narrows; see above.
