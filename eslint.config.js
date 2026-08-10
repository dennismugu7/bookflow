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
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['apps/api/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Config files at the root are plain ESM and are not part of any tsconfig.
    files: ['*.js', '*.config.js', '*.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
  // Must stay last: turns off every rule Prettier owns, so formatting is
  // decided in exactly one place.
  prettier,
);
