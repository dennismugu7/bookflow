import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

/**
 * Review screenshots at 390×844 (docs/portfolio/evidence/2026-10-03-restyle/), against a local
 * Supabase seeded with e2e/seed-showcase.sql (fake names only). The banner and logo are abstract
 * images rendered here, so no third-party photos are involved. Opt-in:
 * pnpm build, then SCREENSHOTS=1 E2E_PROD=1 pnpm exec playwright test e2e/screenshots.spec.ts
 */
test.skip(!process.env.SCREENSHOTS, "needs the local Supabase stack; set SCREENSHOTS=1");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const OUT = path.resolve(__dirname, "../../../docs/portfolio/evidence/2026-10-03-restyle");
const MAILBOX = process.env.E2E_MAILBOX_URL ?? "http://127.0.0.1:54324";
const SALON_ID = "a0000000-0000-4000-8000-0000000000aa";

const shot = (page: Page, name: string) => page.screenshot({ path: path.join(OUT, `${name}.png`) });

async function renderJpeg(
  page: Page,
  html: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const image = await page.context().newPage();
  await image.setViewportSize({ width, height });
  // Without a viewport tag, mobile emulation lays the page out 980 px wide.
  await image.setContent(
    `<meta name="viewport" content="width=${width}"><body style="margin:0">${html}</body>`,
  );
  const jpeg = await image.screenshot({ type: "jpeg", quality: 85 });
  await image.close();
  return jpeg;
}

/** Uploads our abstract banner and logo and points the salon at them (secret key, local only). */
async function addArtwork(page: Page) {
  const api = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const banner = await renderJpeg(
    page,
    `<div style="width:1200px;height:900px;background:radial-gradient(circle at 25% 30%,#7b67e8 0,#3a1fa8 45%,#16131f 100%)"></div>`,
    1200,
    900,
  );
  const logo = await renderJpeg(
    page,
    `<div style="width:256px;height:256px;background:#f0a030;display:flex;align-items:center;justify-content:center;font:700 120px sans-serif;color:#16131f">A</div>`,
    256,
    256,
  );
  for (const [kind, body] of [
    ["banner", banner],
    ["logo", logo],
  ] as const) {
    const res = await fetch(
      `${api}/storage/v1/object/salon-media/${SALON_ID}/${kind}/showcase.jpg`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
        body: new Uint8Array(body),
      },
    );
    expect(res.ok, `upload ${kind}`).toBe(true);
  }
  const res = await fetch(`${api}/rest/v1/salons?id=eq.${SALON_ID}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      banner_path: `${SALON_ID}/banner/showcase.jpg`,
      logo_path: `${SALON_ID}/logo/showcase.jpg`,
    }),
  });
  expect(res.ok, "set artwork paths").toBe(true);
}

async function latestCode(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const list = (await (
      await fetch(`${MAILBOX}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json()) as { messages?: { ID: string }[] };
    const id = list.messages?.[0]?.ID;
    if (id) {
      const message = (await (await fetch(`${MAILBOX}/api/v1/message/${id}`)).json()) as {
        Text?: string;
      };
      const code = /\b(\d{6})\b/.exec(message.Text ?? "")?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`No code email for ${email}`);
}

test("review screenshots", async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(OUT, { recursive: true });
  await addArtwork(page);

  // Salon page
  await page.goto("/s/amani-beauty");
  await expect(page.getByRole("heading", { name: "Amani Beauty Studio" })).toBeVisible();
  await expect(page.getByText(/^(Open|Closed)$/).first()).toBeVisible();
  await shot(page, "01-salon-top");
  await page.locator("#services").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.getElementById("services")?.scrollIntoView());
  await shot(page, "02-salon-services");
  await page.evaluate(() => document.getElementById("team")?.scrollIntoView());
  await shot(page, "03-salon-team");
  await page.evaluate(() => document.getElementById("hours")?.scrollIntoView());
  await page.waitForTimeout(1500); // let the map preview load
  await shot(page, "04-salon-hours-location");

  // Profile sheet
  await page.evaluate(() => document.getElementById("team")?.scrollIntoView());
  await page.getByRole("button", { name: /Njeri Kamau, Stylist/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, "05-profile-sheet");
  await page.keyboard.press("Escape");

  // Booking flow
  await page.getByRole("link", { name: "Book now" }).click();
  await expect(page.getByRole("heading", { name: "Select services" })).toBeVisible();
  await page.getByRole("button", { name: /Silk press/ }).click();
  await shot(page, "06-select-services");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Select professional" })).toBeVisible();
  await page.getByRole("button", { name: "Select Njeri Kamau" }).click();
  await shot(page, "07-select-professional");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();
  // A full weekday shows more times than late today.
  await page.getByRole("radio", { name: /^Mon / }).first().click();
  await page.getByRole("radio", { name: "10:30 am" }).click();
  await shot(page, "08-pick-a-time");
  await page.getByRole("button", { name: "Hold this time" }).click();

  // Confirm: sign-in, then the name step
  await expect(page.getByText(/held for \d:\d{2}/)).toBeVisible({ timeout: 20_000 });
  await shot(page, "09-confirm-signin");
  const email = `review-${Date.now()}@example.test`;
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("6-digit code").fill(await latestCode(email));
  await expect(page.getByRole("heading", { name: "What should we call you?" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByLabel("Your name").fill("Wanjiru Otieno");
  await page.getByLabel("Phone number").fill("700 000 051");
  await shot(page, "10-confirm-name");
  await page.getByRole("button", { name: "Confirm booking" }).click();

  // You're all set
  await expect(page.getByRole("heading", { name: /You're all set!/ })).toBeVisible({
    timeout: 20_000,
  });
  await shot(page, "11-booked");
});
