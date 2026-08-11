import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Nothing generated or installed is linted. `packages/contracts` will hold
    // generated output only (ADR-025), which is build product that happens to
    // be committed — holding it to hand-written standards produces noise
    // nobody may fix.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'packages/contracts/**',
      // Generated from the live schema by `npm run db:types` (ADR-022).
      'apps/api/src/platform/db.types.ts',
      // Scratch space the Supabase CLI writes on `start` — it contains the
      // edge-runtime's own TypeScript, which is neither ours nor in any
      // tsconfig. Already gitignored by supabase/.gitignore; ESLint does not
      // read that.
      'supabase/.temp/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['apps/api/src/**/*.ts', 'apps/api/test/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Config files at the root are plain ESM and are not part of any tsconfig.
    files: ['*.js', '*.config.js', '*.config.ts', 'scripts/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Plain Node scripts. Declared explicitly rather than pulling in the
    // `globals` package for two names.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  // Must stay last: turns off every rule Prettier owns, so formatting is
  // decided in exactly one place.
  prettier,
);
