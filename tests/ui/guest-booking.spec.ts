import type { Room } from "../../src/api/schemas";
import { stay } from "../../src/data/factories";
import { TestData } from "../../src/data/test-data";
import { expect, test } from "../../src/fixtures";

/**
 * The revenue path: a guest finds a room and books it. Each test creates the room it
 * books through the API, so availability is deterministic on a shared environment.
 * Rules (overlaps, limits, validation) are covered at the API layer; the UI covers the
 * journey once.
 */
test.describe("UI · Guest booking", () => {
  let data: TestData;
  let room: Room;

  test.beforeEach(async ({ adminApi }) => {
    data = new TestData(adminApi);
    room = await data.createRoom();
  });

  test.afterEach(async ({}, testInfo) => {
    await data.cleanup(testInfo);
  });

  test.describe("happy path", () => {
    test(
      "offers a newly added room to guests on the home page",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "The home page renders only the first 3 rooms" },
      },
      async ({ homePage }) => {
        await homePage.open();

        await expect(homePage.roomOnOffer(room.description ?? room.roomName)).toBeVisible();
      },
    );

    test(
      "lets a guest book a room and records the booking",
      {
        tag: ["@smoke", "@defect"],
        annotation: {
          type: "defect",
          description: "Reservation page never loads: GET /room/:id → 500",
        },
      },
      async ({ reservationPage }) => {
        const booking = data.booking(room.roomid, { bookingdates: stay(45, 2) });

        await reservationPage.open(room.roomid, booking.bookingdates);
        await reservationPage.reserve(booking);

        await expect(reservationPage.confirmationHeading).toBeVisible();
        expect(await data.bookingsForRoom(room.roomid)).toEqual([
          expect.objectContaining({
            firstname: booking.firstname,
            lastname: booking.lastname,
            bookingdates: booking.bookingdates,
          }),
        ]);
      },
    );
  });
});
