import { describe, expect, it, vi } from "vitest";

import { DELETE_ERROR, requestAccountDeletion, webUrl } from "./account-deletion";

const reply = (status: number, body: unknown) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

describe("requestAccountDeletion", () => {
  it("sends the token and the reason", async () => {
    const fetchImpl = reply(200, { deleted: true });
    await expect(
      requestAccountDeletion(
        { reason: "other", details: "  Moving  " },
        "tok",
        "https://x.test",
        fetchImpl,
      ),
    ).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith("https://x.test/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
      body: JSON.stringify({ reason: "other", details: "Moving" }),
    });
  });

  it("leaves out empty details", async () => {
    const fetchImpl = reply(200, { deleted: true });
    await requestAccountDeletion(
      { reason: "accident", details: " " },
      "tok",
      "https://x.test",
      fetchImpl,
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ body: '{"reason":"accident"}' });
  });

  it("shows the server's message", async () => {
    await expect(
      requestAccountDeletion(
        { reason: "accident", details: "" },
        "tok",
        "https://x.test",
        reply(429, {
          message: "Too many tries. Wait an hour and try again.",
        }),
      ),
    ).resolves.toEqual({ ok: false, message: "Too many tries. Wait an hour and try again." });
  });

  it("falls back to a plain message offline", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new Error("offline");
    });
    await expect(
      requestAccountDeletion(
        { reason: "accident", details: "" },
        "tok",
        "https://x.test",
        fetchImpl,
      ),
    ).resolves.toEqual({ ok: false, message: DELETE_ERROR });
  });
});

describe("webUrl", () => {
  it("defaults to production and trims a trailing slash", () => {
    expect(webUrl()).toBe("https://bookflow-web-pearl.vercel.app");
    expect(webUrl("http://10.0.2.2:3000/")).toBe("http://10.0.2.2:3000");
  });
});
