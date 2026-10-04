// Release 0.5.0, Google sign-in and notifications: design | live side-by-sides against
// docs/design/owner-v5 (ADR 0009) and the spec's checks that the web target can show, on fake data
// against the local Supabase stack. Same setup as capture.mjs (Expo's web target), then:
//   SUPABASE_SECRET_KEY=<local secret key> CAPTURE_URL=http://localhost:8105 \
//     node apps/owner/scripts/capture-notifications.mjs
// Live shots go to docs/portfolio/evidence/2026-10-04-owner-0.5.0/, side-by-sides to
// design-ref/compare/owner5-<nn>.png (git-ignored). 04 (Android's shade) needs a phone.
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(ROOT, "docs/portfolio/evidence/2026-10-04-owner-0.5.0");
const MOCKUPS = path.join(ROOT, "docs/design/owner-v5");
const COMPARE = path.join(ROOT, "design-ref/compare");
const APP = process.env.CAPTURE_URL ?? "http://localhost:8105";
const API = process.env.CAPTURE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const MAILBOX = process.env.CAPTURE_MAILBOX_URL ?? "http://127.0.0.1:54324";
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SECRET) throw new Error("Set SUPABASE_SECRET_KEY to the local stack's secret key.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(API)) throw new Error("Local Supabase only.");

const RUN = Date.now().toString(36);
const admin = { apikey: SECRET, Authorization: `Bearer ${SECRET}` };

async function rest(pathname, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: { ...admin, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${pathname}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const insert = (table, body) =>
  rest(`/rest/v1/${table}`, { method: "POST", headers: { Prefer: "return=representation" }, body });

/** A salon (not published: the tabs need nothing more) owned by `email`. Fake names only. */
async function seedOwner(email) {
  const owner = await rest("/auth/v1/admin/users", {
    method: "POST",
    body: { email, email_confirm: true },
  });
  const [salon] = await insert("salons", {
    slug: `amani-notify-${RUN}`,
    name: "Amani Beauty Studio",
  });
  await insert("salon_members", { salon_id: salon.id, user_id: owner.id, role: "owner" });
}

async function latestCode(email) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const list = await (
      await fetch(`${MAILBOX}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json();
    const id = list.messages?.[0]?.ID;
    if (id) {
      const message = await (await fetch(`${MAILBOX}/api/v1/message/${id}`)).json();
      const code = /\b(\d{6})\b/.exec(message.Text ?? "")?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No code email for ${email}`);
}

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
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">design owner-v5/${mockup}<div style="width:390px;height:844px;overflow:hidden;background:#ccc"><img src="${dataUrl(path.join(MOCKUPS, `${mockup}.png`))}" style="width:390px;display:block"></div></figure>
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">live ${name}<img src="${dataUrl(live)}" style="width:390px;display:block"></figure>
    </body>`,
  );
  await sheet.locator("body").screenshot({ path: path.join(COMPARE, `${name}.png`) });
  await sheet.close();
}

function check(ok, message) {
  if (!ok) throw new Error(`FAILED: ${message}`);
  console.log(`ok: ${message}`);
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
const page = await context.newPage();
await page.goto(APP, { waitUntil: "domcontentloaded" });

// 01: Sign in, the email field focused with the mockup's address.
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("button", { name: "Continue with Google" }).waitFor();
await page.getByLabel("Email", { exact: true }).fill("salome@example.com");
await settle(page);
await shot(page, "owner5-01-sign-in", "01-sign-in");
check(
  (await page.getByText("Sign in to Bookflow").count()) === 1,
  "the sheet says Sign in to Bookflow",
);
check(
  (await page.getByText(/By continuing you agree/).count()) === 0,
  "no Terms line when signing in",
);

// Google: Supabase is asked for a PKCE sign-in that returns to bookflow://auth/callback.
// The local stack has no real Google client, so Google itself shows an error in the popup.
const popup = page.waitForEvent("popup", { timeout: 10_000 }).catch(() => null);
const authorize = context
  .waitForEvent("request", {
    predicate: (r) => r.url().includes("/auth/v1/authorize"),
    timeout: 10_000,
  })
  .catch(() => null);
await page.getByRole("button", { name: "Continue with Google" }).click();
const opened = await popup;
const url = new URL((await authorize)?.url() ?? "about:blank");
check(
  url.searchParams.get("provider") === "google",
  "Continue with Google opens Supabase's Google sign-in",
);
check(
  url.searchParams.get("redirect_to") === "bookflow://auth/callback",
  "it returns to bookflow://auth/callback",
);
check(url.searchParams.get("code_challenge_method")?.toLowerCase() === "s256", "it uses PKCE");
await opened?.close();
await settle(page, 1500);
check(
  (await page.getByText("Google sign-in didn't finish. Try again or use your email.").count()) ===
    0,
  "closing the browser stays on the sheet silently",
);

// 02: Create account.
await page.getByRole("button", { name: "Back" }).click();
await page.getByRole("button", { name: "Create for free" }).click();
await page.getByText("Create your Bookflow account").waitFor();
await page.getByLabel("Email", { exact: true }).fill("salome@example.com");
await settle(page);
await shot(page, "owner5-02-create-account", "02-create-account");
check(
  (await page.getByRole("link", { name: "Terms" }).count()) === 1,
  "Create account links the Terms",
);
check(
  (await page.getByRole("link", { name: "Privacy Policy" }).count()) === 1,
  "and the Privacy Policy",
);

// The email code still works (PKCE flow), into the tabs.
const owner = `notify.owner.${RUN}@example.com`;
await seedOwner(owner);
await page.getByLabel("Email", { exact: true }).fill(owner);
await page.getByRole("button", { name: "Send me a code" }).click();
await page.getByLabel("Verification code").waitFor();
await settle(page);
await shot(page, "owner5-04b-enter-code");
await page.getByLabel("Verification code").fill(await latestCode(owner));
await page.getByRole("tab", { name: "Menu" }).waitFor({ timeout: 15_000 });
check(true, "an email code still signs in with the PKCE flow");

// Menu → Notifications (05). The web target has no notification permission, so it shows the
// "Open phone settings" line, as the mockup does.
await page.getByRole("tab", { name: "Menu" }).click();
await page.getByRole("button", { name: "Notifications" }).click();
const morning = page.getByRole("switch", { name: "Morning summary" });
await morning.waitFor();
await settle(page);
await shot(page, "owner5-05-notification-settings", "05-notification-settings");
check(
  (await page.getByRole("switch", { name: "New bookings" }).getAttribute("aria-checked")) ===
    "true" &&
    (await page.getByRole("switch", { name: "Cancellations" }).getAttribute("aria-checked")) ===
      "true" &&
    (await morning.getAttribute("aria-checked")) === "false",
  "new bookings and cancellations start on, the morning summary off",
);
await morning.click();
await settle(page, 1200);
await page.reload();
await page.getByRole("switch", { name: "Morning summary" }).waitFor();
await settle(page, 1200);
check(
  (await page.getByRole("switch", { name: "Morning summary" }).getAttribute("aria-checked")) ===
    "true",
  "a switch is saved straight away and still on after a reload",
);
await page.getByRole("switch", { name: "Morning summary" }).click();
await settle(page, 1000);

// 03: Turn on notifications (shown automatically on Android only; opened directly here).
await page.goto(`${APP}/allow-notifications`, { waitUntil: "domcontentloaded" });
await page.getByText("Know the moment someone books").waitFor();
await settle(page);
await shot(page, "owner5-03-allow-notifications", "03-allow-notifications");
await page.getByRole("button", { name: "Not now" }).click();
await page.getByRole("tab", { name: "Today" }).waitFor();
check(true, "Not now goes to the tabs");

await browser.close();
