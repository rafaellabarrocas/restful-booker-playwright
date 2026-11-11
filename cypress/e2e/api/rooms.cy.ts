import { adminHeaders } from "../../support/api/auth.api";
import { createRoom, listRooms, postRoom } from "../../support/api/rooms.api";
import { buildRoom } from "../../support/data/factories";

describe("API · Rooms", () => {
  it("publishes a room created by the admin to the public room list", { tags: "@smoke" }, () => {
    const room = buildRoom({ type: "Suite", roomPrice: 275, features: ["WiFi", "Views"] });

    createRoom(room);

    listRooms()
      .then((rooms) => rooms.find((r) => r.roomName === room.roomName) ?? null)
      .should("deep.include", {
        type: room.type,
        roomPrice: room.roomPrice,
        accessible: room.accessible,
        features: room.features,
        description: room.description,
      });
  });

  it("rejects a room without a name or a valid price", () => {
    adminHeaders()
      .then((headers) => postRoom(buildRoom({ roomName: "", roomPrice: 0 }), headers))
      .should((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property("errors").that.includes("Room name must be set");
      });
  });
});
