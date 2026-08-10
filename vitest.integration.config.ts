import { existsSync } from 'node:fs';

import { defineConfig } from 'vitest/config';

/**
 * Integration layer. Runs against the local Supabase Postgres.
 *
 * Loads `.env` — unlike the unit config — because these tests need
 * DATABASE_URL. Node supplies `loadEnvFile`, so this costs no dependency.
 * A missing `.env` is not handled here: it surfaces as a configuration failure
 * from `config.ts` naming the variable, which is a better message than
 * anything this file could invent.
 */
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  test: {
    name: 'integration',
    include: ['apps/api/**/*.integration.test.ts'],
    exclude: ['**/node_modules/**'],
    environment: 'node',
    // Checks the connection once, and FAILS the run if it is unreachable.
    // Never skips — see apps/api/test/integration/harness.ts.
    globalSetup: ['./apps/api/test/integration/global-setup.ts'],
  },
});
