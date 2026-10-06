import { beforeEach, describe, expect, it, vi } from "vitest";

const credential = vi.hoisted(() => ({
  createNonce: vi.fn(() => ({ raw: "raw-nonce", hashed: "hashed-nonce" })),
  sha256Hex: vi.fn(),
  signIn: vi.fn(),
  clearCredentialState: vi.fn(async () => undefined),
}));
const auth = vi.hoisted(() => ({ signInWithIdToken: vi.fn() }));
const env = vi.hoisted(() => ({
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "845533071467-web.apps.googleusercontent.com" as
    | string
    | undefined,
}));

vi.mock("../../modules/google-credential", () => ({ default: credential }));
vi.mock("./supabase", () => ({ getSupabase: () => ({ auth }) }));
vi.mock("../env", () => ({ getEnv: () => env }));

const { idTokenToSession, signInWithGoogle, signOutOfGoogle } = await import("./google-sign-in");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  auth.signInWithIdToken.mockResolvedValue({ data: {}, error: null });
  env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = "845533071467-web.apps.googleusercontent.com";
});

describe("signInWithGoogle", () => {
  it("gives Google the hashed nonce and Supabase the token with the raw nonce", async () => {
    credential.signIn.mockResolvedValue({ idToken: "id-token" });
    const onToken = vi.fn();
    expect(await signInWithGoogle(onToken)).toEqual({ outcome: "signed-in" });
    expect(credential.signIn).toHaveBeenCalledWith(
      "845533071467-web.apps.googleusercontent.com",
      "hashed-nonce",
    );
    expect(auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "id-token",
      nonce: "raw-nonce",
    });
    expect(onToken).toHaveBeenCalledTimes(1);
  });

  it("uses a new nonce each attempt", async () => {
    credential.signIn.mockResolvedValue({ idToken: "id-token" });
    await signInWithGoogle();
    await signInWithGoogle();
    expect(credential.createNonce).toHaveBeenCalledTimes(2);
  });

  it("stays quiet when the chooser or the consent is cancelled", async () => {
    credential.signIn.mockRejectedValue(Object.assign(new Error("closed"), { code: "CANCELLED" }));
    const onToken = vi.fn();
    expect(await signInWithGoogle(onToken)).toEqual({ outcome: "cancelled", code: "CANCELLED" });
    expect(onToken).not.toHaveBeenCalled();
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("reports a Credential Manager failure with its code", async () => {
    credential.signIn.mockRejectedValue(
      Object.assign(new Error("TYPE_UNKNOWN: boom"), { code: "CREDENTIAL_ERROR" }),
    );
    expect(await signInWithGoogle()).toEqual({ outcome: "error", code: "CREDENTIAL_ERROR" });
  });

  it("is an error when Supabase refuses the token", async () => {
    credential.signIn.mockResolvedValue({ idToken: "id-token" });
    auth.signInWithIdToken.mockResolvedValue({ data: {}, error: { message: "Nonces mismatch" } });
    expect(await signInWithGoogle()).toEqual({
      outcome: "error",
      code: "supabase: Nonces mismatch",
    });
  });

  it("says not set up without a web client ID, before opening Google", async () => {
    env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = undefined;
    expect(await signInWithGoogle()).toEqual({ outcome: "not-set-up", code: "no-client-id" });
    expect(credential.signIn).not.toHaveBeenCalled();
  });
});

describe("idTokenToSession", () => {
  it("needs a token", async () => {
    expect(await idTokenToSession(null, "raw")).toEqual({ outcome: "error", code: "no-id-token" });
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });
});

describe("signOutOfGoogle", () => {
  it("clears Credential Manager's state so the chooser shows next time", async () => {
    await signOutOfGoogle();
    expect(credential.clearCredentialState).toHaveBeenCalled();
  });

  it("never throws", async () => {
    credential.clearCredentialState.mockRejectedValueOnce(new Error("no play services"));
    await expect(signOutOfGoogle()).resolves.toBeUndefined();
  });
});
