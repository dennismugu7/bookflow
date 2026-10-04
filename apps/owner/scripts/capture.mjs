// Design | live side-by-sides for the owner app (ADR 0009), rendered with Expo's web target, which
// exists for capture only. Fake data only, against the local Supabase stack:
//   1. pnpm db:start
//   2. in apps/owner: CAPTURE_WEB=1 EXPO_NO_WEB_SETUP=1 EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
//      EXPO_PUBLIC_SUPABASE_ANON_KEY=<local publishable key> npx expo start --web --port 8099
//   3. SUPABASE_SECRET_KEY=<local secret key> node apps/owner/scripts/capture.mjs
// Live shots go to docs/portfolio/evidence/2026-10-04-owner-fidelity/; when Dennis's originals are
// in design-ref/original-owner/ (git-ignored), design | live images go to design-ref/compare/.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(ROOT, "docs/portfolio/evidence/2026-10-04-owner-fidelity");
const DESIGNS = path.join(ROOT, "design-ref/original-owner");
const COMPARE = path.join(ROOT, "design-ref/compare");
const APP = process.env.CAPTURE_URL ?? "http://localhost:8099";
const API = process.env.CAPTURE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const MAILBOX = process.env.CAPTURE_MAILBOX_URL ?? "http://127.0.0.1:54324";
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SECRET) throw new Error("Set SUPABASE_SECRET_KEY to the local stack's secret key.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(API)) throw new Error("Local Supabase only.");

const NEW_OWNER = "new.owner@example.com";
const FULL_OWNER = "amina.owner@example.com";
const SLUGS = ["kito-hair-lounge", "amani-beauty-showcase"];

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

/** Removes earlier capture data, so every run starts from the same state. */
async function reset() {
  for (const slug of SLUGS) await rest(`/rest/v1/salons?slug=eq.${slug}`, { method: "DELETE" });
  const { users } = await rest("/auth/v1/admin/users?per_page=1000");
  for (const user of users.filter((u) => [NEW_OWNER, FULL_OWNER].includes(u.email))) {
    await rest(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
  }
}

async function render(browser, html, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(`<body style="margin:0">${html}</body>`);
  const jpeg = await page.screenshot({ type: "jpeg", quality: 85 });
  await page.close();
  return jpeg;
}

async function upload(salonId, kind, id, jpeg) {
  const objectPath = `${salonId}/${kind}/${id}.jpg`;
  const res = await fetch(`${API}/storage/v1/object/salon-media/${objectPath}`, {
    method: "POST",
    headers: { ...admin, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: new Uint8Array(jpeg),
  });
  if (!res.ok) throw new Error(`upload ${objectPath}: ${res.status}`);
  return objectPath;
}

/** A published salon with brand, services, team, hours and location. Fake names only. */
async function seedFullSalon(browser) {
  const user = await rest("/auth/v1/admin/users", {
    method: "POST",
    body: { email: FULL_OWNER, email_confirm: true },
  });
  const [salon] = await rest("/rest/v1/salons", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: {
      slug: "amani-beauty-showcase",
      name: "Amani Beauty Studio",
      tagline: "Look your best, feel your best",
      about: "Natural hair, braids and silk presses in Kilimani.",
      address: "2nd floor, Galana Plaza, Kilimani, Nairobi",
      maps_url: "https://www.google.com/maps?q=-1.29207,36.78614",
      latitude: -1.29207,
      longitude: 36.78614,
    },
  });
  await rest("/rest/v1/salon_members", {
    method: "POST",
    body: { salon_id: salon.id, user_id: user.id, role: "owner" },
  });

  // Abstract artwork rendered here, so no third-party photos are involved.
  const banner = await render(
    browser,
    `<div style="width:1200px;height:610px;background:linear-gradient(135deg,#d9c3a5 0,#8a5a44 45%,#3b2a24 100%)"></div>`,
    1200,
    610,
  );
  const logo = await render(
    browser,
    `<div style="width:256px;height:256px;background:#fff;display:flex;align-items:center;justify-content:center;font:italic 700 170px Georgia,serif;color:#d9a53a">A</div>`,
    256,
    256,
  );
  const logoPath = await upload(salon.id, "logo", "c0ffee00-0000-4000-8000-000000000001", logo);
  const bannerPath = await upload(
    salon.id,
    "banner",
    "c0ffee00-0000-4000-8000-000000000002",
    banner,
  );
  await rest(`/rest/v1/salons?id=eq.${salon.id}`, {
    method: "PATCH",
    body: { logo_path: logoPath, banner_path: bannerPath },
  });

  const services = await rest("/rest/v1/services", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: [
      { salon_id: salon.id, name: "Silk press", duration_min: 60, price_kes: 1500, sort_order: 1 },
      { salon_id: salon.id, name: "Box braids", duration_min: 180, price_kes: 3500, sort_order: 2 },
      {
        salon_id: salon.id,
        name: "Beard shape-up",
        duration_min: 20,
        price_kes: 400,
        sort_order: 3,
      },
      { salon_id: salon.id, name: "Cornrows", duration_min: 90, price_kes: 1800, sort_order: 4 },
    ],
  });
  const team = [
    ["Njeri Kamau", "Stylist", "#c98f6b"],
    ["Achieng Ouma", "Braider", "#8f6bc9"],
    ["Wanjiru Mwangi", "Silk press specialist", "#6bc9a8"],
  ];
  const staff = [];
  for (const [index, [name, title, tint]] of team.entries()) {
    const photo = await render(
      browser,
      `<div style="width:400px;height:400px;background:radial-gradient(circle at 50% 38%,#f3e3d3 0 22%,${tint} 23% 100%);display:flex;align-items:flex-end;justify-content:center"><div style="width:250px;height:150px;border-radius:125px 125px 0 0;background:#3a3a4a"></div></div>`,
      400,
      400,
    );
    const photoPath = await upload(
      salon.id,
      "staff",
      `c0ffee00-0000-4000-8000-00000000001${index}`,
      photo,
    );
    const [row] = await rest("/rest/v1/staff", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: {
        salon_id: salon.id,
        display_name: name,
        title,
        bio: `${name.split(" ")[0]} has eight years of experience with natural hair, protective styles and silk presses, and loves a look that lasts all week.`,
        photo_path: photoPath,
        sort_order: index + 1,
      },
    });
    staff.push(row);
  }
  await rest("/rest/v1/staff_services", {
    method: "POST",
    body: staff.flatMap((s) =>
      services.map((v) => ({ salon_id: salon.id, staff_id: s.id, service_id: v.id })),
    ),
  });
  await rest("/rest/v1/opening_hours", {
    method: "POST",
    body: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      salon_id: salon.id,
      weekday,
      opens: weekday === 5 ? "12:30" : "10:00",
      closes: weekday === 7 ? "16:00" : "20:00",
    })),
  });
  await rest(`/rest/v1/salons?id=eq.${salon.id}`, {
    method: "PATCH",
    body: { is_published: true },
  });
  return { salonId: salon.id, staffId: staff[0].id };
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

