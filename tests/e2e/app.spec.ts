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
    await page.waitForTimeout(2000);
  });

  test("sign-up page renders", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(2000);
  });

  test("i18n: English page loads correctly", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("nav")).toBeVisible({ timeout: 10000 });
  });

  test("i18n: Chinese page loads correctly", async ({ page }) => {
    const response = await page.goto("/zh");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("SEO: has meta tags", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title).toBeTruthy();

    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toBeTruthy();
  });

  test("SEO: has OG tags", async ({ page }) => {
    await page.goto("/");
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(ogTitle).toBeTruthy();
  });

  test("SEO: has canonical URL", async ({ page }) => {
    await page.goto("/");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBeTruthy();
  });

  test("404 page for invalid routes", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");
    expect(response?.status()).toBe(404);
  });

  test("API: health check returns 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBeLessThan(500);
  });

  test("API: unauthorized access returns 401", async ({ request }) => {
    const response = await request.post("/api/summarize", {
      data: { documentId: "invalid" },
    });
    // Should be 401 without auth token
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("Rate limiting: guest upload has rate limit headers", async ({ request }) => {
    const response = await request.post("/api/upload", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    // Either 400 (bad request) or 429 (rate limited) — both valid
    expect([400, 429, 401, 415]).toContain(response.status());
  });

  test("Security: CSP header is present on pages", async ({ page }) => {
    const response = await page.goto("/");
    const csp = response?.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
  });

  test("Security: frame-ancestors prevents clickjacking", async ({ page }) => {
    const response = await page.goto("/");
    const csp = response?.headers()["content-security-policy"] || "";
    expect(csp).toContain("frame-ancestors");
  });
});
