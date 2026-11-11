import {
  BookingListSchema,
  BookingSchema,
  ErrorSchema,
  ValidationErrorsSchema,
  type Room,
} from "../../src/api/schemas";
import { LIMITS, isoDate, phoneOfLength, stay, textOfLength } from "../../src/data/factories";
import { TestData } from "../../src/data/test-data";
import { expect, test } from "../../src/fixtures";

const DOUBLE_BOOKING = { error: "Failed to create booking" };

test.describe("API · Bookings", () => {
  let data: TestData;
  let room: Room;

  // Every test books a room of its own, so availability never depends on what other
  // tests or other users of the shared environment have booked.
  test.beforeEach(async ({ adminApi }) => {
    data = new TestData(adminApi);
    room = await data.createRoom();
  });

  test.afterEach(async ({}, testInfo) => {
    await data.cleanup(testInfo);
  });

  test.describe("happy path", () => {
    test(
      "books an available room and echoes the booking",
      { tag: "@smoke" },
      async ({ anonApi }) => {
        const booking = data.booking(room.roomid, { bookingdates: stay(40, 3) });

        const response = await anonApi.bookings.create(booking);

        await expect(response).toBeJson(201);
        const body = await response.json();
        await expect(response).toMatchSchema(BookingSchema);
        expect(body).toEqual({
          bookingid: expect.any(Number),
          roomid: room.roomid,
          firstname: booking.firstname,
          lastname: booking.lastname,
          depositpaid: booking.depositpaid,
          bookingdates: booking.bookingdates,
        });
      },
    );

    test("stores the booking against the room", async ({ adminApi }) => {
      const booking = await data.createBooking(room.roomid);

      const response = await adminApi.bookings.listForRoom(room.roomid);

      await expect(response).toBeJson(200);
      const body = await response.json();
      await expect(response).toMatchSchema(BookingListSchema);
      expect(body.bookings).toEqual([booking]);
    });

    test("notifies the admin of the new booking", async () => {
      const booking = await data.createBooking(room.roomid);

      expect(await data.findMessageFrom(`${booking.firstname} ${booking.lastname}`)).toMatchObject({
        subject: "You have a new booking!",
        read: false,
      });
    });

    test(
      "returns a single booking by id",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "GET /booking/:id → HTTP 500" },
      },
      async ({ adminApi }) => {
        const booking = await data.createBooking(room.roomid);

        const response = await adminApi.bookings.get(booking.bookingid);

        await expect(response).toBeJson(200);
        expect(await response.json()).toMatchObject(booking);
      },
    );

    test(
      "cancels a booking and frees its dates",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "DELETE /booking/:id → HTTP 500" },
      },
      async ({ adminApi, anonApi }) => {
        const dates = stay(45);
        const booking = await data.createBooking(room.roomid, { bookingdates: dates });

        expect((await adminApi.bookings.delete(booking.bookingid)).ok()).toBe(true);

        await expect(
          await anonApi.bookings.create(data.booking(room.roomid, { bookingdates: dates })),
        ).toBeJson(201);
      },
    );
  });

  test.describe("alternative flows", () => {
    for (const depositpaid of [true, false]) {
      test(`records a booking with deposit paid = ${depositpaid}`, async ({ anonApi }) => {
        const response = await anonApi.bookings.create(data.booking(room.roomid, { depositpaid }));

        await expect(response).toBeJson(201);
        expect(await response.json()).toMatchObject({ depositpaid });
      });
    }

    test("accepts back-to-back stays (checkout day = next checkin day)", async ({ anonApi }) => {
      await data.createBooking(room.roomid, {
        bookingdates: { checkin: isoDate(60), checkout: isoDate(62) },
      });

      const response = await anonApi.bookings.create(
        data.booking(room.roomid, {
          bookingdates: { checkin: isoDate(62), checkout: isoDate(64) },
        }),
      );

      await expect(response).toBeJson(201);
      expect(await data.bookingsForRoom(room.roomid)).toHaveLength(2);
    });

    test("accepts the same dates on a different room", async ({ anonApi }) => {
      const otherRoom = await data.createRoom({ roomName: `${data.tag}-other` });
      const dates = stay(70);
      await data.createBooking(room.roomid, { bookingdates: dates });

      const response = await anonApi.bookings.create(
        data.booking(otherRoom.roomid, { bookingdates: dates }),
      );

      await expect(response).toBeJson(201);
    });
  });

  test.describe("negative", () => {
    const existing = { checkin: isoDate(80), checkout: isoDate(84) };
    const overlaps = [
      { name: "the same dates", dates: existing },
      { name: "a stay starting inside it", dates: { checkin: isoDate(82), checkout: isoDate(86) } },
      { name: "a stay ending inside it", dates: { checkin: isoDate(78), checkout: isoDate(81) } },
      { name: "a stay enclosing it", dates: { checkin: isoDate(79), checkout: isoDate(85) } },
      { name: "a stay inside it", dates: { checkin: isoDate(81), checkout: isoDate(83) } },
    ];

    for (const { name, dates } of overlaps) {
      test(`refuses to double-book: ${name}`, { tag: "@smoke" }, async ({ anonApi }) => {
        await data.createBooking(room.roomid, { bookingdates: existing });

        const response = await anonApi.bookings.create(
          data.booking(room.roomid, { bookingdates: dates }),
        );

        await expect(response).toBeJson(409);
        expect(await response.json()).toEqual(DOUBLE_BOOKING);
        expect(await data.bookingsForRoom(room.roomid)).toHaveLength(1);
      });
    }

    test("refuses a stay whose checkout is before its checkin", async ({ anonApi }) => {
      const { checkin, checkout } = stay(90, 3);

      const response = await anonApi.bookings.create(
        data.booking(room.roomid, { bookingdates: { checkin: checkout, checkout: checkin } }),
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
      await expect(response).toMatchSchema(ErrorSchema);
      expect(await data.bookingsForRoom(room.roomid)).toEqual([]);
    });

    test("refuses a zero-night stay (checkin = checkout)", async ({ anonApi }) => {
      const day = isoDate(95);

      const response = await anonApi.bookings.create(
        data.booking(room.roomid, { bookingdates: { checkin: day, checkout: day } }),
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
      expect(await data.bookingsForRoom(room.roomid)).toEqual([]);
    });

    test("refuses a booking with no fields, listing every problem", async ({ anonApi }) => {
      const response = await anonApi.bookings.create({});

      await expect(response).toBeJson(400);
      const body = await response.json();
      await expect(response).toMatchSchema(ValidationErrorsSchema);
      expect(body.errors).toEqual(
        expect.arrayContaining(["Firstname should not be blank", "Lastname should not be blank"]),
      );
    });

    test("refuses an invalid email address", async ({ anonApi }) => {
      const response = await anonApi.bookings.create(
        data.booking(room.roomid, { email: "not-an-email" }),
      );

      await expect(response).toBeJson(400);
      expect((await response.json()).errors).toEqual(["must be a well-formed email address"]);
      expect(await data.bookingsForRoom(room.roomid)).toEqual([]);
    });

    test("refuses a calendar date that does not exist (30 February)", async ({ anonApi }) => {
      const response = await anonApi.bookings.create(
        data.booking(room.roomid, {
          bookingdates: { checkin: "2031-02-30", checkout: "2031-03-02" },
        }),
      );

      await expect(response).toBeJson(400);
      expect(await data.bookingsForRoom(room.roomid)).toEqual([]);
    });

    test("lists bookings only to the admin", async ({ anonApi }) => {
      const response = await anonApi.bookings.listForRoom(room.roomid);

      await expect(response).toBeJson(401);
      expect(await response.json()).toEqual({ error: "Authentication required" });
    });

    test("requires a room when listing bookings", async ({ adminApi }) => {
      const response = await adminApi.bookings.listForRoom("");

      await expect(response).toBeJson(400);
      expect(await response.json()).toEqual({ error: "Room ID is required" });
    });
  });

  test.describe("edge cases", () => {
    const boundaries = [
      { field: "firstname", value: textOfLength(LIMITS.firstname.min, "Q") },
      { field: "firstname", value: textOfLength(LIMITS.firstname.max, "Q") },
      { field: "lastname", value: textOfLength(LIMITS.lastname.min, "Q") },
      { field: "lastname", value: textOfLength(LIMITS.lastname.max, "Q") },
      { field: "phone", value: phoneOfLength(LIMITS.phone.min) },
      { field: "phone", value: phoneOfLength(LIMITS.phone.max) },
    ] as const;

    for (const { field, value } of boundaries) {
      test(`accepts a ${field} of ${value.length} characters (limit)`, async ({ anonApi }) => {
        const response = await anonApi.bookings.create(
          data.booking(room.roomid, { [field]: value }),
        );

        await expect(response).toBeJson(201);
      });
    }

    const outOfBounds = [
      {
        field: "firstname",
        value: textOfLength(LIMITS.firstname.min - 1, "Q"),
        error: "size must be between 3 and 18",
      },
      {
        field: "firstname",
        value: textOfLength(LIMITS.firstname.max + 1, "Q"),
        error: "size must be between 3 and 18",
      },
      {
        field: "lastname",
        value: textOfLength(LIMITS.lastname.min - 1, "Q"),
        error: "size must be between 3 and 30",
      },
      {
        field: "lastname",
        value: textOfLength(LIMITS.lastname.max + 1, "Q"),
        error: "size must be between 3 and 30",
      },
      {
        field: "phone",
        value: phoneOfLength(LIMITS.phone.min - 1),
        error: "size must be between 11 and 21",
      },
      {
        field: "phone",
        value: phoneOfLength(LIMITS.phone.max + 1),
        error: "size must be between 11 and 21",
      },
    ] as const;

    for (const { field, value, error } of outOfBounds) {
      test(`refuses a ${field} of ${value.length} characters`, async ({ anonApi }) => {
        const response = await anonApi.bookings.create(
          data.booking(room.roomid, { [field]: value }),
        );

        await expect(response).toBeJson(400);
        expect((await response.json()).errors).toEqual([error]);
        expect(await data.bookingsForRoom(room.roomid)).toEqual([]);
      });
    }

    test("accepts a one-night stay", async ({ anonApi }) => {
      const response = await anonApi.bookings.create(
        data.booking(room.roomid, { bookingdates: stay(100, 1) }),
      );

      await expect(response).toBeJson(201);
    });

    test("accepts a stay ending on a leap day", async ({ anonApi }) => {
      const bookingdates = { checkin: "2028-02-28", checkout: "2028-02-29" };

      const response = await anonApi.bookings.create(data.booking(room.roomid, { bookingdates }));

      await expect(response).toBeJson(201);
      expect((await response.json()).bookingdates).toEqual(bookingdates);
    });
  });

  test.describe("corner cases", () => {
    test("keeps accents and non-Latin characters in guest names", async ({ anonApi }) => {
      const response = await anonApi.bookings.create(
        data.booking(room.roomid, { firstname: "Zoë-Ñandú", lastname: "Øster-東京" }),
      );

      await expect(response).toBeJson(201);
      expect(await response.json()).toMatchObject({
        firstname: "Zoë-Ñandú",
        lastname: "Øster-東京",
      });
    });

    test("never returns the guest's email or phone", async ({ anonApi }) => {
      const response = await anonApi.bookings.create(data.booking(room.roomid));

      await expect(response).toBeJson(201);
      const body = await response.json();
      expect(body).not.toHaveProperty("email");
      expect(body).not.toHaveProperty("phone");
    });

    test(
      "refuses a stay in the past",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "Past dates are accepted (201)" },
      },
      async ({ anonApi }) => {
        const response = await anonApi.bookings.create(
          data.booking(room.roomid, { bookingdates: stay(-30) }),
        );

        expect(response.status()).toBe(400);
      },
    );

    test(
      "refuses a booking for a room that does not exist",
      {
        tag: "@defect",
        annotation: {
          type: "defect",
          description: "Booking on a non-existent room is accepted (201)",
        },
      },
      async ({ anonApi }) => {
        const response = await anonApi.bookings.create(data.booking(987_654));
        await data.trackBookingIfCreated(response);

        expect([400, 404]).toContain(response.status());
      },
    );
  });

  test.describe("exceptions", () => {
    test(
      "answers malformed JSON with 400, not a server error",
      { tag: "@defect", annotation: { type: "defect", description: "Malformed JSON → HTTP 500" } },
      async ({ anonApi }) => {
        const response = await anonApi.bookings.create('{"roomid":');

        expect(response.status()).toBe(400);
      },
    );

    test("refuses a room id sent as text", async ({ anonApi }) => {
      const response = await anonApi.bookings.create({
        ...data.booking(room.roomid),
        roomid: "abc",
      });

      await expect(response).toBeJson(400);
      expect(await data.bookingsForRoom(room.roomid)).toEqual([]);
    });
  });
});
