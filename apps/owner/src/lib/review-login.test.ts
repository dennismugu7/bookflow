import { describe, expect, it } from "vitest";

import { REVIEW_EMAIL, completeReviewSignIn, requestReviewSignIn } from "./review-login";

// A fake password, only ever used here.
const input = { email: REVIEW_EMAIL, password: "fake-review-password-0123456789" };
const base = "https://bookflow.example.com";
const respond = (status: number, body: unknown) => async () =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status });

const failure = (message: string) => ({ ok: false, message });

describe("requestReviewSignIn messages", () => {
  it("503: the login isn't set up on the server", async () => {
    expect(await requestReviewSignIn(input, base, respond(503, { code: "UNAVAILABLE" }))).toEqual(
      failure("Signing in is unavailable. Try again later."),
    );
  });

  it("500 or another unexpected status: something went wrong", async () => {
    for (const status of [500, 502, 400, 404, 418]) {
      expect(await requestReviewSignIn(input, base, respond(status, {}))).toEqual(
        failure("Something went wrong. Try again."),
      );
    }
  });

  it("a 200 without a token hash: something went wrong", async () => {
    expect(await requestReviewSignIn(input, base, respond(200, {}))).toEqual(
      failure("Something went wrong. Try again."),
    );
    expect(await requestReviewSignIn(input, base, respond(200, "not json"))).toEqual(
      failure("Something went wrong. Try again."),
    );
  });

  it("only a real network error says No connection", async () => {
    const offline = await requestReviewSignIn(input, base, async () => {
      throw new TypeError("Network request failed");
    });
    expect(offline).toEqual(failure("No connection. Check your internet and try again."));
    for (const status of [401, 429, 500, 503]) {
      const result = await requestReviewSignIn(input, base, respond(status, {}));
      expect(result).not.toEqual(offline);
    }
  });

  it("sends the trimmed, lower-cased email and the password as typed", async () => {
    let sent: { url: string; body: unknown } | undefined;
    await requestReviewSignIn(
      { email: "  Support@Mugu-Labs.com ", password: " pass with spaces " },
      base,
      async (url, init) => {
        sent = { url, body: JSON.parse(String(init.body)) };
        return new Response(JSON.stringify({ token_hash: "fake-hashed-token" }), { status: 200 });
      },
    );
    expect(sent).toEqual({
      url: `${base}/api/review-sign-in`,
      body: { email: REVIEW_EMAIL, password: " pass with spaces " },
    });
  });
});

describe("completeReviewSignIn", () => {
  it("signs in with the token hash as a magic link", async () => {
    let params: unknown;
    const message = await completeReviewSignIn("fake-hashed-token", async (p) => {
      params = p;
      return { error: null };
    });
    expect(message).toBeNull();
    expect(params).toEqual({ token_hash: "fake-hashed-token", type: "magiclink" });
  });

  it("verifyOtp failing after a 200: couldn't finish signing in", async () => {
    expect(
      await completeReviewSignIn("fake-hashed-token", async () => ({
        error: { status: 403, code: "otp_expired" },
      })),
    ).toBe("Couldn't finish signing in. Try again.");
    expect(
      await completeReviewSignIn("fake-hashed-token", async () => {
        throw new Error("boom");
      }),
    ).toBe("Couldn't finish signing in. Try again.");
  });
});
