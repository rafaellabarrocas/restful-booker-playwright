/**
 * Builders for valid request payloads. Each returns a complete, valid object that carries
 * the owner's unique tag; tests override only the fields they are about.
 *
 * Field limits (observed on the live API, and pinned by the boundary tests):
 *   room     roomName required · roomPrice 1–999 · type one of ROOM_TYPES
 *   booking  firstname 3–18 · lastname 3–30 · phone 11–21 · valid email
 *   message  name required · phone 11–21 · subject 5–100 · description 20–2000 · valid email
 */
import { faker } from "@faker-js/faker";
import type { BookingDates, BookingInput, MessageInput, RoomInput } from "../api/schemas";

export const LIMITS = {
  roomPrice: { min: 1, max: 999 },
  firstname: { min: 3, max: 18 },
  lastname: { min: 3, max: 30 },
  phone: { min: 11, max: 21 },
  subject: { min: 5, max: 100 },
  description: { min: 20, max: 2000 },
} as const;

/** A string of exactly `length` characters that starts with `prefix`. */
export function textOfLength(length: number, prefix = ""): string {
  return (prefix + "x".repeat(length)).slice(0, length);
}

/** A UK-style phone number of exactly `length` digits. */
export function phoneOfLength(length: number = LIMITS.phone.min): string {
  return `07${faker.string.numeric(Math.max(length - 2, 0))}`.slice(0, length);
}

export function isoDate(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

/** A stay of `nights` nights starting `daysFromToday` days from now. */
export function stay(daysFromToday: number, nights = 2): BookingDates {
  return { checkin: isoDate(daysFromToday), checkout: isoDate(daysFromToday + nights) };
}

export function buildRoom(tag: string, overrides: Partial<RoomInput> = {}): RoomInput {
  return {
    roomName: `${tag}-room`,
    type: "Double",
    accessible: true,
    roomPrice: faker.number.int({ min: 50, max: 400 }),
    features: ["WiFi", "TV"],
    description: `${tag} ${faker.lorem.sentence()}`,
    image: "/images/room2.jpg",
    ...overrides,
  };
}

export function buildBooking(
  tag: string,
  roomid: number,
  overrides: Partial<BookingInput> = {},
): BookingInput {
  return {
    roomid,
    firstname: tag,
    // The tag is in both names, so a test that overrides one still owns the booking.
    lastname: `${tag}-${faker.person.lastName()}`.slice(0, LIMITS.lastname.max),
    depositpaid: false,
    email: faker.internet.email({ provider: "example.com" }),
    phone: phoneOfLength(),
    bookingdates: stay(30),
    ...overrides,
  };
}

export function buildMessage(tag: string, overrides: Partial<MessageInput> = {}): MessageInput {
  return {
    name: `${tag} ${faker.person.lastName()}`,
    email: faker.internet.email({ provider: "example.com" }),
    phone: phoneOfLength(),
    subject: `${tag} question about my stay`,
    description: faker.lorem.sentences(2).padEnd(LIMITS.description.min, "."),
    ...overrides,
  };
}
