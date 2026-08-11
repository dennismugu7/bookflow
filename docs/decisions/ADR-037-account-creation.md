# ADR-037 — Account creation

**Status:** Accepted · **Resolves:** K72

## Context

PR 1's migration made `user_profiles.terms_version` and `user_profiles.terms_accepted_at`
`not null`, on ADR-031's reasoning that consent recorded later cannot be recorded honestly.

The line-by-line review of that migration surfaced a consequence nobody had stated. **GoTrue owns
the `auth.users` insert** (ADR-027), and our API is not in that transaction. So the profile row —
with real consent values — must come into existence at the same moment as the account, and
nothing in the ADRs said how.

Anything that leaves a window produces an authenticated user with no profile. There is no honest
backfill for that user: there is no truthful value to write for consent that was never given.

Tracked as **K72**, classified `F`, blocking PR 2. It sits on a Do-Not-Vibe surface.

## Decision

**Sign-up is mediated by our API. The client does not call GoTrue's signup endpoint.**

`POST /v1/auth/signup` proxies to GoTrue **server-side**, so the activation email still flows
from GoTrue exactly as ADR-027 decided. On success, the API inserts the `user_profiles` row with
a **server-supplied** `terms_version`.

**If the profile insert fails, the API deletes the created user through GoTrue's admin API and
returns an error.** A compensating action, because the two writes cannot share a transaction.

**Login remains direct to GoTrue.** ADR-017 is unchanged.

## Rejected: a trigger on `auth.users` reading `raw_user_meta_data`

This was the obvious answer and it is wrong for one decisive reason.

**`raw_user_meta_data` is client-supplied.** Anyone holding the anon key — which ships in the
Flutter app and is not a secret — can call GoTrue's signup endpoint directly and assert any
`terms_version` they like, including one that does not exist or one they never saw. **A consent
record the subject controls is not a consent record**, and consent is the entire reason ADR-031
added the columns. A trigger would faithfully persist an attacker's claim about what they agreed
to.

Secondarily, it puts business logic in a database trigger, against `CLAUDE.md` §4's rule that
services hold the logic. ADR-036 already uses a trigger for `updated_at`, which is mechanical
bookkeeping with no policy in it; a consent decision is not that.

## Consequences

- **Open sign-up must be disabled on GoTrue**, or the mediated path is merely the *polite* path
  and the direct one remains open. This is **configuration, not code**: `auth.enable_signup =
  false` in `supabase/config.toml` for local, and the corresponding Authentication → Sign In /
  Providers setting for hosted projects. The API's server-side call uses the service-role
  credential and creates users through the admin API, which is unaffected by that flag.
  **This must be verified on staging, not assumed** — a setting that silently fails to apply
  leaves the hole open while the ADR says it is closed.
- **The compensating delete is a Do-Not-Vibe surface** and needs a test proving **no orphaned
  `auth.users` row survives a failed profile insert**. Fault injection, not inspection: make the
  profile insert fail and assert the user is gone.
- **The compensating delete can itself fail.** If GoTrue's admin delete errors after the profile
  insert already failed, an orphan survives and nothing retries it. Accepted for now, and it is
  the residual risk in this design; a reconciliation sweep belongs with the outbox worker if it
  ever becomes real. It should be logged loudly enough to be noticed.
- **Sign-up latency is now two network hops**, ours plus GoTrue's, and the client sees the sum.
- **The API needs GoTrue's service-role credential** to create and delete users, which is
  already true of the API and is why ADR-013 puts authorization in the repository layer rather
  than trusting RLS.
- **K7's verification-code settings still apply**, because the mediated call still triggers
  GoTrue's own email and code (ADR-030).

## Items resolved

**K72** (how a `user_profiles` row is created). It was `F`.

## Items created

None tracked. Two implementation obligations are named above — verifying `enable_signup = false`
on staging, and the no-orphan test — and both belong to PR 2 rather than to Phase 0.
