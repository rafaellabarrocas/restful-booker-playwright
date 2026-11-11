/**
 * Every test gets a fresh, short, unique tag that is embedded in all the data it creates
 * (room names, guest names, message subjects).
 *
 * The tag is what makes this suite safe on a shared environment:
 *  - a test only ever looks for *its own* data, so other users' data cannot break it;
 *  - cleanup can find everything the test created — including data created through the UI,
 *    whose ids the test never sees — by searching for the tag.
 */

// Stored through Cypress.expose() rather than a module variable: the support file and each
// spec are bundled separately, so a module variable would not be shared between them.
const KEY = "testTag";

export function startNewTestTag(): string {
  const tag = `qa${Math.random().toString(36).slice(2, 7)}`;
  Cypress.expose(KEY, tag);
  return tag;
}

export function testTag(): string {
  const tag: unknown = Cypress.expose(KEY);
  if (typeof tag !== "string") {
    throw new Error("testTag() used outside a test — is the support file loaded?");
  }
  return tag;
}
