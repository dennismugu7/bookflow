import { sql, type Kysely } from 'kysely';
import { afterAll, afterEach, beforeEach, expect } from 'vitest';

import { createDb } from '../../src/platform/db.ts';
import type { DB } from '../../src/platform/db.types.ts';
import { adminConnectionString } from './admin-connection.ts';

/**
 * Integration test harness.
 *
 * This file is the pattern every vertical slice copies. Read it before writing
 * your first integration test; `../README.md` is the short version.
 *
 * ── Three rules, all load-bearing ───────────────────────────────────────────
 *
 * 1. EVERY TEST RUNS INSIDE A TRANSACTION THAT IS ROLLED BACK.
 *
 *    A test gets a `ControlledTransaction`, not a connection. Everything it
 *    writes is invisible to every other test and is gone when it finishes, so
 *    the suite needs no `db reset` between tests, no truncation step, no
 *    ordering discipline and no per-test fixture teardown. Tests may run in any
 *    order and still see the same database: exactly what the migrations
 *    produced, and nothing any other test did.
 *
 *    The cost, stated plainly so nobody is surprised: code under test must
 *    accept the transaction rather than reaching for its own connection. A
 *    repository that opens its own pool escapes the transaction, writes for
 *    real, and leaves rows behind — if you see stray rows after a run, that is
 *    the bug.
 *
 * 2. IF THE DATABASE IS UNREACHABLE, THIS SUITE FAILS. IT NEVER SKIPS.
 *
 *    This is deliberate, it is the whole reason the harness exists, and it must
 *    not be "fixed" later by someone tidying up a red build.
 *
 *    The tempting alternative — `describe.skipIf(!databaseIsUp)` — produces a
 *    suite that turns green on a machine with no database. Green then means
 *    "nothing ran", which is indistinguishable in CI output from "everything
 *    passed". Every integration guarantee in this project would silently stop
 *    being checked the first time a connection string went stale.
 *
 *    So: no `skipIf`, no `try/catch` that downgrades a connection failure to a
 *    warning, no `it.skip` left behind after debugging. A missing database is a
 *    failed run. Start it with `npm run db:start`. The connection is checked
 *    once, before any test file loads, in `global-setup.ts`.
 *
 * 3. THE AMBIENT ROLE IS THE APPLICATION ROLE, NOT `postgres`.
 *
 *    `ctx.db` runs as `bookflow_api` — CRUD on the application tables, no DDL,
 *    no ownership (ADR-038). That is what the API runs as, so it is what code
 *    under test must run as. If the harness ran as `postgres`, a repository
 *    reading a table nobody granted would pass CI and fail in production, which
 *    is most of what ADR-038 exists to prevent.
 *
 *    Privilege is therefore something a test asks for EXPLICITLY:
 *
 *      await ctx.asAdmin(() => insertAnAuthUser());   // needs postgres
 *      await ctx.asRole('anon', () => ...);           // needs a third role
 *
 *    Both restore the application role afterwards, including on failure. Use
 *    `asAdmin` only for fixtures the application genuinely must never be able
 *    to write — an `auth.users` row being the obvious case, since ADR-037 has
 *    the API create users through GoTrue's admin API over HTTP and the
 *    migration grants nothing on `auth`.
 *
 *    Why one connection and `SET ROLE`, rather than two connections: the
 *    transaction is what makes rollback isolation work, and a transaction
 *    belongs to one connection. Two connections means two transactions, and a
 *    fixture written on the admin one would be invisible to the application one
 *    until committed — destroying the guarantee this harness is built on.
 *
 *    So the connection is `postgres` and the effective role is `bookflow_api`.
 *    `SET ROLE` is faithful for what these tests check: afterwards
 *    `current_user` IS the application role, and every privilege and RLS
 *    decision is made against it — verified on the hosted project, where the
 *    switched role is refused DDL exactly as a directly-connected one is. What
 *    `SET ROLE` does not exercise is authentication itself; that is covered by
 *    connecting with the role's own credential, in `role.integration.test.ts`
 *    and against staging.
 *
 * ── AND THE ONE THAT CATCHES EVERYONE ───────────────────────────────────────
 *
 *    A PL/pgSQL exception handler is a SAVEPOINT, and rolling back to a
 *    savepoint REVERTS `SET LOCAL ROLE`. So does an explicit
 *    `rollback to savepoint`. A test that switches role, triggers an error and
 *    keeps asserting is therefore testing whatever role the rollback restored —
 *    silently, and usually `postgres`.
 *
 *    This was found while verifying ADR-038 against the hosted project: a probe
 *    reported that the restricted role could CREATE TABLE, which was true only
 *    because an earlier handler had already reverted it. Use `ctx.expectDenied`
 *    below, which restores the role for you, or restore it yourself.
 */

