# ADR-017 — Owner session and logout

**Status:** Accepted

## Context

The native doc specifies logout's backend behaviour as a heading with nothing under it —
`"API Call:"` and `"Local Storage Action:"` both left blank (`DD-Bookflow-Native.md:984`) —
and the Log Out modal's Confirm action has no Backend / System Action bullet at all. Nothing
anywhere states what a session is, how long it lasts, or what logging out actually ends.

Spike 001 verdict C5 settled the *mechanism* empirically: Supabase Auth issues **ES256**
tokens with a published JWKS, and a separate Node service verified one independently —
signature and claims, `sub`, `role`, `aud`, `iss` — without calling back to Supabase. A
token with three altered signature bytes was rejected. ADR-013 built on that by making the
API an independent verifier rather than a Supabase client.

What remained was the part a spike cannot answer: lifetime, refresh, and what logout revokes.

## Decision

Supabase Auth issues ES256 JWTs, verified independently by the API against the published
JWKS (spike 001/C5).

**Access tokens are short-lived — one hour.**

**Refresh tokens are long-lived and revoked on logout.**

**No denylist is maintained.**

## Consequences

Stated explicitly rather than left as an implication: **verification is stateless, so an
access token issued before logout remains valid until it expires.** Logging out on a stolen
or shared device does not immediately invalidate a token already in flight. **Maximum
exposure is the access token lifetime — one hour.**

- This is the deliberate trade. Checking a denylist would add a database read to every
  authenticated request and forfeit the stateless verification that spike C5 proved
  available; the whole value of ES256 with a published JWKS is not having to ask anyone.
- One hour is the lever. If the exposure window is later judged too wide, the fix is to
  shorten the access token, not to add a denylist.
- Refresh-token revocation is where logout does real work: the session cannot be extended
  past the current access token's expiry.
- Because the API never calls Supabase per request, an Auth outage degrades new sign-ins
  and refreshes but does not break requests carrying a valid token.
- This governs owners only. The client booking token is a separate credential with a
  separate model (ADR-019).

## Items resolved

K8 (owner session model — lifetime, refresh, logout invalidation). It was F.

## Items created

K57 — the refresh token's absolute lifetime and whether it rotates on use. Classified D;
"long-lived" is a posture, not a number.
