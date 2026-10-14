import { defineConfig } from "@playwright/test";

const port = process.env.PORT ?? "3000";

export default defineConfig({
  testDir: "e2e",
  webServer: {
    command: "pnpm start",
    url: `http://127.0.0.1:${port}/learn`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // set CHROMIUM_PATH to reuse an already installed Chromium instead of downloading the one Playwright expects
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
});
