import { afterAll, afterEach, beforeEach } from 'vitest';
import type { Kysely } from 'kysely';

import { createDb } from '../../src/platform/db.ts';
import { adminConnectionString } from './admin-connection.ts';
import type { DB } from '../../src/platform/db.types.ts';

/**
 * Integration test harness.
 *
 * This file is the pattern every vertical slice copies. Read it before writing
 * your first integration test; `../README.md` is the short version.
 *
 * ── Two rules, both load-bearing ─────────────────────────────────────────────
 *
 * 1. EVERY TEST RUNS INSIDE A TRANSACTION THAT IS ROLLED BACK.
 *
 *    A test gets a `ControlledTransaction`, not a connection. Everything it
 *    writes is invisible to every other test and is gone when it finishes, so
 *    the suite needs no `db reset` between tests, no truncation step, no
 *    ordering discipline and no per-test fixtures teardown. Tests may run in
 *    any order and still see the same database: exactly what the migrations
 *    produced, and nothing any other test did.
 *
 *    The cost of this, stated plainly so nobody is surprised: code under test
 *    must accept the transaction rather than reaching for its own connection.
 *    That is why `createDb` takes its connection as an argument and why
 *    repositories will take a `Kysely | Transaction` executor. A repository
 *    that opens its own pool escapes the transaction, writes for real, and
 *    leaves rows behind — if you see stray rows after a test run, that is the
 *    bug.
 *
 * 2. IF THE DATABASE IS UNREACHABLE, THIS SUITE FAILS. IT NEVER SKIPS.
 *
 *    This is deliberate, it is the whole reason the harness exists, and it
 *    must not be "fixed" later by someone tidying up a red build.
 *
 *    The tempting alternative — `describe.skipIf(!databaseIsUp)` — produces a
 *    suite that turns green on a machine with no database. Green then means
 *    "nothing ran", which is indistinguishable in CI output from "everything
 *    passed". Every integration guarantee in this project would silently stop
 *    being checked the first time a connection string went stale, and nobody
 *    would learn about it from a build.
 *
 *    So: no `skipIf`, no `try/catch` that downgrades a connection failure to a
 *    warning, no `it.skip` left behind after debugging. A missing database is
 *    a failed run. Start it with `npm run db:start`.
 *
 *    The connection is checked once, before any test file loads, in
 *    `global-setup.ts` — so the failure is one clear message rather than the
 *    same connection error repeated by every test in the suite.
 */

let shared: Kysely<DB> | undefined;

/**
 * One pool per test file. Vitest isolates files into separate workers, so this
 * module-level value is per-file rather than global — which is what we want:
 * a file's transactions all share a pool, and files cannot interfere.
 */
function sharedDb(): Kysely<DB> {
  shared ??= createDb(adminConnectionString());
  return shared;
}

/**
 * The exact type `startTransaction().execute()` resolves to, derived from
 * Kysely rather than named, so a Kysely upgrade cannot leave this quietly
 * wrong.
 */
type ControlledTrx = Awaited<
  ReturnType<ReturnType<Kysely<DB>['startTransaction']>['execute']>
>;

export interface IntegrationContext {
  /**
   * The transaction for the current test. Pass this wherever a slice's code
   * expects a database executor. Valid only inside a test body — it is opened
   * in `beforeEach` and rolled back in `afterEach`.
   */
  readonly db: ControlledTrx;
}

/**
 * Call once at the top level of an integration test file, then use the
 * returned context inside tests:
 *
 *   const ctx = useTransaction();
 *
 *   it('does a thing', async () => {
 *     await sql`select 1`.execute(ctx.db);
 *   });
 *
 * Do not destructure it (`const { db } = useTransaction()`): the transaction
 * is replaced before every test, and a destructured copy would pin the first
 * one, which is rolled back and closed by the time the second test runs.
 */
export function useTransaction(): IntegrationContext {
  const context: { db: ControlledTrx | undefined } = { db: undefined };

  beforeEach(async () => {
    context.db = await sharedDb().startTransaction().execute();
  });

  afterEach(async () => {
    const open = context.db;
    context.db = undefined;
    if (open !== undefined) {
      await open.rollback().execute();
    }
  });

  afterAll(async () => {
    const pool = shared;
    shared = undefined;
    if (pool !== undefined) {
      await pool.destroy();
    }
  });

  return {
    get db(): ControlledTrx {
      if (context.db === undefined) {
        throw new Error(
          'No open transaction. `useTransaction()` must be called at the top ' +
            'level of the test file, and `ctx.db` used inside a test body — ' +
            'not in a top-level statement, a `beforeAll`, or after the test ' +
            'has finished.',
        );
      }
      return context.db;
    },
  };
}
