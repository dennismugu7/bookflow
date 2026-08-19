import { describe, expect, it } from 'vitest';

import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import type {
  BusinessRepository,
  BusinessRow,
} from './businesses.repository.ts';
import { createMyBusiness } from './businesses.service.ts';

/**
 * The branch that had never run — **the SERVICE, not the predicate.**
 *
 * Paired with `businesses.conflict-predicate.test.ts`. That file asks whether an
 * error IS the conflict; this one asks what `createMyBusiness` does once it is.
 *
 * ══ WHY IT COULD NOT BE REACHED BEFORE ══════════════════════════════════════
 *
 * `createMyBusiness` refuses a second business twice: a pre-check, and — for the
 * case the check cannot see — the partial unique index. The index branch fires
 * only when two creations interleave, and the integration harness gives one
 * transaction per test, so no integration test can produce it. It was reachable
 * in production and by nothing else.
 *
 * `businesses.conflict-predicate.test.ts` covers the PREDICATE — given an error, is it
 * the conflict. **This covers the SERVICE — given that error, what does it do**,
 * which is a different question and the one that was open: the predicate can be
 * right while the branch answers 500, logs at the wrong level, or writes the
 * submitted name into a log line.
 *
 * ── WHAT MAKES IT TESTABLE NOW ──────────────────────────────────────────────
 *
 * `CreateBusinessDeps.repository`, in `SignupDeps`'s shape. A fake raises the
 * error PostgreSQL raises; **the genuine `isSecondBusinessConflict` classifies
 * it**, because the predicate is imported rather than injected. A fake that
 * also decided what counts as a conflict would prove nothing.
 *
 * No database, no network: a unit test.
 */

/** The shape `pg` raises. Same fields `businesses.conflict-predicate.test.ts` uses. */
function pgError(code: string, constraint: string): Error {
  return Object.assign(
    new Error('duplicate key value violates unique constraint'),
    {
      code,
      constraint,
    },
  );
}

/**
 * Fails the insert with the given error, having found nothing in the pre-check.
 *
 * The error is typed `Error` because `pg` raises one — the code and constraint
 * ride on it as extra fields, which is the shape `isSecondBusinessConflict`
 * reads and the shape `businesses.conflict-predicate.test.ts` already asserts against.
 */
function repositoryThatFailsInsert(error: Error): BusinessRepository {
  return {
    findBusinessOwnedBy: (): Promise<BusinessRow | undefined> => {
      // The pre-check finds nothing — which is precisely the race: both callers
      // read before either writes.
      return Promise.resolve(undefined);
    },
    createBusinessForUser: (): Promise<BusinessRow | undefined> => {
      return Promise.reject(error);
    },
  };
}

/** Captures structured log calls with their level. */
function recordingLogger(): {
  readonly entries: { level: 'info' | 'warn'; context: object }[];
  readonly log: { info: (c: object) => void; warn: (c: object) => void };
} {
  const entries: { level: 'info' | 'warn'; context: object }[] = [];
  return {
    entries,
    log: {
      info: (context: object): void => {
        entries.push({ level: 'info', context });
      },
      warn: (context: object): void => {
        entries.push({ level: 'warn', context });
      },
    },
  };
}

const SCOPE = { userId: '00000000-0000-4000-8000-00000000000b' };
const SUBMITTED = 'Vera’s Second Salon';
// Never touched: the fake repository never reaches it.
const db = undefined as unknown as Executor;

describe('createMyBusiness — the constraint branch', () => {
  it('answers business-already-exists, not a 500, when the index refuses the insert', async () => {
    const recorder = recordingLogger();

    const failure = await createMyBusiness(
      {
        db,
        log: recorder.log,
        repository: repositoryThatFailsInsert(
          pgError('23505', 'uq_memberships_one_owner_per_user'),
        ),
      },
      SCOPE,
      SUBMITTED,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ProblemError);
    expect((failure as ProblemError).slug).toBe('business-already-exists');
  });

  it('logs business.conflict_constraint at WARN, and not at info', async () => {
    const recorder = recordingLogger();

    await createMyBusiness(
      {
        db,
        log: recorder.log,
        repository: repositoryThatFailsInsert(
          pgError('23505', 'uq_memberships_one_owner_per_user'),
        ),
      },
      SCOPE,
      SUBMITTED,
    ).catch(() => undefined);

    // Exactly one event, and its level is the assertion. Warn is what separates
    // "the pre-check lost a race" from "an owner tapped Create twice"; at info
    // the two are one line and the rare one stops being findable.
    expect(recorder.entries).toHaveLength(1);
    expect(recorder.entries[0]?.level).toBe('warn');
    expect(recorder.entries[0]?.context).toMatchObject({
      event: 'business.conflict_constraint',
      userId: SCOPE.userId,
    });
  });

  it('writes the submitted name into no field of the event', async () => {
    const recorder = recordingLogger();

    await createMyBusiness(
      {
        db,
        log: recorder.log,
        repository: repositoryThatFailsInsert(
          pgError('23505', 'uq_memberships_one_owner_per_user'),
        ),
      },
      SCOPE,
      SUBMITTED,
    ).catch(() => undefined);

    // The whole serialised event, not a field list: a name added to a new field
    // tomorrow would pass a per-field check and fail this one. `problem.ts`
    // argues a reflected value is how an error response becomes a probe; a log
    // line is a reflected value with a longer life.
    expect(JSON.stringify(recorder.entries)).not.toContain(SUBMITTED);
    expect(JSON.stringify(recorder.entries)).not.toContain('Salon');
  });

  it('THE NEAR-MISS — a different 23505 on the same table is NOT this branch', async () => {
    const recorder = recordingLogger();
    const wrongConstraint = pgError('23505', 'uq_memberships_user_business');

    const failure = await createMyBusiness(
      {
        db,
        log: recorder.log,
        repository: repositoryThatFailsInsert(wrongConstraint),
      },
      SCOPE,
      SUBMITTED,
    ).catch((error: unknown) => error);

    // `uq_memberships_user_business` is also 23505 and also on `memberships`,
    // and means a repeat join to the SAME business — not "you already have
    // one". The predicate has a unit test for this; what had never been checked
    // is the SERVICE's behaviour on it, which must be to rethrow untouched so
    // the error handler answers 500 rather than a wrong 409.
    expect(failure).toBe(wrongConstraint);
    expect(failure).not.toBeInstanceOf(ProblemError);

    // And it must not log the conflict event either: a warn on this path would
    // be an operator chasing a race that did not happen.
    expect(recorder.entries).toEqual([]);
  });
});
