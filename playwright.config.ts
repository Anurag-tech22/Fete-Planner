import { defineConfig, devices } from "@playwright/test";

const PORT = 8791;

/** Real-browser end-to-end tests against the production build (`npm run build` first). */
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "node dist-server/index.js",
    url: `http://localhost:${PORT}/api/health`,
    env: { PORT: String(PORT), RATE_LIMIT_PER_MIN: "1000" },
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
