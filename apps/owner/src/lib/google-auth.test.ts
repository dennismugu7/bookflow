import { describe, expect, it } from "vitest";

import { GOOGLE_ERROR, GOOGLE_NOT_SET_UP, googleErrorOutcome, googleMessage } from "./google-auth";

describe("googleErrorOutcome", () => {
  it("stays quiet on a cancel", () => {
    expect(googleErrorOutcome({ code: "CANCELLED" })).toBe("cancelled");
  });

  it("says not set up for an unregistered build or no Google provider", () => {
    expect(
      googleErrorOutcome({
        code: "CREDENTIAL_ERROR",
        message: "TYPE_UNKNOWN: [28444] Developer console is not set up correctly.",
      }),
    ).toBe("not-set-up");
    expect(googleErrorOutcome({ code: "NO_PROVIDER" })).toBe("not-set-up");
  });

  it("treats anything else as an error", () => {
    expect(googleErrorOutcome({ code: "NO_CREDENTIAL", message: "no accounts" })).toBe("error");
    expect(googleErrorOutcome(new Error("boom"))).toBe("error");
    expect(googleErrorOutcome(null)).toBe("error");
  });
});

describe("googleMessage", () => {
  it("shows a message only when the user needs one", () => {
    expect(googleMessage({ outcome: "not-set-up", code: "10" })).toBe(
      "Google sign-in isn't set up on this build yet. Use your email.",
    );
    expect(GOOGLE_NOT_SET_UP).toBe(googleMessage({ outcome: "not-set-up" }));
    expect(googleMessage({ outcome: "error", code: "7" })).toBe(GOOGLE_ERROR);
    expect(googleMessage({ outcome: "cancelled" })).toBeUndefined();
    expect(googleMessage({ outcome: "signed-in" })).toBeUndefined();
  });

  it("adds Google's raw code in debug builds only", () => {
    expect(googleMessage({ outcome: "not-set-up", code: "10" }, true)).toBe(
      "Google sign-in isn't set up on this build yet. Use your email. (code 10)",
    );
    expect(googleMessage({ outcome: "not-set-up", code: "no-client-id" }, true)).toMatch(
      /\(code no-client-id\)$/,
    );
    expect(googleMessage({ outcome: "error" }, true)).toBe(GOOGLE_ERROR);
    expect(googleMessage({ outcome: "cancelled", code: "12501" }, true)).toBeUndefined();
  });
});
