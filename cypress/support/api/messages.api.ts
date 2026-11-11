import { adminHeaders } from "./auth.api";
import type { MessageInput, MessageSummary } from "./types";

/** Public endpoint behind the "Send Us a Message" form. Yields the raw response. */
export function postMessage(
  message: Partial<MessageInput>,
): Cypress.Chainable<Cypress.Response<unknown>> {
  return cy.request({
    method: "POST",
    url: "/api/message",
    body: message,
    failOnStatusCode: false,
  });
}

export function listMessages(): Cypress.Chainable<MessageSummary[]> {
  return adminHeaders()
    .then((headers) => cy.request<{ messages: MessageSummary[] }>({ url: "/api/message", headers }))
    .its("body.messages");
}

/**
 * Sends a guest message and yields its summary.
 * The API only answers `{ success: true }`, so the id is resolved by the message's unique subject.
 */
export function createMessage(message: MessageInput): Cypress.Chainable<MessageSummary> {
  return postMessage(message)
    .then((response) => {
      if (response.status !== 200) {
        throw new Error(
          `Message setup failed with HTTP ${response.status}: ${JSON.stringify(response.body)}`,
        );
      }
      return listMessages();
    })
    .then((messages) => {
      const created = messages.find((m) => m.subject === message.subject);
      if (!created) throw new Error(`Message "${message.subject}" was sent but is not listed`);
      return created;
    });
}

export function deleteMessage(id: number): Cypress.Chainable<Cypress.Response<unknown>> {
  return adminHeaders().then((headers) =>
    cy.request({ method: "DELETE", url: `/api/message/${id}`, headers, failOnStatusCode: false }),
  );
}
