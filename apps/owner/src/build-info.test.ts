import { describe, expect, it } from "vitest";

import { debugApkLabel, formatVersionLine } from "./build-info";

describe("formatVersionLine", () => {
  it("shows the plain version when running the bundle shipped in the APK", () => {
    expect(
      formatVersionLine({
        version: "1.0.0",
        isEmbeddedLaunch: true,
        createdAt: new Date("2026-10-06T09:00:00Z"),
      }),
    ).toBe("1.0.0");
  });

  it("adds the update's date after an over-the-air update", () => {
    expect(
      formatVersionLine(
        { version: "1.0.0", isEmbeddedLaunch: false, createdAt: new Date("2026-10-07T09:00:00Z") },
        "Africa/Nairobi",
      ),
    ).toBe("1.0.0 · update 7 Oct");
  });

  it("uses the date in the given time zone", () => {
    expect(
      formatVersionLine(
        { version: "1.0.0", isEmbeddedLaunch: false, createdAt: new Date("2026-10-07T22:30:00Z") },
        "Africa/Nairobi",
      ),
    ).toBe("1.0.0 · update 8 Oct");
  });

  it("shows the plain version when updates are off or the date is unknown", () => {
    expect(formatVersionLine({ version: "1.0.0", isEmbeddedLaunch: false, createdAt: null })).toBe(
      "1.0.0",
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
});
