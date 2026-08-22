import type { Executor } from '../../platform/db.ts';
import { GoTrueError, type GoTrueClient } from '../../platform/gotrue.ts';
import { ProblemError } from '../../platform/problem.ts';
import type { BreachChecker } from '../../platform/pwned.ts';
import { deleteProfile, insertProfile } from './auth.repository.ts';
import { type SignupRequest } from './auth.schema.ts';

/**
 * Mediated account creation. ALL of the business logic lives here (CLAUDE.md
 * §4); the route knows HTTP and the repository knows the table.
 *
 * ══ DO-NOT-VIBE ═════════════════════════════════════════════════════════════
 * This file is auth AND the compensation boundary. `CLAUDE.md` §6: written
 * deliberately, reviewed line by line, never accepted from a generated diff on
 * faith. It is presented unreviewed.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ── THE MECHANISM (ADR-037, as amended 2026-08-14) ──────────────────────────
 *
 *   1. GoTrue `POST /admin/users`      — creates the user, SILENTLY
 *   2. insert `user_profiles`          — with a SERVER-supplied terms version
 *   3. GoTrue `POST /resend`           — GoTrue sends its own activation email
 *
 * The ADR originally described one call doing steps 1 and 3 together. It does
 * not exist: the admin path sends nothing (spike 002 L2). The amendment records
 * the correction and this file implements the corrected mechanism.
 *
 * ── WHY THE PROFILE INSERT SITS IN THE MIDDLE ───────────────────────────────
 *
 * Because it is the step most likely to fail, and it is the only one whose
 * failure can be undone invisibly. Ordering it before the email means a failed
 * profile insert compensates BEFORE any mail has gone out, so the user never
 * sees an activation link for an account that was rolled back. Under the ADR's
 * original one-call mechanism the mail was already sent by the time the profile
 * insert ran, and there was no way back from that.
 *
 * ── WHAT IS NOT ATOMIC, STATED PLAINLY ──────────────────────────────────────
 *
 * Steps 1 and 3 are HTTP calls to another system; step 2 is a database write.
 * No transaction spans them and none can. Compensation is therefore best
 * effort, and the residual failure is real — see `compensate` below, which does
 * not pretend otherwise.
 */

/**
 * The terms version recorded against every account created here.
 *
 * **Server-supplied, and that is the entire point of ADR-037.** A client-
 * supplied version — which is what a trigger reading `raw_user_meta_data` would
 * have persisted — is a consent record the subject controls, which is not a
 * consent record. It is a constant rather than a request field so that no route
 * change can turn it into one by accident.
 *
 * The value points at nothing yet: the Terms and Privacy documents do not exist
 * (ADR-031, K70, classified `D`). It is honest about that rather than claiming
 * a version number that implies a published document.
 */
export const CURRENT_TERMS_VERSION = 'unpublished-v0';

/** Structural; `FastifyBaseLogger` satisfies it without this module knowing. */
export interface SignupLogger {
  info(context: object, message: string): void;
  warn(context: object, message: string): void;
  error(context: object, message: string): void;
}

export interface SignupDeps {
  readonly gotrue: GoTrueClient;
  readonly db: Executor;
  readonly log: SignupLogger;
  /**
   * ADR-030's breach check. NOT optional: GoTrue does not perform it on this
   * path (see `platform/pwned.ts`), so a caller that forgot to pass one would
   * silently be running with no password policy beyond the length floor.
   */
  readonly breachChecker: BreachChecker;
  readonly termsVersion?: string;
}

/**
 * Creates an owner account, or answers as though it did.
 *
 * Resolves when the activation email has been dispatched by GoTrue. Throws a
 * `ProblemError` for everything else, having first undone whatever it managed
 * to create.
 */
