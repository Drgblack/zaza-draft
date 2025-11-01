import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.CI ? undefined : {
    command: "pnpm dev",
    url: process.env.BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
  reporter: [["html", { open: "never" }]],
  projects: [
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
  ],
});
