import { defineConfig, devices } from "@playwright/test";

// Rooktest tegen een draaiende ONRAJ (standaard productie). Overschrijf met
// SMOKE_BASE_URL=http://localhost:3000 om lokaal te testen.
const baseURL = process.env.SMOKE_BASE_URL ?? "https://onraj.vercel.app";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    // Logt eenmalig in en bewaart de sessie; de rooktest hergebruikt die.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
