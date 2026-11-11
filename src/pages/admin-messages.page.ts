import type { Locator, Page } from "@playwright/test";

/** Admin inbox at /admin/message. */
export class AdminMessagesPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/admin/message");
  }

  /** The inbox row of a message, found by the sender's (unique) name. */
  messageRow(senderName: string): Locator {
    return this.senderCell(senderName).locator("..");
  }

  async openMessage(senderName: string): Promise<void> {
    await this.senderCell(senderName).click();
  }

  textOnPage(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  private senderCell(senderName: string): Locator {
    return this.page.getByTestId(/^message\d+$/).filter({ hasText: senderName });
  }
}
