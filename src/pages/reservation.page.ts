import type { Locator, Page } from "@playwright/test";
import type { BookingDates, BookingInput } from "../api/schemas";

type GuestDetails = Pick<BookingInput, "firstname" | "lastname" | "email" | "phone">;

/**
 * Guest reservation page: /reservation/:roomid?checkin=&checkout=
 *
 * UNVERIFIED LOCATORS: while this suite was written the page never rendered on the demo
 * (it hangs on a spinner because GET /api/room/:id returns 500), so the guest form
 * locators follow the platform's field placeholders and must be confirmed once it loads.
 */
export class ReservationPage {
  private readonly reserveNowButton: Locator;
  private readonly firstnameInput: Locator;
  private readonly lastnameInput: Locator;
  private readonly emailInput: Locator;
  private readonly phoneInput: Locator;
  readonly confirmationHeading: Locator;

  constructor(private readonly page: Page) {
    this.reserveNowButton = page.getByRole("button", { name: "Reserve Now" });
    this.firstnameInput = page.getByPlaceholder("Firstname");
    this.lastnameInput = page.getByPlaceholder("Lastname");
    this.emailInput = page.getByPlaceholder("Email");
    this.phoneInput = page.getByPlaceholder("Phone");
    this.confirmationHeading = page.getByRole("heading", { name: "Booking Confirmed" });
  }

  async open(roomid: number, { checkin, checkout }: BookingDates): Promise<void> {
    await this.page.goto(`/reservation/${roomid}?checkin=${checkin}&checkout=${checkout}`);
  }

  async reserve(guest: GuestDetails): Promise<void> {
    await this.reserveNowButton.click();
    await this.firstnameInput.fill(guest.firstname);
    await this.lastnameInput.fill(guest.lastname);
    await this.emailInput.fill(guest.email);
    await this.phoneInput.fill(guest.phone);
    await this.reserveNowButton.click();
  }
}
