# ADR-031 — Foundation data model

**Status:** Accepted

## Context

The project manual's Phase 3 asks the data layer for "the core schema decided in Phase 1 — auth
tables plus one placeholder domain table". Taken literally that is a table with a name and a
column, existing only so the migration has something to create.

ADR-003 decided the tenancy model — one business per account, one seat, through a membership
table — and `CLAUDE.md` §5 makes the scoping rule `user → membership → business` a
non-negotiable applied in the repository layer. Spike 001/C7 established why it has to be
application code: the API's service credential bypasses RLS entirely, so the database will not
catch a missing scope.

Tracked as **K63** (what the placeholder table is), **K10** (terms versioning and acceptance)
and the data half of **I10** (what exists for a user with no membership).

## Decision

**Three tables in Phase 3's first migration: `user_profiles`, `businesses`, `memberships`.**

**`user_profiles`** — what `auth.users` does not hold. First name, last name, avatar reference,
and the terms-acceptance fields below. Keyed to the GoTrue user.

**`businesses`** — the business record ADR-003 makes one-per-account, carrying at minimum the
`published` flag ADR-004 requires every public read to filter on.

**`memberships`** — the join ADR-003 specifies, carrying the role column ADR-003 notes has no UI
behind it in v1 (I9).

**Terms acceptance: a version string and a timestamp on `user_profiles`, written at sign-up.**

## Rationale

**These are not a placeholder, and the substitution is deliberate.** A throwaway table proves
that a migration runs. These three prove that **the membership scoping rule works** — which is
the thing every protected read and write in this system depends on, which is a Do-Not-Vibe
surface, and which the manual's Phase 3 exists to establish before features assume it.

With only a placeholder, Phase 3's protected route can demonstrate that an unauthenticated
request is rejected and nothing more. With the tenancy spine present, it demonstrates the whole
chain: an authenticated user resolves through a membership to a business, a repository applies
that scope, and a request for another business's row returns nothing. **That is the difference
between proving the foundation and asserting it.** It is also the cheapest moment to get it
wrong, because there is no data and no second consumer.

**On `user_profiles` existing at all.** Screen #20, My Profile Details, renders first name, last
name and avatar. `auth.users` holds none of them, and ADR-013 puts our API rather than PostgREST
in front of the database, so there is no route to that data except a table we own. Phase 3's one
true page requires this table; it is not speculative.

**On terms acceptance being cheap now and dishonest later.** Adding a version and a timestamp to
a table nobody has rows in costs a column. Adding it after users exist costs a migration plus a
backfill — and the backfill cannot be performed honestly, because there is no truthful value to
write for a user who was never asked. Either the record claims an acceptance that did not
happen, or it is null and the column means nothing. K10 is answered now for that reason rather
than because the legal need is pressing.

## Consequences

- **The migration is Do-Not-Vibe.** This ADR states what the tables are for; it deliberately
  states no DDL. Column types, constraints, indexes, foreign-key behaviour and RLS policies are
  written and reviewed line by line in the slice, per `CLAUDE.md` §6.
- **Phase 3's protected route can prove the scoping rule**, and `DEFINITION_OF_DONE.md`'s
  "every new protected query goes through the repository membership scoping rule" becomes
  checkable in the first slice rather than the first feature.
- **A user with no membership is a real, representable state**, not an edge case discovered
  later: a `user_profiles` row with no `memberships` row. The UI half of I10 is decided in
  ADR-032.
- **The Terms and Privacy documents do not exist.** Recording acceptance of a version string
  that points at nothing is a placeholder until they are written. That is a content task before
  launch, tracked as **K70**, classified `D`.
- **Scope discipline is now on this ADR.** Three tables is more than the manual asked for, and
  the temptation in the slice will be a fourth — services, or team members, because they are
  obviously coming. They are not in Phase 3. The line is the tenancy spine and nothing past it.

## Items resolved

**K63** (what the placeholder domain table is). It was `S`. It is three tables, and they are not
a placeholder.
**K10** (terms versioning and acceptance at sign-up). It was `S`. Versioned, recorded at
sign-up, on `user_profiles`.
**I10**, data half (what exists for an authenticated user with zero memberships). A profile row
and no membership row. The UI half is ADR-032.

## Items created

**K70** — the Terms of Service and Privacy Policy documents themselves do not exist and must be
written before launch. Classified `D`; it is a content task, not a design question.
