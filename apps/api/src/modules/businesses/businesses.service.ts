import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import {
  type BusinessRow,
  type BusinessScope,
  businessExistsUnscoped,
  createBusinessForUser,
  findBusinessOwnedBy,
  isSecondBusinessConflict,
  renameBusinessForUser,
} from './businesses.repository.ts';

/**
 * Business logic. All of it (`CLAUDE.md` §4).
 *
 * ── PASS-THROUGH, DELIBERATELY, AND ONLY FOR NOW ────────────────────────────
 *
 * There is no rule to apply to "which business is mine". The feature manual's
 * Phase 3 permits exactly this for a vertical slice — "for the slice, it can
 * just pass data through" — and the layer exists now rather than later because
 * the next two things this module gains are not pass-throughs: creation has to
 * refuse a second business (decision 8), and both creation and rename have to
 * hold a transaction the route must not know about.
 *
 * Adding the layer when it first has a rule would mean moving the route's call
 * site at the same moment the rule arrives, which is the diff where mistakes
 * hide. It is one indirection now against that.
 *
 * The executor is a parameter, never a module-level pool (`CLAUDE.md` §5): a
 * function that opens its own connection escapes the test transaction and
 * writes for real.
 */

/** Structural; `FastifyBaseLogger` satisfies it without this module knowing. */
export interface BusinessLogger {
  info(context: object, message: string): void;
  warn(context: object, message: string): void;
}

/**
 * ── WHAT THIS MODULE LOGS, AND WHAT IT DELIBERATELY DOES NOT ────────────────
 *
 * `platform/problem.ts` already logs every `ProblemError` at info with its slug
 * and its message, so a 409 and a 404 are not invisible today. What that line
 * cannot carry is a **stable event key**, the **principal**, and — for the 404
 * — the one fact the response is designed to withhold. These events add exactly
 * that and nothing else.
 *
 * **The no-echo rule applies to what we write down, not only to what we send.**
 * `problem.ts` argues that a reflected value is how an error response becomes a
 * probe; a log line is a reflected value with a longer life and a wider
 * audience. **So no submitted name appears in any event here** — not the
 * rejected one, not the conflicting one, not truncated, not hashed. The `userId`
 * and the `businessId` the caller already supplied are enough to answer every
 * operational question these events exist for.
 */

/**
 * The caller's business, or `undefined` if they have not created one.
 *
 * `undefined` is an ordinary answer, not a refusal — see the repository. The
 * route turns it into a 404 and the Flutter repository turns that back into
 * "no business yet"; neither treats it as an error.
 */
export async function getMyBusiness(
  db: Executor,
  scope: { readonly userId: string },
): Promise<BusinessRow | undefined> {
  return await findBusinessOwnedBy(db, scope);
}

/**
 * Creates the caller's business.
 *
 * ── TWO LAYERS OF DEFENCE, AND THE SECOND IS THE REAL ONE ───────────────────
 *
 * Decision 8 refuses a second business with a conflict. This checks first —
 * which gives the ordinary caller a clean 409 without provoking a database
 * error — and then **relies on the index** for the case the check cannot see:
 * two requests that both read before either writes.
 *
 * **The pre-check is a courtesy; `uq_memberships_one_owner_per_user` is the
 * guarantee.** If the check were removed the behaviour would be identical, only
 * noisier. If the index were removed the check would be a race, and criterion 22
 * would silently stop holding. That ordering matters when someone later
 * wonders which to keep.
 *
 * Throws `ProblemError('business-already-exists')` either way, so the route does
 * not have to know which layer caught it.
 */
