import { describe, expect, it } from "vitest";

import { debugApkLabel, formatBuildInfo, localApkLabel } from "./build-info";

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

describe("debugApkLabel", () => {
  it("reads the debug APK's label", () => {
    expect(debugApkLabel({ debugApk: { label: "0.5.0-debug · 1a2b3c4" } })).toBe(
      "0.5.0-debug · 1a2b3c4",
    );
  });

  it("is null for every other build", () => {
    expect(debugApkLabel({ eas: { projectId: "x" } })).toBeNull();
    expect(debugApkLabel(undefined)).toBeNull();
    expect(debugApkLabel({ debugApk: {} })).toBeNull();
  });

  it("is null for the release APK, so it never shows Google's error codes", () => {
    expect(debugApkLabel({ releaseApk: { label: "1.0.0" } })).toBeNull();
  });
});

describe("localApkLabel", () => {
  it("shows the release APK's plain version", () => {
    expect(localApkLabel({ releaseApk: { label: "1.0.0" } })).toBe("1.0.0");
  });

  it("shows the debug APK's label", () => {
    expect(localApkLabel({ debugApk: { label: "1.0.0-debug · 1a2b3c4" } })).toBe(
      "1.0.0-debug · 1a2b3c4",
    );
  });

  it("is null for EAS builds and OTA updates", () => {
    expect(localApkLabel({ eas: { projectId: "x" } })).toBeNull();
    expect(localApkLabel(undefined)).toBeNull();
    expect(localApkLabel({ releaseApk: {} })).toBeNull();
  });
});
