import { TestData } from "../../src/data/test-data";
import { expect, test } from "../../src/fixtures";

test.describe("UI · Guest contact form", () => {
  let data: TestData;

  test.beforeEach(async ({ adminApi, homePage }) => {
    data = new TestData(adminApi);
    await homePage.open();
  });

  test.afterEach(async ({}, testInfo) => {
    await data.cleanup(testInfo);
  });

  test.describe("happy path", () => {
    test(
      "thanks the guest and delivers the message to the hotel",
      { tag: "@smoke" },
      async ({ homePage }) => {
        const message = data.message();

        await homePage.sendMessage(message);

        await expect(homePage.messageConfirmation()).toContainText(
          `Thanks for getting in touch ${message.name}!`,
        );
        await expect(homePage.messageConfirmation()).toContainText(message.subject);
        expect(await data.findMessage(message.subject)).toMatchObject({
          name: message.name,
          read: false,
        });
      },
    );
  });

  test.describe("negative", () => {
    test("explains every missing field when the form is sent empty", async ({ homePage }) => {
      await homePage.sendMessage({});

      for (const error of [
        "Name may not be blank",
        "Email may not be blank",
        "Phone may not be blank",
        "Subject may not be blank",
        "Message may not be blank",
      ]) {
        await expect(homePage.validationMessage(error)).toBeVisible();
      }
      await expect(homePage.contactHeading).toBeVisible();
    });

    test("refuses an invalid email address and keeps the form", async ({ homePage }) => {
      const message = data.message({ email: "guest.example.com" });

      await homePage.sendMessage(message);

      await expect(homePage.validationMessage("must be a well-formed email address")).toBeVisible();
      await expect(homePage.contactHeading).toBeVisible();
      expect(await data.findMessage(message.subject)).toBeUndefined();
    });
  });

  test.describe("edge cases", () => {
    test("refuses a subject one character too short", async ({ homePage }) => {
      const message = data.message({ subject: "Help" });

      await homePage.sendMessage(message);

      await expect(
        homePage.validationMessage("Subject must be between 5 and 100 characters."),
      ).toBeVisible();
      expect(await data.findMessage(message.subject)).toBeUndefined();
    });
  });

  test.describe("corner cases", () => {
    test("shows markup typed by a guest as plain text", async ({ homePage }) => {
      const message = data.message({ subject: `${data.tag} <b>urgent</b>` });

      await homePage.sendMessage(message);

      await expect(homePage.messageConfirmation()).toContainText(`${data.tag} <b>urgent</b>`);
    });
  });
});
