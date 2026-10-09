import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL } from "./tests/e2e/helpers";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = `http://localhost:${PORT}`;

const phone = { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } };

export default defineConfig({
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", testDir: "./tests/e2e", use: phone },
    // Visual self-review only: `npm run screens`.
    { name: "screens", testDir: "./tests/visual", use: phone },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `${baseURL}/connexion`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
      REGISTRATION_MODE: "invite",
      PHOTOS_DIR: "./data/e2e-photos",
    },
  },
  globalSetup: "./tests/e2e/global-setup.ts",
});
