/**
 * Thin, typed wrappers over the REST API: one class per resource.
 *
 * They only build requests and return the raw APIResponse, so tests can assert on status,
 * headers and body. They never assert and never hide failures. Paths are relative (no
 * leading slash) so they resolve against the configured API base URL of any environment.
 */
import type { APIRequestContext, APIResponse } from "@playwright/test";
import type { BookingDates, BookingInput, MessageInput, RoomInput } from "./schemas";

/** A JSON body, or a raw string to send malformed payloads. */
type Body = object | string;

const json = (data: Body) => ({ data, headers: { "Content-Type": "application/json" } });

export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  login(credentials: Body): Promise<APIResponse> {
    return this.request.post("auth/login", json(credentials));
  }

  validate(token: string): Promise<APIResponse> {
    return this.request.post("auth/validate", json({ token }));
  }

  logout(token: string): Promise<APIResponse> {
    return this.request.post("auth/logout", json({ token }));
  }
}

export class RoomsClient {
  constructor(private readonly request: APIRequestContext) {}

  list(dates?: Partial<BookingDates>): Promise<APIResponse> {
    return this.request.get("room", { params: dates });
  }

  get(roomid: number): Promise<APIResponse> {
    return this.request.get(`room/${roomid}`);
  }

  create(room: Partial<RoomInput> | Body): Promise<APIResponse> {
    return this.request.post("room", json(room));
  }

  update(roomid: number, room: Partial<RoomInput>): Promise<APIResponse> {
    return this.request.put(`room/${roomid}`, json({ ...room, roomid }));
  }

  delete(roomid: number): Promise<APIResponse> {
    return this.request.delete(`room/${roomid}`);
  }
}

export class BookingsClient {
  constructor(private readonly request: APIRequestContext) {}

  listForRoom(roomid: number | string): Promise<APIResponse> {
    return this.request.get("booking", { params: { roomid } });
  }

  get(bookingid: number): Promise<APIResponse> {
    return this.request.get(`booking/${bookingid}`);
  }

  create(booking: Partial<BookingInput> | Body): Promise<APIResponse> {
    return this.request.post("booking", json(booking));
  }

  delete(bookingid: number): Promise<APIResponse> {
    return this.request.delete(`booking/${bookingid}`);
  }
}

export class MessagesClient {
  constructor(private readonly request: APIRequestContext) {}

  list(): Promise<APIResponse> {
    return this.request.get("message");
  }

  count(): Promise<APIResponse> {
    return this.request.get("message/count");
  }

  get(id: number): Promise<APIResponse> {
    return this.request.get(`message/${id}`);
  }

  create(message: Partial<MessageInput> | Body): Promise<APIResponse> {
    return this.request.post("message", json(message));
  }

  delete(id: number): Promise<APIResponse> {
    return this.request.delete(`message/${id}`);
  }
}

export class BrandingClient {
  constructor(private readonly request: APIRequestContext) {}

  get(): Promise<APIResponse> {
    return this.request.get("branding");
  }

  update(branding: Body): Promise<APIResponse> {
    return this.request.put("branding", json(branding));
  }
}

export class ReportClient {
  constructor(private readonly request: APIRequestContext) {}

  all(): Promise<APIResponse> {
    return this.request.get("report");
  }

  forRoom(roomid: number): Promise<APIResponse> {
    return this.request.get(`report/room/${roomid}`);
  }
}

/** Every resource client bound to one request context (anonymous or authenticated). */
export class Api {
  readonly auth: AuthClient;
  readonly rooms: RoomsClient;
  readonly bookings: BookingsClient;
  readonly messages: MessagesClient;
  readonly branding: BrandingClient;
  readonly report: ReportClient;

  constructor(readonly request: APIRequestContext) {
    this.auth = new AuthClient(request);
    this.rooms = new RoomsClient(request);
    this.bookings = new BookingsClient(request);
    this.messages = new MessagesClient(request);
    this.branding = new BrandingClient(request);
    this.report = new ReportClient(request);
  }
}
