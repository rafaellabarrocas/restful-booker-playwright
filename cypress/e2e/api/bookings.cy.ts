import { createBooking, listBookingsForRoom, postBooking } from "../../support/api/bookings.api";
import { createRoom } from "../../support/api/rooms.api";
import type { Room } from "../../support/api/types";
import { buildBooking, buildRoom, stayDates } from "../../support/data/factories";

describe("API · Bookings", () => {
  // Every test books its own freshly created room, so availability never depends on
  // what other users of the shared environment have booked.
  beforeEach(() => {
    createRoom(buildRoom()).as("room");
  });

  it("books an available room for a guest", { tags: "@smoke" }, function () {
    const { roomid } = this.room as Room;
    const booking = buildBooking(roomid, { bookingdates: stayDates(40, 3) });

    postBooking(booking).should((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.deep.include({
        roomid,
        firstname: booking.firstname,
        lastname: booking.lastname,
        bookingdates: booking.bookingdates,
      });
    });

    listBookingsForRoom(roomid)
      .should("have.length", 1)
      .its(0)
      .should("deep.include", { firstname: booking.firstname, bookingdates: booking.bookingdates });
  });

  it("does not double-book a room for overlapping dates", { tags: "@smoke" }, function () {
    const { roomid } = this.room as Room;
    createBooking(buildBooking(roomid, { bookingdates: stayDates(50, 3) }));

    const overlapping = buildBooking(roomid, { bookingdates: stayDates(51, 3) });

    postBooking(overlapping).its("status").should("eq", 409);
    listBookingsForRoom(roomid).should("have.length", 1);
  });

  it("allows back-to-back stays (checkout day = next checkin day)", function () {
    const { roomid } = this.room as Room;
    createBooking(buildBooking(roomid, { bookingdates: stayDates(60, 2) }));

    postBooking(buildBooking(roomid, { bookingdates: stayDates(62, 2) }))
      .its("status")
      .should("eq", 201);
  });

  it("rejects a stay whose checkout is before its checkin", function () {
    const { roomid } = this.room as Room;
    const { checkin, checkout } = stayDates(70, 3);

    postBooking(buildBooking(roomid, { bookingdates: { checkin: checkout, checkout: checkin } }))
      .its("status")
      .should("be.within", 400, 499);
    listBookingsForRoom(roomid).should("be.empty");
  });

  it("rejects invalid guest details with a reason per field", function () {
    const { roomid } = this.room as Room;
    const invalid = buildBooking(roomid, { firstname: "Al", email: "not-an-email", phone: "123" });

    postBooking(invalid).should((response) => {
      expect(response.status).to.eq(400);
      expect(response.body)
        .to.have.property("errors")
        .that.includes.members([
          "must be a well-formed email address",
          "size must be between 11 and 21",
        ]);
    });
    listBookingsForRoom(roomid).should("be.empty");
  });
});
