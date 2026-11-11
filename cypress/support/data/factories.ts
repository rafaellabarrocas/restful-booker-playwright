/**
 * Builders for valid API payloads. Each returns a complete, valid object tagged with the
 * current test's tag; override only the fields a test cares about.
 *
 * Validation limits (observed on the live API):
 *  booking: firstname 3–18, lastname 3–30, phone 11–21, valid email
 *  message: name required, phone 11–21, subject 5–100, description 20–2000, valid email
 *  room:    roomName required, roomPrice >= 1
 */
import { faker } from "@faker-js/faker";
import { testTag } from "./testTag";
import type { BookingDates, BookingInput, MessageInput, RoomInput } from "../api/types";

const ukPhone = (): string => `07${faker.string.numeric(9)}`;

export function buildRoom(overrides: Partial<RoomInput> = {}): RoomInput {
  return {
    roomName: `${testTag()}-room`,
    type: "Double",
    accessible: true,
    roomPrice: faker.number.int({ min: 50, max: 400 }),
    features: ["WiFi", "TV"],
    description: `${testTag()} ${faker.lorem.sentence()}`,
    image: "/images/room2.jpg",
    ...overrides,
  };
}

/** A stay of `nights` nights, starting `daysFromToday` days from now. */
export function stayDates(daysFromToday: number, nights: number): BookingDates {
  const checkin = new Date();
  checkin.setUTCDate(checkin.getUTCDate() + daysFromToday);
  const checkout = new Date(checkin);
  checkout.setUTCDate(checkout.getUTCDate() + nights);

  const isoDate = (date: Date): string => date.toISOString().slice(0, 10);
  return { checkin: isoDate(checkin), checkout: isoDate(checkout) };
}

export function buildBooking(roomid: number, overrides: Partial<BookingInput> = {}): BookingInput {
  return {
    roomid,
    firstname: testTag(),
    lastname: faker.person.lastName().padEnd(3, "x"),
    depositpaid: false,
    email: faker.internet.email({ provider: "example.com" }),
    phone: ukPhone(),
    bookingdates: stayDates(30, 2),
    ...overrides,
  };
}

export function buildMessage(overrides: Partial<MessageInput> = {}): MessageInput {
  return {
    name: `${testTag()} ${faker.person.lastName()}`,
    email: faker.internet.email({ provider: "example.com" }),
    phone: ukPhone(),
    subject: `${testTag()} question about my stay`,
    description: faker.lorem.sentences(2).padEnd(20, "."),
    ...overrides,
  };
}
