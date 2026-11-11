import { RoomListEnvelopeSchema, type Booking, type Room } from "../../src/api/schemas";
import { isoDate } from "../../src/data/factories";
import { TestData } from "../../src/data/test-data";
import { expect, test } from "../../src/fixtures";

/**
 * Room search by dates (GET /room?checkin=&checkout=), the query behind the home page's
 * "Check Availability". All tests only read, so the data is created once for the file:
 * one room, booked from day 200 to day 204.
 */
test.describe("API · Room availability", () => {
  let data: TestData;
  let room: Room;
  let booking: Booking;

  test.beforeAll(async ({ adminApi }) => {
    data = new TestData(adminApi);
    room = await data.createRoom();
    booking = await data.createBooking(room.roomid, {
      bookingdates: { checkin: isoDate(200), checkout: isoDate(204) },
    });
  });

  test.afterAll(async ({}, testInfo) => {
    await data.cleanup(testInfo);
  });

  test.describe("happy path", () => {
    test("offers the room for dates when it is free", { tag: "@smoke" }, async ({ anonApi }) => {
      const response = await anonApi.rooms.list({ checkin: isoDate(220), checkout: isoDate(222) });

      await expect(response).toBeJson(200);
      await expect(response).toMatchSchema(RoomListEnvelopeSchema);
      expect((await response.json()).rooms).toContainEqual(room);
    });

    test(
      "does not offer the room for dates it is booked",
      { tag: "@smoke" },
      async ({ anonApi }) => {
        const response = await anonApi.rooms.list(booking.bookingdates);

        await expect(response).toBeJson(200);
        expect((await response.json()).rooms).not.toContainEqual(room);
      },
    );
  });

  test.describe("edge cases", () => {
    const PARTIAL_OVERLAP = "Search excludes the room only for exact or enclosing ranges";
    const cases = [
      { name: "a search ending on the booking's checkin day", offered: true, from: 198, to: 200 },
      {
        name: "a search starting on the booking's checkout day",
        offered: true,
        from: 204,
        to: 206,
      },
      { name: "a search enclosing the booking", offered: false, from: 198, to: 206 },
      {
        name: "a search overlapping the first night",
        offered: false,
        from: 199,
        to: 201,
        defect: PARTIAL_OVERLAP,
      },
      {
        name: "a search overlapping the last night",
        offered: false,
        from: 203,
        to: 205,
        defect: PARTIAL_OVERLAP,
      },
      {
        name: "a search inside the booking",
        offered: false,
        from: 201,
        to: 203,
        defect: PARTIAL_OVERLAP,
      },
    ];

    for (const { name, offered, from, to, defect } of cases) {
      const details = defect
        ? { tag: "@defect", annotation: { type: "defect", description: defect } }
        : {};

      test(
        `${offered ? "offers" : "does not offer"} the room for ${name}`,
        details,
        async ({ anonApi }) => {
          const response = await anonApi.rooms.list({
            checkin: isoDate(from),
            checkout: isoDate(to),
          });

          await expect(response).toBeJson(200);
          const roomIds = (await response.json()).rooms.map((r: Room) => r.roomid);
          expect(roomIds.includes(room.roomid)).toBe(offered);
        },
      );
    }
  });

  test.describe("alternative flows", () => {
    test("lists every room, booked or not, when no dates are given", async ({ anonApi }) => {
      const response = await anonApi.rooms.list();

      await expect(response).toBeJson(200);
      expect((await response.json()).rooms).toContainEqual(room);
    });
  });

  test.describe("exceptions", () => {
    test(
      "answers an unparseable date with 400, not a server error",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "checkin=not-a-date → HTTP 500" },
      },
      async ({ anonApi }) => {
        const response = await anonApi.rooms.list({
          checkin: "not-a-date",
          checkout: isoDate(210),
        });

        expect(response.status()).toBe(400);
      },
    );
  });
});
