import { beforeEach, describe, expect, it, vi } from "vitest";

const google = vi.hoisted(() => ({
  configure: vi.fn(),
  hasPlayServices: vi.fn(async () => true),
  signIn: vi.fn(),
  signOut: vi.fn(async () => null),
}));
const auth = vi.hoisted(() => ({ signInWithIdToken: vi.fn() }));
const env = vi.hoisted(() => ({ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "web-client.apps.googleusercontent.com" as string | undefined }));

vi.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: google,
  statusCodes: { SIGN_IN_CANCELLED: "12501", IN_PROGRESS: "IN_PROGRESS", PLAY_SERVICES_NOT_AVAILABLE: "PLAY" },
  isSuccessResponse: (r: { type: string }) => r.type === "success",
  isCancelledResponse: (r: { type: string }) => r.type === "cancelled",
}));
vi.mock("./supabase", () => ({ getSupabase: () => ({ auth }) }));
vi.mock("../env", () => ({ getEnv: () => env }));

const { idTokenToSession, signInWithGoogle, signOutOfGoogle } = await import("./google-sign-in");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  auth.signInWithIdToken.mockResolvedValue({ data: {}, error: null });
});

describe("signInWithGoogle", () => {
  it("turns Google's ID token into a Supabase session", async () => {
    google.signIn.mockResolvedValue({ type: "success", data: { idToken: "id-token" } });
    expect(await signInWithGoogle()).toEqual({ outcome: "signed-in" });
    expect(google.configure).toHaveBeenCalledWith({ webClientId: "web-client.apps.googleusercontent.com" });
    expect(auth.signInWithIdToken).toHaveBeenCalledWith({ provider: "google", token: "id-token" });
  });

  it("stays quiet when the chooser is closed", async () => {
    google.signIn.mockResolvedValue({ type: "cancelled", data: null });
    expect(await signInWithGoogle()).toEqual({ outcome: "cancelled" });
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("says not set up when Google rejects the build (DEVELOPER_ERROR)", async () => {
    google.signIn.mockRejectedValue(Object.assign(new Error("DEVELOPER_ERROR"), { code: "10" }));
    expect(await signInWithGoogle()).toEqual({ outcome: "not-set-up", code: "10" });
    expect(console.warn).toHaveBeenCalledWith("Google sign-in failed:", "10", expect.any(String));
  });

  it("is an error when Supabase refuses the token", async () => {
    google.signIn.mockResolvedValue({ type: "success", data: { idToken: "id-token" } });
    auth.signInWithIdToken.mockResolvedValue({ data: {}, error: { message: "Bad ID token" } });
    expect(await signInWithGoogle()).toEqual({ outcome: "error", code: "supabase: Bad ID token" });
  });
});

describe("idTokenToSession", () => {
  it("needs a token", async () => {
    expect(await idTokenToSession(null)).toEqual({ outcome: "error", code: "no-id-token" });
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });
});

describe("signOutOfGoogle", () => {
  it("forgets the Google account so the chooser shows next time", async () => {
    await signOutOfGoogle();
    expect(google.signOut).toHaveBeenCalled();
  });

  it("never throws", async () => {
    google.signOut.mockRejectedValueOnce(new Error("offline"));
    await expect(signOutOfGoogle()).resolves.toBeUndefined();
  });
});
