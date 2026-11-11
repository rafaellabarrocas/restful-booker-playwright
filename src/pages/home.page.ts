import type { Locator, Page } from "@playwright/test";
import type { MessageInput } from "../api/schemas";

/** Public home page: rooms on offer and the "Send Us a Message" contact form. */
export class HomePage {
  readonly contactHeading: Locator;
  private readonly nameInput: Locator;
  private readonly emailInput: Locator;
  private readonly phoneInput: Locator;
  private readonly subjectInput: Locator;
  private readonly messageInput: Locator;
  private readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.contactHeading = page.getByRole("heading", { name: "Send Us a Message" });
    this.nameInput = page.getByLabel("Name");
    this.emailInput = page.getByLabel("Email");
    this.phoneInput = page.getByLabel("Phone");
    this.subjectInput = page.getByLabel("Subject");
    // The "Message" label is not associated with its textarea (label for="message",
    // textarea id="description"), so it has no accessible name: fall back to its test id.
    this.messageInput = page.getByTestId("ContactDescription");
    this.submitButton = page.getByRole("button", { name: "Submit" });
  }

  async open(): Promise<void> {
    await this.page.goto("/");
  }

  async sendMessage(message: Partial<MessageInput>): Promise<void> {
    await this.nameInput.fill(message.name ?? "");
    await this.emailInput.fill(message.email ?? "");
    await this.phoneInput.fill(message.phone ?? "");
    await this.subjectInput.fill(message.subject ?? "");
    await this.messageInput.fill(message.description ?? "");
    await this.submitButton.click();
  }

  /** The thank-you panel that replaces the form once a message is accepted. */
  messageConfirmation(): Locator {
    return this.page.getByRole("heading", { name: /Thanks for getting in touch/ }).locator("..");
  }

  validationMessage(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /** A room on offer, identified by its (unique) description. */
  roomOnOffer(description: string): Locator {
    return this.page.getByText(description);
  }
}
