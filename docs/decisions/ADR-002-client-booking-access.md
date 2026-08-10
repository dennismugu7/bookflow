# ADR-002 — Client access to their own booking

**Status:** Accepted

## Context

The client web app has no login on any of its eleven pages, and the booking flow
terminates at Submit. A client who books has no way back: no booking reference is ever
shown to them, and neither the confirmation nor the cancellation email carries a link.
Their only stated recourse is the copy "If you need to make any changes, just get in
touch with us" — which resolves to nothing, since the salon's own phone and email are
never collected either.

Meanwhile the owner-facing doc mentions cancellation 48 times and the client-facing doc
zero times. Cancellation exists as a concept only for the party who did not make the
booking.

The reviews system has the mirrored problem: it computes per-salon and per-team-member
aggregates from client submissions, with no identity, no booking linkage, and no
duplicate prevention.

## Decision

A signed magic-link token is generated per booking and emailed with every booking email.
It opens a single booking page carrying a cancel action.

- No client accounts, no login, no password.
- The token is the booking reference.
- The same token later authenticates review submission, making the reviewer provably the
  person who held that booking.

## Consequences

- One credential serves two purposes across two phases. Its scope and lifetime must be
  designed before the first token is minted (see K20).
- Review identity, booking linkage and uniqueness all fall out of the token rather than
  needing an accounts system.
- Email deliverability moves onto the critical path for the client experience, not just
  for owner sign-up (E1, E2).
- A new client-facing page exists that appears in no design document.

## Items resolved

G1 (who may review), G2 (review-to-booking linkage), G4 (duplicate prevention),
H1 (no client cancellation path), H2 (emails carry no mechanism),
H3 (no booking reference surfaced).

## Items created

K20 — the token's scope, lifetime, revocation on cancellation, and reuse for review
submission after the booking has passed. Classified F.
