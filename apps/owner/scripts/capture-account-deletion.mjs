// Release prep 1, privacy, terms and deleting an account: design | live side-by-sides against
// docs/design/owner-v7 (ADR 0009), and the spec's local end-to-end run, on fake data against the
// local Supabase stack:
//   1. pnpm db:start
//   2. in apps/web: NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
//      NEXT_PUBLIC_SUPABASE_ANON_KEY=<local publishable key> SUPABASE_SECRET_KEY=<local secret key>
//      pnpm exec next dev --port 3100
//   3. in apps/owner: CAPTURE_WEB=1 EXPO_NO_WEB_SETUP=1 EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
//      EXPO_PUBLIC_SUPABASE_ANON_KEY=<local publishable key> EXPO_PUBLIC_WEB_URL=http://localhost:3100
//      npx expo start --web --port 8106
//   4. SUPABASE_SECRET_KEY=<local secret key> node apps/owner/scripts/capture-account-deletion.mjs
// Live shots go to docs/portfolio/evidence/2026-10-06-release-prep-1/, side-by-sides to
// design-ref/compare/owner7-<nn>.png (git-ignored).
import { Buffer } from "node:buffer";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(ROOT, "docs/portfolio/evidence/2026-10-06-release-prep-1");
const MOCKUPS = path.join(ROOT, "docs/design/owner-v7");
const COMPARE = path.join(ROOT, "design-ref/compare");
const APP = process.env.CAPTURE_URL ?? "http://localhost:8106";
const WEB = process.env.CAPTURE_WEB_URL ?? "http://localhost:3100";
const API = process.env.CAPTURE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const MAILBOX = process.env.CAPTURE_MAILBOX_URL ?? "http://127.0.0.1:54324";
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SECRET) throw new Error("Set SUPABASE_SECRET_KEY to the local stack's secret key.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(API)) throw new Error("Local Supabase only.");

const RUN = Date.now().toString(36);
const OWNER = "salome@example.com";
const CO_OWNER = `co.owner.${RUN}@example.com`;
const CLIENT = "wanjiru@example.com";
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

async function userByEmail(email) {
  const { users } = await rest("/auth/v1/admin/users?per_page=1000");
  return users.find((u) => u.email === email) ?? null;
}

/** Earlier runs' fake people, so the mockup's addresses can be used every time. */
async function reset() {
  for (const email of [OWNER, CLIENT]) {
    const user = await userByEmail(email);
    if (!user) continue;
    const members = await rest(`/rest/v1/salon_members?user_id=eq.${user.id}&select=salon_id`);
    for (const m of members)
      await rest(`/rest/v1/salons?id=eq.${m.salon_id}`, { method: "DELETE" });
    await rest(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
  }
}

const later = (days, hour) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};
const range = (start) =>
  `[${start.toISOString()},${new Date(start.getTime() + 30 * 60_000).toISOString()})`;

async function seedSalon(name, slug) {
  const [salon] = await insert("salons", { slug: `${slug}-${RUN}`, name });
  const [staff] = await insert("staff", { salon_id: salon.id, display_name: "Njeri" });
  return { salon, staff };
}

async function uploadPhoto(salonId, file) {
  const objectPath = `${salonId}/banner/${file}`;
  const res = await fetch(`${API}/storage/v1/object/salon-media/${objectPath}`, {
    method: "POST",
    headers: { ...admin, "Content-Type": "image/jpeg", "x-upsert": "true" },
    // A tiny valid JPEG is enough: only its presence is checked.
    body: Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      "base64",
    ),
  });
  if (!res.ok) throw new Error(`upload ${objectPath}: ${res.status} ${await res.text()}`);
}

