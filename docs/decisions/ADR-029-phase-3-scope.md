# ADR-029 — Phase 3 scope: what "auth end to end" means

**Status:** Accepted

## Context

The project manual's Phase 3 asks for "auth end-to-end: sign-up, login, session/token issuance,
and one protected route that rejects unauthenticated requests". It does not say whether social
login and password reset are part of that.

The design documents contain both. ADR-018 decided how a social login links to an existing
password account. Screens #10 and #11 are the two password-reset steps. So both are real,
specified work — the question is only whether they belong in the **foundation's** thin slice or
in slices of their own.

This was answered once already, in `docs/BUILD_LOG.md` §7, to resolve a contradiction inside
that section: it listed "auth and password reset" among the Do-Not-Vibe surfaces Phase 3
touches, while its own deliverables list named only sign-up, login and token issuance. That
answer has been governing Phase 3's entry conditions ever since, and it changed K56's status.
A scope decision with that reach living only in a mutable file is the wrong home for it.

## Decision

**Phase 3 delivers email-and-password authentication only:** sign-up, login, session and token
issuance per ADR-017, and one protected route that rejects an unauthenticated request.

**Social login is out of Phase 3.** ADR-018's verified-email linking rule stands unchanged;
nothing in Phase 3 exercises it.

**Password reset is out of Phase 3.** Screens #10 and #11, and the reset flow behind them, are
their own slice.

Each is a vertical slice afterwards, with its own Phase 0, its own `S` items and its own
Do-Not-Vibe review.

## Rationale

The manual's Phase 3 exists to prove a **thin** slice through every layer — data, auth, API
middleware, client shell, one page, deploy — so that everything afterwards is addition rather
than infrastructure. Its value comes from being thin: the point is that each layer is pierced
once, and that the piercing is reviewed properly.

Widening it to include social login and password reset makes it **three auth journeys at once**,
each with its own screens, its own failure states and its own security review, before a single
one of them has been proven end to end. That is the opposite of thin, and it front-loads the
phase whose whole purpose is to de-risk the ones after it.

Both deferred journeys also depend on things Phase 3 establishes rather than the reverse.
Social login needs the account model and session issuance to exist before it can link to them.
Password reset needs the email path settled — which ADR-027 has now done — and needs the auth
schema it resets against.

## Consequences

- **K56 is unblocked from Phase 3.** The refused-social-link state is a question about a screen
  Phase 3 does not build; it belongs to the social-login slice.
- **A user who forgets their password in the Phase 3 window has no recovery path.** Accepted:
  the only users in that window are us, on staging. The trigger for closing this is the same one
  ADR-027 sets for custom SMTP — before any real owner signs up.
- **Two more slices are now named** and will need their own Phase 0. That is a feature of this
  decision, not a cost of it: they were always separate journeys, and treating them as such
  makes their `S` items visible instead of absorbed.
- **The Do-Not-Vibe surface list for Phase 3 shrinks.** `CLAUDE.md` §6 names "auth and password
  reset" as one universal surface; Phase 3 touches the auth half only. The reset half is
  reviewed line by line in its own slice, not waved through as already-covered.
- **`docs/BUILD_LOG.md` §7 now cites this ADR** rather than carrying the decision itself.

## Items resolved

None in the triage directly. This promotes a scope decision that was previously recorded only
in `docs/BUILD_LOG.md` §7 into the place decisions are recorded, and it changes **K56** from
blocking Phase 3 to belonging to the social-login slice.

## Items created

None.
