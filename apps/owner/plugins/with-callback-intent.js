// Release 1.0.0: Google sign-in for new accounts. While the user is in Chrome, Android may kill
// the app to free memory. Chrome's bookflow://auth/callback link then restarts it, but the link
// arrives through onNewIntent before JS has loaded, where React Native drops it, and the activity
// keeps its old launcher intent, so Linking.getInitialURL() never sees the code. Keeping the
// newest intent as the activity's intent lets getInitialURL() read the callback.
const { withMainActivity } = require("expo/config-plugins");

const MARK = "// bookflow-callback-intent";

const ON_NEW_INTENT = `
  ${MARK}: Linking.getInitialURL() reads the newest link, also one that arrived before JS loaded.
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
`;

function keepNewIntent(contents) {
  if (contents.includes(MARK)) return contents;
  if (/override fun onNewIntent/.test(contents))
    throw new Error("with-callback-intent: MainActivity already overrides onNewIntent");
  const classStart = /class MainActivity : ReactActivity\(\) \{\n/;
  if (!classStart.test(contents))
    throw new Error("with-callback-intent: MainActivity class not found");
  const withImport = contents.includes("import android.content.Intent\n")
    ? contents
    : contents.replace("import android.os.Bundle\n", "import android.content.Intent\nimport android.os.Bundle\n");
  if (!withImport.includes("import android.content.Intent\n"))
    throw new Error("with-callback-intent: import anchor not found in MainActivity");
  return withImport.replace(classStart, (start) => `${start}${ON_NEW_INTENT}\n`);
}

module.exports = function withCallbackIntent(config) {
  return withMainActivity(config, (c) => {
    if (c.modResults.language !== "kt")
      throw new Error("with-callback-intent: expected a Kotlin MainActivity");
    c.modResults.contents = keepNewIntent(c.modResults.contents);
    return c;
  });
};

module.exports.keepNewIntent = keepNewIntent;
