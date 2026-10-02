import { describe, expect, it } from "vitest";

import { formatBuildInfo } from "./build-info";

describe("formatBuildInfo", () => {
  it("shows channel and short update id for an OTA update", () => {
    expect(
      formatBuildInfo({
        channel: "preview",
        updateId: "1a2b3c4d-5e6f-7a8b-9c0d-112233445566",
        isEmbeddedLaunch: false,
      }),
    ).toBe("preview · 1a2b3c4d");
  });

  it("shows 'embedded' when running the bundle shipped in the APK", () => {
    expect(
      formatBuildInfo({
        channel: "preview",
        updateId: "1a2b3c4d-5e6f-7a8b-9c0d-112233445566",
        isEmbeddedLaunch: true,
      }),
    ).toBe("preview · embedded");
  });

  it("falls back to 'dev' and 'embedded' when updates are not configured", () => {
    expect(formatBuildInfo({ channel: null, updateId: null, isEmbeddedLaunch: false })).toBe(
      "dev · embedded",
    );
  });
});
