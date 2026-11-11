# Restful Booker Platform — Cypress test suite

The start of an automated test suite for [Restful Booker Platform](https://automationintesting.online),
a demo hotel booking site. Written in Cypress + TypeScript.

## Running the tests

Requirements: Node.js 20+.

```bash
npm ci

# Admin credentials are read from the environment, never from a file in the repo.
# Use the demo credentials given in the exercise brief.
export ADMIN_USERNAME=...
export ADMIN_PASSWORD=...

npm test              # whole suite, headless
npm run test:smoke    # only the @smoke tests (the PR gate)
npm run test:api      # API specs only
npm run test:ui       # UI specs only
npm run cy:open       # interactive runner

npm run check         # formatting, lint and type-check
```

`BASE_URL` points the suite at another environment (default: `https://automationintesting.online`).

To pick a browser, add `-- --browser chrome` (or `chromium`, `firefox`).

## What is covered, and why

I tested the paths where a failure costs the hotel money or trust first, at the lowest layer that can
prove each one:

| Area                   | Layer    | Tests                                                                                                                                                                     |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Booking rules          | API      | a guest can book; **no double booking** on overlapping dates; back-to-back stays allowed; inverted dates rejected; invalid guest details rejected with a reason per field |
| Guest booking journey  | UI       | a room added by the admin is offered on the home page; a guest books it through the reservation page and the booking is recorded                                          |
| Guest → hotel messages | API + UI | message is confirmed to the guest, delivered to the admin inbox and shown in the admin panel; incomplete messages explained field by field                                |
| Admin access           | API + UI | valid login/logout; wrong password refused; admin endpoints refuse anonymous calls                                                                                        |
| Room management        | API + UI | room created by the admin (via API and via the panel) is published with the right type, price, accessibility and features                                                 |

21 tests: 12 API, 9 UI. 9 are tagged `@smoke`.

## How the suite is built

```
cypress/
  e2e/
    api/          # contract and business-rule tests, no browser
    ui/           # user journeys
  support/
    api/          # one typed client per resource (auth, rooms, bookings, messages)
    data/         # factories, per-test tag, cleanup
    pages/        # page objects: locate and act, never assert
    commands.ts   # cy.loginAsAdmin() — API login cached with cy.session
    e2e.ts        # global hooks
  plugins/        # Node side: end-of-run cleanup report
```

**Test data through the API, before every test, cleaned up after.** UI tests never build their own
preconditions through the UI. A booking test creates its own room through the API, so it never
depends on what other people have booked on the shared environment.

**A unique tag per test.** Every test gets a short random tag (`qa3k9xz`) that goes into every name
it creates: room name, guest name, message subject. That gives two things on a shared, resettable
environment:

- a test only looks for its own data, so other users cannot break it;
- cleanup finds everything the test created by its tag — including data created _through the UI_,
  whose ids the test never sees, and the "You have a new booking!" message the platform generates
  for each booking.

**Cleanup never hides a result.** A global `afterEach` deletes the test's tagged data (bookings,
rooms, messages), whether the test passed or failed. A failed delete does not fail the test; it is
collected and printed at the end of the run so leftovers are visible.

**Other choices**

- Admin UI tests log in through the API (`cy.session`); only the login spec drives the login form.
- Credentials are read with `cy.env()` from environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`),
  never committed. In CI they come from repository secrets.
- No fixed waits: everything relies on Cypress retry-ability and assertions.
- Only one uncaught application error is ignored: React hydration error #418, which the live site
  throws on every page load (see findings). Any other uncaught error still fails the test.
- Retries are on in CI (1) and off locally, so flakiness is seen where it is fixed.
- Static checks: TypeScript `strict`, ESLint (`typescript-eslint` + `eslint-plugin-cypress`), Prettier.
  The suite was also scanned with [lootfilter](https://github.com/rafaellabarrocas/lootfilter), my
  test-code linter: 23 files, 0 violations.
- CI (`.github/workflows/e2e.yml`): static checks, then smoke tests on every pull request and the full
  suite on `main` and nightly; screenshots and videos are uploaded when a run fails.

## Current results and findings

Last full run against the live site: **19 passed, 2 failed.** Both failures are product defects, not
test problems; the tests are left failing on purpose.

1. **Guests cannot book a room — the reservation page never loads.** `/reservation/:id` stays on a
   spinner because `GET /api/room/:id` returns HTTP 500. Every endpoint with an id in the path
   returns 500 (`GET /api/room/1`, `GET /api/booking/1`, `GET /api/message/1`, all `DELETE`s), so
   this looks like a routing/proxy problem in front of the API rather than in one service.
   → fails `UI · Guest booking › lets a guest book a room and records the booking`.
   Because the page never rendered, the locators of the reservation form
   (`support/pages/reservation.page.ts`) could not be checked against the real DOM.
2. **A room added by the admin is never offered to guests.** The home page loads every room from
   `GET /api/room` but only renders the first three cards. Any room beyond the seed data is invisible
   on the public site. → fails `UI · Guest booking › offers a newly added room to guests on the home page`.
3. **Cleanup is currently impossible.** Because of (1), every `DELETE` returns 500, so test data
   cannot be removed right now. The suite reports each leftover at the end of the run. The
   environment's periodic reset removes them.
4. **React hydration error #418 on every page.** Server and client renders differ. It does not break
   a flow today, but it hides real client errors and costs performance.
5. **Open question — guest messages are readable without logging in.** `GET /api/message` returns
   guests' names and message subjects to anonymous callers, while bookings and reports require a
   token. I did not encode this as a test because I could not confirm whether it is intended.

## What I would do next

- **Confirm the two open product questions** (home page showing three rooms; anonymous access to
  messages) and turn the answers into tests.
- **Re-check the reservation page locators** as soon as `GET /api/room/:id` works again.
- **Run against an environment we own** (the platform ships as Docker images). A private, resettable
  environment makes cleanup trivial, removes the noise of other users, and lets the suite run in
  parallel.
- **Add a dedicated test for the 500s on id routes** as a health check, so this kind of outage is
  reported as one clear failure instead of through the journeys it breaks.
- **More coverage, in this order:** admin editing and deleting rooms and bookings; booking edge cases
  (minimum stay, past dates, same-day checkin/checkout, max guests); branding/contact details; the admin
  report calendar; accessibility checks (`cypress-axe`) on the guest pages; visual checks of the room
  cards.
- **Contract tests** for the API (JSON schema per endpoint) so breaking response changes fail fast.
- **Reporting:** a JUnit/HTML report published from CI, and a flaky-test log built from CI retries.
- **Parallel runs** in CI once the suite grows past a few minutes.

## Time spent

About 30 minutes of AI-assisted build time (exploring the app and its API, writing the suite,
running it against the live site), plus my own review. The commit timestamps show the progression.

## AI usage

Built with Claude Code (Claude). The session export is included with the submission.
