import { defineConfig } from "cypress";
import { plugin as cypressGrepPlugin } from "@cypress/grep/plugin";
import { registerCleanupReport } from "./cypress/plugins/cleanupReport";

export default defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL ?? "https://automationintesting.online",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",

    // The target is a shared public demo hosted far from most runners: give it room.
    defaultCommandTimeout: 10_000,
    requestTimeout: 15_000,
    responseTimeout: 20_000,
    pageLoadTimeout: 60_000,

    viewportWidth: 1280,
    viewportHeight: 900,

    // Only CI retries. Locally, a flaky test should fail loudly so it gets fixed.
    retries: { runMode: 1, openMode: 0 },

    screenshotOnRunFailure: true,
    video: true,
    videoCompression: true,

    // Credentials are sensitive: read through cy.env(), never Cypress.expose().
    // Values come from the shell or CI secrets — see README.
    env: {
      adminUsername: process.env.ADMIN_USERNAME,
      adminPassword: process.env.ADMIN_PASSWORD,
    },

    setupNodeEvents(on, config) {
      registerCleanupReport(on);
      cypressGrepPlugin(config);
      return config;
    },
  },
});
