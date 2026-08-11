import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import { useTransaction } from '../../test/integration/harness.ts';

/**
 * The application database role (ADR-038).
 *
 * The API connects as `bookflow_api` — CRUD on the application tables, no DDL,
 * no ownership, plus `BYPASSRLS` so that RLS-with-no-policies does not lock it
 * out of its own data. These assert all three halves of that.
 *
 * ── READ THIS BEFORE ADDING A TEST THAT EXPECTS A PERMISSION FAILURE ────────
 *
 * A PL/pgSQL exception handler is a SAVEPOINT, and rolling back to a savepoint
 * REVERTS `SET LOCAL ROLE`. The same is true of the `rollback to savepoint`
 * this file's `expectDenied` helper uses.
 *
 * So a test that switches role, triggers an error, and then keeps asserting is
 * NOT testing the role it thinks it is — it is testing `postgres`, silently,
 * and it will pass while proving the opposite of what it claims.
 *
 * This was found the hard way while verifying ADR-038 against the hosted
 * project: a probe reported that the restricted role could CREATE TABLE, which
 * was true only because the role had already been reverted by an earlier
 * handler. The rule that falls out of it:
 *
 *   **Re-establish the role after every expected failure**, or assert the
 *   privilege without switching role at all.
 *
 * `has_table_privilege` is preferred wherever it will do, precisely because it
 * answers the question from the `postgres` session without any role switching.
 */

const ctx = useTransaction();

const APP_ROLE = 'bookflow_api';
const PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;

/** Every table the application schema currently contains. */
async function applicationTables(): Promise<string[]> {
  const result = await sql<{ tablename: string }>`
    select tablename from pg_tables where schemaname = 'public' order by tablename
  `.execute(ctx.db);
  return result.rows.map((row) => row.tablename);
}

/**
 * Runs a statement expected to fail, inside a savepoint, and puts the session
 * back on `postgres` afterwards.
 *
 * The role reset is not tidiness — see the note at the top of this file. The
 * savepoint rollback reverts `SET LOCAL ROLE` as a side effect, so without an
 * explicit reset the next statement's role depends on whether the previous one
 * threw. That is how a test comes to assert something about the wrong role.
 */
async function expectDenied(
  statement: string,
  pattern: RegExp,
  message: string,
): Promise<void> {
  await sql.raw('savepoint probe').execute(ctx.db);
  let caught: unknown;
  try {
    await sql.raw(statement).execute(ctx.db);
  } catch (error) {
    caught = error;
  }
  await sql.raw('rollback to savepoint probe').execute(ctx.db);
  await sql.raw('set local role postgres').execute(ctx.db);

  expect(caught, message).toBeInstanceOf(Error);
  expect((caught as Error).message, message).toMatch(pattern);
}

describe('the application role exists with the right attributes', () => {
  it('can log in, bypasses RLS, and is not a superuser or an owner', async () => {
    const result = await sql<{
      rolcanlogin: boolean;
      rolbypassrls: boolean;
      rolsuper: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
    }>`
      select rolcanlogin, rolbypassrls, rolsuper, rolcreatedb, rolcreaterole
      from pg_roles where rolname = ${APP_ROLE}
    `.execute(ctx.db);

    const role = result.rows[0];
    expect(role, `${APP_ROLE} exists`).toBeDefined();
    expect(role!.rolcanlogin).toBe(true);
    expect(role!.rolbypassrls).toBe(true);
    expect(role!.rolsuper).toBe(false);
    expect(role!.rolcreatedb).toBe(false);
    expect(role!.rolcreaterole).toBe(false);
  });

  it('owns nothing in public', async () => {
    // Ownership is what would give it DDL over its own tables regardless of
    // any grant, so this is the assertion the no-DDL claim rests on.
    const result = await sql<{ count: string }>`
      select count(*)::text as count
      from pg_tables where schemaname = 'public' and tableowner = ${APP_ROLE}
    `.execute(ctx.db);

    expect(result.rows[0]?.count).toBe('0');
  });

  it('has usage but not create on the public schema', async () => {
    const result = await sql<{ usage: boolean; create: boolean }>`
      select has_schema_privilege(${APP_ROLE}, 'public', 'USAGE') as usage,
             has_schema_privilege(${APP_ROLE}, 'public', 'CREATE') as create
    `.execute(ctx.db);

    expect(result.rows[0]?.usage).toBe(true);
    expect(result.rows[0]?.create).toBe(false);
  });
});

