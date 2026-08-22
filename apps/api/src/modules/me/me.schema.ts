import { z } from 'zod';

/** The `me` contract (ADR-014, ADR-025). */

const NAME_MAX_LENGTH = 100;

/**
 * A person's name, as `auth.schema.ts` already defines it for sign-up.
 *
 * ── DUPLICATED RATHER THAN IMPORTED, AND THAT IS DELIBERATE ────────────────
 *
 * `personName` is not exported from `auth.schema.ts`, and importing it here
 * would couple the profile-edit rules to the sign-up rules permanently: the two
 * happen to agree today, and there is no reason they must. A sign-up name is
 * typed once under time pressure; an edit is a correction.
 *
 * What matters is that both TRIM before validating, so `"  "` fails `.min(1)`
 * rather than being stored as whitespace — see `businesses.schema.ts` for the
 * ordering argument at length. Reversing `.trim()` and `.min(1)` lets a
 * whitespace-only name through, in both files.
 *
 * ADR-005 keeps a TEAM MEMBER's name in one field. This is the OWNER's own
 * account, where screen #20 draws two, and `user_profiles` carries both (J2).
 */
const personName = z
  .string()
  .trim()
  .min(1)
  .max(NAME_MAX_LENGTH)
  .describe('Required. Trimmed. 1–100 characters after trimming.');

export const updateProfileRequestSchema = z
  .object({
    firstName: personName,
    lastName: personName,
  })
  .describe('The owner’s own name. Both fields are required.')
  .meta({ id: 'UpdateProfileRequest' });

const DELETE_REASON_MAX_LENGTH = 500;

/**
 * Why the account is being deleted.
 *
 * ══ IT GOES TO A LOG AND NOWHERE ELSE ═══════════════════════════════════════
 *
 * There is no `deletion_reasons` table and there deliberately is not one. A row
 * keyed to a user who is being erased is the thing the erasure was for — and a
 * row NOT keyed to them is an unattributable string that a structured log
 * already holds better.
 *
 * So it is logged, and the log is where product questions get answered from.
 * **Nothing here is a promise to retain it**; whatever retention the log has is
 * the retention this gets.
 *
 * Optional, because screen #25's four canned reasons include "Something else"
 * with a free-text field the visitor may leave empty — and because refusing a
 * deletion for want of a survey answer would be indefensible.
 */
export const deleteAccountRequestSchema = z
  .object({
    /**
     * ══ REQUIRED, AND THE TOKEN ALONE IS NOT ENOUGH ═════════════════════════
     *
     * This endpoint destroys a salon's entire booking history, irreversibly.
     * ADR-017 keeps no token denylist — "exposure is bounded at one hour by
     * design" — which is a reasonable trade for reading a diary and an
     * indefensible one for erasing it. A phone left unlocked, or a token lifted
     * from a log, would otherwise be a complete erasure with no second step.
     *
     * **Verified server-side against the session's own email**, so a client
     * cannot skip it by calling the API directly. No `.min()`: a length rule
     * here would say what the password is not, and every wrong value gets the
     * same answer regardless.
     */
    password: z
      .string()
      .describe(
        'The caller’s current password. Verified before anything is deleted.',
      ),
    reason: z
      .string()
      .trim()
      .max(DELETE_REASON_MAX_LENGTH)
      .optional()
      .describe('Free text from the exit survey. Logged, never stored.'),
  })
  .describe('Confirmation and optional feedback for an account deletion.')
  .meta({ id: 'DeleteAccountRequest' });
