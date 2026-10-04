import { describe, expect, it } from "vitest";

import { MIN_SPLASH_MS, splashHoldMs } from "./splash-timing";

describe("splashHoldMs", () => {
  it("holds the splash for the rest of the minimum when the app is ready early", () => {
    expect(splashHoldMs(1_000, 1_000)).toBe(MIN_SPLASH_MS);
    expect(splashHoldMs(1_000, 1_200)).toBe(400);
  });

  it("lets the splash fade at once when loading took longer than the minimum", () => {
    expect(splashHoldMs(1_000, 1_600)).toBe(0);
    expect(splashHoldMs(1_000, 5_000)).toBe(0);
  });

  it("keeps the minimum at 600 ms", () => {
    expect(MIN_SPLASH_MS).toBe(600);
  });
});
