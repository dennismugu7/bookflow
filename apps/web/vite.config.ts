import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite, with as little configuration as the app can get away with.
 *
 * ── `test` LIVES HERE RATHER THAN IN A vitest.config.ts ────────────────────
 *
 * The root already has two Vitest configs (`vitest.unit.config.ts` and
 * `vitest.integration.config.ts`) that glob over `apps/api`. A third at the root
 * would have to be kept out of the other two's way; a second config file in this
 * directory would duplicate the plugin list. Vite reads `test` from its own
 * config, so this is one file and one source of truth.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    // Named so the Render blueprint's `staticPublishPath` has something stable
    // to point at, rather than inheriting a default that could change.
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    // No jsdom, and no component tests. The suite here covers the two pieces of
    // pure logic that are worth driving — the step sequence and the open/closed
    // computation — and neither touches the DOM. Adding jsdom would be a
    // dependency and a config surface bought for tests nobody asked for.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
