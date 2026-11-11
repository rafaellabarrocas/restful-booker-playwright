import { createMessage } from "../../support/api/messages.api";
import { buildMessage } from "../../support/data/factories";
import { adminPage } from "../../support/pages/admin.page";

describe("UI · Admin messages inbox", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it("shows a guest's message to the admin", () => {
    const message = buildMessage();
    createMessage(message);

    adminPage.messages.visit();

    adminPage.messages.rowFor(message.name).should("contain.text", message.subject);
  });
});
