/**
 * The suite's `test` and `expect`. Specs import from here, never from @playwright/test.
 *
 * Worker-scoped (shared by every test of a worker, available in beforeAll/afterAll):
 *   anonApi   API clients with no credentials — what a guest or an attacker can do
 *   adminApi  API clients authenticated as the admin (one login per worker)
 *
 * Test-scoped: one page object per screen.
 */
import { test as base } from "@playwright/test";
import { Api } from "../api/clients";
import { TokenSchema } from "../api/schemas";
import { env } from "../config/env";
import { AdminLoginPage } from "../pages/admin-login.page";
import { AdminMessagesPage } from "../pages/admin-messages.page";
import { AdminRoomsPage } from "../pages/admin-rooms.page";
import { HomePage } from "../pages/home.page";
import { ReservationPage } from "../pages/reservation.page";
import { expect } from "./matchers";

interface WorkerFixtures {
  anonApi: Api;
  adminApi: Api;
}

interface Pages {
  homePage: HomePage;
  reservationPage: ReservationPage;
  adminLoginPage: AdminLoginPage;
  adminRoomsPage: AdminRoomsPage;
  adminMessagesPage: AdminMessagesPage;
}

export const test = base.extend<Pages, WorkerFixtures>({
  anonApi: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext({ baseURL: env.apiBaseUrl });
      await use(new Api(request));
      await request.dispose();
    },
    { scope: "worker" },
  ],

  adminApi: [
    async ({ playwright, anonApi }, use) => {
      const response = await anonApi.auth.login(env.admin);
      await expect(response, "admin login for API fixtures").toBeOK();
      const { token } = TokenSchema.parse(await response.json());

      // The API expects the token back as a cookie on every protected call.
      const request = await playwright.request.newContext({
        baseURL: env.apiBaseUrl,
        extraHTTPHeaders: { Cookie: `token=${token}` },
      });
      await use(new Api(request));
      await request.dispose();
    },
    { scope: "worker" },
  ],

  homePage: async ({ page }, use) => use(new HomePage(page)),
  reservationPage: async ({ page }, use) => use(new ReservationPage(page)),
  adminLoginPage: async ({ page }, use) => use(new AdminLoginPage(page)),
  adminRoomsPage: async ({ page }, use) => use(new AdminRoomsPage(page)),
  adminMessagesPage: async ({ page }, use) => use(new AdminMessagesPage(page)),
});

export { expect };
