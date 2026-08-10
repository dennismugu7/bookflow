import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests live beside the code they cover, inside the module that owns them
    // (CLAUDE.md §4). There are none yet — `--passWithNoTests` in the root
    // `test` script is what keeps the gate green until the first slice.
    include: ['apps/api/src/**/*.{test,spec}.ts'],
    environment: 'node',
  },
});
