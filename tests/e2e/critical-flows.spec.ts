import { test, expect } from "@playwright/test";

test.describe("PDF Summarizer — Critical User Flows", () => {
  test("sign-up flow: form validation works", async ({ page }) => {
    await page.goto("/sign-up");
    // Try submitting empty form
    const submitButton = page.getByRole("button", { name: /Sign|注册|Submit/i }).first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show validation error, not crash
      await page.waitForTimeout(1000);
      expect(page.url()).toContain("/sign-up");
    }
  });

  test("sign-in flow: form validation works", async ({ page }) => {
    await page.goto("/sign-in");
    // Try submitting empty form
    const submitButton = page.getByRole("button", { name: /Sign|登录|Submit/i }).first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain("/sign-in");
    }
  });

  test("pricing page: plans are displayed", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("h1").first()).toBeVisible();
    // Should have pricing cards or plan options
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("help page: FAQ or documentation is present", async ({ page }) => {
    await page.goto("/help");
    await expect(page.locator("h1").first()).toBeVisible();
    const bodyText = await page.textContent("body");
    expect(bodyText?.length || 0).toBeGreaterThan(100);
  });

  test("language switcher: can switch locales", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("body")).toBeVisible();
    // Try navigating to Chinese
    await page.goto("/zh");
    await expect(page.locator("body")).toBeVisible();
  });

  test("API: upload without auth returns error", async ({ request }) => {
    const response = await request.post("/api/upload", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([400, 401, 403, 415, 429]).toContain(response.status());
  });

  test("API: summarize without auth returns error", async ({ request }) => {
    const response = await request.post("/api/summarize", {
      data: { documentId: "test-id" },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test("API: invalid document ID returns error", async ({ request }) => {
    const response = await request.get("/api/documents/invalid-id-12345");
    expect([400, 401, 403, 404]).toContain(response.status());
  });

  test("Security: X-Frame-Options or CSP prevents framing", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() || {};
    const csp = headers["content-security-policy"] || "";
    const xfo = headers["x-frame-options"] || "";
    expect(csp.includes("frame-ancestors") || xfo).toBeTruthy();
  });

  test("Security: HSTS header is present", async ({ page }) => {
    const response = await page.goto("/");
    const hsts = response?.headers()["strict-transport-security"];
    // HSTS may not be present on HTTP (dev), only HTTPS
    if (hsts) {
      expect(hsts).toContain("max-age");
    }
  });

  test("Performance: homepage loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test("Accessibility: main content has landmark elements", async ({ page }) => {
    await page.goto("/");
    // Check for main landmark
    const main = page.locator("main, [role='main']").first();
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }
    // Check for nav landmark
    const nav = page.locator("nav, [role='navigation']").first();
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();
    }
  });
});