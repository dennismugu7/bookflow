import { describe, expect, it } from "vitest";

import {
  AUTH_MESSAGES,
  isValidEmail,
  resendSecondsLeft,
  sanitizeCode,
  sendCodeErrorMessage,
  verifyCodeErrorMessage,
} from "./auth-errors";

describe("isValidEmail", () => {
  it.each(["owner@example.test", "  a.b+c@salon.co.ke "])("accepts %j", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });
  it.each(["", "owner", "owner@", "owner@example", "a b@example.test"])("rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe("sendCodeErrorMessage", () => {
  it("asks the owner to wait when rate limited", () => {
    expect(sendCodeErrorMessage({ status: 429, code: "over_email_send_rate_limit" })).toBe(
      "Wait a minute before asking for another code.",
    );
    expect(sendCodeErrorMessage({ status: 429 })).toBe(AUTH_MESSAGES.rateLimited);
  });
  it("flags an invalid email", () => {
    expect(sendCodeErrorMessage({ status: 400, code: "email_address_invalid" })).toBe(
      AUTH_MESSAGES.invalidEmail,
    );
  });
  it("explains a network failure", () => {
    expect(sendCodeErrorMessage({ name: "AuthRetryableFetchError", status: 0 })).toBe(
      AUTH_MESSAGES.offline,
    );
    expect(sendCodeErrorMessage({ message: "Network request failed" })).toBe(AUTH_MESSAGES.offline);
  });
  it("falls back to a generic message", () => {
    expect(sendCodeErrorMessage({ status: 500, code: "unexpected_failure" })).toBe(
      AUTH_MESSAGES.unknown,
    );
    expect(sendCodeErrorMessage(null)).toBe(AUTH_MESSAGES.unknown);
  });
});

describe("verifyCodeErrorMessage", () => {
  it("says the code is wrong or expired", () => {
    expect(verifyCodeErrorMessage({ status: 403, code: "otp_expired" })).toBe(
      AUTH_MESSAGES.badCode,
    );
  });
  it("asks the owner to wait when rate limited", () => {
    expect(verifyCodeErrorMessage({ status: 429, code: "over_request_rate_limit" })).toBe(
      AUTH_MESSAGES.rateLimited,
    );
  });
  it("explains a network failure", () => {
    expect(verifyCodeErrorMessage({ name: "AuthRetryableFetchError" })).toBe(AUTH_MESSAGES.offline);
  });
});

describe("sanitizeCode", () => {
  it.each([
    ["123456", "123456"],
    ["123 456", "123456"],
    ["Code: 123-456", "123456"],
    ["12345678", "123456"],
    ["abc", ""],
  ])("turns %j into %j", (input, expected) => {
    expect(sanitizeCode(input)).toBe(expected);
  });
});

describe("resendSecondsLeft", () => {
  it("counts down from 60 and stops at 0", () => {
    expect(resendSecondsLeft(0, 0)).toBe(60);
    expect(resendSecondsLeft(0, 59_001)).toBe(1);
    expect(resendSecondsLeft(0, 60_000)).toBe(0);
    expect(resendSecondsLeft(0, 90_000)).toBe(0);
  });
});
