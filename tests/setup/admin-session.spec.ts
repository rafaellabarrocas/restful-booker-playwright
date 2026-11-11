/**
 * Authenticates the admin once through the API and saves the browser state, so admin UI
 * tests start already logged in. Only tests/ui/admin-login.spec.ts drives the login form.
 */
import { TokenSchema } from "../../src/api/schemas";
import { env } from "../../src/config/env";
import { ADMIN_STORAGE_STATE } from "../../src/config/paths";
import { expect, test as setup } from "../../src/fixtures";

setup("authenticate the admin", async ({ anonApi, page, adminRoomsPage }) => {
  const response = await anonApi.auth.login(env.admin);
  await expect(response).toBeJson(200);
  const { token } = TokenSchema.parse(await response.json());

  await page.context().addCookies([{ name: "token", value: token, url: env.baseUrl }]);
  await adminRoomsPage.open();
  await expect(adminRoomsPage.logoutButton).toBeVisible();

  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
