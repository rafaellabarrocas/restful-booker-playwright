import { adminCredentials } from "../../support/api/auth.api";
import { adminPage } from "../../support/pages/admin.page";

describe("UI · Admin login", () => {
  beforeEach(() => {
    adminPage.login.visit();
  });

  it("lets the admin log in and out", { tags: "@smoke" }, () => {
    adminCredentials().then(({ adminUsername, adminPassword }) =>
      adminPage.login.submit(adminUsername, adminPassword),
    );

    cy.location("pathname").should("eq", "/admin/rooms");
    cy.getCookie("token").should("exist");

    adminPage.logoutButton().click();

    cy.location("pathname").should("eq", "/");
    cy.getCookie("token").should("not.exist");

    // The session is really gone: the admin area asks for credentials again.
    adminPage.rooms.visit();
    adminPage.login.form().should("be.visible");
  });

  it("refuses a wrong password and keeps the admin area locked", () => {
    adminCredentials().then(({ adminUsername }) =>
      adminPage.login.submit(adminUsername, "not-the-password"),
    );

    adminPage.login.error().should("have.text", "Invalid credentials");
    cy.getCookie("token").should("not.exist");
    cy.location("pathname").should("eq", "/admin");
  });
});
