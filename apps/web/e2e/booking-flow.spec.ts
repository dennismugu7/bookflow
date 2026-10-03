import { expect, test } from "@playwright/test";

/**
 * The whole client journey against a local Supabase (`pnpm exec supabase start`) seeded with
 * e2e/seed-booking.sql: salon page → time → hold → email code (read from the local mailbox) →
 * details → "You're all set!". Opt-in, because it needs the full local stack and Cloudflare's
 * Turnstile test keys: E2E_BOOKING=1 pnpm --filter web test:e2e
 */
test.skip(!process.env.E2E_BOOKING, "needs the local Supabase stack; set E2E_BOOKING=1");

const MAILBOX = process.env.E2E_MAILBOX_URL ?? "http://127.0.0.1:54324";

async function latestCode(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const list = (await (
      await fetch(`${MAILBOX}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json()) as {
      messages?: { ID: string }[];
    };
    const id = list.messages?.[0]?.ID;
    if (id) {
      const message = (await (await fetch(`${MAILBOX}/api/v1/message/${id}`)).json()) as {
        Text?: string;
        HTML?: string;
      };
      const code = /\b(\d{6})\b/.exec(message.Text ?? message.HTML ?? "")?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`No code email for ${email}`);
}

test("a client books with an email code", async ({ page }) => {
  const email = `client-${Date.now()}@example.test`;

  await page.goto("/s/e2e-salon");
  await expect(page.getByRole("heading", { name: "E2E Salon" })).toBeVisible();
  await page.getByRole("link", { name: "Book Trim" }).click();

  // Trim is preselected; with one professional the flow goes straight to the time.
  await expect(page.getByRole("heading", { name: "Select services" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Trim/, pressed: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();
  await page
    .getByRole("radio", { name: /^\d{1,2}:\d{2} (am|pm)$/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Hold this time" }).click();

  await expect(page.getByRole("heading", { name: "Confirm your booking" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/held for \d:\d{2}/)).toBeVisible();
  await expect(page.getByText("Pay at the salon. No payment is taken online.")).toBeVisible();

  // The hold token lives only in an httpOnly cookie that page scripts can't read (ADR 0008).
  const holdCookie = (await page.context().cookies()).find((c) => c.name === "bf_hold");
  expect(holdCookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
  expect(await page.evaluate(() => document.cookie)).not.toContain("bf_hold");

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.getByLabel("6-digit code").fill(await latestCode(email));

  await expect(page.getByRole("heading", { name: "What should we call you?" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByLabel("Your name").fill("Wanjiru Otieno");
  await page.getByLabel("Phone number").fill("700 000 041");
  await page.getByRole("button", { name: "Confirm booking" }).click();

  await expect(page.getByRole("heading", { name: /You're all set!/ })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Trim – with Njeri")).toBeVisible();
  await expect(page.getByRole("link", { name: "Add to calendar" })).toBeVisible();

  const ics = await page.request.get(`${new URL(page.url()).pathname}/ics`);
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain("BEGIN:VEVENT");
});
