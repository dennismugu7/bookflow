# ADR-030 — Authentication policy

**Status:** Accepted

## Context

`DD-Bookflow-Native.md` specifies a password field and an email verification screen without
specifying either policy. The password requirement is given as "e.g., min length, character
sets" — an example, not a decision. The verification screen shows an eight-digit code with no
expiry, no attempt limit and no resend rule.

ADR-027 moved both of these from code we write to configuration we set: GoTrue owns the user
record, issues the code and enforces the limits. What remains is which values.

Tracked as **K6** (password policy) and **K7** (verification code expiry, attempt limit, resend
cooldown, lockout).

## Decision

**Password: minimum eight characters. No composition rules.** No required uppercase, digit or
symbol. **GoTrue's leaked-password protection is enabled**, which checks candidate passwords
against the HaveIBeenPwned breach corpus at sign-up and at change.

**Verification code: six digits**, GoTrue's format. **Ten-minute expiry. Sixty-second resend
cooldown. GoTrue's built-in rate limiting** for repeated attempts, rather than a bespoke lockout.

All four are set in `supabase/config.toml` locally and in the project's auth settings for hosted
environments.

## Rationale

**On composition rules.** They reduce entropy rather than adding it. A rule requiring an
uppercase letter and a digit reliably produces `Password1` — users satisfy the checker with the
most predictable substitution available, and the resulting distribution is narrower than an
unconstrained one of the same length. NIST SP 800-63B says this plainly and recommends the
opposite pairing: a length floor plus a check against known-breached credentials. That is what
this decision adopts. Eight characters is the floor NIST names; the breach check is what
actually stops the weak passwords, because a breached password fails regardless of how well it
satisfies a composition rule.

**On six digits versus the design's eight.** GoTrue issues six. Its OTP length is a configured
range rather than an arbitrary one, so eight would mean either fighting the platform or
replacing the mechanism — the mechanism ADR-027 just decided not to own. The design document's
own author also questioned eight, at `:122`, as more error-prone to transcribe than a typical
four-to-six-digit OTP. So the platform and the document's own reservation agree, and the
argument for eight is that a screenshot shows eight boxes.

**On ten minutes and sixty seconds.** Long enough that a code survives a slow mail hop and the
user switching apps to read it; short enough that an intercepted code has a small window.
Sixty seconds on resend is the shortest cooldown that still makes automated resend-spam
unattractive without making a legitimate "it didn't arrive" retry feel broken.

## Consequences

- **The verification screen's design changes.** It shows six input boxes, not eight. This is a
  deliberate deviation from `DD-Bookflow-Native.md`, recorded in
  `docs/analysis/08-design-deviations.md` — a list this ADR starts, because none existed and
  this will not be the last one.
- **Password strength is enforced by a network call.** GoTrue's leaked-password check queries
  an external service. A sign-up can therefore fail for a reason unrelated to the user's input
  being malformed, and the copy has to say something truthful and non-alarming about it.
- **No password-strength meter is specified.** The design has none, and this ADR does not add
  one. A user who picks a breached password learns so on submit.
- **K46 is narrowed to nothing.** It asked whether a single wide input is right for an eight
  digit code and whether it is validated to exactly eight numeric characters. The code is six;
  the control question survives only as a design detail of the new six-box screen.
- **These are configuration, so they drift silently between environments** unless
  `supabase/config.toml` and the hosted projects are kept in step by hand. Local is declarative;
  hosted is dashboard state. Nothing reconciles them.

## Items resolved

**K6** (password policy). It was `S`.
**K7** (verification code expiry, attempt limit, resend cooldown, lockout). It was `S`, already
narrowed to configuration by ADR-027; this sets the values.

## Items created

None. `docs/analysis/08-design-deviations.md` is started by this ADR but is a record, not an
open question.
