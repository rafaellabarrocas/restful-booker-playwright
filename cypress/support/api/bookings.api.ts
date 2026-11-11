import { adminHeaders } from "./auth.api";
import type { Booking, BookingInput } from "./types";

/** Public endpoint used by the guest booking flow. Yields the raw response. */
export function postBooking(
  booking: Partial<BookingInput>,
): Cypress.Chainable<Cypress.Response<unknown>> {
  return cy.request({
    method: "POST",
    url: "/api/booking",
    body: booking,
    failOnStatusCode: false,
  });
}

export function createBooking(booking: BookingInput): Cypress.Chainable<Booking> {
  return postBooking(booking).then((response) => {
    if (response.status !== 201) {
      throw new Error(
        `Booking setup failed with HTTP ${response.status}: ${JSON.stringify(response.body)}`,
      );
    }
    return response.body as Booking;
  });
}

export function listBookingsForRoom(roomid: number): Cypress.Chainable<Booking[]> {
  return adminHeaders()
    .then((headers) =>
      cy.request<{ bookings: Booking[] }>({ url: `/api/booking?roomid=${roomid}`, headers }),
    )
    .its("body.bookings");
}

export function deleteBooking(bookingid: number): Cypress.Chainable<Cypress.Response<unknown>> {
  return adminHeaders().then((headers) =>
    cy.request({
      method: "DELETE",
      url: `/api/booking/${bookingid}`,
      headers,
      failOnStatusCode: false,
    }),
  );
}
