import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

/**
 * Fidelity screenshots at 390×844 (ADR 0009), against a local Supabase seeded with
 * e2e/seed-showcase.sql (fake names only). The banner and logo are abstract images rendered here,
 * so no third-party photos are involved. Live shots go to docs/portfolio/evidence/; when Dennis's
 * originals are in design-ref/original-client/ (git-ignored), a design | live image per screen goes
 * to design-ref/compare/ (both 390 px wide, the 9:16 design padded to the live height). Opt-in:
 * pnpm build, then SCREENSHOTS=1 E2E_PROD=1 pnpm exec playwright test e2e/screenshots.spec.ts
 */
test.skip(!process.env.SCREENSHOTS, "needs the local Supabase stack; set SCREENSHOTS=1");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "docs/portfolio/evidence/2026-10-03-fidelity");
const DESIGNS = path.join(ROOT, "design-ref/original-client");
const COMPARE = path.join(ROOT, "design-ref/compare");
const MAILBOX = process.env.E2E_MAILBOX_URL ?? "http://127.0.0.1:54324";
const SALON_ID = "a0000000-0000-4000-8000-0000000000aa";

/** Saves the live screen and, when the original is present, a side-by-side with it. */
async function shot(page: Page, name: string, design?: string) {
  const live = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: live });
  const original = design ? path.join(DESIGNS, `${design}.png`) : null;
  if (!original || !existsSync(original)) return;
  mkdirSync(COMPARE, { recursive: true });
  const dataUrl = (file: string) => `data:image/png;base64,${readFileSync(file, "base64")}`;
  const sheet = await page.context().newPage();
  await sheet.setViewportSize({ width: 900, height: 900 });
  await sheet.setContent(
    `<meta name="viewport" content="width=900"><body style="margin:0;background:#888;display:flex;gap:12px;padding:12px;width:max-content">
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">design ${design}<div style="width:390px;height:844px;background:#ccc"><img src="${dataUrl(original)}" style="width:390px;display:block"></div></figure>
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">live ${name}<img src="${dataUrl(live)}" style="width:390px;display:block"></figure>
    </body>`,
  );
  await sheet.locator("body").screenshot({ path: path.join(COMPARE, `${name}.png`) });
  await sheet.close();
}

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
    `<div style="width:256px;height:256px;background:#fff;display:flex;align-items:center;justify-content:center;font:700 150px serif;color:#d9a53a">A</div>`,
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

/** Scrolls so the section sits just under the sticky tabs, as a tap on its tab would. */
async function scrollToSection(page: Page, id: string) {
  await page
    .getByRole("link", { name: new RegExp(`^${id === "hours" ? "Hours" : id}`, "i") })
    .click();
  await page.waitForTimeout(600);
}

test("fidelity screenshots", async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(OUT, { recursive: true });
  await addArtwork(page);

  // Salon page
  await page.goto("/s/amani-beauty");
  await expect(page.getByRole("heading", { name: "Amani Beauty Studio" })).toBeVisible();
  await expect(page.getByText(/^(Open|Closed)$/).first()).toBeVisible();
  await shot(page, "01-salon-hero", "01-salon-hero");
  await scrollToSection(page, "services");
  await shot(page, "02-services-tab", "02-services-tab");
  await page.evaluate(() => {
    const team = document.getElementById("team")!;
    window.scrollTo({ top: team.getBoundingClientRect().top + window.scrollY - 520 });
  });
  await page.waitForTimeout(300);
  await shot(page, "03-services-team", "03-services-team");
  await scrollToSection(page, "team");
  await shot(page, "04-team", "04-team-reviews");
  await scrollToSection(page, "hours");
  await shot(page, "06-hours", "06-portfolio-hours");
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }));
  await page.waitForTimeout(1500); // let the map preview load
  await shot(page, "07-hours-location", "07-hours-location");

  // Profile sheet
  await scrollToSection(page, "team");
  await page.getByRole("button", { name: /Njeri Kamau, Stylist/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, "11-professional-profile", "11-professional-profile");
  await page.keyboard.press("Escape");

  // Booking flow
  await page.getByRole("link", { name: "Book now" }).click();
  await expect(page.getByRole("heading", { name: "Select services" })).toBeVisible();
  await shot(page, "08-select-services", "08-select-services");
  await page.getByRole("button", { name: /Silk press/ }).click();
  await shot(page, "09-select-services-selected", "09-select-services-selected");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Select professional" })).toBeVisible();
  await shot(page, "10-select-professional", "10-select-professional");
  await page.getByRole("button", { name: "Select Njeri Kamau" }).click();
  await shot(page, "12-professional-selected", "12-professional-selected");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();
  // A full weekday shows more times than late today.
  await page.getByRole("radio", { name: /^Mon / }).first().click();
  await page.getByRole("radio", { name: "10:30 am" }).click();
  await shot(page, "13-pick-a-time", "10-select-professional");
  await page.getByRole("button", { name: "Hold this time" }).click();

  // Confirm: sign-in, then the name step
  await expect(page.getByText(/held for \d+:\d{2}/)).toBeVisible({ timeout: 20_000 });
  await shot(page, "16-confirm-signin", "16-confirm-hold-signin");
  const email = `review-${Date.now()}@example.test`;
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("6-digit code").fill(await latestCode(email));
  await expect(page.getByRole("heading", { name: "What should we call you?" })).toBeVisible({
    timeout: 20_000,
  });
  await shot(page, "18-confirm-name", "18-confirm-name");
  await page.getByLabel("First name").fill("Wanjiru");
  await page.getByLabel("Phone number").fill("700 000 051");
  await page.getByRole("button", { name: "Confirm booking" }).click();

  // You're all set
  await expect(page.getByRole("heading", { name: /You're all set!/ })).toBeVisible({
    timeout: 20_000,
  });
  await shot(page, "21-booked", "21-booked");
  await page.getByRole("heading", { name: /Know someone/ }).scrollIntoViewIfNeeded();
  await shot(page, "20-booked-share", "20-booked-share");
});
