import { describe, expect, it } from "vitest";

import { backTarget } from "./back-nav";

const ME = "https://bookflow.example/me";

describe("backTarget", () => {
  it("goes back when the previous page is one of ours", () => {
    expect(
      backTarget({
        previousUrl: "https://bookflow.example/s/amani-beauty/book?services=a",
        currentUrl: ME,
        lastSalon: "other",
      }),
    ).toEqual({ kind: "history" });
  });

  it("goes to the last salon visited when there is no previous page", () => {
    expect(backTarget({ previousUrl: null, currentUrl: ME, lastSalon: "amani-beauty" })).toEqual({
      kind: "link",
      href: "/s/amani-beauty",
    });
  });

  it("ignores another site, the sign-in callback and this same page", () => {
    for (const previousUrl of [
      "https://accounts.google.com/o/oauth2",
      "https://bookflow.example/auth/callback?next=%2Fme",
      "https://bookflow.example/me?signin=failed",
    ]) {
      expect(backTarget({ previousUrl, currentUrl: ME, lastSalon: "amani-beauty" })).toEqual({
        kind: "link",
        href: "/s/amani-beauty",
      });
    }
  });

  it("falls back to the home page without a usable salon", () => {
    expect(backTarget({ previousUrl: "nonsense", currentUrl: ME, lastSalon: null })).toEqual({
      kind: "link",
      href: "/",
    });
    expect(backTarget({ previousUrl: null, currentUrl: ME, lastSalon: "../evil" })).toEqual({
      kind: "link",
      href: "/",
    });
  });
});
