// Capture-only web target for design side-by-sides (ADR 0009): CAPTURE_WEB=1 adds "web" so
// `expo start --web` can render the screens. Shipped builds and updates stay Android-only.
// Push needs Firebase's google-services.json, which is never committed: EAS provides it as the
// file environment variable GOOGLE_SERVICES_JSON. Without it the app builds and runs, minus push.
// BOOKFLOW_DEBUG_APK=1 is the testers' local debug APK only (scripts/build-debug-apk.ps1, ops 03):
// no dev client, the bundle embedded, no OTA updates, and "1.0.0-debug · <sha>" in Menu.
// BOOKFLOW_RELEASE_APK=1 is the local release APK (scripts/build-release-apk.ps1, ops 04): OTA
// updates on the "preview" channel like the EAS preview APK, the versionCode from
// BOOKFLOW_VERSION_CODE. BOOKFLOW_UPDATES_CHANNEL=production is the Play bundle (the same script
// with -Bundle, ops 05): the same config, OTA updates on "production" instead. Without either flag
// the config is unchanged.
module.exports = ({ config }) => {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  const android = googleServicesFile ? { ...config.android, googleServicesFile } : config.android;
  const platforms =
    process.env.CAPTURE_WEB === "1" ? [...config.platforms, "web"] : config.platforms;
  const result = { ...config, platforms, android };

  if (process.env.BOOKFLOW_RELEASE_APK === "1") {
    const versionCode = Number(process.env.BOOKFLOW_VERSION_CODE);
    if (!Number.isInteger(versionCode) || versionCode < 1)
      throw new Error("BOOKFLOW_RELEASE_APK=1 needs BOOKFLOW_VERSION_CODE (a whole number).");
    const channel = process.env.BOOKFLOW_UPDATES_CHANNEL || "preview";
    if (channel !== "preview" && channel !== "production")
      throw new Error("BOOKFLOW_UPDATES_CHANNEL must be preview or production.");
    return {
      ...result,
      android: { ...android, versionCode },
      // EAS writes the channel into the build; a local build has to name it itself.
      updates: { ...config.updates, requestHeaders: { "expo-channel-name": channel } },
    };
  }
  if (process.env.BOOKFLOW_DEBUG_APK !== "1") return result;

  const sha = process.env.BOOKFLOW_DEBUG_SHA || "unknown";
  return {
    ...result,
    plugins: [...config.plugins, "./plugins/with-debug-apk"],
    updates: { ...config.updates, enabled: false },
    extra: { ...config.extra, debugApk: { label: `${config.version}-debug · ${sha}` } },
  };
};