/** The role the API connects as (ADR-038). The harness's default. */
export const APPLICATION_ROLE = 'bookflow_api';

/** The privileged role. Reached only through `asAdmin`. */
const ADMIN_ROLE = 'postgres';

let shared: Kysely<DB> | undefined;

/**
 * One pool per test file. Vitest isolates files into separate workers, so this
 * module-level value is per-file rather than global.
 *
 * The pool connects with the ADMIN credential, because the harness needs to be
 * able to switch roles. The transaction handed to a test does not run as that
 * role — see rule 3.
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
   * The transaction for the current test, running as the APPLICATION role.
   * Pass this wherever a slice's code expects a database executor. Valid only
   * inside a test body — opened in `beforeEach`, rolled back in `afterEach`.
   */
  readonly db: ControlledTrx;

  /**
   * Runs `fn` as `postgres`, then restores the application role — including if
   * `fn` throws.
   *
   * For fixtures needing privileges the application must never hold. Every call
   * is a deliberate statement that this setup is outside what the API can do.
   */
  asAdmin<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Runs `fn` as an arbitrary role, then restores the application role.
   *
   * For asserting what `anon` and `authenticated` can see. Goes via `postgres`,
   * because the application role cannot `SET ROLE` to anything.
   */
  asRole<T>(role: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Runs a statement expected to fail, inside a savepoint, and restores the
   * application role afterwards.
   *
   * The restore is the point — see the savepoint warning above.
   */
  expectDenied(
    run: () => Promise<unknown>,
    pattern: RegExp,
    message: string,
  ): Promise<void>;
}

/**
 * Call once at the top level of an integration test file, then use the returned
 * context inside tests:
 *
 *   const ctx = useTransaction();
 *
 *   it('does a thing', async () => {
 *     await sql`select 1`.execute(ctx.db);
 *   });
 *
 * Do not destructure it: the transaction is replaced before every test, and a
 * destructured copy would pin the first one.
 */
export function useTransaction(): IntegrationContext {
  const context: { db: ControlledTrx | undefined } = { db: undefined };

  beforeEach(async () => {
    const trx = await sharedDb().startTransaction().execute();
    context.db = trx;
    // The restricted role is the ambient condition, established before the test
    // body runs. `set local` is scoped to this transaction and goes away with
    // the rollback.
    await sql.raw(`set local role ${APPLICATION_ROLE}`).execute(trx);
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

  function current(): ControlledTrx {
    if (context.db === undefined) {
      throw new Error(
        'No open transaction. `useTransaction()` must be called at the top ' +
          'level of the test file, and `ctx.db` used inside a test body — not ' +
          'in a top-level statement, a `beforeAll`, or after the test has ' +
          'finished.',
      );
    }
    return context.db;
  }

  async function setRole(role: string): Promise<void> {
    await sql.raw(`set local role ${role}`).execute(current());
  }

  async function asRole<T>(role: string, fn: () => Promise<T>): Promise<T> {
    await setRole(ADMIN_ROLE);
    if (role !== ADMIN_ROLE) {
      await setRole(role);
    }
    try {
      return await fn();
    } finally {
      // Restored even on failure, or the next statement runs as whatever the
      // failure left behind.
      await setRole(ADMIN_ROLE);
      await setRole(APPLICATION_ROLE);
    }
  }

  return {
    get db(): ControlledTrx {
      return current();
    },

    asAdmin<T>(fn: () => Promise<T>): Promise<T> {
      return asRole(ADMIN_ROLE, fn);
    },

    asRole,

    async expectDenied(
      run: () => Promise<unknown>,
      pattern: RegExp,
      message: string,
    ): Promise<void> {
      const db = current();
      await sql.raw('savepoint denied_probe').execute(db);
      let caught: unknown;
      try {
        await run();
      } catch (error) {
        caught = error;
      }
      await sql.raw('rollback to savepoint denied_probe').execute(db);
      // That rollback reverted SET LOCAL ROLE. Put it back.
      await sql.raw(`set local role ${APPLICATION_ROLE}`).execute(db);

      expect(caught, message).toBeInstanceOf(Error);
      expect((caught as Error).message, message).toMatch(pattern);
    },
  };
}