async function mediaCount(salonId) {
  const list = await rest(`/storage/v1/object/list/salon-media`, {
    method: "POST",
    body: { prefix: `${salonId}/banner`, limit: 100 },
  });
  return list.length;
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

async function clearMailbox() {
  await fetch(`${MAILBOX}/api/v1/messages`, { method: "DELETE" }).catch(() => undefined);
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
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">design owner-v7/${mockup}<div style="width:390px;height:844px;overflow:hidden;background:#ccc"><img src="${dataUrl(path.join(MOCKUPS, `${mockup}.png`))}" style="width:390px;display:block"></div></figure>
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

// Seed ------------------------------------------------------------------------------------------

await reset();
await clearMailbox();
const owner = await rest("/auth/v1/admin/users", {
  method: "POST",
  body: { email: OWNER, email_confirm: true },
});
const coOwner = await rest("/auth/v1/admin/users", {
  method: "POST",
  body: { email: CO_OWNER, email_confirm: true },
});
const client = await rest("/auth/v1/admin/users", {
  method: "POST",
  body: { email: CLIENT, email_confirm: true },
});

// Salome Saloon: owned alone, 4 upcoming bookings and 2 photos. Shared Studio: co-owned.
const own = await seedSalon("Salome Saloon", "salome-saloon");
const shared = await seedSalon("Shared Studio", "shared-studio");
await insert("salon_members", [
  { salon_id: own.salon.id, user_id: owner.id, role: "owner" },
  { salon_id: shared.salon.id, user_id: owner.id, role: "owner" },
  { salon_id: shared.salon.id, user_id: coOwner.id, role: "owner" },
]);
await uploadPhoto(own.salon.id, "a.jpg");
await uploadPhoto(own.salon.id, "b.jpg");
await uploadPhoto(shared.salon.id, "c.jpg");

const [ownClient] = await insert("clients", {
  salon_id: own.salon.id,
  full_name: "Achieng Mwangi",
  phone: "+254700000061",
});
await insert(
  "bookings",
  [1, 2, 3, 4].map((day) => ({
    salon_id: own.salon.id,
    staff_id: own.staff.id,
    client_id: ownClient.id,
    status: "confirmed",
    period: range(later(day, 8)),
    total_kes: 1200,
    source: "owner",
  })),
);

// The client has visited the shared salon (a past visit) and books with their account.
const [visit] = await insert("clients", {
  salon_id: shared.salon.id,
  full_name: "Wanjiru Otieno",
  phone: "+254700000062",
  email: CLIENT,
  user_id: client.id,
});
await insert("bookings", {
  salon_id: shared.salon.id,
  staff_id: shared.staff.id,
  client_id: visit.id,
  status: "completed",
  period: range(later(-3, 8)),
  total_kes: 1500,
  source: "web",
});

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await context.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    // No focus rings, and no Next.js dev badge on the web pages.
    style.textContent =
      "*:focus, *:focus-visible { outline: none !important; } nextjs-portal { display: none !important; }";
    document.head.append(style);
  });
});

// The phone app calls the web app with no CORS; the web target needs the headers added.
await context.route(`${WEB}/api/account/delete`, async (route) => {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "POST",
  };
  if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  const response = await route.fetch();
  await route.fulfill({ response, headers: { ...response.headers(), ...cors } });
});

// Owner app -------------------------------------------------------------------------------------

