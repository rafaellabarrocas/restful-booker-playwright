/**
 * Public home page: room list and the "Send Us a Message" contact form.
 * Page objects locate and act; assertions stay in the specs.
 */
import type { MessageInput } from "../api/types";

export const homePage = {
  visit(): void {
    cy.visit("/");
  },

  roomCardWithText(text: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains(".room-card", text);
  },

  contactForm: {
    fill(message: Partial<MessageInput>): void {
      const fields: [keyof MessageInput, string][] = [
        ["name", "ContactName"],
        ["email", "ContactEmail"],
        ["phone", "ContactPhone"],
        ["subject", "ContactSubject"],
        ["description", "ContactDescription"],
      ];
      for (const [field, testId] of fields) {
        const value = message[field];
        if (value) cy.get(`[data-testid="${testId}"]`).type(value, { delay: 0 });
      }
    },

    submit(): void {
      cy.contains("button", "Submit").click();
    },

    errors(): Cypress.Chainable<JQuery<HTMLElement>> {
      return cy.get(".alert-danger p");
    },

    confirmation(): Cypress.Chainable<JQuery<HTMLElement>> {
      return cy.contains("h3", "Thanks for getting in touch").parent();
    },
  },
};
