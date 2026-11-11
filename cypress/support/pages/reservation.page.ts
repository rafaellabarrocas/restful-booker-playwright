/**
 * Guest reservation page (/reservation/:roomid?checkin=&checkout=).
 *
 * NOTE: at the time of writing this page never renders on the live environment
 * (it hangs on a spinner because GET /api/room/:id returns 500), so the form
 * locators below could not be checked against the real DOM. They follow the
 * platform's field names and must be confirmed once the page loads again.
 */
import type { BookingDates, BookingInput } from "../api/types";

type GuestDetails = Pick<BookingInput, "firstname" | "lastname" | "email" | "phone">;

export const reservationPage = {
  visit(roomid: number, { checkin, checkout }: BookingDates): void {
    cy.visit(`/reservation/${roomid}?checkin=${checkin}&checkout=${checkout}`);
  },

  reserveNowButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains<HTMLElement>("button", "Reserve Now");
  },

  fillGuestDetails(guest: GuestDetails): void {
    cy.get('input[name="firstname"]').type(guest.firstname, { delay: 0 });
    cy.get('input[name="lastname"]').type(guest.lastname, { delay: 0 });
    cy.get('input[name="email"]').type(guest.email, { delay: 0 });
    cy.get('input[name="phone"]').type(guest.phone, { delay: 0 });
  },

  confirmation(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains<HTMLElement>("Booking Confirmed");
  },
};
