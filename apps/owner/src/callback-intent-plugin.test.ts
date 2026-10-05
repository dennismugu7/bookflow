import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const plugin = require("../plugins/with-callback-intent") as {
  keepNewIntent: (contents: string) => string;
};

const MAIN_ACTIVITY = [
  "package com.mugulabs.bookflow",
  "import android.os.Build",
  "import android.os.Bundle",
  "",
  "class MainActivity : ReactActivity() {",
  "  override fun onCreate(savedInstanceState: Bundle?) {",
  "    super.onCreate(null)",
  "  }",
  "}",
  "",
].join("\n");

describe("with-callback-intent", () => {
  it("keeps the newest intent so getInitialURL sees a link that came before JS", () => {
    const out = plugin.keepNewIntent(MAIN_ACTIVITY);
    expect(out).toContain("import android.content.Intent\nimport android.os.Bundle\n");
    expect(out).toContain(
      "override fun onNewIntent(intent: Intent) {\n    super.onNewIntent(intent)\n    setIntent(intent)\n  }",
    );
    expect(out.indexOf("onNewIntent")).toBeGreaterThan(out.indexOf("class MainActivity"));
  });

  it("applies once", () => {
    const once = plugin.keepNewIntent(MAIN_ACTIVITY);
    expect(plugin.keepNewIntent(once)).toBe(once);
  });

  it("fails loudly when the template changes", () => {
    expect(() => plugin.keepNewIntent("class Other {}\n")).toThrow(/MainActivity class not found/);
    const overridden = MAIN_ACTIVITY.replace(
      "  override fun onCreate",
      "  override fun onNewIntent(intent: Intent) {}\n  override fun onCreate",
    );
    expect(() => plugin.keepNewIntent(overridden)).toThrow(/already overrides onNewIntent/);
  });
});