export async function createMyBusiness(
  db: Executor,
  log: BusinessLogger,
  scope: { readonly userId: string },
  name: string,
): Promise<BusinessRow> {
  const existing = await findBusinessOwnedBy(db, scope);
  if (existing !== undefined) {
    // INFO: an ordinary refusal, not a fault. A returning owner who reinstalls,
    // or a double-tapped button. `signup.password_breached` is the precedent —
    // an expected rejection, logged because the rate is worth knowing.
    log.info(
      { event: 'business.conflict_precheck', userId: scope.userId },
      'create business: account already has one; refused by the pre-check',
    );
    throw new ProblemError(
      'business-already-exists',
      'this account already has a business',
    );
  }

  let created: BusinessRow | undefined;
  try {
    created = await createBusinessForUser(db, scope.userId, name);
  } catch (error) {
    if (isSecondBusinessConflict(error)) {
      // WARN, and deliberately a level above the branch it mirrors.
      //
      // Reaching here means the pre-check LOST A RACE: two creations for one
      // account overlapped, both read no business, and the partial unique index
      // stopped the second. The caller sees the identical 409 either way, so
      // this event is the ONLY signal that the index is doing work the
      // application layer could not — and until now it was indistinguishable
      // from the ordinary refusal above.
      //
      // It is warn rather than info because it should be rare. A steady rate
      // here is a client double-submitting, which is a bug somewhere upstream
      // and is exactly the "worth finding out from data" case
      // `signup.breach_check_unavailable` set the precedent for.
      log.warn(
        { event: 'business.conflict_constraint', userId: scope.userId },
        'create business: pre-check lost a race; refused by the unique index',
      );
      throw new ProblemError(
        'business-already-exists',
        'this account already has a business (constraint)',
      );
    }
    throw error;
  }

  if (created === undefined) {
    // A statement that inserted and returned nothing. The contract says this
    // cannot happen; failing is right, because the alternative is answering 201
    // with no business.
    throw new Error('business insert returned no row');
  }

  return created;
}

/**
 * Renames a business the caller is a member of.
 *
 * `undefined` means the business is not theirs or does not exist — the two are
 * not distinguished here, and the route must not distinguish them either.
 *
 * `name` is already trimmed by the route's schema (decision 9). This layer does
 * not re-trim: two places applying the same rule is two places for it to drift.
 */
export async function renameMyBusiness(
  db: Executor,
  scope: BusinessScope,
  name: string,
): Promise<BusinessRow | undefined> {
  return await renameBusinessForUser(db, scope, name);
}

/**
 * Records WHICH kind of scoped miss just happened, for the operator only.
 *
 * ── THE RESPONSE STAYS BYTE-IDENTICAL; THE LOG DOES NOT ─────────────────────
 *
 * `GET /v1/businesses/{id}` and `PATCH` both answer 404 for "does not exist"
 * and "not yours", and that identity is a security property (ADR-016's ids are
 * UUIDs so they cannot be enumerated; a distinguishing status would hand that
 * back). **Nothing here changes it** — this runs after the decision to refuse
 * and returns nothing to the route.
 *
 * **Why the distinction is worth having somewhere.** The two mean opposite
 * things operationally. `no-such-business` at any volume is a client holding
 * stale ids, or someone walking the id space. `not-yours` means a real business
 * id reached a caller who is not its member — which, in a one-membership-per-
 * account product where the client only ever learns its own id, should be
 * approximately never.
 *
 * Both are INFO. Neither is a fault: a refusal that worked is the system doing
 * its job, and `problem.ts` already logs the refusal itself at info. Raising
 * `not-yours` to warn was considered and rejected — one owner mistyping a URL
 * would page somebody, and the volume, not the single event, is what carries
 * the signal. **The event key is what makes that volume queryable**, which is
 * the whole reason for the stable `event` field.
 */
export async function logScopedMiss(
  db: Executor,
  log: BusinessLogger,
  scope: BusinessScope,
): Promise<void> {
  const exists = await businessExistsUnscoped(db, scope.businessId);

  log.info(
    {
      event: 'business.scoped_miss',
      outcome: exists ? 'not-yours' : 'no-such-business',
      userId: scope.userId,
      // The caller supplied this id, so echoing it into OUR log tells them
      // nothing they did not already know. The no-echo rule is about what
      // travels back to them, and nothing here does.
      businessId: scope.businessId,
    },
    'scoped read missed: refusing with the same 404 either way',
  );
}
