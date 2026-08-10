# ADR-019 — Client booking token

**Status:** Accepted

## Context

ADR-002 established that a client's only route back to their own booking is a signed link
emailed with every booking, and that the same credential would later authenticate review
submission. That decision created K20 — the token's own model — and classified it F, because
the token is minted before anything else about it can be changed: every link already sitting
in an inbox is immutable.

Two properties turned out to be in tension with a signed, stateless token. Cancellation has
to be revocable — a booking cancelled by the owner should not leave a live cancel link in the
client's mail. And review submission needs to record whether a review has already been given,
which is state.

ADR-017 made the owner session stateless deliberately. This is the opposite call, for
opposite reasons, and the two credentials are unrelated.

## Decision

Booking tokens are **opaque random values stored in a table**, not signed JWTs. They are
**entirely separate from Supabase Auth**, which authenticates owners only.

**One token per booking**, carrying two **time-gated capabilities**:

- **cancel** — valid until the appointment start.
- **review** — valid from appointment end until thirty days after.

The token **becomes inert** once the booking reaches a state that permits no further action.

## Consequences

- Revocable, auditable, and it survives key rotation — none of which a signed token gives.
  A stateless token cannot be withdrawn once emailed; this one is a row that can be marked
  inert the moment the owner cancels.
- A row was required regardless, to record whether a review has been submitted. Given that,
  a signed token would have meant carrying both a credential and its state separately.
- The two capabilities never overlap in time: cancel dies at the appointment start, review
  becomes live at the appointment end. A single link is safe to email once and behaves
  differently depending on when it is opened — which is why the client only ever receives
  one.
- The thirty-day review window bounds the credential's life. An old booking email is not an
  indefinite key.
- Lookup is by token value, so the column needs an index and the value needs enough entropy
  to be unguessable. Being opaque rather than derived from the booking id means it leaks
  nothing about volume.
- ADR-016's UUID primary keys mean the token need not carry an enumerable identifier.
- Which booking states are terminal — and therefore make the token inert — is bounded by
  H8 and B3 rather than settled here.

## Items resolved

K20 (the client token's scope, lifetime, revocation and review reuse). It was F.
H4 (cancellation window) — the client may cancel at any point up to the appointment start,
with no notice period. Owner-side cancellation remains unconstrained, as the designs have it.
It was S.

## Items created

None.
