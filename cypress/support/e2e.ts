import { register as registerCypressGrep } from "@cypress/grep";
import "./commands";
import { cleanUpTestData } from "./data/cleanup";
import { startNewTestTag } from "./data/testTag";

registerCypressGrep();

/**
 * Known product defect: the server-rendered HTML does not match the client render, so
 * React throws a hydration error (#418) on every page load. It does not block any user
 * flow. Only this exact error is ignored; any other uncaught exception still fails the test.
 */
const KNOWN_HYDRATION_ERROR = /Minified React error #418/;

Cypress.on("uncaught:exception", (error) => !KNOWN_HYDRATION_ERROR.test(error.message));

beforeEach(() => {
  startNewTestTag();
});

afterEach(() => {
  cleanUpTestData();
});
