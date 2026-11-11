import { defineConfig, devices } from "@playwright/test";
import { env } from "./src/config/env";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: env.isCI,
  // No retries: a test that only passes on retry is a bug to investigate, not to hide.
  retries: 0,
  // Every test owns its data, so tests can run in parallel. Kept low because the
  // default target is a small shared demo that other people use at the same time.
  workers: env.isCI ? 2 : 4,

  // The demo is a remote, shared service: give requests and pages room before failing.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: env.isCI
    ? [["list"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/junit.xml" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: env.baseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "api",
      testDir: "tests/api",
      use: { baseURL: env.apiBaseUrl },
    },
    {
      name: "setup",
      testDir: "tests/setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "ui",
      testDir: "tests/ui",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
