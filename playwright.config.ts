import { defineConfig } from "@playwright/test";

const port = process.env.PORT ?? "3000";

export default defineConfig({
  testDir: "e2e",
  // set NO_SERVER=1 to use a server you already started (for example `pnpm dev`)
  webServer: process.env.NO_SERVER ? undefined : {
    command: "pnpm start",
    url: `http://127.0.0.1:${port}/learn`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: `http://localhost:${port}`,
    // set CHROMIUM_PATH to reuse an already installed Chromium instead of downloading the one Playwright expects
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
});
