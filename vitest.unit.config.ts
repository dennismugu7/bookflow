import { defineConfig } from 'vitest/config';

/**
 * Unit layer. No database, no network.
 *
 * This is the suite `npm run check` runs, which is why it must stay hermetic:
 * `check` has to pass on a machine with nothing running, or it stops being a
 * gate people can trust before pushing. `.env` is deliberately NOT loaded here.
 */
export default defineConfig({
  test: {
    name: 'unit',
    include: ['apps/api/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
    environment: 'node',
  },
});