describe('grants cover every application table', () => {
  // THIS IS THE ENFORCEMENT MECHANISM for ADR-038's choice of explicit grants
  // over `alter default privileges`. Explicit grants can be forgotten; this
  // enumerates what actually exists rather than what someone remembered to
  // list, so a table added by a later migration without a grant fails here
  // instead of failing a request in production.
  //
  // If this test fails, the fix is a grant in the migration that added the
  // table — not an exclusion here.

  it('finds at least the three foundation tables', async () => {
    // Guards the enumeration itself: a query that returned nothing would make
    // every assertion below vacuously true.
    const tables = await applicationTables();
    expect(tables).toEqual(
      expect.arrayContaining(['businesses', 'memberships', 'user_profiles']),
    );
  });

  it('grants select, insert, update and delete on each of them', async () => {
    const tables = await applicationTables();
    expect(tables.length).toBeGreaterThan(0);

    const missing: string[] = [];

    for (const table of tables) {
      for (const privilege of PRIVILEGES) {
        const result = await sql<{ granted: boolean }>`
          select has_table_privilege(
            ${APP_ROLE}, ${`public.${table}`}, ${privilege}
          ) as granted
        `.execute(ctx.db);

        if (result.rows[0]?.granted !== true) {
          missing.push(`${table}.${privilege}`);
        }
      }
    }

    expect(
      missing,
      `every table in public must grant all four privileges to ${APP_ROLE}; ` +
        'a table added without a grant belongs in the migration that added it',
    ).toEqual([]);
  });
});

describe('the application role can use its data', () => {
  it('reads through RLS despite there being no policies', async () => {
    await sql`insert into public.businesses (name) values ('Role Read Probe')`.execute(
      ctx.db,
    );

    await sql.raw(`set local role ${APP_ROLE}`).execute(ctx.db);
    const result = await sql<{ count: string }>`
      select count(*)::text as count from public.businesses
    `.execute(ctx.db);
    await sql.raw('set local role postgres').execute(ctx.db);

    expect(Number(result.rows[0]?.count ?? '0')).toBeGreaterThan(0);
  });

  it('inserts, updates and deletes', async () => {
    await sql.raw(`set local role ${APP_ROLE}`).execute(ctx.db);

    const inserted = await sql<{ id: string }>`
      insert into public.businesses (name) values ('Role Write Probe') returning id
    `.execute(ctx.db);
    const id = inserted.rows[0]?.id;

    await sql`update public.businesses set name = 'Renamed By App' where id = ${id}::uuid`.execute(
      ctx.db,
    );
    await sql`delete from public.businesses where id = ${id}::uuid`.execute(
      ctx.db,
    );

    const remaining = await sql<{ count: string }>`
      select count(*)::text as count from public.businesses where id = ${id}::uuid
    `.execute(ctx.db);

    await sql.raw('set local role postgres').execute(ctx.db);

    expect(id).toBeTruthy();
    expect(remaining.rows[0]?.count).toBe('0');
  });
});

describe('the application role cannot change the schema', () => {
  it('cannot create a table', async () => {
    await sql.raw(`set local role ${APP_ROLE}`).execute(ctx.db);
    await expectDenied(
      'create table public.should_not_exist (x int)',
      /permission denied for schema public/i,
      'the application role cannot create tables',
    );
  });

  it('cannot alter an existing table', async () => {
    await sql.raw(`set local role ${APP_ROLE}`).execute(ctx.db);
    await expectDenied(
      'alter table public.businesses add column should_not_exist int',
      /must be owner of table businesses/i,
      'the application role cannot alter tables',
    );
  });

  it('cannot drop a table', async () => {
    await sql.raw(`set local role ${APP_ROLE}`).execute(ctx.db);
    await expectDenied(
      'drop table public.memberships',
      /must be owner of table memberships/i,
      'the application role cannot drop tables',
    );
  });

  it('is still postgres after those failures — the savepoint caveat', async () => {
    // Proves the discipline the header note demands actually holds. If
    // `expectDenied` stopped resetting the role, this would still pass by
    // accident — the savepoint rollback reverts to postgres anyway — which is
    // exactly why the reset is explicit rather than relied upon.
    const result = await sql<{ current_user: string }>`
      select current_user
    `.execute(ctx.db);

    expect(result.rows[0]?.current_user).toBe('postgres');
  });
});

describe('anon and authenticated still read nothing', () => {
  // ADR-013's defence in depth is unchanged by ADR-038: the application role
  // bypasses RLS, the client-facing roles do not, and both are additionally
  // revoked.
  for (const role of ['anon', 'authenticated'] as const) {
    it(`denies ${role} on every application table`, async () => {
      const tables = await applicationTables();

      for (const table of tables) {
        await sql.raw(`set local role ${role}`).execute(ctx.db);
        await expectDenied(
          `select * from public.${table}`,
          /permission denied/i,
          `${role} cannot read ${table}`,
        );
      }
    });
  }
});
