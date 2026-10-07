import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
type Build = { versionCode: number; kind: string; version: string; commit?: string; date?: string };
type Versions = { note?: string; builds: Build[] };
const lib = require("../scripts/release-versions.cjs") as {
  highestVersionCode: (data: Versions) => number;
  checkNewVersionCode: (data: Versions, versionCode: number) => string | null;
  recordBuild: (data: Versions, build: Build) => Versions;
};

const DATA: Versions = { builds: [{ versionCode: 3, kind: "eas", version: "1.0.0" }] };

describe("release versions", () => {
  it("knows the highest versionCode used", () => {
    expect(lib.highestVersionCode(DATA)).toBe(3);
    expect(
      lib.highestVersionCode({
        builds: [
          ...DATA.builds,
          { versionCode: 7, kind: "play-aab", version: "1.0.0" },
          { versionCode: 5, kind: "play-aab", version: "1.0.0" },
        ],
      }),
    ).toBe(7);
    expect(lib.highestVersionCode({ builds: [] })).toBe(0);
  });

  it("accepts the next number and anything higher", () => {
    expect(lib.checkNewVersionCode(DATA, 4)).toBeNull();
    expect(lib.checkNewVersionCode(DATA, 10)).toBeNull();
  });

  it("refuses a number lower than or equal to the highest", () => {
    expect(lib.checkNewVersionCode(DATA, 3)).toMatch(/higher than 3/);
    expect(lib.checkNewVersionCode(DATA, 1)).toMatch(/higher than 3/);
  });

  it("refuses something that isn't a whole positive number", () => {
    expect(lib.checkNewVersionCode(DATA, 4.5)).toMatch(/whole number/);
    expect(lib.checkNewVersionCode(DATA, Number.NaN)).toMatch(/whole number/);
    expect(lib.checkNewVersionCode(DATA, 2100000001)).toMatch(/whole number/);
  });

  it("records a build without changing the input", () => {
    const build = {
      versionCode: 4,
      kind: "play-aab",
      version: "1.0.0",
      commit: "abc1234",
      date: "2026-10-07",
    };
    const next = lib.recordBuild(DATA, build);
    expect(next.builds).toEqual([...DATA.builds, build]);
    expect(DATA.builds).toHaveLength(1);
    expect(lib.checkNewVersionCode(next, 4)).toMatch(/higher than 4/);
  });

  it("refuses to record a used number", () => {
    expect(() =>
      lib.recordBuild(DATA, { versionCode: 3, kind: "play-aab", version: "1.0.0" }),
    ).toThrow(/higher than 3/);
  });

  it("starts Play bundles at 4: the committed file holds EAS's 3", () => {
    const committed = require("../release-versions.json") as Versions;
    expect(lib.highestVersionCode(committed)).toBeGreaterThanOrEqual(3);
    expect(committed.builds.find((b) => b.kind === "eas")?.versionCode).toBe(3);
  });
});
