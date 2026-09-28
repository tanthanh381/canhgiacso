import { defineConfig } from "@playwright/test";

const browser = (process.env.QC_BROWSER || "chromium") as "chromium" | "firefox" | "webkit";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "platform-smoke.spec.ts",
  timeout: 35_000,
  expect: { timeout: 10_000 },
  retries: 1,
  workers: 1,
  reporter: [["line"]],
  webServer: {
    command: "node scripts/qc-static-server.mjs",
    url: "http://127.0.0.1:4173/",
    timeout: 15_000,
    reuseExistingServer: false,
  },
  use: {
    browserName: browser,
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1366, height: 768 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
