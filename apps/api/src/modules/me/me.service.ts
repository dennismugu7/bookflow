import type { Executor } from '../../platform/db.ts';
import type { GoTrueClient } from '../../platform/gotrue.ts';
import { ProblemError } from '../../platform/problem.ts';
import {
  keyFromPublicUrl,
  StorageError,
  type StorageClient,
} from '../../platform/storage.ts';
import {
  deleteOwnedBusinessData,
  deleteProfile,
  findOwnedMedia,
  findProfileByUserId,
  updateProfile,
  type ProfileRow,
} from './me.repository.ts';

/** Business logic. All of it. */

export interface AccountLogger {
  info(context: object, message: string): void;
  warn(context: object, message: string): void;
}

export async function renameMe(
  db: Executor,
  scope: { readonly userId: string },
  input: { readonly firstName: string; readonly lastName: string },
): Promise<ProfileRow> {
  const updated = await updateProfile(db, scope, input);

  if (updated === undefined) {
    // An authenticated caller with no profile row. ADR-037 makes this
    // impossible for accounts created through mediated sign-up, so it means a
    // hand-made account or a bug — the same 404 `GET /v1/me` gives, for the
    // same reason.
    throw new ProblemError('not-found', 'no profile for this principal');
  }

  return updated;
}

export interface DeleteAccountDeps {
  readonly db: Executor;
  readonly gotrue: Pick<GoTrueClient, 'deleteUser'>;
  readonly storage: Pick<StorageClient, 'remove' | 'publicUrl'>;
  readonly log: AccountLogger;
}

/**
 * Erases the caller's account.
 *
 * ══ DO-NOT-VIBE ADJACENT: THIS IS IRREVERSIBLE AND ORDERED ══════════════════
 *
 * Four steps, and **the order is the whole design**:
 *
 *   1. the business and everything it owns, in ONE transaction
 *   2. the storage objects, best-effort
 *   3. the profile row
 *   4. the GoTrue user — LAST
 *
 * ── WHY GOTRUE IS LAST, WHICH IS THE LOAD-BEARING PART ─────────────────────
 *
 * Every step before it is reachable only by an authenticated caller, and the
 * thing that authenticates them is the GoTrue user. **Delete that first and a
 * failure anywhere after it strands an account that cannot sign in and cannot
 * be finished off** — its business, its bookings and its profile survive, owned
 * by a user id that no longer resolves, and no request the visitor can make will
 * ever reach them again. There is no path back from that state through the API.
 *
 * In this order a failure leaves the visitor still able to sign in, with an
 * account whose data is partly gone. That is bad and it is RECOVERABLE: they
 * press Delete again and the steps that already ran are no-ops — every one is
 * written to be idempotent, and `deleteUser` treats a 404 as success for
 * exactly this reason.
 *
 * **The asymmetry is the point.** One order fails into "try again", the other
 * fails into "contact support and hope".
 *
 * ── STORAGE IS BEST-EFFORT AND NEVER FAILS THE DELETION ────────────────────
 *
 * An object storage outage must not stop somebody erasing their account. The
 * cost of continuing is orphaned files — bytes that reference nothing and that
 * an operator can sweep. The cost of stopping is refusing a deletion request for
 * a reason that has nothing to do with the person asking, and that is not a
 * trade this makes.
 *
 * Each failure is logged with its key so a sweep has something to work from.
 */
export async function deleteMyAccount(
  deps: DeleteAccountDeps,
  scope: { readonly userId: string },
  reason: string | undefined,
): Promise<void> {
  const { db, gotrue, storage, log } = deps;

  // ── THE REASON IS LOGGED FIRST, AND ONLY HERE ────────────────────────────
  //
  // Before anything is destroyed, so a failure part-way through still leaves
  // the survey answer recorded — it is the one piece of this request that has
  // any value after the fact.
  //
  // `reason` is free text a person typed. It is logged because that is what it
  // is for; it is not echoed into any response and never reaches a table.
  log.info(
    { event: 'account.delete_requested', userId: scope.userId, reason },
    'account deletion requested',
  );

  // Collected BEFORE the rows go, because the objects are named by URLs those
  // rows hold. See `findOwnedMedia`.
  const media = await findOwnedMedia(db, scope);

  const businessesDeleted = await deleteOwnedBusinessData(db, scope);

  // ── AN ACCOUNT THAT OWNS NOTHING IS THE ORDINARY CASE ───────────────────
  //
  // Every owner between sign-up and onboarding is in it, and so is anyone who
  // deleted their business first. Zero rows here is not an error and must not
  // short-circuit anything: the profile and the GoTrue user still have to go.
  log.info(
    {
      event: 'account.business_data_deleted',
      userId: scope.userId,
      businesses: businessesDeleted,
      objects: media.urls.length,
    },
    businessesDeleted === 0
      ? 'account deletion: no business owned'
      : 'account deletion: business data removed',
  );

  await removeObjects(storage, log, media.urls, scope.userId);

  await deleteProfile(db, scope);

  // LAST. See the comment above — this is the step whose failure must stay
  // recoverable, and it is recoverable only because everything else is done.
  await gotrue.deleteUser(scope.userId);

  log.info(
    { event: 'account.deleted', userId: scope.userId },
    'account deletion complete',
  );
}

/**
 * Removes every object, reporting failures and continuing.
 *
 * ── THE URL IS PARSED, NOT TRUSTED ─────────────────────────────────────────
 *
 * `keyFromPublicUrl` refuses anything that does not begin with our own bucket's
 * public prefix, and this passes over what it refuses. That matters because the
 * URLs come out of the database: an externally-hosted image, a hand-edited row
 * or a future import would otherwise aim a delete at a path derived from a value
 * somebody else chose.
 *
 * An orphaned object costs storage. A wrongly-deleted one costs someone's
 * photograph, possibly not this someone's.
 */
async function removeObjects(
  storage: Pick<StorageClient, 'remove' | 'publicUrl'>,
  log: AccountLogger,
  urls: readonly string[],
  userId: string,
): Promise<void> {
  for (const url of urls) {
    const key = keyFromPublicUrl(storage as StorageClient, url);
    if (key === undefined) {
      log.warn(
        { event: 'account.object_not_ours', userId },
        'account deletion: a stored URL is not in our bucket; left alone',
      );
      continue;
    }

    try {
      await storage.remove(key);
    } catch (error) {
      if (!(error instanceof StorageError)) throw error;
      // Logged with the key, which is what a later sweep needs. Not fatal:
      // see the function comment above.
      log.warn(
        {
          event: 'account.object_orphaned',
          userId,
          key,
          failure: error.failure,
        },
        'account deletion: object not removed; continuing',
      );
    }
  }
}

/** Re-exported so the route can answer `GET` and `PATCH` from one import. */
export { findProfileByUserId };
