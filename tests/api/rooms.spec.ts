import {
  ROOM_TYPES,
  RoomListSchema,
  RoomSchema,
  SuccessSchema,
  ValidationErrorsSchema,
} from "../../src/api/schemas";
import { LIMITS, textOfLength } from "../../src/data/factories";
import { TestData } from "../../src/data/test-data";
import { expect, test } from "../../src/fixtures";

test.describe("API · Rooms", () => {
  let data: TestData;

  test.beforeEach(({ adminApi }) => {
    data = new TestData(adminApi);
  });

  test.afterEach(async ({}, testInfo) => {
    await data.cleanup(testInfo);
  });

  test.describe("happy path", () => {
    test(
      "publishes a new room with every attribute as sent",
      { tag: "@smoke" },
      async ({ adminApi }) => {
        const room = data.room({ type: "Suite", roomPrice: 275, features: ["WiFi", "Views"] });

        const response = await adminApi.rooms.create(room);

        await expect(response).toBeJson(200);
        await expect(response).toMatchSchema(SuccessSchema);
        const created = await data.findRoom(room.roomName);
        await expect(created).toMatchSchema(RoomSchema);
        expect(created).toMatchObject(room);
      },
    );

    test("lists rooms publicly with a valid contract", async ({ anonApi }) => {
      const room = await data.createRoom();

      const response = await anonApi.rooms.list();

      await expect(response).toBeJson(200);
      const body = await response.json();
      await expect(response).toMatchSchema(RoomListSchema);
      expect(body.rooms).toContainEqual(room);
    });

    test(
      "returns a single room by id",
      { tag: "@defect", annotation: { type: "defect", description: "GET /room/:id → HTTP 500" } },
      async ({ anonApi }) => {
        const room = await data.createRoom();

        const response = await anonApi.rooms.get(room.roomid);

        await expect(response).toBeJson(200);
        expect(await response.json()).toEqual(room);
      },
    );

    test(
      "updates a room",
      { tag: "@defect", annotation: { type: "defect", description: "PUT /room/:id → HTTP 500" } },
      async ({ adminApi }) => {
        const room = await data.createRoom({ roomPrice: 100 });

        const response = await adminApi.rooms.update(room.roomid, { ...room, roomPrice: 120 });

        expect(response.ok()).toBe(true);
        expect(await data.findRoom(room.roomName)).toMatchObject({ roomPrice: 120 });
      },
    );

    test(
      "deletes a room",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "DELETE /room/:id → HTTP 500" },
      },
      async ({ adminApi }) => {
        const room = await data.createRoom();

        const response = await adminApi.rooms.delete(room.roomid);

        expect(response.ok()).toBe(true);
        expect(await data.findRoom(room.roomName)).toBeUndefined();
      },
    );
  });

  test.describe("alternative flows", () => {
    for (const type of ROOM_TYPES) {
      test(`creates a ${type} room`, async ({ adminApi }) => {
        const room = data.room({ type });

        await expect(await adminApi.rooms.create(room)).toBeJson(200);

        expect(await data.findRoom(room.roomName)).toMatchObject({ type });
      });
    }

    test("creates a room with no features, not accessible", async ({ adminApi }) => {
      const room = data.room({ features: [], accessible: false });

      await expect(await adminApi.rooms.create(room)).toBeJson(200);

      expect(await data.findRoom(room.roomName)).toMatchObject({ features: [], accessible: false });
    });

    test("creates a room with every feature", async ({ adminApi }) => {
      const features = ["WiFi", "TV", "Radio", "Refreshments", "Safe", "Views"];
      const room = data.room({ features });

      await expect(await adminApi.rooms.create(room)).toBeJson(200);

      expect((await data.findRoom(room.roomName))?.features).toEqual(features);
    });
  });

  test.describe("negative", () => {
    test("rejects a room with no fields, listing every problem", async ({ adminApi }) => {
      const response = await adminApi.rooms.create({});

      await expect(response).toBeJson(400);
      const body = await response.json();
      await expect(response).toMatchSchema(ValidationErrorsSchema);
      expect(body.errors).toEqual(
        expect.arrayContaining([
          "Room name must be set",
          "Type must be set",
          "must be greater than or equal to 1",
        ]),
      );
    });

    test("rejects an unknown room type", async ({ adminApi }) => {
      const room = data.room({ type: "Penthouse" as never });

      const response = await adminApi.rooms.create(room);

      await expect(response).toBeJson(400);
      expect((await response.json()).errors).toEqual([
        "Type can only contain the room options Single, Double, Twin, Family or Suite",
      ]);
      expect(await data.findRoom(room.roomName)).toBeUndefined();
    });

    test("rejects a room created without admin rights", async ({ anonApi }) => {
      const room = data.room();

      await expect(await anonApi.rooms.create(room)).toBeJson(401);

      expect(await data.findRoom(room.roomName)).toBeUndefined();
    });
  });

  test.describe("edge cases", () => {
    const { min, max } = LIMITS.roomPrice;

    for (const price of [min, max]) {
      test(`accepts the boundary price ${price}`, async ({ adminApi }) => {
        const room = data.room({ roomPrice: price });

        await expect(await adminApi.rooms.create(room)).toBeJson(200);

        expect(await data.findRoom(room.roomName)).toMatchObject({ roomPrice: price });
      });
    }

    for (const [price, error] of [
      [min - 1, `must be greater than or equal to ${min}`],
      [max + 1, `must be less than or equal to ${max}`],
      [-50, `must be greater than or equal to ${min}`],
    ] as const) {
      test(`rejects the out-of-range price ${price}`, async ({ adminApi }) => {
        const room = data.room({ roomPrice: price });

        const response = await adminApi.rooms.create(room);

        await expect(response).toBeJson(400);
        expect((await response.json()).errors).toEqual([error]);
        expect(await data.findRoom(room.roomName)).toBeUndefined();
      });
    }
  });

  test.describe("corner cases", () => {
    test("keeps accents and non-Latin characters in the room name", async ({ adminApi }) => {
      const room = data.room({ roomName: `${data.tag}-Suíte-Ñandú-東京` });

      await expect(await adminApi.rooms.create(room)).toBeJson(200);

      expect(await data.findRoom(room.roomName)).toMatchObject({ roomName: room.roomName });
    });

    test(
      "rejects a fractional price instead of silently truncating it",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "150.5 is accepted and stored as 150" },
      },
      async ({ adminApi }) => {
        const room = data.room({ roomPrice: 150.5 });

        await expect(await adminApi.rooms.create(room)).toBeJson(400);
      },
    );

    test(
      "rejects a feature that is not one of the offered amenities",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "Unknown features are accepted" },
      },
      async ({ adminApi }) => {
        const room = data.room({ features: ["Jacuzzi"] });

        await expect(await adminApi.rooms.create(room)).toBeJson(400);
      },
    );

    test(
      "rejects an over-long room name with a validation error",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "300-character name → HTTP 500" },
      },
      async ({ adminApi }) => {
        const room = data.room({ roomName: textOfLength(300, data.tag) });

        const response = await adminApi.rooms.create(room);

        await expect(response).toBeJson(400);
        await expect(response).toMatchSchema(ValidationErrorsSchema);
      },
    );
  });

  test.describe("exceptions", () => {
    test(
      "answers malformed JSON with 400, not a server error",
      { tag: "@defect", annotation: { type: "defect", description: "Malformed JSON → HTTP 500" } },
      async ({ adminApi }) => {
        const response = await adminApi.rooms.create('{"roomName":');

        expect(response.status()).toBe(400);
      },
    );

    test("rejects a price sent as text", async ({ adminApi }) => {
      const room = { ...data.room(), roomPrice: "cheap" };

      const response = await adminApi.rooms.create(room);

      expect(response.status()).toBe(400);
      expect(await data.findRoom(room.roomName)).toBeUndefined();
    });
  });
});
