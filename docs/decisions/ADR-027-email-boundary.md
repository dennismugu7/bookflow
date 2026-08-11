# ADR-027 — The email boundary

**Status:** Accepted · **Narrows:** ADR-012

## Context

ADR-012 requires that email is dispatched through a transactional outbox and that the mail
provider is **never called inside a request transaction**. `CLAUDE.md` §5 restates that as a
non-negotiable. Neither contemplated a managed authentication service sending mail on the
project's behalf.

ADR-013 puts Supabase Auth (GoTrue) in the stack, and GoTrue sends its own email: the
activation code, the password-reset link, the email-change confirmation, the magic link. Those
sends happen inside GoTrue, in response to its own API calls, entirely outside our request
lifecycle and outside any transaction we control.

So the two rules collide, and both cannot hold. This was found by a cold-start check reading
only the standing documents — not by anyone implementing auth — and it was tracked as **K59**,
classified `F` because it decides whether the outbox exists in Phase 3 at all and because it
sits on two Do-Not-Vibe surfaces at once: auth, and the outbox transaction boundary.

The question is not "which rule wins". It is **what ADR-012's rule is actually for**, and
whether that reason applies to auth email.

## Decision

**The boundary is ownership of the record the email reports on.**

**Email reporting a change to a record Supabase Auth owns is sent by Supabase Auth.** Account
activation, password reset, email change, magic link. We configure the templates and the
sender; we do not route these through the outbox and we do not reimplement them.

**Email reporting a change to a record our own API owns is written to the ADR-012 outbox,
inside the transaction that changed it.** Booking confirmed, cancelled, reinstated, expired;
owner notifications; anything ADR-002 emails to a client about their booking.

The rule for a new email is one question: **which system owns the row that changed?**

## Rationale

The outbox exists to make a domain state change and its notification **atomic**. ADR-012's
context is explicit about the failure it prevents: a booking status change and its email are
described in the design docs as one action, and separating them naively leaves either a
provider outage able to roll back a legitimate booking change, or a dropped send leaving a
client believing a cancelled booking is still live.

**Account activation has no such split.** GoTrue owns the user record *and* the email, and it
writes both. There is no transaction of ours spanning the two, so there is no atomicity to
protect. Applying ADR-012 here would satisfy the letter of a rule whose reason is absent.

The cost of applying it anyway is not neutral. Routing auth email through our outbox means
reimplementing token generation, expiry, single-use enforcement and resend rate-limiting —
on a Do-Not-Vibe surface — in order to replace a component that already does all four and is
maintained by someone else. That is a large amount of security-critical code written for a
conformance reason rather than a functional one.

## Consequences

Stated in full, including the ones that are costs.

- **Two email paths and two template systems, deliberately.** GoTrue templates for auth mail,
  our own renderer in the worker for domain mail. **Sender identity, from-address, subject
  conventions and branding must be kept consistent across both by hand. Nothing enforces it**,
  no test covers it, and the first sign that they have diverged will be a user seeing two
  different-looking emails from the same product. Tracked as K69, classified `D`.
- **The outbox does not ship in Phase 3.** No domain email exists until the booking slice,
  because no domain record exists that anyone needs telling about. The outbox table, the worker
  process and ADR-024's second process group arrive with the first booking email, not with the
  foundation. **This resolves K60.**
- **Verification code expiry, attempt limits and resend cooldown become GoTrue configuration
  rather than code we write.** `supabase/config.toml` carries them locally and the dashboard
  carries them for hosted projects. This substantially resolves **K7** — what remains is
  narrower and is recorded in the triage: which values to set, and whether GoTrue supports the
  8-digit code the design specifies at all, since its OTP length is a configured range rather
  than an arbitrary one. That residue is `S` against the auth slice.
- **Staging uses Supabase's built-in SMTP.** It is rate-limited, shared, and Supabase documents
  it as unsuitable for production. That is acceptable for a staging environment nobody outside
  the project uses. **The trigger for replacing it with a custom SMTP provider is: before any
  real owner signs up.** Not before staging works, not before the first deploy — before a
  person who is not us receives an email from this system.
- **E1 and E2 move to that slice and no longer block Phase 3.** Choosing a provider, verifying a
  sending domain and spiking deliverability to Kenya are all prerequisites of the custom-SMTP
  cutover, not of building auth against Supabase's built-in sender. This is the single largest
  unblocking effect of this ADR: it removes a purchase, a domain registration and an empirical
  spike from Phase 3's entry conditions.
- **A GoTrue outage takes auth email with it**, and we have no retry of our own for those sends.
  Accepted: the alternative is owning that retry, which is the code this ADR declines to write.
- **ADR-012 is narrowed, not overturned.** Its rule stands unchanged for every email it was
  written about. An amendment on ADR-012 points here.

## Items resolved

**K59** (who sends the account-activation email — GoTrue or the ADR-012 outbox). It was `F`.

**K60** (whether the outbox and its worker ship in Phase 3). It was `S`. They do not.

**K7** substantially — the mechanism is now configuration rather than code. A narrowed residue
remains `S`; see the triage.

## Items created

**K69** — how sender identity, from-address and branding are kept consistent across the two
template systems, given nothing enforces it. Classified `D`.
