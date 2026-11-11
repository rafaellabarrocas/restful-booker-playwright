import type { Room } from "../../src/api/schemas";
import { ADMIN_STORAGE_STATE } from "../../src/config/paths";
import { TestData } from "../../src/data/test-data";
import { expect, test } from "../../src/fixtures";

test.describe("UI · Admin room management", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  // A room that already exists, shared read-only by the listing tests of this file.
  let seeded: TestData;
  let existingRoom: Room;
  // Rooms created by each test through the form.
  let data: TestData;

  test.beforeAll(async ({ adminApi }) => {
    seeded = new TestData(adminApi);
    existingRoom = await seeded.createRoom({ type: "Twin", roomPrice: 135, features: ["Radio"] });
  });

  test.beforeEach(async ({ adminApi, adminRoomsPage }) => {
    data = new TestData(adminApi);
    await adminRoomsPage.open();
  });

  test.afterEach(async ({}, testInfo) => {
    await data.cleanup(testInfo);
  });

  test.afterAll(async ({}, testInfo) => {
    await seeded.cleanup(testInfo);
  });

  test.describe("happy path", () => {
    test("creates a room from the form", { tag: "@smoke" }, async ({ adminRoomsPage }) => {
      const room = data.room({
        type: "Family",
        accessible: false,
        roomPrice: 180,
        features: ["TV", "Safe"],
      });

      await adminRoomsPage.createRoom(room);

      const row = adminRoomsPage.roomRow(room.roomName);
      await expect(row).toContainText("Family");
      await expect(row).toContainText("180");
      await expect(row).toContainText("TV, Safe");
      expect(await data.findRoom(room.roomName)).toMatchObject({
        type: "Family",
        accessible: false,
        roomPrice: 180,
        features: ["TV", "Safe"],
      });
    });

    test("lists a room that already exists", async ({ adminRoomsPage }) => {
      const row = adminRoomsPage.roomRow(existingRoom.roomName);

      await expect(row).toContainText("Twin");
      await expect(row).toContainText("135");
      await expect(row).toContainText("Radio");
    });
  });

  test.describe("alternative flows", () => {
    test("creates a room with no features", async ({ adminRoomsPage }) => {
      const room = data.room({ features: [] });

      await adminRoomsPage.createRoom(room);

      await expect(adminRoomsPage.roomRow(room.roomName)).toContainText(
        "No features added to the room",
      );
      expect(await data.findRoom(room.roomName)).toMatchObject({ features: [] });
    });
  });

  test.describe("negative", () => {
    test("tells the admin a room name is required", async ({ adminRoomsPage }) => {
      const room = data.room({ roomName: "" });

      await adminRoomsPage.createRoom(room);

      await expect(adminRoomsPage.formErrors).toHaveText("Room name must be set");
    });

    test(
      "tells the admin a price is required",
      {
        tag: "@defect",
        annotation: {
          type: "defect",
          description: "Missing price → generic 'Failed to create room' with no field reason",
        },
      },
      async ({ adminRoomsPage }) => {
        const { roomPrice: _omitted, ...withoutPrice } = data.room();

        await adminRoomsPage.createRoom(withoutPrice);

        await expect(adminRoomsPage.formErrors).toContainText(/price/i);
        expect(await data.findRoom(withoutPrice.roomName)).toBeUndefined();
      },
    );
  });

  test.describe("edge cases", () => {
    test("accepts the highest allowed price", async ({ adminRoomsPage }) => {
      const room = data.room({ roomPrice: 999 });

      await adminRoomsPage.createRoom(room);

      await expect(adminRoomsPage.roomRow(room.roomName)).toContainText("999");
    });

    test("refuses a price above the maximum", async ({ adminRoomsPage }) => {
      const room = data.room({ roomPrice: 1000 });

      await adminRoomsPage.createRoom(room);

      await expect(adminRoomsPage.formErrors).toHaveText("must be less than or equal to 999");
      expect(await data.findRoom(room.roomName)).toBeUndefined();
    });
  });
});
