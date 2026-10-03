import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bookflow" })).toBeVisible();
  await expect(page.getByText("Bookflow: book your next salon visit.")).toBeVisible();
});

test("an unknown or unpublished salon shows a friendly message", async ({ page }) => {
  const response = await page.goto("/s/no-such-salon-here");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This salon isn't taking bookings yet" }),
  ).toBeVisible();
});

test("a booking page is private to its client", async ({ page }) => {
  await page.goto("/b/f0000000-0000-4000-8000-000000000031");
  await expect(page.getByRole("heading", { name: "Sign in to see this booking" })).toBeVisible();
});

test("the hold API refuses requests without a bot check", async ({ request }) => {
  const response = await request.post("/api/holds", { data: { slug: "x" } });
  expect([400, 503]).toContain(response.status());
});
