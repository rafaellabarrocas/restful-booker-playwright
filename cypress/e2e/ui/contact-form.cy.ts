import { listMessages } from "../../support/api/messages.api";
import { buildMessage } from "../../support/data/factories";
import { homePage } from "../../support/pages/home.page";

describe("UI · Guest contact form", () => {
  beforeEach(() => {
    homePage.visit();
  });

  it("confirms a guest's message and delivers it to the admin", { tags: "@smoke" }, () => {
    const message = buildMessage();

    homePage.contactForm.fill(message);
    homePage.contactForm.submit();

    homePage.contactForm
      .confirmation()
      .should("contain.text", `Thanks for getting in touch ${message.name}!`)
      .and("contain.text", message.subject);

    listMessages()
      .then((messages) => messages.find((m) => m.subject === message.subject) ?? null)
      .should("deep.include", { name: message.name });
  });

  it("explains every missing field when the form is sent empty", () => {
    homePage.contactForm.submit();

    homePage.contactForm
      .errors()
      .then(($errors) => Cypress._.map($errors, "innerText"))
      .should("include.members", [
        "Name may not be blank",
        "Email may not be blank",
        "Phone may not be blank",
        "Subject may not be blank",
        "Message may not be blank",
      ]);
  });
});
