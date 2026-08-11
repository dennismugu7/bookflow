import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import {
  APPLICATION_ROLE,
  useTransaction,
} from '../../test/integration/harness.ts';

/**
 * The application database role (ADR-038).
 *
 * The API connects as `bookflow_api` — CRUD on the application tables, no DDL,
 * no ownership, plus `BYPASSRLS` so that RLS-with-no-policies does not lock it
 * out of its own data. These assert all three.
 *
 * Note what is NOT here: role switching. The harness makes the application role
 * the ambient condition, so these tests simply run — which is the point. A test
 * that had to switch role to check the application's own privileges would be
 * testing a simulation of the API rather than the API's actual condition.
 *
 * The savepoint caveat and the `asAdmin` / `asRole` rules are documented in
 * `test/integration/harness.ts`. Read that before adding a test here that
 * expects a permission failure.
 */

const ctx = useTransaction();

const PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;

/** Every table the application schema currently contains. */
async function applicationTables(): Promise<string[]> {
  const result = await sql<{ tablename: string }>`
    select tablename from pg_tables where schemaname = 'public' order by tablename
  `.execute(ctx.db);
  return result.rows.map((row) => row.tablename);
}

describe('the harness runs as the application role', () => {
  it('is bookflow_api, not postgres', async () => {
    // The ambient condition, asserted rather than assumed. If this reports
    // `postgres`, every repository test in the suite is running with privileges
    // the API does not have, and a missing grant would pass CI.
    const result = await sql<{
      current_user: string;
    }>`select current_user`.execute(ctx.db);

    expect(result.rows[0]?.current_user).toBe(APPLICATION_ROLE);
  });

  it('restores the application role after asAdmin', async () => {
    await ctx.asAdmin(async () => {
      const inside = await sql<{ current_user: string }>`
        select current_user
      `.execute(ctx.db);
      expect(inside.rows[0]?.current_user).toBe('postgres');
    });

    const after = await sql<{
      current_user: string;
    }>`select current_user`.execute(ctx.db);
    expect(after.rows[0]?.current_user).toBe(APPLICATION_ROLE);
  });

  it('restores the application role even when asAdmin throws', async () => {
    await expect(
      ctx.asAdmin(() => Promise.reject(new Error('deliberate'))),
    ).rejects.toThrow('deliberate');

    const after = await sql<{
      current_user: string;
    }>`select current_user`.execute(ctx.db);
    expect(after.rows[0]?.current_user).toBe(APPLICATION_ROLE);
  });
});

describe('the application role has the right attributes', () => {
  it('can log in, bypasses RLS, and is not a superuser', async () => {
    const result = await sql<{
      rolcanlogin: boolean;
      rolbypassrls: boolean;
      rolsuper: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
    }>`
      select rolcanlogin, rolbypassrls, rolsuper, rolcreatedb, rolcreaterole
      from pg_roles where rolname = ${APPLICATION_ROLE}
    `.execute(ctx.db);

    const role = result.rows[0];
    expect(role, `${APPLICATION_ROLE} exists`).toBeDefined();
    expect(role!.rolcanlogin).toBe(true);
    expect(role!.rolbypassrls).toBe(true);
    expect(role!.rolsuper).toBe(false);
    expect(role!.rolcreatedb).toBe(false);
    expect(role!.rolcreaterole).toBe(false);
  });

  it('owns nothing in public', async () => {
    // Ownership would give it DDL over its own tables regardless of any grant,
    // so this is the assertion the no-DDL claim rests on.
    const result = await sql<{ count: string }>`
      select count(*)::text as count
      from pg_tables where schemaname = 'public' and tableowner = ${APPLICATION_ROLE}
    `.execute(ctx.db);

    expect(result.rows[0]?.count).toBe('0');
  });

  it('has usage but not create on the public schema', async () => {
    const result = await sql<{ usage: boolean; create: boolean }>`
      select has_schema_privilege(${APPLICATION_ROLE}, 'public', 'USAGE') as usage,
             has_schema_privilege(${APPLICATION_ROLE}, 'public', 'CREATE') as create
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
  // If this fails, the fix is a grant in the migration that added the table —
  // not an exclusion here.

  it('finds at least the three foundation tables', async () => {
    // Guards the enumeration itself: a query returning nothing would make the
    // assertion below vacuously true.
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
            ${APPLICATION_ROLE}, ${`public.${table}`}, ${privilege}
          ) as granted
        `.execute(ctx.db);

        if (result.rows[0]?.granted !== true) {
          missing.push(`${table}.${privilege}`);
        }
      }
    }

    expect(
      missing,
      `every table in public must grant all four privileges to ${APPLICATION_ROLE}; ` +
        'a table added without a grant belongs in the migration that added it',
    ).toEqual([]);
  });
});

