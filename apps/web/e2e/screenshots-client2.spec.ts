import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { SALON_ID, addArtwork, clearMailbox, latestCode, saveShot } from "./fidelity";

/**
 * Phase 3b fidelity screenshots at 390×844 (ADR 0009): My bookings, Past, the cancel and too-late
 * sheets, the returning-client confirm and "You're all set". Against a local Supabase seeded with
 * e2e/seed-showcase.sql (fake names and +2547000000xx numbers only); mockups are in
 * docs/design/client-v2/. Opt-in: pnpm build, then
 * SCREENSHOTS=1 E2E_PROD=1 pnpm exec playwright test e2e/screenshots-client2.spec.ts
 */
test.skip(!process.env.SCREENSHOTS, "needs the local Supabase stack; set SCREENSHOTS=1");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const ROOT = path.resolve(__dirname, "../../..");
const DIRS = {
  out: path.join(ROOT, "docs/portfolio/evidence/2026-10-04-client-self-service"),
  designs: path.join(ROOT, "docs/design/client-v2"),
  compare: path.join(ROOT, "design-ref/compare"),
};
const EMAIL = "wanjiru@example.com";
const NJERI = "b0000000-0000-4000-8000-0000000000a1";
const ACHIENG = "b0000000-0000-4000-8000-0000000000a2";
const WANJIRU_STAFF = "b0000000-0000-4000-8000-0000000000a3";
const SILK_PRESS = {
  id: "c0000000-0000-4000-8000-0000000000a1",
  name: "Silk press",
  min: 60,
  kes: 1500,
};
const BOX_BRAIDS = {
  id: "c0000000-0000-4000-8000-0000000000a2",
  name: "Box braids",
  min: 180,
  kes: 3500,
};
const TRIM = { id: "c0000000-0000-4000-8000-0000000000a5", name: "Trim", min: 30, kes: 800 };

const shot = (page: Page, name: string, design: string) =>
  saveShot(page, DIRS, `client2-${name}`, design);

function admin() {
  const api = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  return async (route: string, init: { method?: string; body?: unknown; prefer?: string } = {}) => {
    const res = await fetch(`${api}${route}`, {
      method: init.method ?? "GET",
      headers: { ...headers, ...(init.prefer ? { Prefer: init.prefer } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await res.text();
    expect(res.ok, `${init.method ?? "GET"} ${route}: ${text}`).toBe(true);
    return text ? (JSON.parse(text) as unknown) : null;
  };
}

/** `days` from today at `time` in Nairobi (UTC+3, no DST), as an ISO instant. */
function nairobi(days: number, time: string): Date {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  const d = new Date(`${today}T${time}:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function seedClient(): Promise<void> {
  const call = admin();
  const users = (await call("/auth/v1/admin/users?per_page=1000")) as {
    users: { id: string; email: string }[];
  };
  let userId = users.users.find((u) => u.email === EMAIL)?.id;
  if (!userId) {
    const created = (await call("/auth/v1/admin/users", {
      method: "POST",
      body: { email: EMAIL, email_confirm: true },
    })) as { id: string };
    userId = created.id;
  }
  await call(`/rest/v1/salons?id=eq.${SALON_ID}`, {
    method: "PATCH",
    body: { phone: "+254700000099" },
  });
  const [client] = (await call("/rest/v1/clients", {
    method: "POST",
    prefer: "return=representation",
    body: {
      salon_id: SALON_ID,
      full_name: "Wanjiru Otieno",
      phone: "+254700000041",
      email: EMAIL,
      user_id: userId,
    },
  })) as { id: string }[];

  const rows: [typeof SILK_PRESS, string, Date, string][] = [
    [SILK_PRESS, NJERI, nairobi(1, "10:30"), "confirmed"],
    [BOX_BRAIDS, ACHIENG, nairobi(13, "09:00"), "confirmed"],
    [TRIM, ACHIENG, nairobi(-22, "14:00"), "completed"],
    [SILK_PRESS, NJERI, nairobi(-34, "10:00"), "cancelled"],
  ];
  for (const [service, staff, start, status] of rows)
    await addBooking(client!.id, service, staff, start, status);
}

async function addBooking(
  clientId: string,
  service: typeof SILK_PRESS,
  staffId: string,
  start: Date,
  status: string,
) {
  const call = admin();
  const end = new Date(start.getTime() + service.min * 60_000);
  const [booking] = (await call("/rest/v1/bookings", {
    method: "POST",
    prefer: "return=representation",
    body: {
      salon_id: SALON_ID,
      staff_id: staffId,
      client_id: clientId,
      status,
      period: `[${start.toISOString()},${end.toISOString()})`,
      total_kes: service.kes,
      source: "web",
    },
  })) as { id: string }[];
  await call("/rest/v1/booking_services", {
    method: "POST",
    body: {
      booking_id: booking!.id,
      service_id: service.id,
      name: service.name,
      duration_min: service.min,
      price_kes: service.kes,
      position: 0,
    },
  });
}

test("client self-service screenshots", async ({ page }) => {
  test.setTimeout(180_000);
  await addArtwork(page);
  await seedClient();

  // Sign in on /me with an email code.
  await clearMailbox(EMAIL);
  await page.goto("/me");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("6-digit code").fill(await latestCode(EMAIL));
  await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("article")).toHaveCount(2);
  await shot(page, "01-my-bookings", "01-my-bookings");

  await page.getByRole("tab", { name: "Past" }).click();
  await shot(page, "02-past", "02-past");

  await page.getByRole("tab", { name: /Upcoming/ }).click();
  await page.getByRole("button", { name: "Cancel" }).first().click();
  await page.getByRole("button", { name: "Change of plans" }).click();
  await page.waitForTimeout(400);
  await shot(page, "03-cancel-sheet", "03-cancel-sheet");
  await page.getByRole("button", { name: "Keep booking" }).click();

  // A booking that starts in just over an hour can't be cancelled online.
  const clients = (await admin()(
    `/rest/v1/clients?salon_id=eq.${SALON_ID}&phone=eq.%2B254700000041&select=id`,
  )) as { id: string }[];
  const soon = new Date(Math.ceil((Date.now() + 70 * 60_000) / 900_000) * 900_000);
  await addBooking(clients[0]!.id, SILK_PRESS, WANJIRU_STAFF, soon, "confirmed");
  await page.reload();
  await page.getByRole("button", { name: "Cancel" }).first().click();
  await expect(page.getByRole("heading", { name: "It's too late to cancel online" })).toBeVisible();
  await page.waitForTimeout(400);
  await shot(page, "04-too-late", "04-too-late");

  // Returning client: one-tap confirm, then "You're all set".
  await page.goto(`/s/amani-beauty/book?services=${SILK_PRESS.id}&staff=${NJERI}&step=time`);
  await page.getByRole("region", { name: "Date" }).getByRole("radio").nth(1).click();
  await page.getByRole("radio", { name: "12:00 pm" }).click();
  await page.getByRole("button", { name: "Hold this time" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Wanjiru" })).toBeVisible({
    timeout: 20_000,
  });
  await shot(page, "05-returning", "05-returning");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /You're all set!/ })).toBeVisible({
    timeout: 20_000,
  });
  await shot(page, "06-booked", "06-booked");
});
