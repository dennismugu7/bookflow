// Design | live side-by-sides for the owner app (ADR 0009), rendered with Expo's web target, which
// exists for capture only. Fake data only, against the local Supabase stack:
//   1. pnpm db:start
//   2. in apps/owner: CAPTURE_WEB=1 EXPO_NO_WEB_SETUP=1 EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
//      EXPO_PUBLIC_SUPABASE_ANON_KEY=<local publishable key> npx expo start --web --port 8099
//   3. SUPABASE_SECRET_KEY=<local secret key> node apps/owner/scripts/capture.mjs
// Live shots go to docs/portfolio/evidence/2026-10-04-owner-polish/. Side-by-sides go to
// design-ref/compare/: owner2-<nn>.png against the approved mockups in docs/design/owner-v2/, and
// owner-<nn>.png against Dennis's originals in design-ref/original-owner/ (git-ignored).
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(ROOT, "docs/portfolio/evidence/2026-10-04-owner-polish");
const DESIGNS = path.join(ROOT, "design-ref/original-owner");
const MOCKUPS = path.join(ROOT, "docs/design/owner-v2");
const COMPARE = path.join(ROOT, "design-ref/compare");
const APP = process.env.CAPTURE_URL ?? "http://localhost:8099";
const API = process.env.CAPTURE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const MAILBOX = process.env.CAPTURE_MAILBOX_URL ?? "http://127.0.0.1:54324";
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SECRET) throw new Error("Set SUPABASE_SECRET_KEY to the local stack's secret key.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(API)) throw new Error("Local Supabase only.");

const NEW_OWNER = "new.owner@example.com";
const FULL_OWNER = "dennis@example.com";
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
      // One letter short, so the capture can type it and show a focused field (owner-v2 01).
      tagline: "Look your best, feel your bes",
      about: "Natural hair, braids and silk presses in Kilimani. Walk-ins welcome on weekdays.",
      address: "2nd floor, Galana Plaza, Kilimani",
      maps_url: "https://www.google.com/maps/place/Galana+Plaza,+Kilimani/@-1.29207,36.78614,17z",
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
      { salon_id: salon.id, name: "Silk press", duration_min: 30, price_kes: 1500, sort_order: 1 },
      { salon_id: salon.id, name: "Box braids", duration_min: 180, price_kes: 3500, sort_order: 2 },
      {
        salon_id: salon.id,
        name: "Beard shape-up",
        duration_min: 20,
        price_kes: 400,
        sort_order: 3,
      },
    ],
  });
  // No photos, so the rows show initials circles as in owner-v2 04.
  const team = [
    ["Njeri Kamau", "Stylist"],
    ["Achieng Ouma", "Braider"],
  ];
  const staff = [];
  for (const [index, [name, title]] of team.entries()) {
    const [row] = await rest("/rest/v1/staff", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: {
        salon_id: salon.id,
        display_name: name,
        title,
        bio: `${name.split(" ")[0]} has eight years of experience with natural hair, protective styles and silk presses, and loves a look that lasts all week.`,
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
    // As in owner-v2 05: weekdays 09–18 with a lunch break on Thursday, a short Saturday,
    // Sunday closed.
    body: [
      ...[1, 2, 3, 5].map((weekday) => ({ weekday, opens: "09:00", closes: "18:00" })),
      { weekday: 4, opens: "09:00", closes: "13:00" },
      { weekday: 4, opens: "14:00", closes: "18:00" },
      { weekday: 6, opens: "10:00", closes: "16:00" },
    ].map((row) => ({ salon_id: salon.id, ...row })),
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

/**
 * Saves the live screen and, when the design is present, a design | live image. `design` is an
 * original ("51-add-team-member") or an owner-v2 mockup ("v2/01-my-brand").
 */
async function shot(page, name, design) {
  mkdirSync(OUT, { recursive: true });
  const live = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: live });
  console.log("captured", name);
  const original = !design
    ? null
    : design.startsWith("v2/")
      ? path.join(MOCKUPS, `${design.slice(3)}.png`)
      : path.join(DESIGNS, `${design}.png`);
  if (!original || !existsSync(original)) return;
  mkdirSync(COMPARE, { recursive: true });
  const dataUrl = (file) => `data:image/png;base64,${readFileSync(file, "base64")}`;
  const sheet = await page
    .context()
    .browser()
    .newPage({ viewport: { width: 900, height: 900 } });
  await sheet.setContent(
    `<body style="margin:0;background:#888;display:flex;gap:12px;padding:12px;width:max-content">
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">design ${design}<div style="width:390px;height:844px;overflow:hidden;background:#ccc"><img src="${dataUrl(original)}" style="width:390px;display:block"></div></figure>
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

const go = async (page, route, ms = 2500) => {
  await page.goto(`${APP}${route}`);
  await settle(page, ms);
};

// A brand-new owner: sign-in and onboarding, the empty screens, then every save (regression).
{
  const context = await browser.newContext(device);
  await noFocusRing(context);
  const page = await context.newPage();
  await page.goto(APP);
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await clearMailbox(NEW_OWNER);
  await page.getByLabel("Enter email:").fill(NEW_OWNER);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Verification code").waitFor();
  await page.getByLabel("Verification code").fill(await latestCode(NEW_OWNER));
  await page.getByLabel("Salon name:").waitFor();
  await page.getByLabel("Salon name:").fill("Kito Hair Lounge");
  await page.getByRole("button", { name: "Create salon" }).click();
  await page.getByText("Get ready to take bookings").waitFor();

  await go(page, "/business/brand");
  await shot(page, "owner2-01-my-brand-empty", "v2/01-my-brand");
  await go(page, "/business/services");
  await shot(page, "owner2-02-services-empty", "47-services-empty");
  await go(page, "/business/team");
  await shot(page, "owner2-04-team-empty", "50-team-empty");
  await go(page, "/business/hours");
  await shot(page, "owner2-05-hours-empty", "v2/05-hours");
  await go(page, "/business/location");
  await page
    .getByRole("textbox", { name: "Address", exact: true })
    .fill("2nd floor, Galana Plaza, Kilimani");
  await page.getByRole("textbox", { name: "Google Maps link", exact: true }).click();
  await settle(page, 400);
  await shot(page, "owner2-06-location-no-pin", "v2/06-location-no-pin");

  // Saves, one per screen, each checked after a reload.
  await page
    .getByRole("textbox", { name: "Google Maps link", exact: true })
    .fill("https://www.google.com/maps/place/Kito+Hair+Lounge/@-1.29,36.78,17z");
  await page.getByText("✓ Kito Hair Lounge").waitFor();
  await page.getByRole("button", { name: "Save location" }).click();
  await page.getByRole("button", { name: "Change pin" }).waitFor();
  await go(page, "/business/location");
  await page.getByRole("button", { name: "Change pin" }).waitFor();
  await page.getByText("Kito Hair Lounge", { exact: true }).last().waitFor();
  console.log("ok: location saves the pin and address");

  await go(page, "/business/brand");
  await page
    .getByRole("textbox", { name: "About", exact: true })
    .fill("Fresh cuts and braids in Kilimani.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await settle(page, 1500);
  await go(page, "/business/brand");
  if (
    (await page.getByRole("textbox", { name: "About", exact: true }).inputValue()) !==
    "Fresh cuts and braids in Kilimani."
  ) {
    throw new Error("brand did not save");
  }
  console.log("ok: brand saves");

  await go(page, "/business/services/new");
  await page.getByRole("textbox", { name: "Service name", exact: true }).fill("Wash and set");
  await page.getByRole("radio", { name: "45 min" }).click();
  await page
    .getByRole("textbox", { name: "Price in KES, whole shillings", exact: true })
    .fill("1200");
  await page.getByRole("button", { name: "Save service" }).click();
  await page.getByText("Wash and set").waitFor();
  console.log("ok: a service saves");

  await go(page, "/business/team");
  await page.getByRole("button", { name: "Add me as a team member" }).click();
  await settle(page);
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Kito Owner");
  await page.getByRole("button", { name: /^Services offered/ }).click();
  await page.getByRole("checkbox", { name: "Wash and set" }).click();
  await settle(page, 400);
  await shot(page, "owner2-04b-add-yourself", "51-add-team-member");
  await page.getByRole("button", { name: "Save and add to team" }).click();
  await page.getByText("Kito Owner").waitFor();
  console.log("ok: a team member saves");

  await go(page, "/business/hours");
  await page.getByRole("button", { name: /^Tuesday/ }).click();
  await settle(page, 800);
  await page.getByRole("switch", { name: "Closed" }).click();
  await page.getByRole("button", { name: "Add a break" }).click();
  await page.getByRole("textbox", { name: "Opens", exact: true }).nth(1).fill("12:00");
  await page.getByRole("textbox", { name: "Closes", exact: true }).nth(1).fill("19:00");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("These times overlap.").waitFor();
  await settle(page, 400);
  await shot(page, "owner2-05c-day-overlap");
  await page.getByRole("textbox", { name: "Opens", exact: true }).nth(1).fill("19:00");
  await page.getByRole("textbox", { name: "Closes", exact: true }).nth(1).fill("21:00");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("09:00 – 18:00, 19:00 – 21:00").waitFor();
  await go(page, "/business/hours");
  await page.getByText("09:00 – 18:00, 19:00 – 21:00").waitFor();
  console.log("ok: a day with a break saves; overlaps are rejected");

  await go(page, "/");
  await page.getByRole("button", { name: "Publish salon" }).click();
  await page.getByRole("button", { name: "Share your booking link" }).waitFor();
  await go(page, "/menu");
  await page.getByText("Kito Hair Lounge · Live").waitFor();
  console.log("ok: publish, and Menu shows Live");

  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Create for free" }).waitFor();
  console.log("ok: log out");
  await context.close();
}

// An owner with a published, fully set-up salon, as in the mockups.
{
  const context = await browser.newContext(device);
  await noFocusRing(context);
  const page = await context.newPage();
  await signIn(page, FULL_OWNER);
  await shot(page, "owner2-today", "12-today-empty");

  await go(page, "/business/brand");
  await page.getByRole("textbox", { name: "Tagline", exact: true }).click();
  await page.keyboard.press("End");
  await page.keyboard.type("t");
  await settle(page, 400);
  await shot(page, "owner2-01-my-brand", "v2/01-my-brand");

  await go(page, "/business/services");
  await shot(page, "owner2-02-services", "v2/02-services");
  await go(page, "/business/services/new");
  await page.getByRole("radio", { name: "30 min" }).click();
  await page.getByRole("textbox", { name: "Service name", exact: true }).fill("Silk press");
  await settle(page, 400);
  await shot(page, "owner2-03-add-service", "v2/03-add-service");

  await go(page, "/business/team");
  await shot(page, "owner2-04-team", "v2/04-team");
  await go(page, `/business/team/${full.staffId}`);
  await shot(page, "owner2-04b-edit-team-member", "51-add-team-member");
  await go(page, `/business/team/profile/${full.staffId}`);
  await shot(page, "owner2-04c-team-profile", "53-team-member-profile");

  // The mockup's "today" is a Saturday.
  await page.clock.setFixedTime(new Date("2026-10-03T10:00:00+03:00"));
  await go(page, "/business/hours");
  await shot(page, "owner2-05-hours", "v2/05-hours");
  await page.getByRole("button", { name: /^Thursday/ }).click();
  await settle(page, 800);
  await shot(page, "owner2-05b-day-editor");
  await page.getByRole("button", { name: "Close" }).last().click();

  await go(page, "/business/location");
  await shot(page, "owner2-07-location-pin", "v2/07-location-pin");
  await page.getByRole("button", { name: "Change pin" }).click();
  await settle(page, 400);
  await shot(page, "owner2-07b-change-pin", "v2/06-location-no-pin");

  await go(page, "/menu");
  await shot(page, "owner2-08-menu", "v2/08-menu");
  await page.mouse.wheel(0, 1000);
  await settle(page, 600);
  await shot(page, "owner2-08b-menu-log-out", "30-account-logout");
  await page.getByRole("button", { name: "Log out" }).click();
  await settle(page);
  await shot(page, "owner2-08c-log-out-confirm", "31-logout-confirm");
  await context.close();
}

await browser.close();
