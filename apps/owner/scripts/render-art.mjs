// Renders the SVG sources in src/ui/illustrations/ to the PNGs the app bundles (React Native has
// no SVG renderer installed). Uses the workspace's Playwright from apps/web:
//   node apps/owner/scripts/render-art.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/ui/illustrations");
// name → width in px of the 1x PNG; @3x is enough for any Android density.
const ART = { planets: 156, screens: 172, map: 280, "logo-mark": 64, "brand-background": 390 };

const browser = await chromium.launch();
for (const [name, width] of Object.entries(ART)) {
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
// The native splash icon (app.json): the B mark, large enough for xxxhdpi at 107 dp.
{
  const svg = readFileSync(path.join(DIR, "logo-mark.svg"), "utf8");
  const page = await browser.newPage({
    viewport: { width: 107, height: 146 },
    deviceScaleFactor: 4,
  });
  await page.setContent(
    `<body style="margin:0;background:transparent">${svg.replace(/<svg /, '<svg style="display:block;width:107px;height:146px" ')}</body>`,
  );
  await page.screenshot({
    path: path.join(DIR, "../../../assets/images/splash-icon.png"),
    omitBackground: true,
  });
  await page.close();
  console.log("assets/images/splash-icon.png 428×584");
}
await browser.close();
