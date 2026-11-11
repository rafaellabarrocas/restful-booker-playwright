import { adminCredentials, login } from "../../support/api/auth.api";
import { postRoom } from "../../support/api/rooms.api";
import { buildRoom } from "../../support/data/factories";

describe("API · Admin authentication", () => {
  it("issues a token that the API accepts as valid", { tags: "@smoke" }, () => {
    adminCredentials()
      .then(({ adminUsername, adminPassword }) => login(adminUsername, adminPassword))
      .should((response) => {
        expect(response.status).to.eq(200);
        expect(response.body)
          .to.have.property("token")
          .that.is.a("string")
          .with.length.greaterThan(0);
      })
      .its("body.token")
      .then((token) => cy.request({ method: "POST", url: "/api/auth/validate", body: { token } }))
      .its("body.valid")
      .should("eq", true);
  });

  it("rejects a wrong password", () => {
    adminCredentials()
      .then(({ adminUsername }) => login(adminUsername, "not-the-password"))
      .should((response) => {
        expect(response.status).to.eq(401);
        expect(response.body).not.to.have.property("token");
      });
  });

  it("refuses admin operations without a token", () => {
    postRoom(buildRoom()).its("status").should("eq", 401);
  });
});
