# Restful Booker Platform — automated test suite

API and UI tests for [Restful Booker Platform](https://automationintesting.online), a demo hotel
booking site. Playwright + TypeScript.

> The suite started in Cypress (the brief's stack) and was moved to Playwright partway through. The
> commit history shows both.

## Running the tests

Requirements: Node.js 20.12+.

```bash
npm ci
npx playwright install chromium

cp .env.example .env   # then fill in the admin credentials from the exercise brief

npm test                 # everything: API + UI
npm run test:api         # API only (no browser)
npm run test:ui          # UI only
npm run test:smoke       # @smoke: the critical paths
npm run test:regression  # everything except @defect: the CI gate, expected green
npm run test:defects     # only tests documenting known product defects: expected red
npm run report           # open the last HTML report (traces, screenshots, videos)

npm run check            # formatting, lint, type-check
```

### Environments

Nothing environment-specific lives in code. Settings resolve in this order (first wins):

1. real environment variables (CI secrets, shell exports);
2. `.env` — local and gitignored: credentials and `TEST_ENV`;
3. `config/environments/<TEST_ENV>.env` — committed, non-secret: `BASE_URL` and `API_BASE_URL`.

`TEST_ENV` defaults to `demo`. To target another environment (a local Docker stack, staging), add
`config/environments/<name>.env` and run with `TEST_ENV=<name>`. The UI and API base URLs are set
separately, so an API on another host or path works too. A missing setting fails at start-up with a
message naming the variable and where to set it.

## What is covered

137 tests (plus one setup step), grouped in every spec by scenario type. The groups show up in the
report: `API · Bookings › edge cases › refuses a firstname of 19 characters`.

| Area                       |  Happy | Alternative | Negative |   Edge | Corner | Exceptions |   Total |
| -------------------------- | -----: | ----------: | -------: | -----: | -----: | ---------: | ------: |
| API · Authentication       |      3 |           – |        4 |      – |      1 |          2 |      10 |
| API · Room availability    |      2 |           1 |        – |      6 |      – |          1 |      10 |
| API · Bookings             |      5 |           4 |       12 |     14 |      4 |          2 |      41 |
| API · Branding             |      1 |           – |        1 |      – |      – |          – |       2 |
| API · Booking report       |      2 |           – |        1 |      – |      – |          – |       3 |
| API · Guest messages       |      5 |           – |        2 |     12 |      2 |          1 |      22 |
| API · Rooms                |      5 |           8 |        3 |      5 |      4 |          2 |      27 |
| UI · Admin login           |      2 |           – |        2 |      – |      1 |          – |       5 |
| UI · Admin messages inbox  |      2 |           – |        – |      – |      1 |          – |       3 |
| UI · Admin room management |      2 |           1 |        2 |      2 |      – |          – |       7 |
| UI · Guest booking         |      2 |           – |        – |      – |      – |          – |       2 |
| UI · Guest contact form    |      1 |           – |        2 |      1 |      1 |          – |       5 |
| **Total**                  | **32** |      **14** |   **29** | **40** | **14** |      **8** | **137** |

- **Happy path:** the main flow works end to end. For example, a guest books a room, gets a 201
  with the booking echoed back, and the booking is stored against the room.
- **Alternative flows:** other valid ways through, such as each room type, deposit paid or not,
  back-to-back stays, or a room with no features.
- **Negative:** invalid input refused with the right status and message, and nothing persisted.
  This includes double bookings (five overlap shapes), missing fields, bad emails and missing auth.
- **Edge cases:** each field limit tested on both sides of the boundary (name, phone, subject,
  message length, price 1–999), one-night stays, leap days, and availability at the exact edges of a
  booking.
- **Corner cases:** unusual combinations, such as unicode names, markup in messages (stored as text
  and never executed in the admin inbox), past dates, rooms that don't exist, fractional prices,
  token reuse after logout, and responses leaking a guest's email or phone.
- **Exceptions:** malformed JSON, wrong types, forged tokens, unparseable dates. The server should
  answer 4xx, not crash.

**Split between layers.** Business rules are checked at the API, where they are fast and precise.
The UI covers each user journey once, plus what only the UI can show: validation feedback, session
handling, and how user content is rendered.

### What an API test checks

Every API test checks more than the status code:

- **status and content type**: `await expect(response).toBeJson(201)`;
- **contract**: `await expect(response).toMatchSchema(BookingSchema)`. The zod schemas in
  `src/api/schemas.ts` are strict, so an unexpected field fails, for example a guest's email leaking
  into a booking response;
- **values**: the response echoes what was sent (`toEqual` on the whole body where possible);
- **side effects**: after a write, the state is read back. A refused write is checked to have
  stored nothing.

## How it is built

```
config/environments/   per-environment, non-secret settings (demo.env)
src/
  config/              env.ts: the only place that reads process.env
  api/                 schemas.ts (zod contracts + types), clients.ts (one client per resource)
  data/                factories.ts (valid payloads, limits), test-data.ts (setup + cleanup)
  fixtures/            test + expect: API fixtures, page objects, custom matchers
  pages/               page objects: locators and actions, never assertions
tests/
  setup/               admin session for the UI, created through the API
  api/                 API specs
  ui/                  UI specs
```

**Test data is created through the API in `beforeAll`/`beforeEach` and deleted through the API in
`afterAll`/`afterEach`.** Shared, read-only data (for example the booked room behind the
availability tests) is created once per file in `beforeAll`. Anything a test changes is created per
test in `beforeEach`.

**A unique tag per data scope** (`qa3k9xz`) goes into every name the scope creates. On a shared,
resettable environment this means:

- a test only looks for its own data, so other users cannot break it, and tests can run in parallel;
- cleanup finds everything by tag, including data created through the UI (whose ids the test never
  sees) and the "You have a new booking!" message the platform generates for each booking.

**Cleanup never hides a result.** A failed delete doesn't fail the test. It is recorded as a
`cleanup-failed` annotation in the report and printed as a warning.

**Room ids are not trusted as identity.** The demo's services reset independently: room ids get
recycled while bookings made for the old room survive. So each data scope books inside its own random
date window (1–10 years ahead), and booking lookups return only the bookings carrying the scope's tag.

**Lookups are tolerant, assertions are strict.** Setup and cleanup only read the identifying fields
of the shared lists, so one malformed record left by someone else can't break them. Strict contract
checks run on the test's own data.

**Other choices**

- Specs import `test`/`expect` from `src/fixtures`. API clients are worker-scoped fixtures
  (`anonApi`, `adminApi`), so they can be used in `beforeAll`/`afterAll`.
- Admin UI tests start from a session created through the API (setup project + `storageState`).
  Only the login spec drives the login form.
- Locators: role, label and text first; `data-testid` only where the app gives nothing else; CSS
  twice, each justified in a comment (the room form has unlabelled fields).
- No retries and no fixed waits. A test that only passes on retry is a bug.
- Traces, screenshots and videos are kept on failure. CI also writes JUnit.
- Known product defects are tests tagged `@defect` with an annotation describing the defect. They
  fail for the stated reason and are left failing, never skipped or weakened. CI keeps them out of the
  gate and re-runs them in a non-blocking job, so a fix shows up as a defect test that starts
  passing.
- Static checks: TypeScript `strict`, ESLint (`typescript-eslint`, `eslint-plugin-playwright`,
  no floating promises), Prettier. Specs and page objects were also scanned with
  [lootfilter](https://github.com/rafaellabarrocas/lootfilter), my test-code linter (see the
  results below).

### CI (`.github/workflows/e2e.yml`)

| Trigger      | Runs                                                             |
| ------------ | ---------------------------------------------------------------- |
| pull request | static checks → `@smoke` (without `@defect`)                     |
| `main`       | static checks → regression (gate) + known defects (non-blocking) |
| nightly      | same as `main`                                                   |
| manual       | same, with a choice of `TEST_ENV`                                |

Reports, traces and videos are uploaded as artifacts.

## Results against the live demo

Final runs on the last commit: **111 passed, 27 failed. All 27 are `@defect` tests, each failing for
its stated reason, and no `@defect` test passed.** A second full run had the same API results, but 9
admin UI tests failed during a window when the demo's admin side stopped working for any login (even
a fresh one through the form). Re-running the UI project straight after gave 19 passed and 0
unexpected failures.

### Defects found

| #   | Defect                                                                                                                      | Severity                | Tests                       |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------- |
| 1   | **Every API route with an id returns 500** (`GET/PUT/DELETE /room/:id`, `/booking/:id`, `/message/:id`, `/report/room/:id`) | Critical                | 8 API tests                 |
| 2   | → so **guests cannot book**: the reservation page calls `GET /room/:id` and spins forever                                   | Critical                | UI · Guest booking          |
| 3   | → and **admins cannot open, edit or delete** rooms, bookings or messages                                                    | High                    | UI · Admin messages inbox   |
| 4   | **Availability search offers booked rooms** when the search only partly overlaps the booking or falls inside it             | High (overbooking risk) | API · Room availability (3) |
| 5   | **Logout does not invalidate the token**: it still validates and can still create rooms                                     | High (security)         | API · Authentication        |
| 6   | **Bookings accepted for dates in the past**                                                                                 | High                    | API · Bookings              |
| 7   | **Bookings accepted for a room that does not exist** (orphan bookings)                                                      | High                    | API · Bookings              |
| 8   | **A new room never appears on the home page**: it renders only the first three rooms                                        | High                    | UI · Guest booking          |
| 9   | **Bad input crashes the server (500) instead of 4xx**: malformed JSON, forged token, unparseable date, 300-char room name   | Medium                  | 6                           |
| 10  | **Silent data changes**: price 150.5 stored as 150; omitted `features` stored as `[null]`; unknown features accepted        | Medium                  | API · Rooms (3)             |
| 11  | **Missing price gives a generic "Failed to create room"**, with no field reason, in the API and the admin form              | Low                     | UI · Admin room management  |

**Also observed (no test, needs a product decision):**

- `GET /message` lists guests' names and subjects to anonymous callers, while bookings and reports
  need a token.
- An inverted date range (checkout before checkin) in the availability search returns every room
  instead of an error.
- Error bodies are inconsistent: `{ errors: [...] }` for rooms and bookings, a bare array for
  messages, and `{ error }` vs `{ errors }` for the same 401 on different endpoints.
- Duplicate room names are accepted.
- Accessibility: the contact form's message box and every field of the admin room form have no
  accessible name.
- The login page shows a "Logout" button to logged-out users.
- React hydration error #418 on page load.

### Notes and limitations

- **The demo is unstable under test.** I saw services resetting independently mid-run (room ids
  recycled while old bookings survived) and a temporary outage of the admin side. The suite isolates
  its data against the first. The second is out of a test's control, and it's the main argument for
  running against an environment we own (see next steps).

- **The reservation page's form locators are unverified**: the page never rendered while I wrote
  them (defect 2). They follow the platform's placeholders and must be checked once it loads.
- **Test data cannot be cleaned up right now**, because `DELETE` is broken (defect 1). Each leftover
  is reported per test, and the demo's periodic reset removes them.
- **lootfilter** reports no violations except one rule. ASSERT-001 flags 56 tests as having no
  assertion. It's a false positive: its regex ends the test body at the first `})`, so any test that
  destructures fixtures (`async ({ page }) => { … }`) is flagged. A one-line canonical Playwright
  test reproduces it, and ESLint's `playwright/expect-expect` (set to error) passes on every spec. The fix belongs in lootfilter, not here.

## What I would do next

- **Run against an environment we own.** The platform ships as Docker images, and a private,
  resettable stack (`TEST_ENV=local`) makes cleanup trivial and removes other users' noise.
- **Track each `@defect` in the team's issue tracker** and put the ticket id in the annotation.
- **Add the journeys blocked by defect 1** once it is fixed: edit/delete in the admin UI, booking
  cancellation, the admin booking calendar.
- **Accessibility checks** (`@axe-core/playwright`) on guest pages, starting with the unlabelled fields.
- **More browsers and a mobile viewport** as extra Playwright projects.
- **Contract tests from an OpenAPI spec**, if the platform publishes one, instead of hand-written schemas.
- **Performance smoke**: response-time budgets on the booking and availability endpoints.

## Time spent

By the clock (see commit times): the Cypress version took about 30 minutes; the Playwright rework,
including re-probing the API for edge cases, about 50 minutes. Both were AI-assisted, plus my own
review.

## AI usage

Built with Claude Code (Claude). The session export is included with the submission.
