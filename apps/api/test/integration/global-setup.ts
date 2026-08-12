import { sql } from 'kysely';

import { getConfig } from '../../src/platform/config.ts';
import { createDb } from '../../src/platform/db.ts';
import { adminConnectionString } from './admin-connection.ts';

/**
 * Runs once, before any integration test file is loaded.
 *
 * Its only job is to turn "a dependency is not reachable" into ONE clear
 * failure instead of the same connection error repeated by every test — and,
 * critically, into a FAILURE rather than a skip. See the long note in
 * `harness.ts`: a suite that skips when a dependency is down reports green
 * while checking nothing, which is the exact outcome this harness exists to
 * make impossible.
 *
 * TWO dependencies are checked, because two are load-bearing.
 *
 * The database was always one. **The auth surface became one with the auth
 * slice**: the route tests sign the seeded user in against real GoTrue for a
 * genuine ES256 token rather than minting one against keys they control, so an
 * unreachable Kong or GoTrue breaks them.
 *
 * That case was observed before this check existed, and it presented exactly
 * as rule 2 predicts. The connection failure landed in a `beforeAll`, and
 * vitest reported it as **"44 passed | 9 skipped"** beside the failure. The run
 * was red and nothing was missed — but the headline number said most of the
 * suite was fine, and nine tests that never ran were counted as skipped rather
 * than as unverified. One clear message before any test file loads is the
 * difference between "GoTrue is not running" and reading a stack trace to work
 * out why nine tests vanished.
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

  await checkAuthSurface();
}

/**
 * The auth surface, reached the same way the API reaches it.
 *
 * The JWKS endpoint is used deliberately: it is unauthenticated, cheap, and it
 * is the exact URL `platform/jwt.ts` derives from `SUPABASE_URL`. A check that
 * hit some other path could pass while the one thing the API needs was broken.
 */
async function checkAuthSurface(): Promise<void> {
  const config = getConfig();
  const jwksUri = `${config.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json`;

  let response: Response;
  try {
    response = await fetch(jwksUri, {
      headers: { accept: 'application/json' },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    throw new Error(
      [
        'Integration tests cannot reach the auth surface.',
        '',
        `  ${jwksUri}`,
        `  ${detail}`,
        '',
        'The route tests sign the seeded user in against real GoTrue for a',
        'genuine ES256 token (ADR-017, spike 001/C5), so this is not optional.',
        'GoTrue is only reachable through the Kong gateway — if the local stack',
        'was started with `-x kong`, this is what that looks like.',
        '',
        'Start it with `npm run db:start`, then re-run. This suite fails rather',
        'than skipping, on purpose.',
      ].join('\n'),
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new Error(
      `Auth surface answered HTTP ${String(response.status)} at ${jwksUri}. ` +
        'Expected the JWKS document. GoTrue may still be starting.',
    );
  }

  const body = (await response.json()) as { keys?: unknown[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error(
      `Auth surface published no signing keys at ${jwksUri}. Verification ` +
        'cannot succeed against an empty JWKS, so every authenticated test ' +
        'would fail with what looks like a bad token.',
    );
  }
}
