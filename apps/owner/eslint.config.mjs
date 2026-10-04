import base, { ignores } from "@bookflow/config/eslint";

export default [
  ...base,
  { ignores: [...ignores, "expo-env.d.ts", "android/**", "ios/**"] },
  // Node-run files: the Expo config and the art render script.
  {
    files: ["app.config.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        module: "writable",
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
];
