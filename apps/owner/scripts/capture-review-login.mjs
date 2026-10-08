// Release 1.0.1, the Google Play reviewer login: design | live side-by-sides against
// docs/design/owner-v9 (ADR 0009) and a local end-to-end run on fake data:
//   1. pnpm db:start
//   2. in apps/web: NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
//      NEXT_PUBLIC_SUPABASE_ANON_KEY=<local publishable key> SUPABASE_SECRET_KEY=<local secret key>
//      REVIEW_PASSWORD=<a fake password of 24+ characters> pnpm exec next dev --port 3100
//   3. in apps/owner: CAPTURE_WEB=1 EXPO_NO_WEB_SETUP=1 EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
//      EXPO_PUBLIC_SUPABASE_ANON_KEY=<local publishable key> EXPO_PUBLIC_WEB_URL=http://localhost:3100
//      npx expo start --web --port 8106
//   4. REVIEW_PASSWORD=<the same fake password> node apps/owner/scripts/capture-review-login.mjs
// Live shots go to docs/portfolio/evidence/2026-10-08-release-1.0.1/, side-by-sides to
// design-ref/compare/owner9-<nn>.png (git-ignored). The password is never printed.
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(ROOT, "docs/portfolio/evidence/2026-10-08-release-1.0.1");
const MOCKUPS = path.join(ROOT, "docs/design/owner-v9");
const COMPARE = path.join(ROOT, "design-ref/compare");
const APP = process.env.CAPTURE_URL ?? "http://localhost:8106";
const WEB = process.env.CAPTURE_WEB_URL ?? "http://localhost:3100";
const PASSWORD = process.env.REVIEW_PASSWORD;
if (!PASSWORD || PASSWORD.length < 24) throw new Error("Set REVIEW_PASSWORD to the fake password.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(WEB)) throw new Error("Local web app only.");

const REVIEW_EMAIL = "support@mugu-labs.com";
const settle = (page, ms = 1200) => page.waitForTimeout(ms);

async function shot(page, name, mockup) {
  mkdirSync(OUT, { recursive: true });
  const live = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: live });
  console.log("captured", name);
  if (!mockup) return;
  mkdirSync(COMPARE, { recursive: true });
  const dataUrl = (file) => `data:image/png;base64,${readFileSync(file, "base64")}`;
  const sheet = await page
    .context()
    .browser()
    .newPage({ viewport: { width: 900, height: 900 } });
  // The mockups are 780 px wide (2x) with a note under the 844 pt phone; show the phone only.
  await sheet.setContent(
    `<body style="margin:0;background:#888;display:flex;gap:12px;padding:12px;width:max-content">
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">design owner-v9/${mockup}<div style="width:390px;height:844px;overflow:hidden;background:#ccc"><img src="${dataUrl(path.join(MOCKUPS, `${mockup}.png`))}" style="width:390px;display:block"></div></figure>
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">live ${name}<img src="${dataUrl(live)}" style="width:390px;display:block"></figure>
    </body>`,
  );
  await sheet.locator("body").screenshot({ path: path.join(COMPARE, `owner9-${name}.png`) });
  await sheet.close();
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await context.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = "*:focus, *:focus-visible { outline: none !important; }";
    document.head.append(style);
  });
});

// The phone app calls the web app with no CORS; the web target needs the headers added.
await context.route(`${WEB}/api/review-sign-in`, async (route) => {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST",
  };
  if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  const response = await route.fetch();
  await route.fulfill({ response, headers: { ...response.headers(), ...cors } });
});

const page = await context.newPage();
await page.goto(APP, { waitUntil: "domcontentloaded" });
// The first web bundle can take a while to build.
await page.getByRole("button", { name: "Sign in", exact: true }).click({ timeout: 180_000 });
const email = page.getByLabel("Email", { exact: true });
await email.fill("owner@example.com");
await page.getByRole("button", { name: "Send me a code" }).waitFor();
if (await page.getByLabel("Password", { exact: true }).count())
  throw new Error("Password shown for another email");
console.log("ok: other emails keep the code");

// 01: the password field, 20 dots as in the mockup.
await email.fill(REVIEW_EMAIL);
const password = page.getByLabel("Password", { exact: true });
await password.fill("x".repeat(20));
await email.blur();
await password.blur();
await settle(page);
await shot(page, "01-review-password", "01-review-password");

// 02: a wrong password (7 characters, as in the mockup).
await password.fill("wrong12");
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByText("That password isn't right. Try again.").waitFor();
await password.blur();
await settle(page);
await shot(page, "02-wrong-password", "02-wrong-password");

// The right password goes to Today with the demo salon.
await password.fill(PASSWORD);
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("tab", { name: "Today" }).waitFor({ timeout: 30_000 });
await settle(page, 2500);
await shot(page, "03-today-demo-salon");
console.log("ok: the right password opens Today");

await browser.close();
