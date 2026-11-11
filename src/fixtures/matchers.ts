/**
 * API assertions that report clearly when they fail:
 *   await expect(response).toBeJson(201)      status + JSON content type, with the body on failure
 *   await expect(response).toMatchSchema(S)  JSON body against a zod schema: every violation, with its path
 *   await expect(room).toMatchSchema(S)      same, on an already parsed value
 */
import { expect as baseExpect, type APIResponse } from "@playwright/test";
import type { ZodType } from "zod";

function isApiResponse(value: unknown): value is APIResponse {
  return typeof (value as APIResponse | undefined)?.json === "function";
}

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

  /** Works on a value, or on an APIResponse (its JSON body is checked). */
  async toMatchSchema(received: APIResponse | object | undefined, schema: ZodType) {
    const value = isApiResponse(received) ? await received.json() : received;
    const result = schema.safeParse(value);
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
          : `Value does not match the schema:\n${issues}\n\nReceived: ${this.utils.printReceived(value)}`,
    };
  },
});