export async function signUp(
  deps: SignupDeps,
  request: SignupRequest,
): Promise<void> {
  const termsVersion = deps.termsVersion ?? CURRENT_TERMS_VERSION;

  // ── Step 0: the breach check (ADR-030) ────────────────────────────────────
  //
  // BEFORE the account exists, so a rejected password creates nothing and there
  // is nothing to compensate. That ordering is also what makes the test
  // "rejected before any account exists" checkable as a table count.
  //
  // ── FAIL OPEN, DELIBERATELY ─────────────────────────────────────────────
  //
  // If the corpus cannot be consulted, sign-up CONTINUES. This is a decision,
  // not an oversight, and it is the same trade every implementation of this
  // check has to make:
  //
  //   • Failing closed hands a third party the ability to stop all new owner
  //     accounts by being down. haveibeenpwned is free, unauthenticated and
  //     owes us nothing.
  //   • What is lost by failing open is bounded: during an outage, sign-ups
  //     revert to the eight-character floor — which is the policy this project
  //     had five minutes before this code existed, and which every account
  //     created up to now was held to.
  //
  // The loss is bounded and temporary; the alternative failure is total and
  // caused by someone else. So it fails open, and it says so out loud in the
  // log with a stable event name so the frequency is countable rather than
  // guessed at.
  const verdict = await deps.breachChecker.check(request.password);

  if (verdict === 'breached') {
    deps.log.info(
      { event: 'signup.password_breached' },
      'signup: password appears in the breach corpus; refused before creation',
    );
    throw new ProblemError(
      'password-rejected',
      'password found in the breach corpus',
    );
  }

  if (verdict === 'unavailable') {
    deps.log.warn(
      {
        // Stable and greppable. If this is common, the check is not the control
        // ADR-030 believes it is, and that is worth finding out from data.
        event: 'signup.breach_check_unavailable',
      },
      'signup: breach corpus unreachable; proceeding on the length floor alone',
    );
  }

  // ── Step 1 ────────────────────────────────────────────────────────────────
  let userId: string;
  try {
    const created = await deps.gotrue.createUser({
      email: request.email,
      password: request.password,
    });
    userId = created.id;
  } catch (error) {
    if (error instanceof GoTrueError && error.failure === 'email-exists') {
      // ── THE DUPLICATE DECISION ──────────────────────────────────────────
      // Returns, rather than throwing: the caller gets the SAME 202 and the
      // SAME body as a real sign-up, and nothing was created. See the note on
      // `creationProblem` for why this is a security property and not copy.
      deps.log.info(
        // Slugged like every other security event. This one is the ONLY record
        // that a duplicate-address probe happened at all — the response is
        // byte-identical to a real sign-up on purpose, so the log is the only
        // place the difference exists.
        { event: 'signup.duplicate_address', providerCode: error.providerCode },
        'signup: address already registered; answering exactly as success',
      );
      return;
    }
    throw creationProblem(error);
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────
  try {
    await insertProfile(deps.db, {
      userId,
      firstName: request.firstName,
      lastName: request.lastName,
      termsVersion,
    });
  } catch (error) {
    deps.log.warn(
      { event: 'signup.profile_insert_failed', userId, err: error },
      'signup: profile insert failed; compensating before any mail is sent',
    );
    await compensate(deps, userId, 'profile-insert-failed');
    // Deliberately opaque to the caller. The profile insert failing is our
    // fault, not theirs, and nothing about the schema belongs in a response.
    throw new ProblemError(
      'internal-error',
      'profile insert failed during sign-up',
    );
  }

  // ── Step 3 ────────────────────────────────────────────────────────────────
  try {
    await deps.gotrue.sendSignupConfirmation(request.email);
  } catch (error) {
    // ── "CREATED BUT UNEMAILABLE" ─────────────────────────────────────────
    //
    // Reachable, not theoretical. The admin API does not validate address
    // deliverability and the public endpoints do (spike 002 S2, observed on
    // staging), so step 1 can succeed for an address step 3 refuses. The
    // account exists, can never be confirmed, and can therefore never be used
    // — so it must not be left behind.
    deps.log.warn(
      { event: 'signup.confirmation_send_failed', userId, err: error },
      'signup: confirmation send failed; compensating',
    );
    await compensate(deps, userId, 'confirmation-send-failed');
    throw sendProblem(error);
  }

  // The happy path, slugged too. An account being created is the event every
  // other signup event is measured against — without it, a spike in
  // `signup.duplicate_address` cannot be told from a spike in traffic.
  deps.log.info(
    { event: 'signup.created', userId },
    'signup: account created, confirmation dispatched',
  );
}

/**
 * Undoes step 1, and step 2 if it happened.
 *
 * The profile is removed FIRST and explicitly. `user_profiles` cascades from
 * `auth.users` (ADR-036), so deleting the user alone would also clear it — but
 * a compensation on a Do-Not-Vibe surface should not depend on a cascade
 * declared in a different file for its correctness. The cascade stays as the
 * second line, not the first.
 *
 * ── WHEN THIS ITSELF FAILS ──────────────────────────────────────────────────
 *
 * An orphaned `auth.users` row survives: an account with no profile, which can
 * never log in (it is unconfirmed and, if step 3 never ran, was never sent a
 * confirmation). It is inert, not dangerous — but it is real, and it holds the
 * address, so a later legitimate sign-up for that address gets the duplicate
 * path and a confirmation email that never arrives.
 *
 * **NOTHING RECONCILES IT. This is an accepted risk with a named trigger**, per
 * ADR-037's own Consequences: a reconciliation sweep belongs with the outbox
 * worker, which ADR-027 defers to the booking slice. The trigger for building
 * it is whichever comes first —
 *
 *   • the outbox worker shipping (booking slice), which is where a periodic
 *     sweep has somewhere to live; or
 *   • before the first real owner signs up, because until then every orphan is
 *     ours and can be deleted by hand.
 *
 * Until then it is logged at ERROR with a stable `event` field so it can be
 * found by search rather than by memory. That is the whole mitigation, and it
 * is deliberately not dressed up as more than that.
 */
async function compensate(
  deps: SignupDeps,
  userId: string,
  cause: 'profile-insert-failed' | 'confirmation-send-failed',
): Promise<void> {
  try {
    await deleteProfile(deps.db, userId);
  } catch (error) {
    // Non-fatal on its own: the cascade below will take it. Worth a line,
    // because if this is failing the database is in a state worth knowing about.
    deps.log.warn(
      { event: 'signup.compensation_partial', userId, cause, err: error },
      'signup: compensating profile delete failed; relying on the cascade',
    );
  }

  try {
    await deps.gotrue.deleteUser(userId);
  } catch (error) {
    deps.log.error(
      {
        // Stable, greppable, and the reason this branch is not a silent catch.
        event: 'signup.orphaned_auth_user',
        userId,
        cause,
        err: error,
        remediation:
          'delete this auth.users row by hand; nothing reconciles it automatically',
      },
      'signup: COMPENSATING DELETE FAILED — an orphaned auth user survives',
    );
  }
}

/**
 * Maps a step-1 failure onto a response.
 *
 * ── THE DUPLICATE DECISION ──────────────────────────────────────────────────
 *
 * **An address that already has an account is answered EXACTLY as success**:
 * same status, same body, nothing created. Decided here, in the module, because
 * it is a security property of this endpoint rather than a phrasing preference.
 *
 * A distinct "that address is taken" reply turns an unauthenticated, public
 * endpoint into an account-existence oracle: submit an address, read the
 * difference, learn whether that person has an account. This project already
 * made the identical call one layer over, where "not yours" and "does not
 * exist" are byte-identical 404s (`businesses.routes.ts`) — the reasoning is
 * the same and so is the answer.
 *
 * The cost is real and is accepted: someone who forgot they had an account
 * receives no email and is told a confirmation has been sent if the address
 * could be registered. **Password recovery is the path for that person**, which
 * is the standard resolution and is why the response copy points at the
 * condition rather than asserting a send.
 *
 * Note what is NOT leaked as a side effect: no mail is sent on this path, so
 * the timing difference is a fast success rather than a distinguishable error.
 */
function creationProblem(error: unknown): ProblemError {
  if (!(error instanceof GoTrueError)) {
    return new ProblemError('internal-error', 'unexpected sign-up failure');
  }

  switch (error.failure) {
    case 'email-exists':
      // Unreachable: `signUp` returns on this failure before calling here. Kept
      // total so that adding a failure slug cannot silently fall through to a
      // 503, and so this branch is a loud bug rather than a wrong answer.
      return new ProblemError(
        'internal-error',
        'email-exists reached the error mapper; the duplicate path is broken',
      );

    case 'password-rejected':
      // ADR-030's consequence, arriving: the breach check is a network call, so
      // a sign-up can fail for a reason unrelated to the input being malformed.
      return new ProblemError(
        'password-rejected',
        `auth provider refused the password (${error.providerCode ?? 'no code'})`,
      );

    case 'invalid-email':
      return new ProblemError(
        'validation-failed',
        `auth provider refused the address (${error.providerCode ?? 'no code'})`,
      );

    case 'rate-limited':
      return new ProblemError('rate-limited', error.message);

    case 'unavailable':
    case 'rejected':
    default:
      return new ProblemError('auth-unavailable', error.message);
  }
}

/** Maps a step-3 failure. Compensation has already run by the time this runs. */
function sendProblem(error: unknown): ProblemError {
  if (!(error instanceof GoTrueError)) {
    return new ProblemError(
      'internal-error',
      'unexpected confirmation failure',
    );
  }

  switch (error.failure) {
    case 'invalid-email':
      // The honest answer: that address cannot receive the activation email, so
      // no account can exist for it. A 4xx, because retrying with the same
      // address will fail identically.
      return new ProblemError(
        'validation-failed',
        `address accepted by the admin API and refused by the mailer (${
          error.providerCode ?? 'no code'
        })`,
      );
    case 'rate-limited':
      return new ProblemError('rate-limited', error.message);
    default:
      return new ProblemError('auth-unavailable', error.message);
  }
}
