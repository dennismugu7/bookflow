import { describe, expect, it } from "vitest";

import { appReady, screenGroup, settledGroup } from "./launch";

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

describe("settledGroup", () => {
  const signedOut = { sessionKnown: true, signedIn: false, membershipKnown: true, hasSalon: false };

  it("stays on the sign-in sheet until the new account's salon is known, then moves once", () => {
    // A Google sign-in, step by step: session first, the salon lookup after it.
    const steps = [
      signedOut,
      { sessionKnown: true, signedIn: true, membershipKnown: false, hasSalon: false },
      { sessionKnown: true, signedIn: true, membershipKnown: false, hasSalon: false },
      { sessionKnown: true, signedIn: true, membershipKnown: true, hasSalon: false },
    ];
    let group: ReturnType<typeof settledGroup>;
    const shown = steps.map((state) => (group = settledGroup(group, state)));
    expect(shown).toEqual(["auth", "auth", "auth", "onboarding"]);
  });

  it("goes straight to the app for an account that has a salon, never via onboarding", () => {
    let group = settledGroup(undefined, signedOut);
    group = settledGroup(group, { ...signedOut, signedIn: true, membershipKnown: false });
    expect(group).toBe("auth");
    group = settledGroup(group, {
      sessionKnown: true,
      signedIn: true,
      membershipKnown: true,
      hasSalon: true,
    });
    expect(group).toBe("app");
  });

  it("knows nothing before the stored session is read", () => {
    expect(settledGroup(undefined, { ...signedOut, sessionKnown: false })).toBeUndefined();
  });

  it("signs out at once", () => {
    expect(settledGroup("onboarding", signedOut)).toBe("auth");
  });
});