const page = await context.newPage();
await page.goto(APP, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByLabel("Email", { exact: true }).fill(OWNER);
await page.getByRole("button", { name: "Send me a code" }).click();
await page.getByLabel("Verification code").waitFor();
await page.getByLabel("Verification code").fill(await latestCode(OWNER));
await page.getByRole("tab", { name: "Menu" }).waitFor({ timeout: 15_000 });

// 01: Menu with the Settings row.
await page.getByRole("tab", { name: "Menu" }).click();
await page.getByRole("button", { name: "Settings" }).waitFor();
await settle(page);
await shot(page, "owner7-01-menu-settings", "01-menu-settings");

// 02: Settings.
await page.getByRole("button", { name: "Settings" }).click();
await page.getByRole("button", { name: "Delete account" }).waitFor();
await settle(page);
await shot(page, "owner7-02-settings", "02-settings");
const popup = page.waitForEvent("popup", { timeout: 10_000 });
await page.getByRole("link", { name: "Privacy policy" }).click();
const privacy = await popup;
check(privacy.url().endsWith("/privacy"), "Privacy policy opens the web page");
await privacy.close();

// 03: reasons. Continue is off until a reason (and text for Something else).
await page.getByRole("button", { name: "Delete account" }).click();
const next = page.getByRole("button", { name: "Continue" });
await next.waitFor();
check((await next.getAttribute("aria-disabled")) === "true", "Continue is off without a reason");
await page.getByRole("radio", { name: /Something else/ }).click();
check((await next.getAttribute("aria-disabled")) === "true", "Something else needs some text");
await page.getByRole("textbox", { name: "Tell us more" }).fill("Moving to a new town");
check((await next.getAttribute("aria-disabled")) !== "true", "then Continue works");
await page.getByRole("textbox", { name: "Tell us more" }).blur();
await settle(page);
await shot(page, "owner7-03-delete-reasons", "03-delete-reasons");

// × goes back to Settings.
await page.getByRole("button", { name: "Close" }).click();
await page.getByRole("link", { name: "Terms of service" }).waitFor();
check(true, "× goes back to Settings");
await page.getByRole("button", { name: "Delete account" }).click();
await page.getByRole("radio", { name: /Something else/ }).click();
await page.getByRole("textbox", { name: "Tell us more" }).fill("Moving to a new town");
await page.getByRole("button", { name: "Continue" }).click();

// 04: confirm names the salon owned alone and warns about its 4 upcoming bookings.
const remove = page.getByRole("button", { name: "Delete account" });
await page.getByText("Salome Saloon", { exact: true }).filter({ visible: true }).waitFor();
check(
  (await page.getByText("Shared Studio").filter({ visible: true }).count()) === 0,
  "a co-owned salon isn't named",
);
check(
  (await page.getByText("4 upcoming bookings").filter({ visible: true }).count()) === 1,
  "the upcoming warning shows",
);
check((await remove.getAttribute("aria-disabled")) === "true", "Delete is off until ticked");
await page.getByRole("checkbox").click();
check((await remove.getAttribute("aria-disabled")) !== "true", "ticking enables Delete");
await settle(page);
await shot(page, "owner7-04-delete-confirm", "04-delete-confirm");

// 05: deleted.
await remove.click();
await page.getByText("Your account has been deleted").waitFor({ timeout: 20_000 });
await settle(page, 1500);
await shot(page, "owner7-05-account-deleted", "05-account-deleted");

check((await userByEmail(OWNER)) === null, "the owner's auth user is gone");
check(
  (await rest(`/rest/v1/salons?id=eq.${own.salon.id}&select=id`)).length === 0,
  "the salon owned alone is gone",
);
check(
  (await rest(`/rest/v1/bookings?salon_id=eq.${own.salon.id}&select=id`)).length === 0,
  "with its bookings",
);
check((await mediaCount(own.salon.id)) === 0, "and its photos in storage");
check(
  (await rest(`/rest/v1/salons?id=eq.${shared.salon.id}&select=id`)).length === 1,
  "the co-owned salon remains",
);
check((await mediaCount(shared.salon.id)) === 1, "with its photos");
const sharedOwners = await rest(
  `/rest/v1/salon_members?salon_id=eq.${shared.salon.id}&select=user_id`,
);
check(
  sharedOwners.length === 1 && sharedOwners[0].user_id === coOwner.id,
  "kept by its other owner",
);

await page.getByRole("button", { name: "Done" }).click();
await page.getByRole("button", { name: "Create for free" }).waitFor();
check(true, "Done goes to Welcome");
await page.goBack();
await settle(page, 1500);
check(
  (await page.getByRole("tab", { name: "Menu" }).count()) === 0,
  "back doesn't return into the app",
);

// Web: privacy, terms, delete-account ------------------------------------------------------------

const web = await context.newPage();
await web.goto(`${WEB}/privacy`);
await web.getByRole("heading", { name: "Privacy policy" }).waitFor();
await settle(web);
await shot(web, "owner7-07-web-privacy", "07-web-privacy");
check(
  (await web.locator('meta[name="robots"][content*="noindex"]').count()) === 0,
  "/privacy is indexable",
);
check((await web.locator("h2#your-rights").count()) === 1, "headings have anchors");
await web.goto(`${WEB}/terms`);
await web.getByRole("heading", { name: "Terms of service" }).waitFor();
await shot(web, "owner7-07b-web-terms");

const errors = [];
web.on("pageerror", (e) => errors.push(e.message));
await web.goto(`${WEB}/delete-account`);
await web.getByLabel("Email").fill(CLIENT);
await settle(web);
await shot(web, "owner7-06-web-delete-account", "06-web-delete-account");
await web.getByRole("button", { name: "Send me a code" }).click();
await web.locator("#otp").waitFor();
await web.locator("#otp").fill(await latestCode(CLIENT));
const webNext = web.getByRole("button", { name: "Continue" });
await webNext.waitFor({ timeout: 15_000 });
await web.getByText("I created this account by accident.").click();
await settle(web);
await shot(web, "owner7-06b-web-reasons");
await webNext.click();
await web.getByText("I know I won't be able to access my bookings.").click();
await settle(web);
await shot(web, "owner7-06c-web-confirm");
await web.getByRole("button", { name: "Delete account" }).click();
await web.getByText("Your account has been deleted").waitFor({ timeout: 20_000 });
await settle(web);
await shot(web, "owner7-06d-web-deleted");
check(errors.length === 0, `no JavaScript errors on /delete-account (${errors.join("; ")})`);

check((await userByEmail(CLIENT)) === null, "the client's auth user is gone");
const [kept] = await rest(`/rest/v1/clients?id=eq.${visit.id}&select=email,user_id`);
check(
  !!kept && kept.email === null && kept.user_id === null,
  "the visit stays, without email or account",
);
check(
  (await rest(`/rest/v1/bookings?client_id=eq.${visit.id}&select=id`)).length === 1,
  "with its booking",
);

// After deleting, the visitor is signed out: the page starts at the email step again.
await web.goto(`${WEB}/delete-account`);
await web.getByLabel("Email").waitFor();
check(true, "signed out again after deleting (the email step shows)");

await browser.close();
