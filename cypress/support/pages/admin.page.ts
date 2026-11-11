/**
 * Admin panel: login, room management and the messages inbox.
 * Page objects locate and act; assertions stay in the specs.
 */
import type { RoomFeature, RoomInput } from "../api/types";

const featureCheckbox: Record<RoomFeature, string> = {
  WiFi: "#wifiCheckbox",
  TV: "#tvCheckbox",
  Radio: "#radioCheckbox",
  Refreshments: "#refreshCheckbox",
  Safe: "#safeCheckbox",
  Views: "#viewsCheckbox",
};

export const adminPage = {
  login: {
    visit(): void {
      cy.visit("/admin");
    },

    submit(username: string, password: string): void {
      cy.get("#username").type(username, { delay: 0 });
      cy.get("#password").type(password, { delay: 0, log: false });
      cy.get("#doLogin").click();
    },

    form(): Cypress.Chainable<JQuery<HTMLElement>> {
      return cy.get("#doLogin");
    },

    error(): Cypress.Chainable<JQuery<HTMLElement>> {
      return cy.get('.alert-danger[role="alert"]');
    },
  },

  logoutButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains<HTMLElement>("button", "Logout");
  },

  rooms: {
    visit(): void {
      cy.visit("/admin/rooms");
    },

    rowFor(roomName: string): Cypress.Chainable<JQuery<HTMLElement>> {
      return cy.contains('[data-testid="roomlisting"]', roomName);
    },

    create(
      room: Pick<RoomInput, "roomName" | "type" | "accessible" | "roomPrice" | "features">,
    ): void {
      cy.get('[data-testid="roomName"]').type(room.roomName, { delay: 0 });
      cy.get("#type").select(room.type);
      cy.get("#accessible").select(String(room.accessible));
      cy.get("#roomPrice").type(String(room.roomPrice), { delay: 0 });
      for (const feature of room.features) cy.get(featureCheckbox[feature]).check();
      cy.get("#createRoom").click();
    },
  },

  messages: {
    visit(): void {
      cy.visit("/admin/message");
    },

    rowFor(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
      return cy.contains('[data-testid^="message"]', name).parent();
    },
  },
};
