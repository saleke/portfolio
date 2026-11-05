import { expect, test } from "@playwright/test";

test("homepage presents the portfolio identity and project navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Solomon Aleke" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Solomon Aleke home" })).toBeVisible();
  await expect(page).toHaveTitle(/^saleke \| Solomon Aleke/);
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    "href",
    "/favicon.svg",
  );
  await expect(page.locator(".portrait-frame img")).toHaveAttribute(
    "alt",
    "Portrait of Solomon Aleke (saleke)",
  );
  const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
  expect(structuredData).toContain('"additionalName":"saleke"');
  expect(structuredData).toContain("/images/solomon-aleke-profile.png");
  await expect(page.locator("#projects")).toBeAttached();

  const nexus = page.locator(".project-card").filter({ hasText: "Nexus" });
  await nexus.getByText(/\+\d+ more/).click();
  await expect(nexus.getByText("PyTorch", { exact: true })).toBeVisible();
});

test("mobile navigation manages focus and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const toggle = page.locator(".menu-toggle");
  await expect(toggle).toHaveAccessibleName("Open navigation");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveAccessibleName("Close navigation");
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAccessibleName("Open navigation");
  await expect(toggle).toBeFocused();
});

test("case studies expose section and next-project navigation", async ({ page }) => {
  await page.goto("/projects/nexus");

  await expect(page.getByRole("heading", { level: 1, name: "Nexus" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Case study sections" })).toBeVisible();
  await expect(page.locator("#overview")).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Next project" })).toBeVisible();
});

test("system pages and security headers use the portfolio experience", async ({ page }) => {
  const response = await page.goto("/route-that-does-not-exist");

  expect(response?.status()).toBe(404);
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  await expect(page.getByRole("heading", { name: "This route leads nowhere." })).toBeVisible();
});
