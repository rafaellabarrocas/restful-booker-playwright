/**
 * API assertions that report clearly when they fail:
 *   await expect(response).toBeJson(201)      status + JSON content type, with the body on failure
 *   expect(body).toMatchSchema(RoomSchema)    every schema violation, with its path
 */
import { expect as baseExpect, type APIResponse } from "@playwright/test";
import type { ZodType } from "zod";

export const expect = baseExpect.extend({
  async toBeJson(response: APIResponse, expectedStatus: number) {
    const status = response.status();
    const contentType = response.headers()["content-type"] ?? "";
    const pass = status === expectedStatus && contentType.includes("application/json");
    const body = pass ? "" : (await response.text()).slice(0, 500);

    return {
      pass,
      name: "toBeJson",
      message: () =>
        `${this.utils.matcherHint("toBeJson", "response", String(expectedStatus), { isNot: this.isNot })}\n\n` +
        `Expected: HTTP ${expectedStatus}, application/json\n` +
        `Received: HTTP ${status}, ${contentType || "(no content type)"}\n` +
        `${response.url()}\n${body}`,
    };
  },

  toMatchSchema(received: unknown, schema: ZodType) {
    const result = schema.safeParse(received);
    const issues = result.success
      ? ""
      : result.error.issues
          .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("\n");

    return {
      pass: result.success,
      name: "toMatchSchema",
      message: () =>
        this.isNot
          ? "Expected the value not to match the schema"
          : `Value does not match the schema:\n${issues}\n\nReceived: ${this.utils.printReceived(received)}`,
    };
  },
});
