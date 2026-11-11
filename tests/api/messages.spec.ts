import {
  MessageCountSchema,
  MessageListSchema,
  MessageSchema,
  MessageValidationErrorsSchema,
  SuccessSchema,
} from "../../src/api/schemas";
import { LIMITS, phoneOfLength, textOfLength } from "../../src/data/factories";
import { TestData } from "../../src/data/test-data";
import { expect, test } from "../../src/fixtures";

test.describe("API · Guest messages", () => {
  let data: TestData;

  test.beforeEach(({ adminApi }) => {
    data = new TestData(adminApi);
  });

  test.afterEach(async ({}, testInfo) => {
    await data.cleanup(testInfo);
  });

  test.describe("happy path", () => {
    test("accepts a guest message", { tag: "@smoke" }, async ({ anonApi }) => {
      const response = await anonApi.messages.create(data.message());

      await expect(response).toBeJson(200);
      await expect(response).toMatchSchema(SuccessSchema);
    });

    test(
      "delivers it to the admin inbox as unread",
      { tag: "@smoke" },
      async ({ anonApi, adminApi }) => {
        const message = data.message();
        await anonApi.messages.create(message);

        const response = await adminApi.messages.list();

        await expect(response).toBeJson(200);
        await expect(response).toMatchSchema(MessageListSchema);
        expect((await response.json()).messages).toContainEqual({
          id: expect.any(Number),
          name: message.name,
          subject: message.subject,
          read: false,
        });
      },
    );

    test("reports a message count", async ({ adminApi }) => {
      await data.createMessage();

      const response = await adminApi.messages.count();

      await expect(response).toBeJson(200);
      await expect(response).toMatchSchema(MessageCountSchema);
      expect((await response.json()).count).toBeGreaterThanOrEqual(1);
    });

    test(
      "returns the full message to the admin",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "GET /message/:id → HTTP 500" },
      },
      async ({ adminApi }) => {
        const message = data.message();
        const summary = await data.createMessage(message);

        const response = await adminApi.messages.get(summary.id);

        await expect(response).toBeJson(200);
        await expect(response).toMatchSchema(MessageSchema);
        expect(await response.json()).toMatchObject(message);
      },
    );

    test(
      "lets the admin delete a message",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "DELETE /message/:id → HTTP 500" },
      },
      async ({ adminApi }) => {
        const message = data.message();
        const summary = await data.createMessage(message);

        expect((await adminApi.messages.delete(summary.id)).ok()).toBe(true);

        expect(await data.findMessage(message.subject)).toBeUndefined();
      },
    );
  });

  test.describe("negative", () => {
    test("refuses an empty message, listing every problem", async ({ anonApi }) => {
      const response = await anonApi.messages.create({});

      await expect(response).toBeJson(400);
      await expect(response).toMatchSchema(MessageValidationErrorsSchema);
      expect(await response.json()).toEqual(
        expect.arrayContaining([
          "Name may not be blank",
          "Email may not be blank",
          "Phone may not be blank",
          "Subject may not be blank",
          "Message may not be blank",
        ]),
      );
    });

    test("refuses an invalid email address", async ({ anonApi }) => {
      const message = data.message({ email: "guest.example.com" });

      const response = await anonApi.messages.create(message);

      await expect(response).toBeJson(400);
      expect(await response.json()).toEqual(["must be a well-formed email address"]);
      expect(await data.findMessage(message.subject)).toBeUndefined();
    });
  });

  test.describe("edge cases", () => {
    const accepted = [
      { field: "subject", value: textOfLength(LIMITS.subject.min) },
      { field: "subject", value: textOfLength(LIMITS.subject.max) },
      { field: "description", value: textOfLength(LIMITS.description.min) },
      { field: "description", value: textOfLength(LIMITS.description.max) },
      { field: "phone", value: phoneOfLength(LIMITS.phone.min) },
      { field: "phone", value: phoneOfLength(LIMITS.phone.max) },
    ] as const;

    for (const { field, value } of accepted) {
      test(`accepts a ${field} of ${value.length} characters (limit)`, async ({ anonApi }) => {
        const response = await anonApi.messages.create(data.message({ [field]: value }));

        await expect(response).toBeJson(200);
        await expect(response).toMatchSchema(SuccessSchema);
      });
    }

    const refused = [
      {
        field: "subject",
        value: textOfLength(LIMITS.subject.min - 1),
        error: "Subject must be between 5 and 100 characters.",
      },
      {
        field: "subject",
        value: textOfLength(LIMITS.subject.max + 1),
        error: "Subject must be between 5 and 100 characters.",
      },
      {
        field: "description",
        value: textOfLength(LIMITS.description.min - 1),
        error: "Message must be between 20 and 2000 characters.",
      },
      {
        field: "description",
        value: textOfLength(LIMITS.description.max + 1),
        error: "Message must be between 20 and 2000 characters.",
      },
      {
        field: "phone",
        value: phoneOfLength(LIMITS.phone.min - 1),
        error: "Phone must be between 11 and 21 characters.",
      },
      {
        field: "phone",
        value: phoneOfLength(LIMITS.phone.max + 1),
        error: "Phone must be between 11 and 21 characters.",
      },
    ] as const;

    for (const { field, value, error } of refused) {
      test(`refuses a ${field} of ${value.length} characters`, async ({ anonApi }) => {
        const response = await anonApi.messages.create(data.message({ [field]: value }));

        await expect(response).toBeJson(400);
        expect(await response.json()).toEqual([error]);
      });
    }
  });

  test.describe("corner cases", () => {
    test("stores markup in a message as plain text, unchanged", async ({ anonApi }) => {
      const message = data.message({ subject: `${data.tag} <script>alert(1)</script>` });

      await expect(await anonApi.messages.create(message)).toBeJson(200);

      expect(await data.findMessage(message.subject)).toMatchObject({ subject: message.subject });
    });

    test("keeps accents and non-Latin characters", async ({ anonApi }) => {
      const message = data.message({ name: `${data.tag} Zoë Ñandú 東京` });

      await expect(await anonApi.messages.create(message)).toBeJson(200);

      expect(await data.findMessage(message.subject)).toMatchObject({ name: message.name });
    });
  });

  test.describe("exceptions", () => {
    test(
      "answers malformed JSON with 400, not a server error",
      { tag: "@defect", annotation: { type: "defect", description: "Malformed JSON → HTTP 500" } },
      async ({ anonApi }) => {
        const response = await anonApi.messages.create('{"name":');

        expect(response.status()).toBe(400);
      },
    );
  });
});
