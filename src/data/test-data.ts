/**
 * Creates test data through the API and removes it afterwards.
 *
 * One instance per scope: create it in beforeAll/beforeEach, call cleanup() in the matching
 * afterAll/afterEach. Every instance has a unique tag that goes into every name it creates,
 * which makes the suite safe on a shared environment:
 *   - a test only ever looks for its own data, so other users' data cannot break it;
 *   - cleanup() finds everything the scope created by its tag — including data created
 *     through the UI, whose ids the test never sees, and the "You have a new booking!"
 *     message the platform generates for each booking.
 *
 * A failed delete never fails or hides a test result. It is recorded as a "cleanup-failed"
 * annotation in the report and printed, so leftovers on a shared environment stay visible.
 */
import { expect, type APIResponse, type TestInfo } from "@playwright/test";
import { z } from "zod";
import type { Api } from "../api/clients";
import {
  BookingSchema,
  type Booking,
  type BookingInput,
  type MessageInput,
  type MessageSummary,
  type Room,
  type RoomInput,
} from "../api/schemas";
import { buildBooking, buildMessage, buildRoom } from "./factories";

/*
 * Lookups are deliberately tolerant: on a shared environment the lists also hold other
 * people's records (and records left by past defects), and one malformed foreign record
 * must not break this test's setup or cleanup. Each lookup only needs the envelope and
 * the identifying fields; strict contract checks belong in the tests, on their own data.
 */
const RoomRefs = z.object({ rooms: z.array(z.looseObject({})) });
const MessageRefs = z.object({ messages: z.array(z.looseObject({})) });
const BookingRefs = z.object({ bookings: z.array(z.looseObject({})) });

function uniqueTag(): string {
  return `qa${Math.random().toString(36).slice(2, 7)}`;
}

export class TestData {
  readonly tag = uniqueTag();
  private readonly orphanBookingIds = new Set<number>();

  constructor(private readonly admin: Api) {}

  // ── Payload builders bound to this scope's tag ────────────────────────────────────────

  room(overrides: Partial<RoomInput> = {}): RoomInput {
    return buildRoom(this.tag, overrides);
  }

  booking(roomid: number, overrides: Partial<BookingInput> = {}): BookingInput {
    return buildBooking(this.tag, roomid, overrides);
  }

  message(overrides: Partial<MessageInput> = {}): MessageInput {
    return buildMessage(this.tag, overrides);
  }

  // ── Setup through the API ─────────────────────────────────────────────────────────────

  /** Creates a room and yields it with its id (the API answers only `{ success: true }`). */
  async createRoom(overrides: Partial<RoomInput> = {}): Promise<Room> {
    const room = this.room(overrides);
    const response = await this.admin.rooms.create(room);
    await expect(response, `setup: create room ${room.roomName}`).toBeOK();

    const created = await this.findRoom(room.roomName);
    expect(created, `setup: room ${room.roomName} is listed after creation`).toMatchObject(room);
    return created as Room;
  }

  async createBooking(roomid: number, overrides: Partial<BookingInput> = {}): Promise<Booking> {
    const response = await this.admin.bookings.create(this.booking(roomid, overrides));
    expect(response.status(), `setup: create booking on room ${roomid}`).toBe(201);
    return BookingSchema.parse(await response.json());
  }

  /** Sends a guest message and yields its summary (the API answers only `{ success: true }`). */
  async createMessage(overrides: Partial<MessageInput> = {}): Promise<MessageSummary> {
    const message = this.message(overrides);
    const response = await this.admin.messages.create(message);
    await expect(response, `setup: send message ${message.subject}`).toBeOK();

    const created = await this.findMessage(message.subject);
    expect(created, `setup: message ${message.subject} is listed`).toMatchObject({
      name: message.name,
    });
    return created as MessageSummary;
  }

  /**
   * Registers a booking the API created where cleanup cannot find it through a tagged room
   * (e.g. a booking accepted for a room that does not exist). No-op if nothing was created.
   */
  async trackBookingIfCreated(response: APIResponse): Promise<void> {
    const created = BookingSchema.safeParse(await response.json().catch(() => null));
    if (created.success) this.orphanBookingIds.add(created.data.bookingid);
  }

  // ── Lookups ───────────────────────────────────────────────────────────────────────────

  async findRoom(roomName: string): Promise<Room | undefined> {
    const { rooms } = RoomRefs.parse(await (await this.admin.rooms.list()).json());
    return rooms.find((room) => room.roomName === roomName) as Room | undefined;
  }

  async findMessage(subject: string): Promise<MessageSummary | undefined> {
    const { messages } = MessageRefs.parse(await (await this.admin.messages.list()).json());
    return messages.find((message) => message.subject === subject) as MessageSummary | undefined;
  }

  async findMessageFrom(senderName: string): Promise<MessageSummary | undefined> {
    const { messages } = MessageRefs.parse(await (await this.admin.messages.list()).json());
    return messages.find((message) => message.name === senderName) as MessageSummary | undefined;
  }

  async bookingsForRoom(roomid: number): Promise<Booking[]> {
    const response = await this.admin.bookings.listForRoom(roomid);
    return BookingRefs.parse(await response.json()).bookings as Booking[];
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────────────

  async cleanup(testInfo: TestInfo): Promise<void> {
    const failures: string[] = [];
    const remove = async (
      resource: string,
      request: Promise<{ ok(): boolean; status(): number }>,
    ) => {
      const response = await request;
      if (!response.ok()) failures.push(`${resource} → HTTP ${response.status()}`);
    };

    const rooms = RoomRefs.parse(await (await this.admin.rooms.list()).json()).rooms as Room[];
    for (const room of rooms.filter((r) => String(r.roomName).includes(this.tag))) {
      for (const booking of await this.bookingsForRoom(room.roomid)) {
        await remove(`booking ${booking.bookingid}`, this.admin.bookings.delete(booking.bookingid));
      }
      await remove(`room ${room.roomid} "${room.roomName}"`, this.admin.rooms.delete(room.roomid));
    }

    for (const bookingid of this.orphanBookingIds) {
      await remove(`booking ${bookingid}`, this.admin.bookings.delete(bookingid));
    }

    const messages = MessageRefs.parse(await (await this.admin.messages.list()).json())
      .messages as MessageSummary[];
    for (const message of messages.filter((m) => `${m.name} ${m.subject}`.includes(this.tag))) {
      await remove(
        `message ${message.id} "${message.subject}"`,
        this.admin.messages.delete(message.id),
      );
    }

    for (const failure of failures) {
      testInfo.annotations.push({ type: "cleanup-failed", description: failure });
    }
    if (failures.length > 0) {
      console.warn(
        `⚠ cleanup [${this.tag}]: ${failures.length} resource(s) left behind: ${failures.join("; ")}`,
      );
    }
  }
}
