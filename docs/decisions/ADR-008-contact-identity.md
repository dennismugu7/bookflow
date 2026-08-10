# ADR-008 — Contact identity

**Status:** Accepted

## Context

The Contacts tab lists clients, and tapping one is specified to open a detail view
"showing appointment history, total spent, notes, etc." (`DD-Bookflow-Native.md:810`).
Neither document says where a contact comes from, or what makes two bookings the same
person.

The design's own sample data shows the problem: the two contact cards, "Xenon Xavier" and
"Xenon Jason", carry an identical email address and an identical phone number. Whatever
produced that list had no identity rule at all.

Without a key, a contact is a by-product of a booking — one row per booking — and
appointment history and total spent are not computable, only approximable.

ADR-005 fixes the market as Kenya, which makes the choice of key concrete rather than
abstract.

## Decision

A contact is a **first-class record scoped to a business**, keyed on **normalised phone
number**.

Email is stored but is not the key.

## Consequences

- Phone is the stronger identity in the target market, and it is what M-Pesa is tied to —
  so the identifier that reconciles a client's bookings is the same one that will
  reconcile their payments if a payment integration ever arrives.
- Appointment history and "total spent" become reconcilable rather than approximate,
  which is what the contact detail view was always specified to show.
- The key is scoped per business, not global. The same person booking at two salons is
  two contacts. This is correct under ADR-003's tenancy model and avoids a cross-tenant
  identity graph nobody asked for.
- Phone must therefore be required on the client booking form and normalised consistently
  on write. The web form currently marks nothing as required.
- Email being non-key means a client who changes email keeps their history, and two
  clients sharing a family email address stay distinct — the exact case the sample data
  got wrong.

## Items resolved

K19 (the client identity key). It was F.

## Items created

K52 — the exact phone normalisation rule applied before keying, and whether phone becomes
a required field on the client booking form. Classified S.
