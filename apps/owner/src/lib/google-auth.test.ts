import { describe, expect, it } from "vitest";

import { callbackErrorDescription, isGoogleCallback, readGoogleResult } from "./google-auth";

describe("readGoogleResult", () => {
  it("reads the PKCE code from the redirect", () => {
    expect(
      readGoogleResult({ type: "success", url: "bookflow://auth/callback?code=abc-123" }),
    ).toEqual({ kind: "code", code: "abc-123" });
  });

  it("treats a closed browser as a silent cancel", () => {
    expect(readGoogleResult({ type: "cancel" })).toEqual({ kind: "cancel" });
    expect(readGoogleResult({ type: "dismiss" })).toEqual({ kind: "cancel" });
  });

  it("reports errors from Supabase or a missing code", () => {
    expect(
      readGoogleResult({
        type: "success",
        url: "bookflow://auth/callback?error=access_denied&error_description=x",
      }),
    ).toEqual({ kind: "error" });
    expect(
      readGoogleResult({ type: "success", url: "bookflow://auth/callback#error=server_error" }),
    ).toEqual({ kind: "error" });
    expect(readGoogleResult({ type: "success", url: "bookflow://auth/callback" })).toEqual({
      kind: "error",
    });
    expect(readGoogleResult({ type: "locked" })).toEqual({ kind: "error" });
  });
});

describe("isGoogleCallback", () => {
  it("matches only the Google redirect", () => {
    expect(isGoogleCallback("bookflow://auth/callback?code=abc")).toBe(true);
    expect(isGoogleCallback("bookflow:///")).toBe(false);
    expect(isGoogleCallback("bookflow://booking/1")).toBe(false);
    expect(isGoogleCallback(null)).toBe(false);
  });
});

describe("callbackErrorDescription", () => {
  it("reads Supabase's error from the query or the fragment", () => {
    expect(
      callbackErrorDescription(
        "bookflow://auth/callback?error=server_error&error_description=Database+error+saving+new+user",
      ),
    ).toBe("server_error: Database error saving new user");
    expect(callbackErrorDescription("bookflow://auth/callback#error=access_denied")).toBe(
      "access_denied",
    );
    expect(callbackErrorDescription("bookflow://auth/callback?code=abc")).toBeUndefined();
  });
});
