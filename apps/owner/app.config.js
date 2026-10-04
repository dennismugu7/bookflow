// Capture-only web target for design side-by-sides (ADR 0009): CAPTURE_WEB=1 adds "web" so
// `expo start --web` can render the screens. Shipped builds and updates stay Android-only.
// Push needs Firebase's google-services.json, which is never committed: EAS provides it as the
// file environment variable GOOGLE_SERVICES_JSON. Without it the app builds and runs, minus push.
module.exports = ({ config }) => {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  const android = googleServicesFile ? { ...config.android, googleServicesFile } : config.android;
  const platforms =
    process.env.CAPTURE_WEB === "1" ? [...config.platforms, "web"] : config.platforms;
  return { ...config, platforms, android };
};
