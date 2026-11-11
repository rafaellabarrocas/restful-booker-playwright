import { BrandingSchema, ReportSchema, type Booking, type Room } from "../../src/api/schemas";
import { stay } from "../../src/data/factories";
import { TestData } from "../../src/data/test-data";
import { expect, test } from "../../src/fixtures";

test.describe("API · Branding", () => {
  test(
    "publishes the hotel's details with a valid contract",
    { tag: "@smoke" },
    async ({ anonApi }) => {
      const response = await anonApi.branding.get();

      await expect(response).toBeJson(200);
      await expect(response).toMatchSchema(BrandingSchema);
    },
  );

  test("refuses branding changes without admin rights", async ({ anonApi }) => {
    // An empty body is enough: the call must be refused before it is even validated,
    // and nothing is changed on the shared environment either way.
    const response = await anonApi.branding.update({});

    await expect(response).toBeJson(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
  });
});

test.describe("API · Booking report", () => {
  let data: TestData;
  let room: Room;
  let booking: Booking;

  // Read-only tests: one room and one booking for the whole file.
  test.beforeAll(async ({ adminApi }) => {
    data = new TestData(adminApi);
    room = await data.createRoom();
    booking = await data.createBooking(room.roomid, { bookingdates: stay(120, 3) });
  });

  test.afterAll(async ({}, testInfo) => {
    await data.cleanup(testInfo);
  });

  test("lists every booking with its guest, room and dates", async ({ adminApi }) => {
    const response = await adminApi.report.all();

    await expect(response).toBeJson(200);
    await expect(response).toMatchSchema(ReportSchema);
    expect((await response.json()).report).toContainEqual({
      title: `${booking.firstname} ${booking.lastname} - Room: ${room.roomName}`,
      start: booking.bookingdates.checkin,
      end: booking.bookingdates.checkout,
    });
  });

  test("is only available to the admin", async ({ anonApi }) => {
    const response = await anonApi.report.all();

    await expect(response).toBeJson(401);
  });

  test(
    "reports the bookings of a single room",
    {
      tag: "@defect",
      annotation: { type: "defect", description: "GET /report/room/:id → HTTP 500" },
    },
    async ({ adminApi }) => {
      const response = await adminApi.report.forRoom(room.roomid);

      await expect(response).toBeJson(200);
      await expect(response).toMatchSchema(ReportSchema);
    },
  );
});
