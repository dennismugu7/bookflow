# ADR-007 — Availability and conflict model

**Status:** Accepted

## Context

The native doc declares that "the opening hours become the source of truth the client
webapp uses to show availability and determine bookable time slots"
(`DD-Bookflow-Native.md:480`) and then specifies nothing about how. Only one weekly
schedule exists, at business level — yet the web booking flow filters slots by
professional and offers an "Any professional" option whose subtitle claims "Maximum
availa…", a claim that requires per-person availability the data model never captures.

Nothing anywhere prevents two clients booking the same time. The calendar's own open
question refers to "a conflicting or adjacent slot" as a scenario without defining what
stops it.

And the status lifecycle is unresolved against availability: a client can submit a
booking with an unverified deposit, and nothing says whether that holds the slot, for how
long, or what happens if the deposit never arrives.

## Decision

**Two layers of availability.** The salon's weekly opening hours set the outer bound.
Each team member carries their own working days and times within that bound. A slot
exists only where both are open.

**Conflict rule:** one booking per team member per overlapping time range, enforced as a
**database-level exclusion constraint** over (team member, time range, occupying status)
— not as an application-level check.

**Unverified bookings expire.** A Booked-but-unverified appointment occupies its slot for
a bounded expiry window, then expires and releases it. The exact window is a separate
S-level decision.

## Consequences

- This is a hard capability requirement on the platform choice (K1), not a preference:
  the database must support an exclusion constraint over a time range with a status
  predicate. K2, the platform spike, must verify it.
- Enforcing at the database means a race between two simultaneous bookings is resolved by
  the database, and no application path can bypass it — including any future admin tool.
- The booking status set gains an **expired** state, and something must move bookings into
  it. That mechanism is new infrastructure and constrains K1 a second time.
- Per-team-member schedules need somewhere to be entered. No such screen exists in any
  design; onboarding collects one business-level schedule and nothing else.
- "Any professional" becomes computable — it is the union of individual availabilities —
  which is what makes its "maximum availability" claim true rather than aspirational.

## Items resolved

A3 (per-team-member schedules), A4 (concurrency and the conflict rule),
A9 (which statuses occupy a slot). All three were F.

## Items created

A12 — the expiry window's duration. Classified S.
K50 — the per-team-member schedule screen, which exists in no design. Classified S.
K51 — the mechanism that expires unverified bookings: a scheduled job, lazy evaluation on
read, or a platform equivalent. Classified F, since it is a second capability requirement
on K1 and a module boundary that does not otherwise exist.
