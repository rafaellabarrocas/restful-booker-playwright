/**
 * Response contracts of the Restful Booker Platform API, as zod schemas.
 *
 * Object schemas are strict: an unexpected field fails the contract, so a response that
 * starts leaking data (e.g. a guest's email in a booking) or silently changes shape is caught.
 * Request shapes are inferred from the same definitions, so payloads and contracts cannot drift.
 */
import { z } from "zod";

const isoDate = z.iso.date();
const id = z.number().int().positive();

// ── Rooms ────────────────────────────────────────────────────────────────────────────────

export const ROOM_TYPES = ["Single", "Twin", "Double", "Family", "Suite"] as const;
export const ROOM_FEATURES = ["WiFi", "TV", "Radio", "Refreshments", "Safe", "Views"] as const;

export const RoomSchema = z.strictObject({
  roomid: id,
  roomName: z.string().min(1),
  type: z.enum(ROOM_TYPES),
  accessible: z.boolean(),
  roomPrice: z.number().int().min(1).max(999),
  features: z.array(z.string()),
  // Optional: a room created without them is returned without these fields at all.
  description: z.string().optional(),
  image: z.string().optional(),
});

export const RoomListSchema = z.strictObject({ rooms: z.array(RoomSchema) });
/** The list envelope only, for lists that may hold records the test does not control. */
export const RoomListEnvelopeSchema = z.strictObject({ rooms: z.array(z.looseObject({})) });

// ── Bookings ─────────────────────────────────────────────────────────────────────────────

export const BookingDatesSchema = z.strictObject({ checkin: isoDate, checkout: isoDate });

/** What the API returns for a booking: the guest's email and phone are never echoed back. */
export const BookingSchema = z.strictObject({
  bookingid: id,
  roomid: id,
  firstname: z.string(),
  lastname: z.string(),
  depositpaid: z.boolean(),
  bookingdates: BookingDatesSchema,
});

export const BookingListSchema = z.strictObject({ bookings: z.array(BookingSchema) });

// ── Messages ─────────────────────────────────────────────────────────────────────────────

export const MessageSummarySchema = z.strictObject({
  id,
  name: z.string(),
  subject: z.string(),
  read: z.boolean(),
});

export const MessageListSchema = z.strictObject({ messages: z.array(MessageSummarySchema) });

export const MessageSchema = z.strictObject({
  messageid: id,
  name: z.string(),
  email: z.email(),
  phone: z.string(),
  subject: z.string(),
  description: z.string(),
});

export const MessageCountSchema = z.strictObject({ count: z.number().int().min(0) });

// ── Auth ─────────────────────────────────────────────────────────────────────────────────

export const TokenSchema = z.strictObject({ token: z.string().min(8) });
export const TokenValiditySchema = z.strictObject({ valid: z.boolean() });

// ── Branding and report ──────────────────────────────────────────────────────────────────

export const BrandingSchema = z.strictObject({
  name: z.string().min(1),
  map: z.strictObject({ latitude: z.number(), longitude: z.number() }),
  logoUrl: z.string().min(1),
  description: z.string().min(1),
  directions: z.string(),
  contact: z.strictObject({ name: z.string(), phone: z.string(), email: z.email() }),
  address: z.strictObject({
    line1: z.string(),
    line2: z.string(),
    postTown: z.string(),
    county: z.string(),
    postCode: z.string(),
  }),
});

export const ReportSchema = z.strictObject({
  report: z.array(z.strictObject({ start: isoDate, end: isoDate, title: z.string() })),
});

// ── Generic bodies ───────────────────────────────────────────────────────────────────────

export const SuccessSchema = z.strictObject({ success: z.literal(true) });
/** Field validation failures on rooms and bookings. */
export const ValidationErrorsSchema = z.strictObject({ errors: z.array(z.string()).min(1) });
/** Field validation failures on messages: a bare array (inconsistent with the other endpoints). */
export const MessageValidationErrorsSchema = z.array(z.string()).min(1);
export const ErrorSchema = z.strictObject({ error: z.string().min(1) });

// ── Types ────────────────────────────────────────────────────────────────────────────────

export type Room = z.infer<typeof RoomSchema>;
export type RoomInput = Omit<Room, "roomid">;
export type RoomType = (typeof ROOM_TYPES)[number];
export type RoomFeature = (typeof ROOM_FEATURES)[number];
export type BookingDates = z.infer<typeof BookingDatesSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type BookingInput = Omit<Booking, "bookingid"> & { email: string; phone: string };
export type MessageSummary = z.infer<typeof MessageSummarySchema>;
export type Message = z.infer<typeof MessageSchema>;
export type MessageInput = Omit<Message, "messageid">;
