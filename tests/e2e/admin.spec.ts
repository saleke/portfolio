import { expect, test } from "@playwright/test";

test("owner can sign in and reach the admin dashboard", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("playwright-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
});

test("admin editor labels and project workflow controls are accessible", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("playwright-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/content");
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Handle")).toBeVisible();

  await page.goto("/admin/projects");
  await expect(page.getByRole("heading", { name: "Homepage order" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save order" })).toBeDisabled();
});
