import { env } from "../../src/config/env";
import { expect, test } from "../../src/fixtures";

/** The only spec that drives the login form; other admin specs start from a saved session. */
test.describe("UI · Admin login", () => {
  test.beforeEach(async ({ adminLoginPage }) => {
    await adminLoginPage.open();
  });

  test.describe("happy path", () => {
    test(
      "logs the admin in to room management",
      { tag: "@smoke" },
      async ({ page, adminLoginPage, adminRoomsPage }) => {
        await adminLoginPage.logIn(env.admin.username, env.admin.password);

        await expect(page).toHaveURL(/\/admin\/rooms$/);
        await expect(adminRoomsPage.logoutButton).toBeVisible();
      },
    );

    test("logs the admin out and locks the admin area again", async ({
      page,
      adminLoginPage,
      adminRoomsPage,
    }) => {
      await adminLoginPage.logIn(env.admin.username, env.admin.password);
      // The login page also shows a Logout button: be on the rooms page before using it.
      await expect(adminRoomsPage.createButton).toBeVisible();
      await adminRoomsPage.logOut();

      await expect(page).toHaveURL(/\/$/);
      expect(await page.context().cookies()).not.toContainEqual(
        expect.objectContaining({ name: "token" }),
      );
      await adminRoomsPage.open();
      await expect(adminLoginPage.loginButton).toBeVisible();
    });
  });

  test.describe("negative", () => {
    test("refuses a wrong password", async ({ page, adminLoginPage }) => {
      await adminLoginPage.logIn(env.admin.username, env.admin.password + "-not");

      await expect(adminLoginPage.errorMessage).toHaveText("Invalid credentials");
      await expect(page).toHaveURL(/\/admin$/);
      expect(await page.context().cookies()).not.toContainEqual(
        expect.objectContaining({ name: "token" }),
      );
    });

    test("refuses empty credentials", async ({ page, adminLoginPage }) => {
      await adminLoginPage.logIn("", "");

      await expect(adminLoginPage.errorMessage).toHaveText("Invalid credentials");
      await expect(page).toHaveURL(/\/admin$/);
    });
  });

  test.describe("corner cases", () => {
    test("asks for credentials when an admin page is opened without a session", async ({
      adminRoomsPage,
      adminLoginPage,
    }) => {
      await adminRoomsPage.open();

      await expect(adminLoginPage.loginButton).toBeVisible();
      await expect(adminRoomsPage.createButton).toBeHidden();
    });
  });
});
