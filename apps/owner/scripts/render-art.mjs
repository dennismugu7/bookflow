// Renders the SVG sources in src/ui/illustrations/ to the PNGs the app bundles (React Native has
// no SVG renderer installed). Uses the workspace's Playwright from apps/web:
//   node apps/owner/scripts/render-art.mjs [name ...]   (no names: all of them)
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/ui/illustrations");
// name → width in px of the 1x PNG; @3x is enough for any Android density.
const ART = {
  planets: 156,
  screens: 172,
  map: 280,
  "logo-mark": 64,
  "brand-background": 390,
  "calendar-tick": 49,
};
// HTML sources (CSS gradients SVG can't match), rendered at their own size.
const HTML_ART = { "welcome-background": { width: 390, height: 844, scale: 2 } };
const only = process.argv.slice(2);
const wanted = (name) => only.length === 0 || only.includes(name);

const browser = await chromium.launch();
for (const [name, width] of Object.entries(ART).filter(([name]) => wanted(name))) {
  const svg = readFileSync(path.join(DIR, `${name}.svg`), "utf8");
  const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  const height = Math.round((width * Number(h)) / Number(w));
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 3 });
  await page.setContent(
    `<body style="margin:0;background:transparent">${svg.replace(/<svg /, `<svg style="display:block;width:${width}px;height:${height}px" `)}</body>`,
  );
  await page.screenshot({ path: path.join(DIR, `${name}.png`), omitBackground: true });
  await page.close();
  console.log(`${name}.png ${width * 3}×${height * 3}`);
}
for (const [name, { width, height, scale }] of Object.entries(HTML_ART)) {
  if (!wanted(name)) continue;
  const html = readFileSync(path.join(DIR, `${name}.html`), "utf8");
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.setContent(`<body style="margin:0">${html}</body>`);
  await page.screenshot({ path: path.join(DIR, `${name}.png`) });
  await page.close();
  console.log(`${name}.png ${width * scale}×${height * scale}`);
}
await browser.close();
