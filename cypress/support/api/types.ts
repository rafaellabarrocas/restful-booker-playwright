/** Shapes of the Restful Booker Platform REST API, as observed on the live service. */

export type RoomType = "Single" | "Twin" | "Double" | "Family" | "Suite";

export type RoomFeature = "WiFi" | "TV" | "Radio" | "Refreshments" | "Safe" | "Views";

export interface RoomInput {
  roomName: string;
  type: RoomType;
  accessible: boolean;
  roomPrice: number;
  features: RoomFeature[];
  description: string;
  image: string;
}

export interface Room extends RoomInput {
  roomid: number;
}

export interface BookingDates {
  /** ISO date, yyyy-mm-dd */
  checkin: string;
  /** ISO date, yyyy-mm-dd */
  checkout: string;
}

export interface BookingInput {
  roomid: number;
  firstname: string;
  lastname: string;
  depositpaid: boolean;
  email: string;
  phone: string;
  bookingdates: BookingDates;
}

export interface Booking extends Omit<BookingInput, "email" | "phone"> {
  bookingid: number;
}

export interface MessageInput {
  name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
}

export interface MessageSummary {
  id: number;
  name: string;
  subject: string;
  read: boolean;
}

export interface ValidationErrorBody {
  errors: string[];
}
