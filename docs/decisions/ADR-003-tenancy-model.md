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

## Amendments

**2026-08-17 — "One business per account" was unenforced in the schema until today, and the
constraint widely read as enforcing it does not.**

A fact that has moved on. The decision above is unchanged; what has changed is that it is now
enforced by something rather than by nobody.

**What was true from the foundation migration until 2026-08-17.** Nothing enforced this rule.
Not a trigger — `memberships` carries only `trg_memberships_updated_at`, which touches
`updated_at`. Not row-level security — RLS is enabled with no policies at all, and the API's
credential bypasses it regardless. Not a check constraint — `ck_memberships_role` constrains the
role vocabulary, not the row count. **And not application code: no file under `apps/api/src`
inserted into `memberships`, because no slice had yet created a business.** The rule was
correctly recorded, correctly reflected in the table's shape, and enforced by nothing.

**The misreading, which is the part worth recording.** `uq_memberships_user_business unique
(user_id, business_id)` was read — in `docs/features/01-business-setup/00-frame.md` and in that
slice's design, and by the session that wrote both — as holding this line. **It does not.** It
forbids the same user joining the *same* business twice. Two concurrent business creations for
one account insert `(U, B1)` and `(U, B2)` with different generated business ids; the tuples
differ, and neither insert is rejected. The account ends with two businesses.

**What now enforces it**, added by the business-setup slice (its decision 10):

```
create unique index uq_memberships_one_owner_per_user
  on public.memberships (user_id)
  where role = 'owner';
```

**The predicate is not incidental.** A plain `unique (user_id)` would cap a user at one
membership of any kind and permanently forbid a stylist working at two salons — which this ADR
does not forbid. It caps businesses per account for v1 and says in its Consequences that "adding
a second seat later is a feature that inserts rows; it is not an auth rewrite." Predicating on
`role = 'owner'` enforces exactly the rule decided above while leaving I9's vocabulary free to
widen.

**This is not a reversal and nothing above is withdrawn.** The cardinality, the membership-table
model and the scoping rule all stand as written. Only the belief that the schema already
implemented the first of them was wrong.
