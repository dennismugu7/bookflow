import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import base, { ignores } from "@bookflow/config/eslint";

export default defineConfig([
  ...base,
  ...nextVitals,
  ...nextTs,
  globalIgnores([...ignores, ".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
