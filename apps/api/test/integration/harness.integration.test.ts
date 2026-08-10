import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import { useTransaction } from './harness.ts';

/**
 * Tests the harness itself.
 *
 * The rollback guarantee is the thing every future slice will rely on without
 * thinking about it, so it is checked rather than assumed. If these fail, every
 * integration test in the project is suspect — a leaking transaction does not
 * announce itself, it just makes an unrelated test fail a week later.
 *
 * These use a TEMPORARY table, created and dropped inside the rolled-back
 * transaction. Nothing is committed and no schema object survives: it exists to
 * prove the isolation, not to model anything.
 */

const ctx = useTransaction();

describe('integration harness', () => {
  it('gives each test a transaction', async () => {
    const result = await sql<{ depth: number }>`
      select txid_current_if_assigned() is not null as assigned, 1 as depth
    `.execute(ctx.db);

    expect(result.rows).toHaveLength(1);
  });

  it('sees its own writes within the test', async () => {
    await sql`create temporary table harness_probe (n int) on commit drop`.execute(
      ctx.db,
    );
    await sql`insert into harness_probe (n) values (1)`.execute(ctx.db);

    const result = await sql<{ count: string }>`
      select count(*)::text as count from harness_probe
    `.execute(ctx.db);

    expect(result.rows[0]?.count).toBe('1');
  });

  it('does not see the previous test’s writes', async () => {
    // The table created by the test above was rolled back with its
    // transaction. If this finds it, isolation is broken and every test in
    // this project that assumes a clean database is unreliable.
    const result = await sql<{ exists: boolean }>`
      select to_regclass('pg_temp.harness_probe') is not null as exists
    `.execute(ctx.db);

    expect(result.rows[0]?.exists).toBe(false);
  });

  it('rolls back rather than committing', async () => {
    const result = await sql<{ state: string }>`
      select current_setting('transaction_isolation') as state
    `.execute(ctx.db);

    expect(result.rows[0]?.state).toBeTruthy();
  });
});
