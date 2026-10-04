// Phase 4a, Today with bookings: design | live side-by-sides against docs/design/owner-v3 (ADR 0009)
// and the spec's manual checks, run on fake data against the local Supabase stack. Same setup as
// capture.mjs (Expo's web target), then:
//   SUPABASE_SECRET_KEY=<local secret key> CAPTURE_URL=http://localhost:8101 \
//     node apps/owner/scripts/capture-today.mjs
// Live shots go to docs/portfolio/evidence/2026-10-04-owner-today/, side-by-sides to
// design-ref/compare/owner3-<nn>.png (git-ignored).
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(ROOT, "docs/portfolio/evidence/2026-10-04-owner-today");
const MOCKUPS = path.join(ROOT, "docs/design/owner-v3");
const COMPARE = path.join(ROOT, "design-ref/compare");
const APP = process.env.CAPTURE_URL ?? "http://localhost:8099";
const API = process.env.CAPTURE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const MAILBOX = process.env.CAPTURE_MAILBOX_URL ?? "http://127.0.0.1:54324";
const SECRET = process.env.SUPABASE_SECRET_KEY;
const PUBLISHABLE =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
if (!SECRET) throw new Error("Set SUPABASE_SECRET_KEY to the local stack's secret key.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(API)) throw new Error("Local Supabase only.");

// Fresh logins each run: a used salon can't be deleted (append-only booking events), only set aside.
const RUN = Date.now().toString(36);
const OWNER = `today.owner.${RUN}@example.com`;
const CLIENT = `grace.client.${RUN}@example.com`;
const SLUG = "amani-beauty-today";
// The mockups' day: Saturday 3 October, a little after Wanjiru's 10:30 start.
const DAY = "2026-10-03";
const CLOCK = new Date(`${DAY}T10:35:00+03:00`);
const at = (time, day = DAY) => new Date(`${day}T${time}:00+03:00`).toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

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

async function reset() {
  await rest(`/rest/v1/salons?slug=eq.${SLUG}`, { method: "DELETE" }).catch(async () => {
    // Bookings keep events (append-only) that block the cascade; mark the salon aside instead.
    const [salon] = await rest(`/rest/v1/salons?slug=eq.${SLUG}&select=id`);
    await rest(`/rest/v1/salons?id=eq.${salon.id}`, {
      method: "PATCH",
      body: { slug: `old-${Date.now()}`, is_published: false },
    });
  });
}

/** Amani Beauty Studio's Saturday from owner-v3 01. Fake names and numbers only. */
async function seed() {
  const owner = await rest("/auth/v1/admin/users", {
    method: "POST",
    body: { email: OWNER, email_confirm: true },
  });
  const client = await rest("/auth/v1/admin/users", {
    method: "POST",
    body: { email: CLIENT, email_confirm: true },
  });
  const [salon] = await insert("salons", {
    slug: SLUG,
    name: "Amani Beauty Studio",
    address: "2nd floor, Galana Plaza, Kilimani",
  });
  await insert("salon_members", { salon_id: salon.id, user_id: owner.id, role: "owner" });
  // As on New booking (05).
  const services = await insert(
    "services",
    [
      ["Silk press", 30, 1500],
      ["Trim", 30, 1000],
      ["Wash & set", 45, 1200],
    ].map(([name, duration_min, price_kes], i) => ({
      salon_id: salon.id,
      name,
      duration_min,
      price_kes,
      sort_order: i + 1,
    })),
  );
  const [njeri, salome] = await insert("staff", [
    { salon_id: salon.id, display_name: "Njeri", sort_order: 1 },
    { salon_id: salon.id, display_name: "Salome", sort_order: 2 },
  ]);
  await insert(
    "staff_services",
    [njeri, salome].flatMap((s) =>
      services.map((v) => ({ salon_id: salon.id, staff_id: s.id, service_id: v.id })),
    ),
  );
  // Saturday closes 09:45–10:30, so the screen at 10:35 matches 01 without a past gap.
  await insert(
    "opening_hours",
    [
      ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, opens: "09:00", closes: "18:00" })),
      { weekday: 6, opens: "09:00", closes: "09:45" },
      { weekday: 6, opens: "10:30", closes: "15:30" },
    ].map((row) => ({ salon_id: salon.id, ...row })),
  );
  await rest(`/rest/v1/salons?id=eq.${salon.id}`, {
    method: "PATCH",
    body: { is_published: true },
  });

  // Only Wanjiru's phone is unverified, as in 01; Grace signs in to see her bookings.
  const [achieng, wanjiru, brian, grace] = await insert(
    "clients",
    [
      ["Achieng Ouma", "+254700000041", true, null],
      ["Wanjiru Otieno", "+254700000042", false, null],
      ["Brian Kip", "+254700000043", true, null],
      ["Grace Mutua", "+254700000044", true, client.id],
    ].map(([full_name, phone, phone_verified, user_id]) => ({
      salon_id: salon.id,
      full_name,
      phone,
      phone_verified,
      user_id,
      email: user_id ? CLIENT : null,
    })),
  );

  const book = async (row, lines) => {
    const [b] = await insert("bookings", {
      salon_id: salon.id,
      status: "confirmed",
      source: "web",
      created_at: daysAgo(3),
      ...row,
      period: `[${row.period[0]},${row.period[1]})`,
      total_kes: lines.reduce((sum, l) => sum + l[2], 0),
    });
    await insert(
      "booking_services",
      lines.map(([name, duration_min, price_kes], position) => ({
        booking_id: b.id,
        service_id: services[0].id,
        name,
        duration_min,
        price_kes,
        position,
      })),
    );
    return b;
  };
  // Wanjiru's two earlier visits make today her 3rd.
  for (const day of ["2026-09-12", "2026-09-26"]) {
    await book(
      {
        staff_id: njeri.id,
        client_id: wanjiru.id,
        status: "completed",
        period: [at("10:00", day), at("10:30", day)],
      },
      [["Silk press", 30, 1500]],
    );
  }
  await book(
    {
      staff_id: njeri.id,
      client_id: achieng.id,
      status: "completed",
      period: [at("09:00"), at("09:45")],
    },
    [["Box braids", 45, 3500]],
  );
  await book({ staff_id: njeri.id, client_id: wanjiru.id, period: [at("10:30"), at("11:00")] }, [
    ["Silk press", 30, 1500],
  ]);
  await book(
    {
      staff_id: salome.id,
      client_id: brian.id,
      created_at: new Date().toISOString(),
      period: [at("11:00"), at("12:00")],
    },
    [["Fade & beard", 60, 800]],
  );
  await book({ staff_id: njeri.id, client_id: grace.id, period: [at("14:00"), at("15:30")] }, [
    ["Wash & set", 60, 2500],
    ["Trim", 30, 1000],
  ]);
  return { salonId: salon.id, salomeId: salome.id, brianId: brian.id };
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

