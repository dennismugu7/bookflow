import { describe, expect, it, vi } from "vitest";

import { GOOGLE_ERROR } from "./google-auth";
import { createGoogleCallback } from "./google-callback";

const URL_OK = "bookflow://auth/callback?code=abc";

function setup(exchange = vi.fn(async (_code: string) => ({ error: null as Error | null }))) {
  return { exchange, callback: createGoogleCallback(exchange) };
}

describe("createGoogleCallback", () => {
  it("exchanges a code once, however many times the link arrives", async () => {
    const { exchange, callback } = setup();
    const [a, b] = await Promise.all([callback.complete(URL_OK), callback.complete(URL_OK)]);
    expect(await callback.complete(URL_OK)).toBe("signed-in");
    expect([a, b]).toEqual(["signed-in", "signed-in"]);
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(exchange).toHaveBeenCalledWith("abc");
  });

  it("is in progress while the code is exchanged", async () => {
    let finish!: () => void;
    const exchange = vi.fn(
      () => new Promise<{ error: null }>((resolve) => (finish = () => resolve({ error: null }))),
    );
    const { callback } = setup(exchange);
    const listener = vi.fn();
    callback.subscribe(listener);
    const done = callback.complete(URL_OK);
    expect(callback.getState()).toEqual({ pending: true, error: undefined });
    finish();
    await done;
    expect(callback.getState()).toEqual({ pending: false, error: undefined });
    expect(listener).toHaveBeenCalled();
  });

  it("keeps the error to show when the exchange fails", async () => {
    const { callback } = setup(vi.fn(async () => ({ error: new Error("invalid flow state") })));
    expect(await callback.complete(URL_OK)).toBe("error");
    expect(callback.getState()).toEqual({ pending: false, error: GOOGLE_ERROR });
    expect(callback.takeError()).toBe(GOOGLE_ERROR);
    expect(callback.takeError()).toBeUndefined();
  });

  it("keeps the error when the redirect carries one, without exchanging", async () => {
    const { exchange, callback } = setup();
    const url =
      "bookflow://auth/callback?error=server_error&error_description=Database+error+saving+new+user";
    expect(await callback.complete(url)).toBe("error");
    expect(exchange).not.toHaveBeenCalled();
    expect(callback.getState().error).toBe(GOOGLE_ERROR);
  });

  it("treats a thrown exchange as an error", async () => {
    const { callback } = setup(vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await callback.complete(URL_OK)).toBe("error");
    expect(callback.getState()).toEqual({ pending: false, error: GOOGLE_ERROR });
  });
});