describe('the application role can use its data', () => {
  it('reads through RLS despite there being no policies', async () => {
    await sql`insert into public.businesses (name) values ('Role Read Probe')`.execute(
      ctx.db,
    );

    const result = await sql<{ count: string }>`
      select count(*)::text as count from public.businesses
    `.execute(ctx.db);

    expect(Number(result.rows[0]?.count ?? '0')).toBeGreaterThan(0);
  });

  it('inserts, updates and deletes', async () => {
    const inserted = await sql<{ id: string }>`
      insert into public.businesses (name) values ('Role Write Probe') returning id
    `.execute(ctx.db);
    const id = inserted.rows[0]?.id;
    expect(id).toBeTruthy();

    await sql`update public.businesses set name = 'Renamed By App' where id = ${id}::uuid`.execute(
      ctx.db,
    );
    await sql`delete from public.businesses where id = ${id}::uuid`.execute(
      ctx.db,
    );

    const remaining = await sql<{ count: string }>`
      select count(*)::text as count from public.businesses where id = ${id}::uuid
    `.execute(ctx.db);

    expect(remaining.rows[0]?.count).toBe('0');
  });
});

describe('the application role cannot change the schema', () => {
  it('cannot create a table', async () => {
    await ctx.expectDenied(
      () =>
        sql.raw('create table public.should_not_exist (x int)').execute(ctx.db),
      /permission denied for schema public/i,
      'the application role cannot create tables',
    );
  });

  it('cannot alter an existing table', async () => {
    await ctx.expectDenied(
      () =>
        sql
          .raw('alter table public.businesses add column should_not_exist int')
          .execute(ctx.db),
      /must be owner of table businesses/i,
      'the application role cannot alter tables',
    );
  });

  it('cannot drop a table', async () => {
    await ctx.expectDenied(
      () => sql.raw('drop table public.memberships').execute(ctx.db),
      /must be owner of table memberships/i,
      'the application role cannot drop tables',
    );
  });

  it('cannot write auth.users — ADR-037 keeps that on GoTrue', async () => {
    await ctx.expectDenied(
      () =>
        sql
          .raw(
            "insert into auth.users (instance_id, id, aud, role, email) values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'nope@bookflow.test')",
          )
          .execute(ctx.db),
      /permission denied/i,
      'the application role holds nothing on auth',
    );
  });

  it('is still the application role after those failures', async () => {
    // The savepoint caveat, asserted. `expectDenied` restores the role; if it
    // stopped doing so, the rollback would leave `postgres` in force and every
    // later assertion in the test would be about the wrong role.
    const result = await sql<{
      current_user: string;
    }>`select current_user`.execute(ctx.db);

    expect(result.rows[0]?.current_user).toBe(APPLICATION_ROLE);
  });
});

describe('anon and authenticated still read nothing', () => {
  // ADR-013's defence in depth is unchanged by ADR-038: the application role
  // bypasses RLS, the client-facing roles do not, and both are additionally
  // revoked.
  for (const role of ['anon', 'authenticated'] as const) {
    it(`denies ${role} on every application table`, async () => {
      const tables = await applicationTables();
      expect(tables.length).toBeGreaterThan(0);

      for (const table of tables) {
        await ctx.asRole(role, () =>
          ctx.expectDenied(
            () => sql.raw(`select * from public.${table}`).execute(ctx.db),
            /permission denied/i,
            `${role} cannot read ${table}`,
          ),
        );
      }
    });
  }
});
