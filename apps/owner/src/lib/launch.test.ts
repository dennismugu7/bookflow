import { describe, expect, it } from "vitest";

import { appReady, screenGroup } from "./launch";

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


describe("screenGroup", () => {
  it("sends a signed-in user with no salon yet to create your salon", () => {
    expect(screenGroup({ signedIn: true, hasSalon: false })).toBe("onboarding");
  });

  it("sends signed-out users to Welcome and owners to the app", () => {
    expect(screenGroup({ signedIn: false, hasSalon: false })).toBe("auth");
    expect(screenGroup({ signedIn: true, hasSalon: true })).toBe("app");
  });
});
