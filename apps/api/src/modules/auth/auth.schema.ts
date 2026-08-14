import { z } from 'zod';

/**
 * The sign-up contract. One declaration, validated at runtime and emitted into
 * the OpenAPI document the Dart client is generated from (ADR-014, ADR-025).
 */

/**
 * ADR-030: minimum eight characters, NO composition rules. Not an oversight —
 * a rule demanding an uppercase and a digit reliably produces `Password1`, and
 * narrows the distribution rather than widening it.
 *
 * ── THIS CHECK IS THE ONLY ONE. MEASURED, NOT ASSUMED ───────────────────────
 *
 * ADR-030 pairs the length floor with GoTrue's leaked-password protection and
 * treats the breach check as the part that actually stops weak passwords. **On
 * this path, GoTrue enforces neither.** Probed 2026-08-14 against the local
 * stack and against `bookflow-staging`: service-role `POST /admin/users`
 * returned 200 for a seven-character password and for `password123`, which is
 * in the breach corpus millions of times over.
 *
 * ADR-037 requires the admin API — it is the only way to create a user while
 * open sign-up is disabled — and the admin API applies no password policy. So
 * `supabase/config.toml`'s `minimum_password_length` does not back this up, and
 * this line is the whole floor for every account the product creates.
 *
 * That is a conflict between two accepted ADRs, and it is raised rather than
 * quietly patched here: implementing a breach check in our own code would be
 * writing the security-critical code ADR-027 deliberately declined to own.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt — which is what GoTrue hashes with — silently truncates at 72 BYTES.
 * Without a ceiling, two different long passwords can hash identically and the
 * user is never told. Rejecting is honest; truncating is not.
 *
 * Bytes, not characters: `.max()` on a Zod string counts UTF-16 code units, so
 * this is checked as an encoded length below.
 */
export const PASSWORD_MAX_BYTES = 72;

/** Mirrors `ck_user_profiles_*_name_present` in the foundation migration. */
const NAME_MAX_LENGTH = 100;

const personName = z
  .string()
  .trim()
  .min(1)
  .max(NAME_MAX_LENGTH)
  .describe('Required. Trimmed. Rejected above 100 characters.');

export const signupRequestSchema = z
  .object({
    email: z.email().describe('Where the activation email is sent.'),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH)
      .refine(
        (value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
        { message: `must be at most ${String(PASSWORD_MAX_BYTES)} bytes` },
      )
      .describe(
        'At least 8 characters (ADR-030). No composition rules. May still be refused if it appears in a known breach corpus.',
      ),
    // ADR-005 (J2): the OWNER's own account carries first and last name
    // separately — screen #20 has two fields. The one-field rule in that ADR is
    // about TEAM MEMBERS, who are content records, and does not apply here.
    firstName: personName,
    lastName: personName,
  })
  .describe('Everything needed to create an owner account.')
  .meta({ id: 'SignupRequest' });

export type SignupRequest = z.infer<typeof signupRequestSchema>;

/**
 * The response. Carries NO session, NO token, and NO user id.
 *
 * No session because there is nothing to hand out: the account is created
 * unconfirmed and an unconfirmed user cannot log in (spike 002 L3). Returning a
 * token here would mean either confirming the address nobody confirmed, or
 * issuing a credential that every subsequent call rejects.
 *
 * No id and no echo of the email, because this exact body is also returned when
 * the address ALREADY has an account — see `auth.service.ts`. A response that
 * varied by outcome would be an account-existence oracle, and the point is that
 * it cannot be.
 */
export const signupAcceptedSchema = z
  .object({
    status: z
      .literal('confirmation_required')
      .describe(
        'The request was accepted. If the address could be registered, an activation email has been sent to it.',
      ),
  })
  .describe('Sign-up accepted; the address must be confirmed before login.')
  .meta({ id: 'SignupAccepted' });

/** The single response body, built once so success and duplicate cannot drift. */
export const SIGNUP_ACCEPTED = Object.freeze({
  status: 'confirmation_required' as const,
});