async function clearMailbox(email) {
  await fetch(`${MAILBOX}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`, {
    method: "DELETE",
  });
}

const settle = (page, ms = 1200) => page.waitForTimeout(ms);

/** Saves the live screen and, when the original is present, a design | live image. */
async function shot(page, name, design) {
  mkdirSync(OUT, { recursive: true });
  const live = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: live });
  console.log("captured", name);
  const original = design ? path.join(DESIGNS, `${design}.png`) : null;
  if (!original || !existsSync(original)) return;
  mkdirSync(COMPARE, { recursive: true });
  const dataUrl = (file) => `data:image/png;base64,${readFileSync(file, "base64")}`;
  const sheet = await page
    .context()
    .browser()
    .newPage({ viewport: { width: 900, height: 900 } });
  await sheet.setContent(
    `<body style="margin:0;background:#888;display:flex;gap:12px;padding:12px;width:max-content">
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">design ${design}<div style="width:390px;height:844px;background:#ccc"><img src="${dataUrl(original)}" style="width:390px;display:block"></div></figure>
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">live ${name}<img src="${dataUrl(live)}" style="width:390px;display:block"></figure>
    </body>`,
  );
  await sheet.locator("body").screenshot({ path: path.join(COMPARE, `${name}.png`) });
  await sheet.close();
}

async function signIn(page, email) {
  await clearMailbox(email);
  await page.goto(APP);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Enter email:").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Verification code").waitFor();
  await page.getByLabel("Verification code").fill(await latestCode(email));
  await page.getByLabel("Verification code").waitFor({ state: "detached" });
  await settle(page);
}

