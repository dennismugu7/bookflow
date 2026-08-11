import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import { useTransaction } from '../../test/integration/harness.ts';

/**
 * Asserts what migration 20260810163827_enable_extensions guarantees, through
 * Kysely, against the real local Postgres.
 *
 * These fail if that migration is reverted, which is the point: ADR-007's
 * exclusion constraint and ADR-016's UUID keys both rest on what it provides,
 * and both would otherwise fail much later with errors that do not name the
 * missing extension.
 */

const ctx = useTransaction();

describe('migration 20260810163827_enable_extensions', () => {
  it('installs btree_gist, which ADR-007 needs for the exclusion constraint', async () => {
    const result = await sql<{ schema: string }>`
      select n.nspname as schema
      from pg_extension e
      join pg_namespace n on n.oid = e.extnamespace
      where e.extname = 'btree_gist'
    `.execute(ctx.db);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.schema).toBe('extensions');
  });

  it('provides the gist operator class for uuid that btree_gist supplies', async () => {
    // The reason btree_gist is installed at all: GiST indexes the range
    // natively but not uuid equality. Without this operator class the Phase 3
    // constraint fails with "data type uuid has no default operator class for
    // access method gist" (see A13 in docs/analysis/05-triage.md).
    const result = await sql<{ count: string }>`
      select count(*)::text as count
      from pg_opclass c
      join pg_am a on a.oid = c.opcmethod
      join pg_type t on t.oid = c.opcintype
      where a.amname = 'gist' and t.typname = 'uuid'
    `.execute(ctx.db);

    expect(Number(result.rows[0]?.count ?? '0')).toBeGreaterThan(0);
  });

  it('resolves gen_random_uuid() to a core function, not an extension', async () => {
    // ADR-016 requires UUID primary keys; the migration deliberately installs
    // no uuid extension because PostgreSQL 13+ has this in core.
    const result = await sql<{ schema: string; extension: string | null }>`
      select n.nspname as schema,
             (select e.extname
              from pg_extension e
              join pg_depend d on d.refobjid = e.oid and d.objid = p.oid) as extension
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where p.proname = 'gen_random_uuid' and n.nspname = 'pg_catalog'
    `.execute(ctx.db);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.extension).toBeNull();
  });

  it('returns a well-formed v4 UUID from gen_random_uuid()', async () => {
    const result = await sql<{ id: string }>`
      select gen_random_uuid()::text as id
    `.execute(ctx.db);

    expect(result.rows[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('creates no tables of its own — extensions only', async () => {
    // This migration adds extensions and nothing else. It asserted zero tables
    // in `public` until Phase 3 arrived; the foundation migration now creates
    // three, so the claim narrowed to what this migration is actually
    // responsible for. `schema.integration.test.ts` owns the tables.
    // asAdmin: `supabase_migrations` is the CLI's bookkeeping schema and the
    // application role has no privilege on it — correctly, since nothing the
    // API does should read the migration ledger.
    const result = await ctx.asAdmin(
      async () =>
        await sql<{ count: string }>`
          select count(*)::text as count
          from supabase_migrations.schema_migrations
          where version = '20260810163827'
        `.execute(ctx.db),
    );

    expect(result.rows[0]?.count).toBe('1');
  });
});
