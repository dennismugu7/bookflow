import { WEB_BASE_URL } from "@bookflow/shared";
import type { Redirect } from "next/dist/lib/load-custom-routes";
import { afterEach, describe, expect, it, vi } from "vitest";

import nextConfig, { NEW_ORIGIN, OLD_HOST, PRODUCT_PAGE } from "../../next.config";

async function redirectsIn(vercelEnv: string | undefined): Promise<Redirect[]> {
  vi.stubEnv("VERCEL_ENV", vercelEnv);
  return (await nextConfig.redirects!()) as Redirect[];
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("old host redirect", () => {
  it("sends the old host to WEB_BASE_URL with a 308", async () => {
    const rule = (await redirectsIn("preview")).find((r) => r.has)!;
    expect(NEW_ORIGIN).toBe(WEB_BASE_URL);
    expect(rule.has).toEqual([{ type: "host", value: OLD_HOST }]);
    expect(rule.permanent).toBe(true);
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

describe("bare address redirect", () => {
  it("sends exactly / to the product page with a 308, in production, before the old-host rule", async () => {
    const [first, ...rest] = await redirectsIn("production");
    expect(first).toEqual({ source: "/", destination: PRODUCT_PAGE, permanent: true });
    expect(PRODUCT_PAGE).toBe("https://mugu-labs.com/products/bookflow/");
    expect(first).not.toHaveProperty("has");
    expect(rest).toHaveLength(1);
    expect(rest[0]!.has).toEqual([{ type: "host", value: OLD_HOST }]);
  });

  it("leaves previews and local builds on their root page", async () => {
    for (const env of ["preview", "development", undefined]) {
      const rules = await redirectsIn(env);
      expect(rules.some((r) => r.source === "/"), String(env)).toBe(false);
      expect(rules).toHaveLength(1);
    }
  });
});
