// Phase 4b/4c, Calendar and Clients: design | live side-by-sides against docs/design/owner-v4
// (ADR 0009) and the spec's manual checks, on fake data against the local Supabase stack. Same
// setup as capture.mjs (Expo's web target), then:
//   SUPABASE_SECRET_KEY=<local secret key> CAPTURE_URL=http://localhost:8103 \
//     node apps/owner/scripts/capture-calendar-clients.mjs
// Live shots go to docs/portfolio/evidence/2026-10-04-owner-calendar-clients/, side-by-sides to
// design-ref/compare/owner4-<nn>.png (git-ignored).
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(ROOT, "docs/portfolio/evidence/2026-10-04-owner-calendar-clients");
const MOCKUPS = path.join(ROOT, "docs/design/owner-v4");
const COMPARE = path.join(ROOT, "design-ref/compare");
const APP = process.env.CAPTURE_URL ?? "http://localhost:8103";
const API = process.env.CAPTURE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const MAILBOX = process.env.CAPTURE_MAILBOX_URL ?? "http://127.0.0.1:54324";
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SECRET) throw new Error("Set SUPABASE_SECRET_KEY to the local stack's secret key.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(API)) throw new Error("Local Supabase only.");

const RUN = Date.now().toString(36);
// The mockups' moment: Saturday 3 October, 11:40 (the now-line in 01).
const DAY = "2026-10-03";
const CLOCK = new Date(`${DAY}T11:40:00+03:00`);
const at = (time, day = DAY) => new Date(`${day}T${time}:00+03:00`).toISOString();

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

/** A salon set aside from earlier runs keeps its slug free (bookings can't be deleted). */
async function freeSlug(slug) {
  const rows = await rest(`/rest/v1/salons?slug=eq.${slug}&select=id`);
  for (const row of rows) {
    await rest(`/rest/v1/salons?id=eq.${row.id}`, {
      method: "PATCH",
      body: {
        slug: `old-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
        is_published: false,
      },
    });
  }
}

/** A published salon with an owner, services, team and hours; Thursday is closed (02). */
async function salonWith(slug, name, ownerEmail, staffNames) {
  await freeSlug(slug);
  const owner = await rest("/auth/v1/admin/users", {
    method: "POST",
    body: { email: ownerEmail, email_confirm: true },
  });
  const [salon] = await insert("salons", {
    slug,
    name,
    address: "2nd floor, Galana Plaza, Kilimani",
  });
  await insert("salon_members", { salon_id: salon.id, user_id: owner.id, role: "owner" });
  const services = await insert(
    "services",
    [
      ["Trim", 30, 800],
      ["Silk press", 30, 1500],
      ["Wash & set", 60, 1800],
      ["Box braids", 180, 6000],
      ["Cornrows", 90, 2500],
    ].map(([n, duration_min, price_kes], i) => ({
      salon_id: salon.id,
      name: n,
      duration_min,
      price_kes,
      sort_order: i + 1,
    })),
  );
  const staff = await insert(
    "staff",
    staffNames.map((display_name, i) => ({ salon_id: salon.id, display_name, sort_order: i + 1 })),
  );
  await insert(
    "staff_services",
    staff.flatMap((s) =>
      services.map((v) => ({ salon_id: salon.id, staff_id: s.id, service_id: v.id })),
    ),
  );
  await insert(
    "opening_hours",
    [1, 2, 3, 5, 6, 7].map((weekday) => ({
      salon_id: salon.id,
      weekday,
      opens: "09:00",
      closes: "17:00",
    })),
  );
  await rest(`/rest/v1/salons?id=eq.${salon.id}`, {
    method: "PATCH",
    body: { is_published: true },
  });
  const service = (n) => services.find((s) => s.name === n);
  const book = async ({
    staff: s,
    client,
    from,
    to,
    day = DAY,
    status = "confirmed",
    service: n,
    source = "web",
  }) => {
    const v = service(n);
    const [b] = await insert("bookings", {
      salon_id: salon.id,
      staff_id: s.id,
      client_id: client?.id ?? null,
      status,
      source,
      created_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      period: `[${at(from, day)},${at(to, day)})`,
      total_kes: v.price_kes,
    });
    await insert("booking_services", {
      booking_id: b.id,
      service_id: v.id,
      name: v.name,
      duration_min: v.duration_min,
      price_kes: v.price_kes,
      position: 0,
    });
    return b;
  };
  const clients = async (rows) =>
    insert(
      "clients",
      rows.map(([full_name, phone, phone_verified = false]) => ({
        salon_id: salon.id,
        full_name,
        phone,
        phone_verified,
      })),
    );
  return { salon, staff, book, clients };
}

/** 01 and 02: Salome, Njeri and Achieng's Saturday, and the week around it. */
async function seedCalendar(email) {
  const { salon, staff, book, clients } = await salonWith(
    "amani-calendar",
    "Amani Beauty Studio",
    email,
    ["Salome", "Njeri", "Achieng"],
  );
  const [salome, njeri, achieng] = staff;
  const [brian, wanjiru, achiengO, mary, grace, joy] = await clients([
    ["Brian Kip", "+254700000061", true],
    ["Wanjiru Otieno", "+254700000062"],
    ["Achieng Ouma", "+254700000063", true],
    ["Mary Wambui", null],
    ["Grace Mwangi", "+254700000065", true],
    ["Joy Atieno", "+254700000066", true],
  ]);
  await book({
    staff: salome,
    client: brian,
    from: "09:00",
    to: "09:30",
    service: "Trim",
    status: "completed",
  });
  await book({
    staff: salome,
    client: wanjiru,
    from: "10:30",
    to: "11:00",
    service: "Silk press",
    status: "completed",
  });
  await book({
    staff: salome,
    client: mary,
    from: "13:00",
    to: "14:00",
    service: "Wash & set",
    source: "owner",
  });
  await book({ staff: njeri, client: achiengO, from: "09:30", to: "12:30", service: "Box braids" });
  await book({ staff: achieng, client: grace, from: "14:00", to: "15:30", service: "Cornrows" });
  await insert("time_off", {
    salon_id: salon.id,
    staff_id: achieng.id,
    period: `[${at("09:00")},${at("12:00")})`,
  });
  // The rest of the week (02); Thursday 1 October is closed.
  const week = [
    [salome, joy, "2026-09-28", "09:00", "10:00", "Wash & set"],
    [salome, brian, "2026-09-28", "11:00", "12:30", "Cornrows"],
    [njeri, grace, "2026-09-29", "10:00", "11:00", "Wash & set"],
    [njeri, achiengO, "2026-09-30", "09:30", "12:30", "Box braids"],
    [salome, joy, "2026-10-02", "13:00", "15:00", "Cornrows"],
  ];
  for (const [s, client, day, from, to, n] of week) {
    await book({ staff: s, client, day, from, to, service: n, status: "completed" });
  }
  await book({
    staff: njeri,
    client: wanjiru,
    day: "2026-10-04",
    from: "10:00",
    to: "11:30",
    service: "Cornrows",
  });
  return { salonId: salon.id, njeri };
}

/** 04 and 05: the five clients of the list, Wanjiru with the profile's history. */
async function seedClients(email) {
  const { salon, staff, book, clients } = await salonWith(
    "amani-clients",
    "Amani Beauty Studio",
    email,
    ["Njeri", "Salome"],
  );
  const [njeri, salome] = staff;
  const [wanjiru, aisha, grace, faith, mary] = await clients([
    ["Wanjiru Otieno", "+254700000071"],
    ["Aisha Kimani", "+254700000072", true],
    ["Grace Mutua", "+254700000073", true],
    ["Faith Njoroge", "+254700000074", true],
    ["Mary Wambui", null],
  ]);
  await rest(`/rest/v1/clients?id=eq.${wanjiru.id}`, {
    method: "PATCH",
    body: { notes: "Prefers a light press, sensitive scalp." },
  });
  // Six visits about five weeks apart (9.6k), and the no-show of 8 August.
  for (const [day, n] of [
    ["2026-09-14", "Silk press"],
    ["2026-08-03", "Silk press"],
    ["2026-06-29", "Wash & set"],
    ["2026-05-25", "Silk press"],
    ["2026-04-20", "Wash & set"],
    ["2026-03-16", "Silk press"],
  ]) {
    await book({
      staff: njeri,
      client: wanjiru,
      day,
      from: "10:00",
      to: n === "Silk press" ? "10:30" : "11:00",
      service: n,
      status: "completed",
    });
  }
  await book({
    staff: salome,
    client: wanjiru,
    day: "2026-08-08",
    from: "10:00",
    to: "11:00",
    service: "Wash & set",
    status: "no_show",
  });
  await book({
    staff: njeri,
    client: wanjiru,
    day: "2026-10-05",
    from: "10:30",
    to: "11:00",
    service: "Silk press",
  });
  await book({
    staff: njeri,
    client: aisha,
    day: DAY,
    from: "09:00",
    to: "09:30",
    service: "Trim",
    status: "completed",
  });
  for (let i = 0; i < 12; i++) {
    const day = new Date(Date.UTC(2026, 7, 14) - i * 21 * 86_400_000).toISOString().slice(0, 10);
    await book({
      staff: salome,
      client: grace,
      day,
      from: "09:00",
      to: "09:30",
      service: "Trim",
      status: "completed",
    });
  }
  for (const day of ["2026-05-11", "2026-06-22"]) {
    await book({
      staff: salome,
      client: faith,
      day,
      from: "12:00",
      to: "12:30",
      service: "Trim",
      status: "completed",
    });
  }
  await book({
    staff: salome,
    client: mary,
    day: "2026-06-01",
    from: "15:00",
    to: "16:00",
    service: "Wash & set",
    status: "completed",
    source: "owner",
  });
  return { salonId: salon.id, wanjiruId: wanjiru.id };
}

async function seedEmpty(email) {
  const { salon } = await salonWith("amani-empty", "Amani Beauty Studio", email, ["Njeri"]);
  return { salonId: salon.id };
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
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">design owner-v4/${mockup}<div style="width:390px;height:844px;overflow:hidden;background:#ccc"><img src="${dataUrl(path.join(MOCKUPS, `${mockup}.png`))}" style="width:390px;display:block"></div></figure>
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

/** A phone-sized page signed in as `email`, on the mockups' clock. */
async function signIn(email) {
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
  await page.clock.install({ time: CLOCK });
  await page.clock.resume();
  await page.goto(APP);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Enter email:").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Verification code").waitFor();
  await page.getByLabel("Verification code").fill(await latestCode(email));
  await page.getByLabel("Verification code").waitFor({ state: "detached" });
  await settle(page, 2500);
  return page;
}

const tab = (page, name) => page.getByRole("tab", { name }).click();

// ---- Calendar ------------------------------------------------------------------------------
const calendarOwner = `cal.owner.${RUN}@example.com`;
const cal = await seedCalendar(calendarOwner);
let page = await signIn(calendarOwner);
await tab(page, "Calendar");
await page.getByText("Today · Sat 3 Oct").waitFor();
await settle(page, 1500);
await shot(page, "owner4-01-calendar-day", "01-calendar-day");
check((await page.getByText("Off until 12:00").count()) === 1, "Day view shows Achieng's time off");
check(
  (await page.getByRole("button", { name: /^New booking with / }).count()) === 3,
  "Day view has a column for each of the three team members",
);

// Tap a block → the Today card in a sheet.
await page.getByRole("button", { name: /^09:30–12:30, Achieng O\./ }).click();
await page.getByRole("link", { name: "Open Achieng Ouma's profile" }).waitFor();
await settle(page, 800);
await shot(page, "owner4-01b-booking-sheet");
check(
  (await page.getByRole("button", { name: "Mark done" }).count()) === 1,
  "a started booking offers Mark done in the sheet",
);
// The client's name opens their profile.
await page.getByRole("link", { name: "Open Achieng Ouma's profile" }).click();
await page.getByText("Past visits").or(page.getByText("Usually every")).first().waitFor();
check(
  (await page.getByText("Achieng Ouma").count()) >= 1,
  "the name in the opened card opens the client's profile",
);
await page.getByRole("button", { name: "Back" }).last().click();
await settle(page, 1000);

// Tap empty space in Njeri's column at about 15:00 → New booking with Njeri at 15:00.
const njeriColumn = page.getByRole("button", { name: "New booking with Njeri" });
const box = await njeriColumn.boundingBox();
await page.mouse.click(box.x + 40, box.y + 6 * 70 + 3);
await page.getByText("Filled in from the free slot. Tap to change.").waitFor();
await page.getByRole("checkbox", { name: "Trim · 30m" }).click();
await page.getByRole("textbox", { name: "Client", exact: true }).fill("Kevin Walk-in");
await settle(page, 600);
check(
  (await page.getByText("Sat 3 Oct · 15:00 – 15:30").count()) === 1,
  "empty space prefills 15:00",
);
await page.getByRole("button", { name: "Save booking" }).click();
await page.getByRole("button", { name: /^15:00–15:30, Kevin W\./ }).waitFor();
const kevin = await rest(
  `/rest/v1/bookings?salon_id=eq.${cal.salonId}&status=eq.confirmed&select=staff_id,period,client:clients(full_name)`,
);
const saved = kevin.find((b) => b.client?.full_name === "Kevin Walk-in");
check(
  saved?.staff_id === cal.njeri.id && saved.period.includes("12:00:00"),
  "the booking from empty space is saved for Njeri at 15:00",
);

// + → New booking.
await page.getByRole("button", { name: "New booking", exact: true }).click();
await page.getByText("The next free time. Tap to change.").waitFor();
check(true, "+ opens New booking");
await page.getByRole("button", { name: "Back" }).last().click();
await settle(page, 800);

// Week, the staff filter, then a day.
await page.getByRole("tab", { name: "Week" }).click();
await page.getByText("28 Sep – 4 Oct").waitFor();
await settle(page, 1200);
await shot(page, "owner4-02-calendar-week", "02-calendar-week");
check((await page.getByText("Closed").count()) === 1, "Thursday is greyed as closed");
await page.getByRole("radio", { name: "Njeri" }).click();
await settle(page, 600);
await shot(page, "owner4-02b-week-njeri");
await page.getByRole("button", { name: "Open Fri 2" }).click();
await page.getByText("Fri 2 Oct").waitFor();
await page.getByRole("button", { name: "New booking with Salome" }).waitFor();
check(true, "tapping a day opens it in Day view");

// List view for Saturday.
await page.getByRole("button", { name: "Next" }).click();
await page.getByRole("tab", { name: "List", exact: true }).click();
await page.getByText("Today · Sat 3 Oct").waitFor();
await settle(page, 1200);
await shot(page, "owner4-01c-calendar-list");
check(
  await page
    .getByRole("button", { name: /^09:30, Achieng Ouma, Box braids · with Njeri/ })
    .last()
    .isVisible(),
  "List view is the Today list for the date",
);
await page.context().close();

// ---- Clients: empty ------------------------------------------------------------------------
const emptyOwner = `empty.owner.${RUN}@example.com`;
await seedEmpty(emptyOwner);
page = await signIn(emptyOwner);
await tab(page, "Clients");
await page.getByText("Your client list will build itself").waitFor();
await settle(page, 1000);
await shot(page, "owner4-03-clients-empty", "03-clients-empty");
await page.context().close();

// ---- Clients: list and profile -------------------------------------------------------------
// A client's row in the list (Today, still mounted under the tabs, may show the same names).
const row = (p, name) => p.getByRole("button", { name: new RegExp(`^${name}`) });
const clientsOwner = `clients.owner.${RUN}@example.com`;
const book = await seedClients(clientsOwner);
page = await signIn(clientsOwner);
await tab(page, "Clients");
await row(page, "Wanjiru Otieno").waitFor();
await settle(page, 1000);
await shot(page, "owner4-04-clients-list", "04-clients-list");
// Faith and Mary (one visit in June, none since) have gone quiet.
check(
  (await page.getByRole("radio", { name: "Lapsed · 2" }).count()) === 1 &&
    (await page.getByRole("radio", { name: "Regulars · 2" }).count()) === 1 &&
    (await page.getByRole("radio", { name: "New · 1" }).count()) === 1,
  "the segment chips count clients",
);
await page.getByRole("radio", { name: "Lapsed · 2" }).click();
await row(page, "Grace Mutua").waitFor({ state: "detached" });
check(
  (await row(page, "Faith Njoroge").count()) === 1 &&
    (await row(page, "Mary Wambui").count()) === 1 &&
    (await row(page, "Wanjiru Otieno").count()) === 0,
  "Lapsed lists Faith and Mary",
);
await page.getByRole("radio", { name: /^All · / }).click();
await page.getByLabel("Search name or phone").fill("wanj");
await row(page, "Aisha Kimani").waitFor({ state: "detached" });
check((await row(page, "Wanjiru Otieno").count()) === 1, "search finds Wanjiru by name");
await page.getByLabel("Search name or phone").fill("0700 000 074");
await row(page, "Faith Njoroge").waitFor();
check((await row(page, "Wanjiru Otieno").count()) === 0, "search finds Faith by phone");
await page.getByLabel("Search name or phone").fill("");
await row(page, "Wanjiru Otieno").click();
await page.getByText("Usually every").last().waitFor();
await settle(page, 1000);
await shot(page, "owner4-05-client-profile", "05-client-profile");

// Notes save on their own and survive a reload.
const notes = page.getByRole("textbox", { name: "Notes (only you see these)" });
await notes.fill("Prefers a light press, sensitive scalp. Likes 10:30.");
await page.getByText("Saved", { exact: true }).waitFor({ timeout: 10_000 });
await page.reload();
await page.getByText("Usually every").last().waitFor();
await settle(page, 1000);
check(
  (await page.getByRole("textbox", { name: "Notes (only you see these)" }).inputValue()) ===
    "Prefers a light press, sensitive scalp. Likes 10:30.",
  "notes are saved and still there after a reload",
);

// Book → New booking with Wanjiru picked.
await page.getByRole("button", { name: "Book Wanjiru Otieno" }).click();
await page.getByText("Saved on this client").waitFor();
check(
  (await page.getByRole("textbox", { name: "Client", exact: true }).inputValue()) ===
    "Wanjiru Otieno",
  "Book opens New booking with the client picked",
);
await page.getByRole("button", { name: "Back" }).last().click();
await settle(page, 800);
await page.getByRole("button", { name: "Back" }).last().click();
await settle(page, 800);

// Add a client with Wanjiru's number.
// After the reload the profile had no history; open the tab directly.
await tab(page, "Clients");
await settle(page, 800);
await page.getByRole("button", { name: "Add a client" }).click();
await page.getByRole("textbox", { name: "Name" }).fill("Wanjiru Twin");
await page.getByRole("textbox", { name: "Phone (optional)" }).fill("0700 000 071");
await page.getByRole("button", { name: "Save client" }).click();
await page.getByText("That number already belongs to Wanjiru Otieno").waitFor();
await settle(page, 500);
await shot(page, "owner4-06-duplicate-phone");
check(true, "a duplicate phone names the client who has it");
await page.getByRole("link", { name: "Open Wanjiru Otieno" }).click();
await page.getByText("Usually every").last().waitFor();
check(true, "the duplicate message links to that client");
check(
  (await rest(`/rest/v1/clients?salon_id=eq.${book.salonId}&full_name=eq.Wanjiru%20Twin&select=id`))
    .length === 0,
  "no duplicate client was saved",
);

await browser.close();
