import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A fake password, only ever used here.
const FAKE_PASSWORD = "fake-review-password-0123456789-abcdef";
const REVIEW_EMAIL = "support@mugu-labs.com";

type Rpc = (name: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>;

let failures = 0;
let userId: string | null = "d0000000-0000-4000-8000-0000000000aa";
const rpc = vi.fn<Rpc>(async (name) => {
  switch (name) {
    case "review_sign_in_blocked":
      return { data: failures >= 5, error: null };
    case "record_review_sign_in_failure":
      failures += 1;
      return { data: null, error: null };
    case "get_review_user_id":
      return { data: userId, error: null };
    case "ensure_review_demo":
      return { data: "a0000000-0000-4000-8000-0000000000aa", error: null };
    default:
      return { data: null, error: { message: `unexpected rpc ${name}` } };
  }
});
const createUser = vi.fn(async () => ({
  data: { user: { id: "d0000000-0000-4000-8000-0000000000aa" } },
  error: null,
}));
const generateLink = vi.fn(async () => ({
  data: {
    user: { id: "d0000000-0000-4000-8000-0000000000aa" },
    properties: {
      hashed_token: "fake-hashed-token",
      action_link: "https://example.com/verify?token=fake",
      email_otp: "123456",
    },
  },
  error: null,
}));

vi.mock("../../../lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc, auth: { admin: { createUser, generateLink } } }),
}));

const { POST } = await import("./route");

function request(body: unknown) {
  return new Request("https://bookflow.example.com/api/review-sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const logs = () =>
  [console.log, console.info, console.warn, console.error, console.debug].flatMap((fn) =>
    vi.mocked(fn).mock.calls.map((call) => JSON.stringify(call)),
  );

beforeEach(() => {
  failures = 0;
  userId = "d0000000-0000-4000-8000-0000000000aa";
  vi.clearAllMocks();
  vi.stubEnv("REVIEW_PASSWORD", FAKE_PASSWORD);
  vi.stubEnv("SUPABASE_SECRET_KEY", "fake-secret-key");
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation(() => {});
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/review-sign-in", () => {
  it("returns 503 when REVIEW_PASSWORD is not configured", async () => {
    vi.stubEnv("REVIEW_PASSWORD", "");
    const response = await POST(request({ email: REVIEW_EMAIL, password: FAKE_PASSWORD }));
    expect(response.status).toBe(503);
    expect(console.error).toHaveBeenCalledWith("[review] not configured");
  });

  it("returns 503 when REVIEW_PASSWORD is shorter than 24 characters", async () => {
    vi.stubEnv("REVIEW_PASSWORD", "short-fake-password");
    const response = await POST(request({ email: REVIEW_EMAIL, password: "short-fake-password" }));
    expect(response.status).toBe(503);
    expect(console.error).toHaveBeenCalledWith("[review] not configured");
  });

  it("returns 401 for a wrong password", async () => {
    const response = await POST(request({ email: REVIEW_EMAIL, password: "not-the-password" }));
    expect(response.status).toBe(401);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("returns 401 for any other email", async () => {
    const response = await POST(request({ email: "someone@example.com", password: FAKE_PASSWORD }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(
      await (await POST(request({ email: REVIEW_EMAIL, password: "nope" }))).json(),
    );
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("returns 429 after 5 failures", async () => {
    for (let i = 0; i < 5; i++) {
      const response = await POST(request({ email: REVIEW_EMAIL, password: `wrong-${i}` }));
      expect(response.status).toBe(401);
    }
    const blocked = await POST(request({ email: REVIEW_EMAIL, password: FAKE_PASSWORD }));
    expect(blocked.status).toBe(429);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("returns 200 with token_hash only", async () => {
    const response = await POST(request({ email: REVIEW_EMAIL, password: FAKE_PASSWORD }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ token_hash: "fake-hashed-token" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("never puts the password in any log call", async () => {
    await POST(request({ email: REVIEW_EMAIL, password: FAKE_PASSWORD }));
    await POST(request({ email: REVIEW_EMAIL, password: `${FAKE_PASSWORD}-wrong` }));
    rpc.mockImplementationOnce(async () => ({ data: null, error: { message: "boom" } }));
    await POST(request({ email: REVIEW_EMAIL, password: FAKE_PASSWORD }));
    for (const line of logs()) {
      expect(line).not.toContain(FAKE_PASSWORD);
      expect(line).not.toContain("fake-hashed-token");
    }
  });
});
