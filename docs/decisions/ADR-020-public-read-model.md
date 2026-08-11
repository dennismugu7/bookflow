# ADR-020 — Public read model

**Status:** Accepted

## Context

The client web app is entirely unauthenticated — eleven pages, no login on any of them — and
every one of them reads one specific salon's data. That data sits on the same records the
owner writes through the onboarding and profile flows, which also hold account-level fields:
the owner's login email, their personal first and last name, their avatar.

The web doc makes the overlap concrete. It sources the client-facing feedback mailto from
"the mobile app account/profile settings" (`Web:171`) — an account field surfacing on a public
page by design, sitting beside account fields that must not.

ADR-013 removed PostgREST from the client path, so this is no longer a question of RLS policy
correctness. It is now a question about our own serialisers, which is a smaller blast radius
but the same failure: one careless query on one endpoint leaks owner data to anyone with the
salon's link.

## Decision

Public, unauthenticated reads are served from an explicit **`business_public` projection**
exposing an **allowlist** of fields. **Never a denylist.**

Public endpoints read **only** from this projection and **never** from the owner-scoped tables
directly.

## Consequences

- An allowlist makes the leak structurally impossible rather than procedurally avoided. With a
  denylist, every column added in the future is public until someone remembers to exclude it —
  and the person adding a column months from now is the least likely to be thinking about the
  public page.
- The projection is a second place to change when a field becomes public, and that friction is
  the point: making something publicly visible becomes a deliberate act with its own diff.
- Public endpoints reading only from the projection is the enforceable half of the rule. It is
  checkable in review and in tests, where "was this query written carefully" is not.
- This composes with ADR-004: the projection filters on `published`, so an unpublished business
  produces nothing rather than producing a filtered subset.
- ADR-003's membership scoping does not apply here — these reads have no user. The projection
  *is* the authorization boundary for the public surface.
- The field list itself is not settled here, only the mechanism.

## Items resolved

I6 (which fields of a business are publicly readable). It was F.

## Items created

K55 — the actual field allowlist in `business_public`, including whether the owner's contact
email belongs in it given the web app's feedback mailto. Classified S.

## Amendments

**2026-08-11 — the projection now has to overcome a REVOKE, not only RLS.**

Phase 3's foundation migration hardened the owner-scoped tables with **two** independent
mechanisms rather than one: RLS enabled with no policies, **and** `revoke all ... from anon,
authenticated`. Either alone would stop a public reader; together they change what this ADR's
projection has to do to work at all.

**With RLS alone**, a view over the base tables returns an empty result to `anon` — safe, and
the projection would simply have had to be granted `select` and given policies. **With the
`REVOKE` in place, a plain view fails outright**: a normal view runs with the privileges of the
*querying* role, so `anon` selecting from `business_public` hits `permission denied` on the
underlying table, not an empty set.

So `business_public` must be **one of**:

- a **`security definer`** view or function, running as its owner and therefore able to read the
  base tables, with `anon` granted `select` on the view only; or
- a plain view plus an **explicit, narrow grant** to `anon` on the base tables, re-opened just
  far enough for the projection — which reintroduces exactly the exposure the `REVOKE` removed.

**The first is the intended path** and the second is recorded only so it is visibly rejected
rather than stumbled into. A `security definer` object is also a privilege-escalation shape if
written carelessly: it must pin `search_path`, expose the allowlist and nothing else, and filter
on ADR-004's `published` flag itself rather than trusting its caller to.

Nothing in the Decision above changes. What changes is that building the projection is no longer
"create a view" — it is a small piece of privileged code on a Do-Not-Vibe-adjacent surface, and
it should be planned as such. Tracked as **K71**.
