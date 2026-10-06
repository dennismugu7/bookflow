import { describe, expect, it } from "vitest";

import { GOOGLE_ERROR, GOOGLE_NOT_SET_UP, googleErrorOutcome, googleMessage } from "./google-auth";

const CODES = { cancelled: "SIGN_IN_CANCELLED", inProgress: "IN_PROGRESS", noPlayServices: "PLAY" };

describe("googleErrorOutcome", () => {
  it("stays quiet on a cancel or a second tap", () => {
    expect(googleErrorOutcome({ code: "SIGN_IN_CANCELLED" }, CODES)).toBe("cancelled");
    expect(googleErrorOutcome({ code: "IN_PROGRESS" }, CODES)).toBe("cancelled");
  });

  it("says not set up for an unregistered SHA-1 or no Play Services", () => {
    expect(googleErrorOutcome({ code: "10", message: "DEVELOPER_ERROR" }, CODES)).toBe("not-set-up");
    expect(googleErrorOutcome({ code: 10 }, CODES)).toBe("not-set-up");
    expect(googleErrorOutcome({ message: "A non-recoverable sign in failure: DEVELOPER_ERROR" }, CODES)).toBe(
      "not-set-up",
    );
    expect(googleErrorOutcome({ code: "PLAY" }, CODES)).toBe("not-set-up");
  });

  it("treats anything else as an error", () => {
    expect(googleErrorOutcome({ code: "7", message: "NETWORK_ERROR" }, CODES)).toBe("error");
    expect(googleErrorOutcome(new Error("boom"), CODES)).toBe("error");
    expect(googleErrorOutcome(null, CODES)).toBe("error");
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
