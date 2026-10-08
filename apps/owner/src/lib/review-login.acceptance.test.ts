import { describe, expect, it } from "vitest";

import { AUTH_MESSAGES } from "./auth-errors";
import {
  REVIEW_EMAIL,
  REVIEW_MESSAGES,
  isReviewEmail,
  requestReviewSignIn,
  signInButtonLabel,
} from "./review-login";

// A fake password, only ever used here.
const FAKE_PASSWORD = "fake-review-password-0123456789";

const respond = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("review login", () => {
  it("shows the password field only for support@mugu-labs.com, ignoring case and spaces", () => {
    expect(REVIEW_EMAIL).toBe("support@mugu-labs.com");
    expect(isReviewEmail("support@mugu-labs.com")).toBe(true);
    expect(isReviewEmail("  Support@Mugu-Labs.COM ")).toBe(true);
    expect(isReviewEmail("support@mugu-labs.co")).toBe(false);
    expect(isReviewEmail("owner@example.com")).toBe(false);
    expect(isReviewEmail("")).toBe(false);
  });

  it("switches the button label", () => {
    expect(signInButtonLabel("SUPPORT@mugu-labs.com ")).toBe("Sign in");
    expect(signInButtonLabel("owner@example.com")).toBe("Send me a code");
    expect(signInButtonLabel("")).toBe("Send me a code");
  });

  it("maps each error to its message", async () => {
    const input = { email: REVIEW_EMAIL, password: FAKE_PASSWORD };
    const base = "https://bookflow.example.com";

    expect(await requestReviewSignIn(input, base, respond(401, { code: "WRONG" }))).toEqual({
      ok: false,
      message: "That password isn't right. Try again.",
    });
    expect(await requestReviewSignIn(input, base, respond(429, { code: "TOO_MANY" }))).toEqual({
      ok: false,
      message: "Too many tries. Wait 15 minutes and try again.",
    });
    expect(await requestReviewSignIn(input, base, respond(503, {}))).toEqual({
      ok: false,
      message: "Signing in is unavailable. Try again later.",
    });
    expect(
      await requestReviewSignIn(input, base, async () => {
        throw new TypeError("Network request failed");
      }),
    ).toEqual({ ok: false, message: AUTH_MESSAGES.offline });
    expect(REVIEW_MESSAGES.wrongPassword).toBe("That password isn't right. Try again.");
    expect(REVIEW_MESSAGES.tooMany).toBe("Too many tries. Wait 15 minutes and try again.");
  });

  it("returns the token hash on success", async () => {
    const result = await requestReviewSignIn(
      { email: REVIEW_EMAIL, password: FAKE_PASSWORD },
      "https://bookflow.example.com",
      respond(200, { token_hash: "fake-hashed-token" }),
    );
    expect(result).toEqual({ ok: true, tokenHash: "fake-hashed-token" });
  });
});
