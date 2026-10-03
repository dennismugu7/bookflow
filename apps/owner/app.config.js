// Capture-only web target for design side-by-sides (ADR 0009): CAPTURE_WEB=1 adds "web" so
// `expo start --web` can render the screens. Shipped builds and updates stay Android-only.
module.exports = ({ config }) =>
  process.env.CAPTURE_WEB === "1" ? { ...config, platforms: [...config.platforms, "web"] } : config;
