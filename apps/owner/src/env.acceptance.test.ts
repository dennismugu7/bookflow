import { afterEach, describe, expect, it, vi } from "vitest";

describe("getEnv (owner)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns both values when they are set", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const { getEnv } = await import("./env");
    expect(getEnv()).toEqual({
      EXPO_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
  });

  it("names every missing key", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "");
    const { getEnv } = await import("./env");
    expect(() => getEnv()).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(() => getEnv()).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("rejects a URL that is not a URL", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const { getEnv } = await import("./env");
    expect(() => getEnv()).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });
});
