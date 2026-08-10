# ADR-018 — Social identity linking

**Status:** Accepted

## Context

Both the sign-up sheet and the login sheet offer Google and Facebook alongside email and
password. Neither design document says what happens when the two paths collide — when a
social login presents an email address that already has a password account.

The question was classified F because it is an identity-uniqueness rule, and because under
ADR-003 a business hangs off a membership row belonging to exactly one user. Get it wrong in
one direction and the owner has two accounts with their salon reachable from only one; get it
wrong in the other and two different people are silently merged into one identity holding one
business.

The security asymmetry is what settles it. Not every OAuth provider verifies that the person
holding an account controls the email address on it.

## Decision

A social login is linked to an existing password account **only when the provider asserts the
email address is verified and it matches**.

If the provider does not assert verification, **no link is made and no account is created
against that address**.

## Consequences

- Linking on an unasserted email is an account-takeover path: an attacker registers the
  victim's address at a provider that does not verify it, signs in, and inherits the victim's
  business — including its bookings, contacts and payment proofs. The rule closes that path
  by construction rather than by monitoring.
- The refusal case is silent in every design. A user who taps "Continue with Facebook" and is
  neither signed in nor registered needs to be told something coherent, and nothing specifies
  what.
- Some legitimate users will be refused. That is the accepted cost: the failure mode of being
  too strict is a confused owner who can still sign in with a password, and the failure mode
  of being too lax is a stolen business.
- Verified-and-matching is the only linking condition. There is no "link on next login" or
  manual-merge path in v1; if one is wanted later it needs its own decision.
- This is enforced in our API rather than left to Supabase Auth's default linking behaviour,
  which ADR-013 already established as configuration we own.

## Items resolved

K9 (social login against an existing password account — linked or separate). It was F.

## Items created

K56 — what the owner is shown when a social link is refused, on both the sign-up and login
sheets. Classified S.
