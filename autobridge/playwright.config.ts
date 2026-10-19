import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build on http://localhost:3000 with the
 * local Supabase stack and demo data (pnpm db:reset && pnpm seed:demo && pnpm build).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000/ar",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