const clearMailbox = (email) =>
  fetch(`${MAILBOX}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`, {
    method: "DELETE",
  });

/** The client's own session, as the web app would have it. */
async function clientToken(email) {
  await clearMailbox(email);
  const headers = { apikey: PUBLISHABLE, "Content-Type": "application/json" };
  await fetch(`${API}/auth/v1/otp`, { method: "POST", headers, body: JSON.stringify({ email }) });
  const token = await latestCode(email);
  const res = await fetch(`${API}/auth/v1/verify`, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "email", email, token }),
  });
  return (await res.json()).access_token;
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
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">design owner-v3/${mockup}<div style="width:390px;height:844px;overflow:hidden;background:#ccc"><img src="${dataUrl(path.join(MOCKUPS, `${mockup}.png`))}" style="width:390px;display:block"></div></figure>
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
await reset();
const seeded = await seed();
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
  // Record the links Call and WhatsApp open, instead of leaving the page.
  globalThis.__opened = [];
  globalThis.open = (url) => {
    globalThis.__opened.push(String(url));
    return null;
  };
});
const page = await context.newPage();
// A running clock from the mockups' moment (a frozen one would also freeze the splash fade).
await page.clock.install({ time: CLOCK });
await page.clock.resume();

// Sign in as the owner.
await clearMailbox(OWNER);
await page.goto(APP);
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByLabel("Enter email:").fill(OWNER);
await page.getByRole("button", { name: "Continue" }).click();
await page.getByLabel("Verification code").waitFor();
await page.getByLabel("Verification code").fill(await latestCode(OWNER));
await page.getByLabel("Verification code").waitFor({ state: "detached" });
await page.getByText("Next up").waitFor();
await settle(page, 2500);

// 01 Today
await shot(page, "owner3-01-today", "01-today");
const wanjiru = page.getByRole("button", { name: /^10:30, Wanjiru Otieno/ });

// 02 Booking opened
await wanjiru.click();
await settle(page, 600);
await shot(page, "owner3-02-booking-open", "02-booking-open");
await page.getByRole("button", { name: "Call", exact: true }).click();
await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
const opened = await page.evaluate(() => globalThis.__opened);
// The web shim hands tel: links to the browser directly; telLink is covered by agenda.test.ts.
check(opened.includes("https://wa.me/254700000042"), `WhatsApp opens ${opened.join(", ")}`);

