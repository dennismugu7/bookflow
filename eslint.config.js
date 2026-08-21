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
    // ── THE WEB APP, WITH THE SAME TYPE-AWARE RULES ─────────────────────────
    //
    // `projectService` resolves each file to whichever tsconfig includes it, so
    // `apps/web/tsconfig.json` supplies the program here exactly as the API's
    // does there. Listed separately rather than widening the block above
    // because the globs differ — this project has `.tsx`.
    files: ['apps/web/src/**/*.{ts,tsx}', 'apps/web/vite.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        // The browser globals this app actually uses. Declared explicitly for
        // the reason the scripts block below gives: naming the handful in use
        // beats pulling in `globals` for a list nobody reads, and an
        // undeclared global is a typo the linter should catch.
        document: 'readonly',
        window: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Response: 'readonly',
        URLSearchParams: 'readonly',
        IntersectionObserver: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
      },
    },
    rules: {
      // React components are `PascalCase` functions returning JSX; the rule
      // that flags a promise passed to a JSX attribute does not understand
      // event handlers declared `async`, and every one of those here is
      // deliberately fire-and-forget with its own catch.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    // Config files at the root are plain ESM and are not part of any tsconfig.
    files: ['*.js', '*.config.js', '*.config.ts', 'scripts/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Plain Node scripts. Declared explicitly rather than pulling in the
    // `globals` package for a handful of names — the four below are the Node 24
    // web-standard globals the smoke test uses (ADR-022 pins the 24 line, and
    // `fetch`, `AbortSignal` and `crypto` have been global and stable since 18,
    // 15 and 19 respectively).
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        crypto: 'readonly',
      },
    },
  },
  // Must stay last: turns off every rule Prettier owns, so formatting is
  // decided in exactly one place.
  prettier,
);
