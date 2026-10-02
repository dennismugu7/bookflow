import { defineConfig } from "vitest/config";

// Node only: these tests cover plain TypeScript modules and must not import React Native.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
