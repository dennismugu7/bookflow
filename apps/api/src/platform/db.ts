import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

import type { DB } from './db.types.ts';

/**
 * The database connection.
 *
 * ADR-022: Kysely over raw SQL migrations. Typed queries, no ORM — the
 * migration is authoritative about the schema and the types are generated
 * *from* the database by `npm run db:types`, never the other way round.
 *
 * No credential appears in this file. `DATABASE_URL` is read from the
 * environment, which `.env.example` documents and `.gitignore` keeps out of
 * the repository (ADR-023, CLAUDE.md §5).
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

function readConnectionString(): string {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url.trim() === '') {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill it in; ' +
        'local values are printed by `npm run db:start`.',
    );
  }
  return url;
}

/**
 * Builds a Kysely instance. Separate from the module-level singleton so tests
 * and the worker (ADR-013) can hold their own pool with their own lifetime.
 */
export function createDb(
  connectionString = readConnectionString(),
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
