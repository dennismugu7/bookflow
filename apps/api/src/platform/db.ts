import { Kysely, PostgresDialect, type Transaction } from 'kysely';
import pg from 'pg';

import { getConfig } from './config.ts';
import type { DB } from './db.types.ts';

/**
 * The database connection.
 *
 * ADR-022: Kysely over raw SQL migrations. Typed queries, no ORM — the
 * migration is authoritative about the schema and the types are generated
 * *from* the database by `npm run db:types`, never the other way round.
 *
 * No credential appears in this file. `DATABASE_URL` reaches it through
 * `config.ts`, which validates it and never echoes a value; `.env.example`
 * documents it and `.gitignore` keeps `.env` out of the repository (ADR-023,
 * CLAUDE.md §5).
 */

/**
 * `bigint` (OID 20) arrives from `pg` as a string by default, because not
 * every 64-bit value survives a JS number. ADR-009 stores money as bigint
 * minor units and ADR-016 requires the safe-integer assertion at the
 * *serialisation* boundary — which only works if the value reaches the
 * application intact. Parsing to Number here would lose above 2⁵³ silently,
 * exactly the drift spike 001/C2 measured. So: leave it a string, and let the
 * serialisation boundary convert and assert.
 *
 * Set explicitly rather than relied upon, because it is a global on the driver
 * and a default someone could change without noticing what depends on it.
 */
pg.types.setTypeParser(
  pg.types.builtins.INT8,
  (value: string): string => value,
);

/**
 * Builds a Kysely instance. Takes the connection string as an argument, with
 * the validated configuration as the default, so tests and the worker
 * (ADR-013) can hold their own pool with their own lifetime.
 *
 * The default is `DATABASE_URL`, which is the APPLICATION role's connection —
 * `bookflow_api`, with CRUD and no DDL (ADR-038). Nothing in the application
 * passes anything else.
 */
export function createDb(
  connectionString: string = getConfig().DATABASE_URL,
): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString,
        // Small and explicit. The API and the worker are two processes from
        // one image (ADR-024), so the pool size is per-process, not per-app.
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      }),
    }),
  });
}

export type Database = Kysely<DB>;

/**
 * What a repository accepts.
 *
 * A `Kysely` or a `Transaction`, so the same repository works in a request and
 * inside the test harness's rolled-back transaction. Repositories take this as
 * a parameter and never reach for a connection of their own — a repository that
 * opens its own pool escapes the caller's transaction and writes for real
 * (`CLAUDE.md` §5).
 */
export type Executor = Kysely<DB> | Transaction<DB>;
