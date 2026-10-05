// Ops 03: the testers' debug APK (docs/specs/ops-03-debug-apk.md). Only applied when
// BOOKFLOW_DEBUG_APK=1 (see app.config.js), so EAS builds never see it.
//  - Leaves expo-dev-client (and its launcher and menu) out of autolinking: in a debug build the
//    launcher would otherwise open instead of the app.
//  - Embeds the JS bundle in the debug variant (React Native's debuggableVariants), so the APK
//    opens without Metro.
const { withAppBuildGradle, withSettingsGradle } = require("expo/config-plugins");

const DEV_CLIENT_MODULES = [
  "expo-dev-client",
  "expo-dev-launcher",
  "expo-dev-menu",
  "expo-dev-menu-interface",
];
const MARK = "// bookflow-debug-apk";

function excludeDevClient(contents) {
  if (contents.includes(MARK)) return contents;
  const anchor = "expoAutolinking.useExpoModules()";
  if (!contents.includes(anchor))
    throw new Error(`with-debug-apk: "${anchor}" not found in settings.gradle`);
  const list = DEV_CLIENT_MODULES.map((name) => `"${name}"`).join(", ");
  return contents.replace(anchor, `expoAutolinking.exclude = [${list}] ${MARK}\n${anchor}`);
}

function embedBundleInDebug(contents) {
  if (contents.includes(MARK)) return contents;
  const anchor = /^react \{$/m;
  if (!anchor.test(contents))
    throw new Error("with-debug-apk: `react {` not found in app/build.gradle");
  return contents.replace(anchor, `react {\n    debuggableVariants = [] ${MARK}`);
}

module.exports = function withDebugApk(config) {
  config = withSettingsGradle(config, (c) => {
    c.modResults.contents = excludeDevClient(c.modResults.contents);
    return c;
  });
  return withAppBuildGradle(config, (c) => {
    c.modResults.contents = embedBundleInDebug(c.modResults.contents);
    return c;
  });
};

module.exports.excludeDevClient = excludeDevClient;
module.exports.embedBundleInDebug = embedBundleInDebug;
