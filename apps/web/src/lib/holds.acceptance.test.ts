import { describe, expect, it } from "vitest";

import { clientIpFrom, newHoldToken } from "./holds";

describe("clientIpFrom", () => {
  it("uses the address Vercel reports", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIpFrom(new Headers({ "x-vercel-forwarded-for": "198.51.100.7, 10.0.0.1" }))).toBe("198.51.100.7");
    expect(clientIpFrom(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("never trusts the visitor's own x-forwarded-for header", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.9" }))).toBeNull();
  });

  it("rejects values that are not addresses", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "not-an-ip" }))).toBeNull();
    expect(clientIpFrom(new Headers())).toBeNull();
  });
});

describe("newHoldToken", () => {
  it("creates unguessable tokens the database accepts", () => {
    const a = newHoldToken();
    const b = newHoldToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{20,128}$/);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(a).not.toBe(b);
  });
});
