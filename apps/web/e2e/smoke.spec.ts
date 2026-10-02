import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bookflow" })).toBeVisible();
  await expect(page.getByText("KES 400")).toBeVisible();
});

test("salon page renders its slug", async ({ page }) => {
  await page.goto("/s/demo-salon");
  await expect(page.getByRole("heading", { name: "demo-salon" })).toBeVisible();
  await expect(page.getByText("KES 400")).toBeVisible();
});
