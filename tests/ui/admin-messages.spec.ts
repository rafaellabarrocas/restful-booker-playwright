import type { MessageInput } from "../../src/api/schemas";
import { ADMIN_STORAGE_STATE } from "../../src/config/paths";
import { TestData } from "../../src/data/test-data";
import { expect, test } from "../../src/fixtures";

test.describe("UI · Admin messages inbox", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  // Read-only tests: the guest messages are sent once for the whole file.
  let data: TestData;
  let message: MessageInput;
  let markupMessage: MessageInput;

  test.beforeAll(async ({ adminApi }) => {
    data = new TestData(adminApi);
    message = data.message();
    markupMessage = data.message({
      name: `${data.tag} Markup`,
      subject: `${data.tag} <b>bold</b> <img src=x onerror=alert(1)>`,
    });
    await data.createMessage(message);
    await data.createMessage(markupMessage);
  });

  test.beforeEach(async ({ adminMessagesPage }) => {
    await adminMessagesPage.open();
  });

  test.afterAll(async ({}, testInfo) => {
    await data.cleanup(testInfo);
  });

  test(
    "shows a guest's message with its sender and subject",
    { tag: "@smoke" },
    async ({ adminMessagesPage }) => {
      await expect(adminMessagesPage.messageRow(message.name)).toContainText(message.subject);
    },
  );

  test("shows markup sent by a guest as text, without rendering it", async ({
    page,
    adminMessagesPage,
  }) => {
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });

    await expect(adminMessagesPage.messageRow(markupMessage.name)).toContainText(
      markupMessage.subject,
    );
    expect(dialogs).toEqual([]);
  });

  test(
    "opens a message to read it in full",
    {
      tag: "@defect",
      annotation: { type: "defect", description: "Opening a message calls GET /message/:id → 500" },
    },
    async ({ adminMessagesPage }) => {
      await adminMessagesPage.openMessage(message.name);

      await expect(adminMessagesPage.textOnPage(message.description)).toBeVisible();
    },
  );
});
