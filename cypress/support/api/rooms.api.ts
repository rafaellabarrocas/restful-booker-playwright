import { adminHeaders } from "./auth.api";
import type { Room, RoomInput } from "./types";

export function listRooms(): Cypress.Chainable<Room[]> {
  return cy.request<{ rooms: Room[] }>({ url: "/api/room", log: false }).its("body.rooms");
}

/** Yields null (not undefined: Cypress would keep the previous subject) when absent. */
export function findRoomByName(roomName: string): Cypress.Chainable<Room | null> {
  return listRooms().then((rooms) =>
    cy.wrap(rooms.find((room) => room.roomName === roomName) ?? null, { log: false }),
  );
}

/** Sends the create request as-is and yields the raw response (for negative tests). */
export function postRoom(
  room: Partial<RoomInput>,
  headers: Record<string, string> = {},
): Cypress.Chainable<Cypress.Response<unknown>> {
  return cy.request({
    method: "POST",
    url: "/api/room",
    headers,
    body: room,
    failOnStatusCode: false,
  });
}

/**
 * Creates a room as the admin and yields it with its id.
 * The API only answers `{ success: true }`, so the id is resolved by the room's unique name.
 */
export function createRoom(room: RoomInput): Cypress.Chainable<Room> {
  return adminHeaders()
    .then((headers) => postRoom(room, headers))
    .then((response) => {
      if (response.status !== 200) {
        throw new Error(
          `Room setup failed with HTTP ${response.status}: ${JSON.stringify(response.body)}`,
        );
      }
      return findRoomByName(room.roomName);
    })
    .then((created) => {
      if (!created) throw new Error(`Room "${room.roomName}" was created but is not listed`);
      return created;
    });
}

export function deleteRoom(roomid: number): Cypress.Chainable<Cypress.Response<unknown>> {
  return adminHeaders().then((headers) =>
    cy.request({ method: "DELETE", url: `/api/room/${roomid}`, headers, failOnStatusCode: false }),
  );
}
