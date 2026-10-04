import { expect, test, type Page } from "@playwright/test";

import { latestCode } from "./fidelity";

/**
 * Phase 3b against a local Supabase seeded with e2e/seed-booking.sql: sign in → book → My bookings
 * shows it → cancel → it moves to Past and the time is offered again → a returning client confirms
 * in one tap. Opt-in like booking-flow.spec.ts: E2E_BOOKING=1 pnpm --filter web test:e2e
 */
test.skip(!process.env.E2E_BOOKING, "needs the local Supabase stack; set E2E_BOOKING=1");

/** Tomorrow at 10:00 am: more than 2 hours away, so it can be cancelled online. */
async function pickTomorrowTen(page: Page) {
  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();
  await page.getByRole("region", { name: "Date" }).getByRole("radio").nth(1).click();
  await page.getByRole("radio", { name: "10:00 am" }).click();
  await page.getByRole("button", { name: "Hold this time" }).click();
}

test("a client cancels a booking and rebooks in one tap", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `self-service-${Date.now()}@example.test`;

  // Book with an email code.
  await page.goto("/s/e2e-salon");
  await page.getByRole("link", { name: "Book Trim" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await pickTomorrowTen(page);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("6-digit code").fill(await latestCode(email));
  await expect(page.getByRole("heading", { name: "What should we call you?" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByLabel("First name").fill("Wanjiru");
  await page.getByLabel("Phone number").fill("700 000 042");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /You're all set!/ })).toBeVisible({
    timeout: 20_000,
  });

  // My bookings shows it.
  await page.getByRole("link", { name: "View booking" }).click();
  await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
  const card = page.getByRole("article").filter({ hasText: "Trim" });
  await expect(card).toContainText("Confirmed");
  await expect(card).toContainText("10:00");

  // Cancel it; it moves to Past.
  await card.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Change of plans" }).click();
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByRole("status")).toHaveText("Booking cancelled");
  await expect(page.getByText("No upcoming bookings")).toBeVisible();
  await page.getByRole("tab", { name: "Past" }).click();
  const past = page.getByRole("article").filter({ hasText: "Trim" });
  await expect(past).toContainText("Cancelled");

  // Book again: the same time is offered again, and the returning client confirms in one tap.
  await past.getByRole("link", { name: "Book again" }).click();
  await expect(page.getByRole("button", { name: /Trim/, pressed: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await pickTomorrowTen(page);
  await expect(page.getByRole("heading", { name: "Welcome back, Wanjiru" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("0700 000 042")).toBeVisible();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /You're all set!/ })).toBeVisible({
    timeout: 20_000,
  });
});
