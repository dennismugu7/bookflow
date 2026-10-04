import { describe, expect, it } from "vitest";

import { appReady } from "./launch";

const known = { fontsSettled: true, signedIn: true, sessionKnown: true, membershipKnown: true };

describe("appReady", () => {
  it("is ready once fonts, session and salon are known", () => {
    expect(appReady(known)).toBe(true);
  });

  it("waits for fonts and the session", () => {
    expect(appReady({ ...known, fontsSettled: false })).toBe(false);
    expect(appReady({ ...known, sessionKnown: false })).toBe(false);
  });

  it("waits for the salon only when signed in", () => {
    expect(appReady({ ...known, membershipKnown: false })).toBe(false);
    expect(appReady({ ...known, signedIn: false, membershipKnown: false })).toBe(true);
  });
});
