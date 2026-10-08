import base, { ignores } from "@bookflow/config/eslint";

export default [
  ...base,
  { ignores: [...ignores, "expo-env.d.ts", "android/**", "ios/**"] },
  // Node-run files: the Expo config, its local plugin and the scripts.
  {
    files: ["app.config.js", "plugins/**/*.js", "scripts/**/*.mjs", "scripts/**/*.cjs"],
    languageOptions: {
      globals: {
        module: "writable",
        __dirname: "readonly",
        require: "readonly",
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        // capture.mjs passes a function to run inside the page.
        addEventListener: "readonly",
        document: "readonly",
      },
    },
  },
  // Expo loads local config plugins as CommonJS; the release scripts' helper is CommonJS too.
  {
    files: ["plugins/**/*.js", "scripts/**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
