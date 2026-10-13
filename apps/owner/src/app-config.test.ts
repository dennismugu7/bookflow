import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { inflateSync } from "node:zlib";

import { afterEach, describe, expect, it } from "vitest";

import { SPLASH_COLORS } from "./lib/splash-motion";

const require = createRequire(import.meta.url);
type Config = Record<string, unknown> & {
  android: Record<string, unknown>;
  updates: Record<string, unknown>;
};
const appConfig = require("../app.config.js") as (ctx: { config: Config }) => Config;
const appJson = require("../app.json") as { expo: Config };

const FLAGS = [
  "BOOKFLOW_RELEASE_APK",
  "BOOKFLOW_VERSION_CODE",
  "BOOKFLOW_UPDATES_CHANNEL",
  "BOOKFLOW_DEBUG_APK",
  "GOOGLE_SERVICES_JSON",
  "CAPTURE_WEB",
];
const saved = Object.fromEntries(FLAGS.map((name) => [name, process.env[name]]));
afterEach(() => {
  for (const name of FLAGS) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

function build(env: Record<string, string>) {
  for (const name of FLAGS) delete process.env[name];
  Object.assign(process.env, env);
  return appConfig({ config: structuredClone(appJson.expo) });
}

describe("app.config.js", () => {
  it("leaves the config unchanged without flags (EAS builds)", () => {
    expect(build({})).toEqual(appJson.expo);
  });

  it("release APK: preview channel and the given versionCode", () => {
    const config = build({ BOOKFLOW_RELEASE_APK: "1", BOOKFLOW_VERSION_CODE: "3" });
    expect(config.android.versionCode).toBe(3);
    expect(config.updates.requestHeaders).toEqual({ "expo-channel-name": "preview" });
    expect(config.updates.url).toBe(appJson.expo.updates.url);
  });

  it("Play bundle: production channel", () => {
    const config = build({
      BOOKFLOW_RELEASE_APK: "1",
      BOOKFLOW_VERSION_CODE: "4",
      BOOKFLOW_UPDATES_CHANNEL: "production",
    });
    expect(config.android.versionCode).toBe(4);
    expect(config.updates.requestHeaders).toEqual({ "expo-channel-name": "production" });
  });

  it("the Play bundle differs from the release APK only in versionCode and channel", () => {
    const apk = build({ BOOKFLOW_RELEASE_APK: "1", BOOKFLOW_VERSION_CODE: "4" });
    const aab = build({
      BOOKFLOW_RELEASE_APK: "1",
      BOOKFLOW_VERSION_CODE: "4",
      BOOKFLOW_UPDATES_CHANNEL: "production",
    });
    expect({
      ...aab,
      updates: { ...aab.updates, requestHeaders: apk.updates.requestHeaders },
    }).toEqual(apk);
  });

  it("refuses an unknown channel", () => {
    expect(() =>
      build({
        BOOKFLOW_RELEASE_APK: "1",
        BOOKFLOW_VERSION_CODE: "4",
        BOOKFLOW_UPDATES_CHANNEL: "prod",
      }),
    ).toThrow(/preview.*production/);
  });

  it("refuses a release build without a versionCode", () => {
    expect(() => build({ BOOKFLOW_RELEASE_APK: "1" })).toThrow(/BOOKFLOW_VERSION_CODE/);
  });
});

describe("native splash (docs/specs/splash-animation.md)", () => {
  const splash = (appJson.expo.plugins as unknown[]).find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen",
  ) as [string, { backgroundColor: string; image: string }];

  it("is the animated splash's background, so the hand-off can't flash", () => {
    expect(splash[1].backgroundColor).toBe(SPLASH_COLORS.background);
  });

  it("shows no logo: its image is fully transparent", () => {
    const png = readFileSync(new URL(`../${splash[1].image}`, import.meta.url));
    // Colour type 6 (RGBA), and every pixel byte zero.
    expect(png[25]).toBe(6);
    const idat = png.indexOf("IDAT");
    const length = png.readUInt32BE(idat - 4);
    expect(inflateSync(png.subarray(idat + 4, idat + 4 + length)).every((byte) => byte === 0)).toBe(
      true,
    );
  });
});
