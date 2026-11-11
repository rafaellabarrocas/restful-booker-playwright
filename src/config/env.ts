/**
 * Single source of runtime configuration. Nothing else in the framework reads process.env.
 *
 * Resolution order (first value found wins, files never override what is already set):
 *   1. real environment variables (CI secrets, shell exports)
 *   2. .env                                — local, gitignored: credentials and TEST_ENV
 *   3. config/environments/<TEST_ENV>.env  — committed, non-secret per-environment settings
 *
 * To target a new environment, add config/environments/<name>.env and run with TEST_ENV=<name>.
 */
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

function loadIfPresent(file: string): void {
  if (existsSync(file)) process.loadEnvFile(file);
}

function missing(name: string): never {
  throw new Error(
    `Missing required setting ${name} for TEST_ENV="${testEnv}". ` +
      `Set it in the environment, in .env, or in config/environments/${testEnv}.env (see README).`,
  );
}

function required(name: string): string {
  return process.env[name] || missing(name);
}

/** Playwright resolves relative paths against the base URL, so it must end with "/". */
function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

loadIfPresent(path.join(ROOT, ".env"));
const testEnv = process.env.TEST_ENV ?? "demo";
const environmentFile = path.join(ROOT, "config", "environments", `${testEnv}.env`);
if (!existsSync(environmentFile)) missing(`config/environments/${testEnv}.env`);
loadIfPresent(environmentFile);

export const env = {
  name: testEnv,
  /** Public site, e.g. https://automationintesting.online */
  baseUrl: required("BASE_URL"),
  /** REST API root, e.g. https://automationintesting.online/api/ */
  apiBaseUrl: withTrailingSlash(required("API_BASE_URL")),
  admin: {
    username: required("ADMIN_USERNAME"),
    password: required("ADMIN_PASSWORD"),
  },
  isCI: Boolean(process.env.CI),
} as const;
