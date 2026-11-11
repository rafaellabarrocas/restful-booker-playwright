/**
 * Admin authentication against /api/auth.
 *
 * The API issues an opaque token in the login response body; every protected
 * endpoint (and the admin UI) expects it back as a `token` cookie.
 */

interface AdminCredentials {
  adminUsername: string;
  adminPassword: string;
}

let cachedToken: string | undefined;

export function adminCredentials(): Cypress.Chainable<AdminCredentials> {
  return cy
    .env<AdminCredentials>(["adminUsername", "adminPassword"], { log: false })
    .then((credentials) => {
      if (!credentials.adminUsername || !credentials.adminPassword) {
        throw new Error(
          "Admin credentials are not set. Export ADMIN_USERNAME and ADMIN_PASSWORD (see README).",
        );
      }
      return credentials;
    });
}

export function login(
  username: string,
  password: string,
): Cypress.Chainable<Cypress.Response<unknown>> {
  return cy.request({
    method: "POST",
    url: "/api/auth/login",
    body: { username, password },
    failOnStatusCode: false,
    log: false,
  });
}

/** Returns a valid admin token, logging in once per spec file. */
export function adminToken(): Cypress.Chainable<string> {
  if (cachedToken) return cy.wrap(cachedToken, { log: false });

  return adminCredentials()
    .then(({ adminUsername, adminPassword }) => login(adminUsername, adminPassword))
    .then((response) => {
      const { token } = response.body as { token?: string };
      if (response.status !== 200 || !token) {
        throw new Error(`Admin login failed with HTTP ${response.status}`);
      }
      cachedToken = token;
      return token;
    });
}

/** Headers that authenticate a cy.request() as the admin. */
export function adminHeaders(): Cypress.Chainable<Record<string, string>> {
  return adminToken().then((token): Record<string, string> => ({ Cookie: `token=${token}` }));
}
