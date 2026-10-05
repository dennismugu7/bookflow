import { WEB_BASE_URL } from "@bookflow/shared";
import { describe, expect, it } from "vitest";

import nextConfig, { NEW_ORIGIN, OLD_HOST } from "../../next.config";

describe("old host redirect", () => {
  it("sends the old host to WEB_BASE_URL with a 308", async () => {
    const rules = await nextConfig.redirects!();
    expect(rules).toHaveLength(1);
    const rule = rules[0]!;
    expect(NEW_ORIGIN).toBe(WEB_BASE_URL);
    expect(rule.has).toEqual([{ type: "host", value: OLD_HOST }]);
    expect("permanent" in rule && rule.permanent).toBe(true);
    expect(rule.destination).toBe(`${WEB_BASE_URL}/:path`);
  });

  it("covers pages but not /api", () => {
    // The source's custom pattern, as Next anchors it.
    const pattern = /^\/((?!api(?:\/|$)).*)$/;
    for (const path of ["/", "/s/salome-salon", "/delete-account", "/apiary", "/b/x"])
      expect(pattern.test(path), path).toBe(true);
    for (const path of ["/api", "/api/account/delete", "/api/health"])
      expect(pattern.test(path), path).toBe(false);
  });
});
