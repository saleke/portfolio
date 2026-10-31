import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    env: {
      ADMIN_PASSWORD_HASH:
        "scrypt$0563defd901ed318d9a2bba2dbb63b73$7c7e672d52a3134a30a54b0e85b7f9aa64fd175b90881f9e53530b9194f6ad6e519f03ab44ac28a17cb0694f7a3d92eea84f22fa1905d988b8a6a28bccd22e94",
      ADMIN_SESSION_SECRET: "playwright-only-session-secret-not-used-in-production",
    },
  },
});
