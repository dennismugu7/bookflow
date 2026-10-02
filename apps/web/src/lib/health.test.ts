import { describe, expect, it, vi } from "vitest";

import { checkHealth } from "./health";

const base = {
  supabaseUrl: "https://abc.supabase.co",
  anonKey: "anon-key-should-never-leak",
  commitSha: "0123456789abcdef",
};

function respond(status: number, body = "{}") {
  return vi.fn<typeof fetch>(async () => new Response(body, { status }));
}

describe("checkHealth", () => {
  it("returns 200 with supabase ok when Supabase is healthy", async () => {
    const fetchImpl = respond(200);
    const result = await checkHealth({ ...base, fetchImpl });
    expect(result).toEqual({
      httpStatus: 200,
      body: { status: "ok", supabase: "ok", commit: "0123456" },
    });
  });

  it("calls the auth health endpoint with the apikey header", async () => {
    const fetchImpl = respond(200);
    await checkHealth({ ...base, supabaseUrl: "https://abc.supabase.co/", fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://abc.supabase.co/auth/v1/health");
    expect(new Headers(init?.headers).get("apikey")).toBe(base.anonKey);
    expect(init?.cache).toBe("no-store");
  });

  it.each([undefined, ""])("reports commit 'local' when the SHA is %j", async (commitSha) => {
    const result = await checkHealth({ ...base, commitSha, fetchImpl: respond(200) });
    expect(result.body.commit).toBe("local");
  });

  it("returns 503 when Supabase responds with an error status", async () => {
    const result = await checkHealth({ ...base, fetchImpl: respond(500, "boom details") });
    expect(result).toEqual({
      httpStatus: 503,
      body: { status: "ok", supabase: "error", commit: "0123456" },
    });
  });

  it("returns 503 when the request throws", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new Error("ECONNREFUSED secret-host");
    });
    const result = await checkHealth({ ...base, fetchImpl });
    expect(result.httpStatus).toBe(503);
    expect(result.body.supabase).toBe("error");
  });

  it("returns 503 when Supabase does not answer within the timeout", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const result = await checkHealth({ ...base, fetchImpl, timeoutMs: 20 });
    expect(result.httpStatus).toBe(503);
    expect(result.body.supabase).toBe("error");
  });

  it("returns 503 without calling Supabase when config is missing", async () => {
    const fetchImpl = respond(200);
    const result = await checkHealth({ ...base, supabaseUrl: undefined, fetchImpl });
    expect(result.httpStatus).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never includes the key or upstream error details in the body", async () => {
    const results = await Promise.all([
      checkHealth({ ...base, fetchImpl: respond(200) }),
      checkHealth({ ...base, fetchImpl: respond(401, "invalid apikey anon-key-should-never-leak") }),
    ]);
    for (const { body } of results) {
      expect(Object.keys(body).sort()).toEqual(["commit", "status", "supabase"]);
      expect(JSON.stringify(body)).not.toContain(base.anonKey);
    }
  });
});
