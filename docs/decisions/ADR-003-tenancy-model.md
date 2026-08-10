# ADR-003 — Tenancy model

**Status:** Accepted

## Context

The design docs never state whether one account maps to one business. Sign-up creates a
user; onboarding creates a business profile; the cardinality is left open. Team members
are content records with a name, photo and bio — they cannot log in, and no screen
creates credentials for them — yet they carry individual ratings and are selectable in
the client booking flow.

More seriously, every backend action in the native doc is described without an
authorization check: fetch bookings, fetch contacts, update booking status, fetch the
payment-proof file, delete account. The Project-Scaffolding manual names this exact gap
as Do-Not-Vibe territory: "how does every future protected route check them the same
way?"

## Decision

**One business per account, one seat, in v1.**

But ownership is modelled as a **membership table** joining users to businesses with a
role — not as an `owner_id` column on the business. Every protected read and write
scopes through `user → membership → business`.

No invite flow, no roles UI, no seat management is built.

Team members remain content records — name, photo, bio, no credentials — exactly as the
designs have them.

## Consequences

- The scoping rule is the expensive thing to change, not the table. Adding a second seat
  later is a feature that inserts rows; it is not an auth rewrite.
- v1 ships a column with one value and a join with one row per user. That indirection is
  paid for deliberately.
- This is a named risk in the sense the Project-Scaffolding manual's Phase 0 intends:
  the foundation is built to grow a second seat without a rewrite, and the cost of being
  wrong is a small amount of unused structure rather than a migration.
- An authenticated user can exist with zero memberships, between sign-up and onboarding.
  Every scoped query must handle that state.
- Ownership transfer and account recovery become tractable later — they move a membership
  row rather than re-parenting a business.

## Items resolved

I1 (ownership cardinality and seat count), and I3 — but only the authorization *rule*.
Where that rule is enforced is a separate question, split out below.

## Items created

I3b — at which layer the scoping rule is enforced (row-level security, API middleware, or
repository guard), and how every future protected route inherits it without
re-implementing it. Downstream of K1, since the platform choice constrains which layers
are available. Satisfies the Phase 4 "authorization scaffolding" requirement in the
Project-Scaffolding manual. Classified F.
I9 — what the role vocabulary is in v1, given the column exists with no UI. Classified D.
I10 — what the app does for an authenticated user with zero memberships. Classified S.
