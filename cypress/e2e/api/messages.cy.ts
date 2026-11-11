import { listMessages, postMessage } from "../../support/api/messages.api";
import { buildMessage } from "../../support/data/factories";

describe("API · Guest messages", () => {
  it("delivers a guest message to the admin inbox", { tags: "@smoke" }, () => {
    const message = buildMessage();

    postMessage(message).its("status").should("eq", 200);

    listMessages()
      .then((messages) => messages.find((m) => m.subject === message.subject) ?? null)
      .should("deep.include", { name: message.name, read: false });
  });

  it("rejects an incomplete message with a reason per field", () => {
    postMessage(buildMessage({ name: "", subject: "Hi", description: "Too short" })).should(
      (response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.include.members([
          "Name may not be blank",
          "Subject must be between 5 and 100 characters.",
          "Message must be between 20 and 2000 characters.",
        ]);
      },
    );
  });
});
