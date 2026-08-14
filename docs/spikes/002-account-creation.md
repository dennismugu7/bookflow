# Spike 002 — mediated account creation

**Run:** 2026-08-12 · **Branch:** `feat/mediated-signup` · **Status:** complete, endpoint not written

## Why

ADR-037 requires that **only our API can create accounts**. ADR-027 requires that **GoTrue sends
the activation email**. ADR-037's own consequence text asserts both hold at once:

> `POST /v1/auth/signup` proxies to GoTrue **server-side**, so the activation email still flows
> from GoTrue exactly as ADR-027 decided.

and

> The API's server-side call uses the service-role credential and creates users through the admin
> API, which is unaffected by that flag.

Those two sentences describe **one** admin call doing both jobs. Nobody had verified that it does.
This spike was run before any endpoint code, to find out.

## Method

Local Supabase stack (CLI 2.113.0) with `[auth] enable_signup = false` and
`[auth.email] enable_confirmations = true`, mail captured in mailpit. Every result below is an
observed HTTP status from a throwaway probe script, not a reading of the documentation.
Then repeated against staging (`bookflow-staging`) with **its configuration left unchanged**.

## Verdicts — local

**L1. Open sign-up is genuinely closable.** Anon `POST /signup` returns **422 `signup_disabled`**
("Signups not allowed for this instance"). The direct hole ADR-037 worries about does close.

**L2. The admin API creates the user and sends no email.** Service-role `POST /admin/users`
returns **200**. The user exists with `email_confirmed_at: null` **and `confirmation_sent_at:
null`**. The mailbox count does not move. `email_confirm: false` makes no difference — still
silent. **This is the finding that matters: the admin path is mute.**

**L3. An unconfirmed user cannot log in.** `POST /token?grant_type=password` returns **400
`email_not_confirmed`**. Confirmation is a real gate, not a decoration — so a user stranded
between the two calls holds nothing usable.

**L4. `invite` sends the wrong email.** `POST /invite` does send mail, but the subject is
**"You've been invited"** — the invite template, and it stamps `invited_at`. That is not an
activation email and it describes a flow Bookflow does not have.

**L5. `generate_link` sends nothing.** `POST /admin/generate_link type=signup` returns **200** with
an `action_link` in the body and dispatches **no** mail. Using it would mean *our* API sends the
activation email, which is precisely what ADR-027 forbids.

**L6. `resend` sends the genuine activation email.** `POST /resend type=signup`, with the **anon**
key, for the unconfirmed admin-created user, returns **200** and delivers subject **"Confirm your
email address"** — GoTrue's own confirmation template, GoTrue's own token.

**L7. The activation link completes the flow.** `GET` on the emailed `/auth/v1/verify?...` returns
**303** redirecting to `site_url` with an `access_token` fragment. It is **single-use** — a second
`GET` returns `otp_expired`. Login afterwards returns **200 with a token**. End to end, this works.

**L8. `resend` does not leak account existence.** Called for an address with no account it returns
**200 `{}`**, identical to the success case.

**L9. Duplicate creation fails cleanly.** `POST /admin/users` with an existing address returns
**422 `email_exists`** and creates nothing.

**L10. The compensating delete works.** `DELETE /admin/users/:id` returns **200**. ADR-037's
compensation path is available.

### The mechanism this establishes

Account creation is **two GoTrue calls, not one**:

1. service-role `POST /admin/users` — creates the user, silently;
2. `POST /resend type=signup` — makes GoTrue send its own activation email.

With the `user_profiles` insert between them, so a profile failure compensates by deleting the
user before any email has gone out.

## Verdicts — staging (configuration unchanged)

**S1. Open sign-up is currently OPEN on staging.** Anon `POST /signup` returns **400
`email_address_invalid`** — an address-validation error, not `signup_disabled`. Locally the
`signup_disabled` check fires *before* address validation, so reaching validation proves the flag
is not set. ADR-037's requirement is **not yet satisfied on staging.**

**S2. The admin API does not validate address deliverability; the public endpoints do.** The same
`@bookflow.test` address that `POST /signup` and `POST /resend` both reject with
`email_address_invalid` is accepted by `POST /admin/users` with **200**. A user the admin API
happily creates can therefore be **impossible to send an activation email to**. Step 1 of the
mechanism can succeed where step 2 cannot.

**S3. Unconfirmed login is blocked on staging too.** 400 `email_not_confirmed`. Matches L3.

**S4. Duplicate and delete match local.** 422 `email_exists`; delete 200.

**S5. Hosted cannot send the activation email at all right now.** `POST /resend type=signup` for a
real, deliverable address returned **429 `over_email_send_rate_limit` on the first attempt**, and
`confirmation_sent_at` stayed `null`. Supabase's built-in SMTP is not a usable sender. **Custom
SMTP must be configured before mediated sign-up works anywhere but locally.** No further attempts
were made — one 429 is a sufficient answer and retrying would only consume quota.

## Where this contradicts the ADRs

**ADR-037 is wrong on one point of fact.** It states the server-side admin call keeps the
activation email "flowing from GoTrue exactly as ADR-027 decided". It does not — the admin call
sends nothing (L2). ADR-037 describes a one-call mechanism; the working mechanism is two calls.

**ADR-027 is not contradicted.** GoTrue still sends the email, from its own template with its own
token, and the API never touches a mail provider. The `resend` call satisfies it.

**The gap is a sequencing detail ADR-037 did not anticipate, not a broken decision.** Both ADRs
remain achievable. But the correction belongs in an amendment written deliberately, not absorbed
silently into the endpoint.

Two further obligations fall out of staging and were not in either ADR:

- disabling open sign-up on staging (S1) — still outstanding;
- configuring custom SMTP (S5) — a hard prerequisite, currently unmet.

## Traps encountered

**`[auth.email] enable_signup` is not the setting you want.** The first run set both
`[auth] enable_signup = false` and `[auth.email] enable_signup = false`. The latter disables the
**email provider entirely** — every call, including login, fails with `email_provider_disabled`
("Email logins are disabled"). Only `[auth] enable_signup = false` is correct. The first run's
results were discarded.

**`supabase config push` is whole-file and has no `--dry-run`.** Pushing this repository's
`config.toml` to change one auth flag would also overwrite staging's `site_url`,
`additional_redirect_urls` and rate limits with local development values. It was not used. A
targeted change through the dashboard or the Management API is the safe path.

## State left behind

`supabase/config.toml` holds `enable_signup = false` and `enable_confirmations = true`,
uncommitted. Those are the values ADR-037 requires, but they belong to the endpoint PR, not to a
spike. Staging configuration was **not** modified. All users created by this spike were deleted.

## Amendments

### 2026-08-14 — the `config.toml` values above did not survive

The machine crashed and rebooted after this spike was written and before any of it was committed.
`supabase/config.toml` is now **byte-identical to `HEAD`** — `git diff` reports nothing. The two
uncommitted edits recorded under "State left behind" are gone:

| Setting | Spike left it at | Reads now |
|---|---|---|
| `[auth] enable_signup` | `false` | `true` |
| `[auth.email] enable_confirmations` | `true` | `false` |

(`[auth.sms]` carries its own pair of both settings, unrelated and untouched.)

**Nothing above is revised.** It was true when written, and the verdicts are observations at a
moment. This entry records only what has moved on beneath them — the findings themselves are
unaffected, since the spike's probes ran while those values were live.

**Whoever writes PR 2c sets those flags rather than finding them waiting.** The trap recorded
above still applies in full: `[auth.email] enable_signup` is a different setting and is not the
one to change — it disables the email provider outright, including login.
