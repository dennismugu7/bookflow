// Base flat config shared by every workspace. Apps extend it with their framework rules.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export const ignores = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.expo/**",
  "**/.turbo/**",
  "**/dist/**",
  "**/coverage/**",
  "**/playwright-report/**",
  "**/test-results/**",
];

export default tseslint.config(
  { ignores },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
);
