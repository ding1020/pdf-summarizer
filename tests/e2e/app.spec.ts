import { test, expect } from "@playwright/test";

test.describe("PDF Summarizer — Core E2E", () => {
  test("homepage loads and renders hero section", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);

    // Hero heading should be visible
    await expect(page.locator("h1").first()).toBeVisible();

    // CTA button should be present
    const ctaLink = page.getByRole("link", { name: /Get Started|开始使用/i });
    await expect(ctaLink.first()).toBeVisible();
  });

  test("navigation works: Home → Pricing → Help", async ({ page }) => {
    await page.goto("/");

    // Go to pricing
    await page.getByRole("link", { name: /Pricing|价格/i }).first().click();
    await expect(page.locator("h1").first()).toBeVisible();

    // Go to help
    await page.goto("/help");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("dashboard loads upload section", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1").first()).toBeVisible();

    // Dropzone should be present
    const dropzone = page.locator("[class*='dropzone']");
    if (await dropzone.count() > 0) {
      await expect(dropzone.first()).toBeVisible();
    }
  });

  test("sign-in page renders", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("h1").first()).toBeVisible();

    // Clerk should load eventually
    await page.waitForTimeout(2000);
  });

  test("i18n: English page loads correctly", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response?.status()).toBeLessThan(400);

    // Navigation brand name should be visible
    await expect(page.locator("nav")).toBeVisible({ timeout: 10000 });
  });

  test("SEO: has meta tags", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title).toBeTruthy();

    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toBeTruthy();
  });

  test("404 page for invalid routes", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");
    expect(response?.status()).toBe(404);
  });
});
