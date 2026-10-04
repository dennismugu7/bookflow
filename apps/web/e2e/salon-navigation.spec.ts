import { expect, test, type Page } from "@playwright/test";

/**
 * Fix 3a-2: sticky section tabs and instant step changes, against a local Supabase seeded with
 * e2e/seed-showcase.sql (fake names only). Opt-in, like the other stack tests; run the timing
 * test on a production build for real numbers:
 * pnpm build, then E2E_BOOKING=1 E2E_PROD=1 pnpm exec playwright test e2e/salon-navigation.spec.ts
 */
test.skip(!process.env.E2E_BOOKING, "needs the local Supabase stack; set E2E_BOOKING=1");

const SALON = "/s/amani-beauty";
const SILK_PRESS = "c0000000-0000-4000-8000-0000000000a1";
/** Spec: a step change renders in under 300 ms with the CPU slowed 4×. */
const BUDGET_MS = 300;

test("the section tabs stay at the top and follow the scroll", async ({ page }) => {
  await page.goto(SALON);
  const nav = page.getByRole("navigation", { name: "Sections" });

  for (const [id, label] of [
    ["team", "Team"],
    ["hours", "Hours & location"],
  ] as const) {
    await page.evaluate((section) => document.getElementById(section)!.scrollIntoView(), id);
    await expect.poll(() => nav.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "true");
  }
});

test("the salon header shows name, tagline and area on the salon and confirm pages", async ({
  page,
}) => {
  // The confirm page renders its header from the URL alone; no hold is needed to look at it.
  const confirm = `${SALON}/confirm?services=${SILK_PRESS}&staff=any&start=2026-12-01T07:00:00Z&expires=2099-01-01T00:00:00Z`;
  for (const url of [SALON, confirm]) {
    await page.goto(url);
    const header = page.locator("main").first();
    await expect(header.getByText("Amani Beauty Studio", { exact: true })).toBeVisible();
    await expect(
      header.getByText("Natural hair, braids and silk presses", { exact: true }),
    ).toBeVisible();
    await expect(header.getByText("Kilimani, Nairobi", { exact: true })).toBeVisible();
  }
});

/**
 * Clicks (or goes back) inside the page and resolves with the milliseconds until the step title
 * shows `title`, timed with performance.now() so Playwright's own round-trips don't count.
 */
function timeStep(page: Page, action: "back-button" | "history-back" | string, title: string) {
  return page.evaluate(
    ([how, expected]) =>
      new Promise<number>((resolve, reject) => {
        const start = performance.now();
        if (how === "history-back") window.history.back();
        else {
          const target = [...document.querySelectorAll<HTMLElement>("button, a")].find((el) =>
            how === "back-button"
              ? el.getAttribute("aria-label") === "Back"
              : el.textContent?.trim() === how,
          );
          if (!target) return reject(new Error(`No control for ${how}`));
          target.click();
        }
        const check = () => {
          if (document.querySelector("h1")?.textContent === expected)
            // The next frame is when the new step is on screen.
            requestAnimationFrame(() => resolve(performance.now() - start));
          else if (performance.now() - start > 5000) reject(new Error(`No "${expected}"`));
          else requestAnimationFrame(check);
        };
        check();
      }),
    [action, title] as const,
  );
}

test("booking steps switch in the browser within 300 ms on a 4× slower CPU", async ({ page }) => {
  await page.goto(`${SALON}/book?services=${SILK_PRESS}&staff=any&step=services`);
  await expect(page.getByRole("heading", { name: "Select services" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const timings: Record<string, number> = {};
  timings["Continue → Select professional"] = await timeStep(
    page,
    "Continue",
    "Select professional",
  );
  timings["back arrow → Select services"] = await timeStep(page, "back-button", "Select services");
  timings["Continue → Select professional (again)"] = await timeStep(
    page,
    "Continue",
    "Select professional",
  );
  await page.getByRole("button", { name: "Select Njeri Kamau" }).click();
  timings["Continue → Pick a time"] = await timeStep(page, "Continue", "Pick a time");
  timings["phone back → Select professional"] = await timeStep(
    page,
    "history-back",
    "Select professional",
  );
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  for (const [step, ms] of Object.entries(timings)) {
    test.info().annotations.push({ type: "timing", description: `${step}: ${ms.toFixed(0)} ms` });
    console.log(`[timing ×4 CPU] ${step}: ${ms.toFixed(0)} ms`);
    expect(ms, step).toBeLessThan(BUDGET_MS);
  }

  // Nothing went to the server: the URL still says which step, and a refresh lands on it.
  await expect(page).toHaveURL(/step=pro/);
  await expect(page.getByRole("img", { name: "Njeri Kamau selected" })).toBeVisible();
});

test("the back arrow and phone back both return to the previous step", async ({ page }) => {
  await page.goto(`${SALON}/book?services=${SILK_PRESS}&staff=any&step=services`);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Select professional" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Select professional" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Select services" })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Select professional" })).toBeVisible();

  // × leaves for the salon page.
  await page.getByRole("button", { name: "Close and go back to the salon" }).click();
  await expect(page.getByRole("heading", { name: "Amani Beauty Studio" })).toBeVisible();
});

test("a booking link opened mid-flow steps back in place", async ({ page }) => {
  await page.goto(`${SALON}/book?services=${SILK_PRESS}&staff=any&step=time`);
  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Select professional" })).toBeVisible();
  await expect(page).toHaveURL(/step=pro/);
});

/** Page backgrounds behind `selector`, up to the body, that aren't transparent or white. */
async function tintedBackgrounds(page: Page, selector: string): Promise<string[]> {
  return page.$$eval(selector, (els) =>
    els
      .map((el) => getComputedStyle(el).backgroundColor)
      .filter((c) => c !== "rgba(0, 0, 0, 0)" && c !== "rgb(255, 255, 255)"),
  );
}

test("client pages are white, with no grey bands (Dennis, 2026-10-04)", async ({ page }) => {
  for (const url of [SALON, `${SALON}/book?services=${SILK_PRESS}`, "/me"]) {
    await page.goto(url);
    await expect(page.locator("main").first()).toBeVisible();
    // Every block-level wrapper: sections, divs and the page itself.
    expect(
      await tintedBackgrounds(page, "body, body > div, main, main > div, main > section, main section > div"),
    ).toEqual([]);
  }
  await page.goto(SALON);
  const service = page.locator("#services li").first();
  await expect(service).toHaveCSS("border-top-color", "rgb(231, 230, 236)");
  await expect(service).toHaveCSS("border-radius", "14px");
});

test("Continue with Google uses Google's blue button", async ({ page }) => {
  await page.goto("/me");
  const google = page.getByRole("button", { name: "Continue with Google" });
  await expect(google).toHaveCSS("background-color", "rgb(66, 133, 244)");
  await expect(google).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(google).toHaveCSS("height", "48px");
  await expect(google).toHaveCSS("border-radius", "8px");
});

test("My bookings' back arrow returns to the previous page", async ({ page }) => {
  await page.goto(SALON);
  await page.getByRole("link", { name: "My bookings" }).click();
  await expect(page).toHaveURL(/\/me$/);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(new RegExp(`${SALON}$`));
});

test("without history, My bookings' back arrow opens the last salon visited", async ({
  context,
}) => {
  const first = await context.newPage();
  await first.goto(SALON);
  await expect(first.getByRole("heading", { level: 1 })).toBeVisible();
  const fresh = await context.newPage();
  await fresh.goto("/me");
  await fresh.getByRole("button", { name: "Back" }).click();
  await expect(fresh).toHaveURL(new RegExp(`${SALON}$`));
});