// 03 Cancel sheet (from ⋯), then keep the booking
await page.getByRole("button", { name: "More: cancel booking" }).click();
await settle(page, 800);
await shot(page, "owner3-03-cancel", "03-cancel");
await page.getByRole("button", { name: "Keep booking" }).click();
await settle(page, 600);

// 04 No-show sheet, then confirm it
await page.getByRole("button", { name: "No-show", exact: true }).click();
await settle(page, 800);
await shot(page, "owner3-04-no-show", "04-no-show");
await page.getByRole("button", { name: "Mark no-show" }).click();
await page.getByText("No-show", { exact: true }).first().waitFor();
await settle(page, 800);
check(
  (await rest(`/rest/v1/bookings?salon_id=eq.${seeded.salonId}&status=eq.no_show&select=id`))
    .length === 1,
  "No-show saves through update_booking_status",
);

// 05 New booking from the 12:00 gap
await page.getByRole("button", { name: /^12:00, 2h free/ }).click();
await page.getByText("Filled in from the free slot. Tap to change.").waitFor();
await settle(page, 1000);
await page.getByRole("checkbox", { name: "Silk press · 30m" }).click();
await page.getByRole("checkbox", { name: "Wash & set · 45m" }).click();
await page.getByRole("textbox", { name: "Client", exact: true }).fill("Mary Wambui");
await settle(page, 800);
await shot(page, "owner3-05-add-booking", "05-add-booking");
check(
  (await page.getByText("Sat 3 Oct · 12:00 – 13:15").count()) === 1,
  "New booking starts at the gap and adds up the services",
);

// Fill this slot → save → the gap shrinks
await page.getByRole("button", { name: "Save booking" }).click();
await page.getByText("Next up").waitFor();
await page.getByRole("button", { name: /^13:15, 45m free/ }).waitFor();
check(true, "after saving, the 12:00 gap shrinks to 13:15, 45m free");
await settle(page, 600);
await shot(page, "owner3-06-after-walk-in");

// A client books on the web → Today updates without a refresh (inserted as our server would).
const before = await page.getByText("New client Test").count();
const [webClient] = await insert("clients", {
  salon_id: seeded.salonId,
  full_name: "New client Test",
  phone: "+254700000045",
});
const [webBooking] = await insert("bookings", {
  salon_id: seeded.salonId,
  staff_id: seeded.salomeId,
  client_id: webClient.id,
  status: "confirmed",
  source: "web",
  period: `[${at("13:15")},${at("13:45")})`,
  total_kes: 1000,
});
await insert("booking_services", {
  booking_id: webBooking.id,
  service_id: (
    await rest(`/rest/v1/services?salon_id=eq.${seeded.salonId}&name=eq.Trim&select=id`)
  )[0].id,
  name: "Trim",
  duration_min: 30,
  price_kes: 1000,
});
await page.getByText("New client Test").waitFor({ timeout: 10_000 });
check(before === 0, "a new web booking appears on Today without a manual refresh (realtime)");

// Mark done once the booking has started: Brian's 11:00, with the clock at 11:05.
await page.clock.setSystemTime(new Date(`${DAY}T11:05:00+03:00`));
await page.reload();
await page.getByText("Next up").waitFor();
await settle(page, 1500);
await page.getByRole("button", { name: /^11:00, Brian Kip/ }).click();
await page.getByRole("button", { name: "Mark done" }).click();
await settle(page, 1500);
check(
  (await rest(`/rest/v1/bookings?client_id=eq.${seeded.brianId}&select=status`))[0].status ===
    "completed",
  "Mark done after the start time completes the booking",
);
await shot(page, "owner3-07-marked-done");

// Cancel Grace's 14:00 (before it starts) → her My bookings shows Cancelled.
await page.getByRole("button", { name: /^14:00, Grace Mutua/ }).click();
await page.getByRole("button", { name: "Cancel booking" }).click();
await page.getByRole("radio", { name: "I'm unavailable" }).click();
await page.getByRole("button", { name: "Cancel booking" }).last().click();
await settle(page, 1500);
const token = await clientToken(CLIENT);
const mine = await (
  await fetch(`${API}/rest/v1/rpc/get_my_bookings`, {
    method: "POST",
    headers: {
      apikey: PUBLISHABLE,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  })
).json();
const graceToday = mine.find((b) => b.starts_at.startsWith("2026-10-03T11:00"));
check(graceToday?.status === "cancelled", "Grace's My bookings shows the booking as cancelled");
await shot(page, "owner3-08-after-cancel");

await browser.close();
