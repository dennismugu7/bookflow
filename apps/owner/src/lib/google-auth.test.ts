import { describe, expect, it } from "vitest";

import { readGoogleResult } from "./google-auth";

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
