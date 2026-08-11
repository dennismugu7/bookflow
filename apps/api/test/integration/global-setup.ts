import { sql } from 'kysely';

import { createDb } from '../../src/platform/db.ts';
import { adminConnectionString } from './admin-connection.ts';

/**
 * Runs once, before any integration test file is loaded.
 *
 * Its only job is to turn "the database is not reachable" into ONE clear
 * failure instead of the same connection error repeated by every test — and,
 * critically, into a FAILURE rather than a skip. See the long note in
 * `harness.ts`: a suite that skips when the database is down reports green
 * while checking nothing, which is the exact outcome this harness exists to
 * make impossible.
 *
 * Throwing here fails the run. That is the intended behaviour.
 */
export default async function setup(): Promise<void> {
  const db = createDb(adminConnectionString());

  try {
    await sql`select 1`.execute(db);
  } catch (error) {
    // The connection string is NOT included in this message. It contains a
    // password (CLAUDE.md §5). The driver's own message names the host and
    // port, which is what you need to diagnose this, and does not echo the
    // credential.
    const detail = error instanceof Error ? error.message : 'unknown error';
    throw new Error(
      [
        'Integration tests cannot reach the database.',
        '',
        `  ${detail}`,
        '',
        'Start the local stack with `npm run db:start`, then re-run.',
        'This suite fails rather than skipping, on purpose: a skipped',
        'integration suite reports green while verifying nothing.',
      ].join('\n'),
      { cause: error },
    );
  } finally {
    await db.destroy();
  }
}
