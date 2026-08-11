import { getConfig } from '../../src/platform/config.ts';

/**
 * The privileged connection string, for test infrastructure only.
 *
 * The application connects as `bookflow_api` — CRUD, no DDL, no ownership
 * (ADR-038). The test harness cannot: it creates `auth.users` rows, switches
 * roles to assert what each can see, and needs to read `pg_*` catalogues. That
 * is `postgres` work, and it is test infrastructure rather than application
 * code.
 *
 * `ADMIN_DATABASE_URL` is optional in `config.ts` because a deployed API must
 * not hold it. Here it is required, and its absence fails loudly rather than
 * falling back to `DATABASE_URL` — a silent fallback would run the whole
 * integration suite as the application role and every privileged assertion
 * would fail in a way that looks like a broken grant.
 */
export function adminConnectionString(): string {
  const url = getConfig().ADMIN_DATABASE_URL;
  if (url === undefined) {
    throw new Error(
      'ADMIN_DATABASE_URL is not set. The integration suite connects as ' +
        'postgres to create auth users and switch roles; the application role ' +
        'cannot do either. Copy .env.example to .env — local values are ' +
        'printed by `npm run db:start`.',
    );
  }
  return url;
}
