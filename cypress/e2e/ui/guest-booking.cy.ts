import { listBookingsForRoom } from "../../support/api/bookings.api";
import { createRoom } from "../../support/api/rooms.api";
import type { Room } from "../../support/api/types";
import { buildBooking, buildRoom, stayDates } from "../../support/data/factories";
import { homePage } from "../../support/pages/home.page";
import { reservationPage } from "../../support/pages/reservation.page";

/**
 * The revenue path: a guest finds a room and books it.
 * Each test books a room it created itself, so availability is deterministic.
 */
describe("UI · Guest booking", () => {
  beforeEach(() => {
    createRoom(buildRoom()).as("room");
  });

  it("offers a newly added room to guests on the home page", function () {
    const room = this.room as Room;

    homePage.visit();

    homePage.roomCardWithText(room.description).should("be.visible");
  });

  it("lets a guest book a room and records the booking", { tags: "@smoke" }, function () {
    const { roomid } = this.room as Room;
    const booking = buildBooking(roomid, { bookingdates: stayDates(45, 2) });

    reservationPage.visit(roomid, booking.bookingdates);
    reservationPage.reserveNowButton().click();
    reservationPage.fillGuestDetails(booking);
    reservationPage.reserveNowButton().click();

    reservationPage.confirmation().should("be.visible");
    listBookingsForRoom(roomid).should("have.length", 1).its(0).should("deep.include", {
      firstname: booking.firstname,
      lastname: booking.lastname,
      bookingdates: booking.bookingdates,
    });
  });
});
