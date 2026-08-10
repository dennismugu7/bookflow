# ADR-006 — Booking record shape

**Status:** Accepted

## Context

The booking record's fields are never enumerated in either design document. Three
questions about its shape were classified F because each forces a migration if guessed
wrong, and the documents contradict themselves on all three.

The web doc flags a duration discrepancy it cannot explain — the summary bar reads
"10 mins" while the service card reads "20 mins" (`Web:1194`) — and recommends
"clarifying which value is authoritative before wiring up the duration calculations."
That is not a copy bug. It is what a booking looks like when nobody has decided whether
it holds its own values or reads them from somewhere else.

On multiplicity, the native booking card reads "Haircut, Beard — 50 mins. — KES 140"
while the web selection step is explicitly single-select (`Web:832`).

On the team member, the web flow makes choosing one an entire step, and the web author
notices the orphaned "·" separator on the review screen where the name should render but
does not (`Web:1218`).

## Decision

**Snapshot, not reference.** A booking snapshots the service name, duration and price as
they were at booking time. A nullable `service_id` is kept for reporting only, never for
display.

**Multiple services per booking**, held in a line-items child table. Duration is the sum
of the line items.

**One team member per booking.** All services in a booking are performed by the same
person; splitting an appointment across staff is out of scope for v1.

**The team member is stored** as a non-null foreign key plus a name snapshot. "Any
professional" is a client-side convenience that resolves to a specific team member at
booking time — it is never stored as null.

## Consequences

- An owner editing a price or duration no longer rewrites history. Past bookings, past
  totals and past confirmation emails stay true to what was agreed.
- `service_id` being nullable means a deleted service does not orphan a booking, and the
  booking still displays correctly from its snapshot.
- The conflict constraint in ADR-007 has a subject to constrain, the calendar can show
  who is occupied, and per-staff ratings have something to attach to.
- The web "Select services" step must become genuinely multi-select. The design specifies
  single-select and its "+" affordance was flagged as misleading; that flag now inverts.
- Something must decide *which* team member "Any professional" resolves to.

## Items resolved

C7 (snapshot versus live reference), K17 (booking stores the team member),
K18 (multi-service bookings). All three were F.
G8 (review attribution under "Any professional") — resolved as a side effect, since the
booking always names a specific person.

## Items created

A11 — the rule by which "Any professional" resolves to a specific team member.
Classified S.
K49 — reworking the web "Select services" step from single-select to multi-select.
Classified S.
