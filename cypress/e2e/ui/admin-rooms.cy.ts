import { createRoom, findRoomByName } from "../../support/api/rooms.api";
import { buildRoom } from "../../support/data/factories";
import { adminPage } from "../../support/pages/admin.page";

describe("UI · Admin room management", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it("creates a room from the admin panel", { tags: "@smoke" }, () => {
    const room = buildRoom({
      type: "Family",
      accessible: false,
      roomPrice: 180,
      features: ["TV", "Safe"],
    });

    adminPage.rooms.visit();
    adminPage.rooms.create(room);

    adminPage.rooms
      .rowFor(room.roomName)
      .should("contain.text", room.type)
      .and("contain.text", String(room.roomPrice));

    findRoomByName(room.roomName).should("deep.include", {
      type: room.type,
      accessible: room.accessible,
      roomPrice: room.roomPrice,
      features: room.features,
    });
  });

  it("lists rooms that already exist", () => {
    const room = buildRoom();
    createRoom(room);

    adminPage.rooms.visit();

    adminPage.rooms.rowFor(room.roomName).should("be.visible");
  });
});