const browser = await chromium.launch();
await reset();
const full = await seedFullSalon(browser);
const device = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };
// The browser's focus ring is a web-only artefact; the Android app has none.
const noFocusRing = (context) =>
  context.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "*:focus, *:focus-visible { outline: none !important; }";
      document.head.append(style);
    });
  });

// Signed out, then a brand-new owner with an empty salon.
{
  const context = await browser.newContext(device);
  await noFocusRing(context);
  const page = await context.newPage();
  await page.goto(APP);
  await page.getByRole("button", { name: "Create for free" }).waitFor();
  await settle(page);
  await shot(page, "owner-02-welcome", "02-welcome");
  await page.getByRole("button", { name: "Create for free" }).click();
  await settle(page);
  await shot(page, "owner-03-create-account", "03-create-account");
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await settle(page);
  await shot(page, "owner-05-sign-in", "05-sign-in");
  await clearMailbox(NEW_OWNER);
  await page.getByLabel("Enter email:").fill(NEW_OWNER);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Verification code").waitFor();
  await settle(page);
  await shot(page, "owner-04-enter-code", "04-enter-code");
  await page.getByLabel("Verification code").fill(await latestCode(NEW_OWNER));
  await page.getByLabel("Salon name:").waitFor();
  await settle(page);
  await shot(page, "owner-create-salon", "03-create-account");
  await page.getByLabel("Salon name:").fill("Kito Hair Lounge");
  await page.getByRole("button", { name: "Create salon" }).click();
  await page.getByText("Get ready to take bookings").waitFor();
  for (const [route, name, design] of [
    ["/business/brand", "owner-44-my-brand-empty", "44-my-brand-empty"],
    ["/business/services", "owner-47-services-empty", "47-services-empty"],
    ["/business/team", "owner-50-team-empty", "50-team-empty"],
    ["/business/hours", "owner-56-opening-hours-edit", "56-opening-hours-edit"],
    ["/business/location", "owner-58-location-edit", "58-location-edit"],
  ]) {
    await page.goto(`${APP}${route}`);
    await settle(page, 2500);
    await shot(page, name, design);
  }
  await context.close();
}

// An owner with a published, fully set-up salon.
{
  const context = await browser.newContext(device);
  await noFocusRing(context);
  const page = await context.newPage();
  await signIn(page, FULL_OWNER);
  await shot(page, "owner-12-today-empty", "12-today-empty");
  // The splash stays up while the salon loads; hold that request back to capture it.
  await page.route(/salon_members/, async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });
  await page.reload();
  await settle(page, 1000);
  await shot(page, "owner-01-splash", "01-splash");
  await page.unrouteAll({ behavior: "wait" });
  await page.goto(`${APP}/account`);
  await settle(page, 2000);
  await shot(page, "owner-29-account", "29-account");
  await page.mouse.wheel(0, 1000);
  await settle(page, 600);
  await shot(page, "owner-30-account-logout", "30-account-logout");
  await page.getByRole("button", { name: "Log out" }).click();
  await settle(page);
  await shot(page, "owner-31-logout-confirm", "31-logout-confirm");

  const pages = [
    ["/business/brand", "owner-45-my-brand", "45-my-brand"],
    ["/business/services", "owner-49-services-list", "49-services-list"],
    ["/business/services/new", "owner-48-add-service", "48-add-service"],
    ["/business/team", "owner-52-team-list", "52-team-list"],
    ["/business/team/new", "owner-51-add-team-member", "51-add-team-member"],
    [
      `/business/team/profile/${full.staffId}`,
      "owner-53-team-member-profile",
      "53-team-member-profile",
    ],
    ["/business/hours", "owner-57-opening-hours", "57-opening-hours"],
    ["/business/location", "owner-59-location", "59-location"],
  ];
  for (const [route, name, design] of pages) {
    await page.goto(`${APP}${route}`);
    await settle(page, 2500);
    await shot(page, name, design);
  }
  await page.goto(`${APP}/business/brand`);
  await settle(page, 2500);
  await page.getByRole("button", { name: "Edit brand" }).click();
  await settle(page);
  await shot(page, "owner-46-my-brand-edit", "46-my-brand-edit");
  await context.close();
}

await browser.close();
