import {
  ErrorSchema,
  TokenSchema,
  TokenValiditySchema,
  ValidationErrorsSchema,
} from "../../src/api/schemas";
import { env } from "../../src/config/env";
import { TestData } from "../../src/data/test-data";
import { expect, test } from "../../src/fixtures";

test.describe("API · Authentication", () => {
  let data: TestData;

  test.beforeEach(({ adminApi }) => {
    data = new TestData(adminApi);
  });

  test.afterEach(async ({}, testInfo) => {
    await data.cleanup(testInfo);
  });

  test.describe("happy path", () => {
    test("issues a token for valid admin credentials", { tag: "@smoke" }, async ({ anonApi }) => {
      const response = await anonApi.auth.login(env.admin);

      await expect(response).toBeJson(200);
      await expect(response).toMatchSchema(TokenSchema);
    });

    test("accepts its own token as valid", async ({ anonApi }) => {
      const { token } = TokenSchema.parse(await (await anonApi.auth.login(env.admin)).json());

      const response = await anonApi.auth.validate(token);

      await expect(response).toBeJson(200);
      expect(await response.json()).toEqual({ valid: true });
    });

    test("issues a different token on every login", async ({ anonApi }) => {
      const first = TokenSchema.parse(await (await anonApi.auth.login(env.admin)).json());
      const second = TokenSchema.parse(await (await anonApi.auth.login(env.admin)).json());

      expect(first.token).not.toBe(second.token);
    });
  });

  test.describe("negative", () => {
    const wrongPassword = env.admin.password + "-not";
    const invalidLogins = [
      {
        name: "a wrong password",
        credentials: { username: env.admin.username, password: wrongPassword },
      },
      {
        name: "an unknown user",
        credentials: { username: "nobody-here", password: env.admin.password },
      },
      { name: "an empty body", credentials: {} },
    ];

    for (const { name, credentials } of invalidLogins) {
      test(`refuses ${name} without revealing which part is wrong`, async ({ anonApi }) => {
        const response = await anonApi.auth.login(credentials);

        await expect(response).toBeJson(401);
        expect(await response.json()).toEqual({ error: "Invalid credentials" });
      });
    }

    test("refuses admin operations without a token", async ({ anonApi }) => {
      const response = await anonApi.rooms.create(data.room());

      await expect(response).toBeJson(401);
      const body = await response.json();
      await expect(response).toMatchSchema(ValidationErrorsSchema);
      expect(body.errors).toEqual(["Authentication required"]);
      expect(await data.findRoom(data.room().roomName)).toBeUndefined();
    });
  });

  test.describe("exceptions", () => {
    test("reports an unknown token as invalid", async ({ anonApi }) => {
      const response = await anonApi.auth.validate("not-a-real-token");

      await expect(response).toBeJson(403);
      await expect(response).toMatchSchema(ErrorSchema);
    });

    test(
      "answers a forged token with 401/403, not a server error",
      { tag: "@defect", annotation: { type: "defect", description: "Forged token → HTTP 500" } },
      async ({ playwright }) => {
        const forged = await playwright.request.newContext({
          baseURL: env.apiBaseUrl,
          extraHTTPHeaders: { Cookie: "token=forged-token" },
        });

        const response = await forged.post("room", { data: data.room() });

        expect([401, 403]).toContain(response.status());
        await forged.dispose();
      },
    );
  });

  test.describe("corner cases", () => {
    test(
      "a token stops working after logout",
      {
        tag: "@defect",
        annotation: { type: "defect", description: "Logout does not invalidate the token" },
      },
      async ({ anonApi }) => {
        // A token of its own: logging out the shared worker token would break other tests.
        const { token } = TokenSchema.parse(await (await anonApi.auth.login(env.admin)).json());
        await expect(await anonApi.auth.logout(token)).toBeJson(200);

        const response = await anonApi.auth.validate(token);

        expect(TokenValiditySchema.safeParse(await response.json()).data?.valid ?? false).toBe(
          false,
        );
      },
    );
  });
});
