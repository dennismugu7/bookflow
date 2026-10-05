import base, { ignores } from "@bookflow/config/eslint";

export default [
  ...base,
  { ignores: [...ignores, "expo-env.d.ts", "android/**", "ios/**"] },
  // Node-run files: the Expo config, its local plugin and the scripts.
  {
    files: ["app.config.js", "plugins/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        module: "writable",
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
  // Expo loads local config plugins as CommonJS.
  {
    files: ["plugins/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
