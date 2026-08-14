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

## Amendments

### 2026-08-14 — the stated mechanism does not exist; the working one is two calls

Spike 002 (`docs/spikes/002-account-creation.md`) tested this ADR's mechanism before any endpoint
code was written. **The decision above stands** — sign-up is mediated by our API and the client
does not call GoTrue's signup endpoint. **Only the mechanism was wrong.**

**What the Decision claims.** That `POST /v1/auth/signup` proxying to GoTrue server-side means
"the activation email still flows from GoTrue exactly as ADR-027 decided" — one service-role
admin call doing both jobs.

**What is true.** `POST /admin/users` returns **200** and creates the user **silently**:
`email_confirmed_at` null **and `confirmation_sent_at` null**, no mail dispatched, **with or
without `email_confirm`** (spike 002, L2). **The admin path is mute.** One call cannot do both
jobs because the admin API never sends anything.

**The working mechanism is two GoTrue calls, not one:**

1. service-role `POST /admin/users` — creates the user, silently;
2. insert `user_profiles` with the **server-supplied** `terms_version`;
3. `POST /resend type=signup` — GoTrue sends **its own** confirmation template with **its own**
   token (L6); the emailed link completes the flow and is single-use (L7).

**That ordering is better than the one this ADR described, not merely a correction.** The profile
insert sits **between** the two GoTrue calls, so a profile failure compensates by deleting the
user **before any mail has gone out**. Under the one-call mechanism this ADR imagined, the
activation email would already have been sent when the compensation ran, leaving a deleted user
holding a live link to an account that no longer exists. **ADR-027 is untouched**: GoTrue still
sends, from its own template, and our API still never calls a mail provider.

**Rejected, with reasons.**

- **`POST /invite`** does send mail, but the wrong mail — subject "You've been invited", the
  invite template, and it stamps `invited_at`. It describes a flow Bookflow does not have (L4).
- **`POST /admin/generate_link type=signup`** returns 200 with an `action_link` and dispatches
  **nothing** (L5). Using it makes **our API** the sender of the activation email, which is
  precisely what ADR-027 forbids.

**Supporting facts the endpoint depends on.** Each observed, not assumed:

- **An unconfirmed user cannot log in** — `POST /token?grant_type=password` returns 400
  `email_not_confirmed` (L3). The window between steps 1 and 3 therefore holds nothing usable,
  which is what makes the sequence safe to interrupt.
- **Duplicate creation returns 422 `email_exists` and creates nothing** (L9).
- **`DELETE /admin/users/:id` returns 200** (L10), so the compensating delete this ADR requires is
  real rather than aspirational.
- **`resend` for an address with no account returns 200 `{}`**, identical to the success case
  (L8). It leaks no account-enumeration signal, so the endpoint may surface it unmodified.

**The asymmetry that shapes the endpoint.** **The admin API does not validate address
deliverability; the public endpoints do** (S2). An address `POST /admin/users` accepts with 200 is
rejected by `POST /resend` with `email_address_invalid`. **Step 1 can therefore succeed for an
address step 3 will reject**, producing a user who exists and can never be emailed. **"Created but
unemailable" is a real path, not a theoretical one, and the endpoint must compensate for it** —
the same delete that covers a failed profile insert, applied to a failed resend.

**This remains a Do-Not-Vibe surface** (`CLAUDE.md` §6: auth). The correction is recorded here,
before the endpoint is written, so the endpoint does not absorb it silently.

**On the Consequences above.** `enable_signup = false` was verified on staging on 2026-08-14 —
anon `POST /signup` returns 422 `signup_disabled`, and the service-role admin path still returns
200 with it closed (`docs/ENVIRONMENT.md` §3). The no-orphan test is still owed and belongs to the
endpoint PR. Sign-up latency is **three** hops rather than the two this ADR counted.
