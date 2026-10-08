import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A fake password, only ever used here.
const FAKE_PASSWORD = "fake-review-password-0123456789-abcdef";

let admin: object | null = { rpc: vi.fn(), auth: { admin: {} } };
vi.mock("../../../lib/supabase/admin", () => ({ createAdminClient: () => admin }));

const { POST } = await import("./route");

const request = (password: string) =>
  new Request("https://bookflow.example.com/api/review-sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "support@mugu-labs.com", password }),
  });

const logged = () => vi.mocked(console.error).mock.calls.map((call) => call.join(" "));

beforeEach(() => {
  admin = { rpc: vi.fn(), auth: { admin: {} } };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/review-sign-in, not configured", () => {
  it("names a missing REVIEW_PASSWORD", async () => {
    vi.stubEnv("REVIEW_PASSWORD", "");
    expect((await POST(request("anything"))).status).toBe(503);
    expect(logged()).toEqual(["[review] not configured: REVIEW_PASSWORD missing"]);
  });

  it("names a short REVIEW_PASSWORD without its value or length", async () => {
    const short = "short-fake-pw-123";
    vi.stubEnv("REVIEW_PASSWORD", short);
    expect((await POST(request(short))).status).toBe(503);
    expect(logged()).toEqual(["[review] not configured: REVIEW_PASSWORD under 24 characters"]);
    expect(logged().join()).not.toContain(short);
    expect(logged().join()).not.toContain(String(short.length));
  });

  it("names a missing SUPABASE_SECRET_KEY when the password is fine", async () => {
    vi.stubEnv("REVIEW_PASSWORD", FAKE_PASSWORD);
    admin = null;
    const response = await POST(request(FAKE_PASSWORD));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "UNAVAILABLE",
      message: "Signing in is unavailable. Try again later.",
    });
    expect(logged()).toEqual(["[review] not configured: SUPABASE_SECRET_KEY missing"]);
    expect(logged().join()).not.toContain(FAKE_PASSWORD);
  });
});
