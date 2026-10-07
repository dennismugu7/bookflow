// Android versionCodes already used (release-versions.json, ops 05). Play rejects a repeated
// versionCode, so build-release-apk.ps1 -Bundle checks the new one here before building and
// records it after a successful build:
//   node scripts/release-versions.cjs check <versionCode>
//   node scripts/release-versions.cjs record <versionCode> <kind> <version> <commit>
const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(__dirname, "..", "release-versions.json");
// Google Play's largest allowed versionCode.
const MAX_VERSION_CODE = 2100000000;

function highestVersionCode(data) {
  return data.builds.reduce((max, build) => Math.max(max, build.versionCode), 0);
}

// Returns why versionCode can't be used, or null when it can.
function checkNewVersionCode(data, versionCode) {
  if (!Number.isInteger(versionCode) || versionCode < 1 || versionCode > MAX_VERSION_CODE)
    return `versionCode must be a whole number from 1 to ${MAX_VERSION_CODE}.`;
  const highest = highestVersionCode(data);
  if (versionCode <= highest)
    return `versionCode ${versionCode} is already used: pick one higher than ${highest} (release-versions.json).`;
  return null;
}

function recordBuild(data, build) {
  const problem = checkNewVersionCode(data, build.versionCode);
  if (problem) throw new Error(problem);
  return { ...data, builds: [...data.builds, build] };
}

function main([command, versionCodeArg, kind, version, commit]) {
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const versionCode = Number(versionCodeArg);
  if (command === "check") {
    const problem = checkNewVersionCode(data, versionCode);
    if (problem) {
      console.error(problem);
      process.exit(1);
    }
    return;
  }
  if (command === "record") {
    const date = new Date().toISOString().slice(0, 10);
    const next = recordBuild(data, { versionCode, kind, version, commit, date });
    fs.writeFileSync(FILE, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`Recorded versionCode ${versionCode} in release-versions.json.`);
    return;
  }
  console.error(
    "Usage: release-versions.cjs check <versionCode> | record <versionCode> <kind> <version> <commit>",
  );
  process.exit(1);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { highestVersionCode, checkNewVersionCode, recordBuild };
