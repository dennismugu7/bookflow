import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const plugin = require("../plugins/with-debug-apk") as {
  excludeDevClient: (contents: string) => string;
  embedBundleInDebug: (contents: string) => string;
};

const SETTINGS = "plugins {}\nexpoAutolinking.useExpoModules()\nrootProject.name = 'x'\n";
const APP_GRADLE = "apply plugin: 'x'\n\nreact {\n    bundleCommand = \"export:embed\"\n}\n";

describe("with-debug-apk", () => {
  it("leaves the dev client out of autolinking", () => {
    const out = plugin.excludeDevClient(SETTINGS);
    expect(out).toContain(
      'expoAutolinking.exclude = ["expo-dev-client", "expo-dev-launcher", "expo-dev-menu", "expo-dev-menu-interface"]',
    );
    expect(out.indexOf("expoAutolinking.exclude")).toBeLessThan(out.indexOf("useExpoModules()"));
  });

  it("embeds the bundle in the debug variant", () => {
    expect(plugin.embedBundleInDebug(APP_GRADLE)).toContain("react {\n    debuggableVariants = []");
  });

  it("applies once", () => {
    const once = plugin.embedBundleInDebug(APP_GRADLE);
    expect(plugin.embedBundleInDebug(once)).toBe(once);
    const settings = plugin.excludeDevClient(SETTINGS);
    expect(plugin.excludeDevClient(settings)).toBe(settings);
  });

  it("fails loudly when the generated files change shape", () => {
    expect(() => plugin.excludeDevClient("nothing here")).toThrow(/useExpoModules/);
    expect(() => plugin.embedBundleInDebug("nothing here")).toThrow(/react \{/);
  });
});
