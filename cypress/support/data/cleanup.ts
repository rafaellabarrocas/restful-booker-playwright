/**
 * Removes everything the current test created, found by its test tag.
 *
 * Runs in a global afterEach, so it also runs when the test fails. Deleting by tag
 * (rather than by tracked ids) also covers data created through the UI, whose ids
 * the test never sees, and the "You have a new booking!" message the platform
 * generates for every booking.
 *
 * A failed delete is reported to the run summary, never thrown: a cleanup problem
 * must not turn a passing test red or hide the real failure of a failing one.
 */
import { deleteBooking, listBookingsForRoom } from "../api/bookings.api";
import { deleteMessage, listMessages } from "../api/messages.api";
import { deleteRoom, listRooms } from "../api/rooms.api";
import { testTag } from "./testTag";

function reportIfFailed(resource: string, response: Cypress.Response<unknown>): void {
  if (response.status >= 200 && response.status < 300) return;

  cy.log(`**cleanup failed** ${resource} → HTTP ${response.status}`);
  cy.task(
    "cleanup:recordFailure",
    {
      spec: Cypress.spec.relative,
      test: Cypress.currentTest.titlePath.join(" › "),
      resource,
      status: response.status,
    },
    { log: false },
  );
}

function deleteTaggedRooms(tag: string): void {
  listRooms().then((rooms) => {
    for (const room of rooms.filter((r) => r.roomName.includes(tag))) {
      listBookingsForRoom(room.roomid).then((bookings) => {
        for (const booking of bookings) {
          deleteBooking(booking.bookingid).then((res) =>
            reportIfFailed(`booking ${booking.bookingid}`, res),
          );
        }
      });
      deleteRoom(room.roomid).then((res) =>
        reportIfFailed(`room ${room.roomid} "${room.roomName}"`, res),
      );
    }
  });
}

function deleteTaggedMessages(tag: string): void {
  listMessages().then((messages) => {
    for (const message of messages.filter((m) => m.name.includes(tag) || m.subject.includes(tag))) {
      deleteMessage(message.id).then((res) =>
        reportIfFailed(`message ${message.id} "${message.subject}"`, res),
      );
    }
  });
}

export function cleanUpTestData(): void {
  const tag = testTag();
  cy.log(`cleanup: removing data tagged "${tag}"`);
  deleteTaggedRooms(tag);
  deleteTaggedMessages(tag);
}
