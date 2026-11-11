import { adminToken } from "./api/auth.api";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Authenticates the browser as the admin through the API (no UI login) and caches the
       * session across tests. Use it in every admin test that is not about logging in.
       */
      loginAsAdmin(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("loginAsAdmin", () => {
  cy.session(
    "admin",
    () => {
      adminToken().then((token) => cy.setCookie("token", token));
    },
    {
      validate() {
        cy.getCookie("token")
          .its("value")
          .then((token) =>
            cy.request({ method: "POST", url: "/api/auth/validate", body: { token } }),
          )
          .its("body.valid")
          .should("eq", true);
      },
      cacheAcrossSpecs: true,
    },
  );
});
