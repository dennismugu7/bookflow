import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

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
