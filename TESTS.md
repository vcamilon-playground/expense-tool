# E2E Test Suite

Playwright tests for the Expense Tool web app. Two jobs run in parallel on every successful Vercel deployment: smoke tests (UI/visibility) and regression tests (real database CRUD).

---

## First-time Setup

`npm install` downloads the `@playwright/test` package but **does not** download the browser binaries. Run this once after cloning or after upgrading Playwright:

```bash
npm run install:browsers
```

This downloads the Chromium binary (~260 MB) to your local Playwright cache. You only need to re-run it when the Playwright version changes.

---

## Running Tests

**Important:** all Playwright commands must be run from the `apps/e2e/` directory. Running from the repo root skips the config file and leaves `baseURL` unset.

### Smoke tests only (fast, no DB writes)

```bash
cd apps/e2e && SMOKE_ONLY=1 npx playwright test
```

### Regression tests only (hits real database)

```bash
cd apps/e2e && npx playwright test tests/budgets.regression.spec.ts tests/expenses.regression.spec.ts tests/recurring.regression.spec.ts tests/settings.regression.spec.ts
```

Or from the repo root using the workspace script:

```bash
npm run test:e2e:regression
```

### A specific spec file

```bash
cd apps/e2e && SMOKE_ONLY=1 npx playwright test tests/expenses.spec.ts
```

### Against a deployed URL

```bash
cd apps/e2e && BASE_URL=https://your-app.vercel.app npx playwright test
```

### Interactive UI mode

```bash
npm run test:e2e:ui
```

### View the test results dashboard

After any test run:

```bash
npm run test:dashboard
```

Writes `apps/e2e/test-dashboard.html` — open in any browser as a plain `file://` URL. Shows pass/fail/skip summary, per-suite breakdown, inline error messages, and a link to the full Playwright HTML report.

### View the full Playwright HTML report (traces and screenshots)

```bash
cd apps/e2e && npx playwright show-report
```

---

## Test Files

| File | Type | What it covers |
|---|---|---|
| `tests/auth.spec.ts` | Smoke | Login page UI, register page UI, unauthenticated redirect, authenticated dashboard access |
| `tests/password-reset.spec.ts` | Smoke | Login links to forgot-password, register offers optional email field, forgot-password form renders, reset-password rejects a missing token |
| `tests/navigation.spec.ts` | Smoke | Desktop sidebar links + active state + profile card + footer; desktop logout/switch-user via sidebar buttons; mobile bottom tab bar navigation + active state + header-avatar profile popup |
| `tests/dashboard.spec.ts` | Smoke | Page heading, four KPI stat cards, Budget Status, Category Chart, 6-month Trend, Upcoming Charges sections |
| `tests/expenses.spec.ts` | Smoke | Page load, Add Expense modal, required fields, inline validation errors, search/filter, delete modal, month group collapse, column sorting, List/Grid/Calendar view toggle + Grid cards + month navigation |
| `tests/recurring.spec.ts` | Smoke | Page load, Add Recurring modal, required fields, inline validation errors, themed table header, payment confirmation flow, delete modal, column sorting |
| `tests/reports.spec.ts` | Smoke | Page load, period select, preset/date-range mode toggle, compare period, column sorting |
| `tests/budgets.spec.ts` | Smoke | Page load, form labels, edit/cancel flow, inline validation errors, column sorting |
| `tests/settings.spec.ts` | Smoke | Session expiry, profile section, global save/cancel, navigation guard, change password, theme colours, categories, past-edit toggle, profile menu |
| `tests/income.spec.ts` | Smoke | Page load, four summary cards, amounts hidden by default + global eye toggle + per-card eye reveal, Add Source modal fields, cash hides name field, inline validation; the "Transaction History" button navigates to the standalone `/income/history` page (heading, back link, "Show archived" toggle, month-grouped 5-column tables / empty state) |
| `tests/maya-savings.spec.ts` | Smoke | `/income/maya` page load (reached via the "💜 Maya Savings" Income-header link), four summary cards (Total Saved / Weeks Completed N/51 / Year-End Goal / Remaining), progress bar, "This Friday" current-week card with mark/undo toggle, weekly schedule table (Week/Friday/Transfer/Running Total/Done) driven from a DB-seeded state (empty / full-51), logged-out redirect to /login |
| `tests/notifications.spec.ts` | Smoke | Page load, Add Reminder form (title/repeat/date), repeat cadence options, empty-title validation, form open/close toggle |
| `tests/site-header.spec.ts` | Smoke | Time-based greeting with user name, personalized today date line (`Today is yyyy/mm/dd, DDD`), theme pill toggles data-theme, notification bell links to /notifications; date line absent on /login |
| `tests/pwa.spec.ts` | Smoke | Web manifest is public + valid (name/display/icons), apple-icon is a public image, icon.svg + sw.js are public |
| `tests/footer.spec.ts` | Smoke | Footer shows About/Contact/copyright on an authed page; About modal shows credit + version; Contact modal shows mailto/tel links; footer absent on the login page |
| `tests/loading.spec.ts` | Smoke | Page-level loading state shows the themed `LoadingScreen` spinner (`.loading-screen`, `role="status"`, `.spinner` with 12 bars, "Loading" label) while a delayed Supabase request is in flight |
| `tests/expenses.regression.spec.ts` | Regression | Create/edit/delete expense; past-month lock with allow-past-edit off and on |
| `tests/expenses-grid.regression.spec.ts` | Regression | Grid cards render category/amount/merchant/description; receipt pill and ≈PHP conversion; search narrows cards; edit/delete from a card; Load More pagination (20-per-page, accent-styled button); past-month lock with allow-past-edit off and on |
| `tests/budgets.regression.spec.ts` | Regression | Seed a per-category budget, edit its limit; verify the computed read-only Overall footer row (sum of category limits, no actions) and the dashboard Overall + category rows |
| `tests/recurring.regression.spec.ts` | Regression | Create/edit/delete recurring expense; confirm YES adds expense + advances date; confirm NO advances date without adding expense |
| `tests/settings.regression.spec.ts` | Regression | Add category with custom icon; add category without icon uses default; deleting category does not delete linked expenses |
| `tests/income.regression.spec.ts` | Regression | Create/edit/delete a bank source; transfer moves balance between sources; transfer rejects an over-balance amount; add money tops up a source balance; add money rejects a non-positive amount; the `/income/history` page logs deduct/add/transfer/balance-edit rows (sign, colour, note, before→after) grouped by month, source deletion retains rows (snapshot label persists), "Show archived" reveals archived rows, privacy eye masks history amounts, and name-only / same-value edits log nothing |
| `tests/maya-savings.regression.spec.ts` | Regression | DB-seeded summaries; toggling a week updates the cards/progress and writes the `maya_savings` row (read back, sorted/deduped); "This Friday" mark/undo persists; first-visit seeding creates exactly one row (weeks before today); empty-array honored; save-failure shows the `.field-error` banner + resyncs UI to DB; load-failure shows the banner-only view |
| `tests/notifications.regression.spec.ts` | Regression | Create/delete a reminder; mark a due one-time reminder Done (removed); mark a due recurring reminder Done (date advances) |
| `tests/password-reset.regression.spec.ts` | Regression | Forgot-password rejects an invalid email inline; returns a generic success for any valid email (no account enumeration); reset-password rejects mismatched passwords inline and an invalid/expired token |

---

## Test Catalogue

> **This catalogue is a point-in-time snapshot for human readers.** The spec files in `apps/e2e/tests/` are the source of truth — when they and this list disagree, trust the specs. The `e2e-author` agent (`.claude/agents/e2e-author.md`) owns the rules for writing and updating tests.

### `auth.spec.ts` — Login & Register

**Login page**
- redirects to /login when not authenticated
- login page renders all required elements *(heading, username-or-email, password, sign-in button, register link)*
- invalid credentials show an error

**Register page**
- register page renders all required elements *(heading, first/last name, username, create account button, sign-in link)*

**Auth — authenticated access**
- dashboard is accessible when logged in

---

### `password-reset.spec.ts` / `password-reset.regression.spec.ts` — Email registration & password reset

**Smoke**
- login page links to the forgot-password page
- register page offers an optional email field
- forgot-password page renders its form *(heading, email input, submit, back-to-sign-in)*
- reset-password page rejects a missing token

**Regression**
- forgot-password rejects an invalid email inline (no request sent)
- forgot-password returns a generic success for any valid email *(no account enumeration)*
- reset-password rejects mismatched passwords inline
- reset-password rejects an invalid/expired token

---

### `navigation.spec.ts` — Navigation

**Navigation — desktop sidebar**
- nav links navigate to correct pages (Home, Income, Expenses, Recurring, Budgets, Reports, Settings)
- active nav link is highlighted on the current page *(expenses and reports)*
- profile card shows the user name and handle
- footer is visible on all pages

**Navigation — logout / switch-user (desktop)** — direct sidebar buttons (no popup on desktop)
- sidebar Log Out button opens confirmation modal
- sidebar Switch User button opens confirmation modal
- logout and switch-user modals close via Cancel and backdrop without acting

**Navigation — mobile bottom tab bar** (`viewport: 390×844`)
- sidebar is hidden and the bottom tab bar is shown on mobile
- bottom tabs navigate to correct pages
- active bottom tab is highlighted on expenses page
- header avatar opens the profile popup with Settings, Switch User, Log Out
- Log Out from the profile popup opens the confirmation modal

---

### `dashboard.spec.ts` — Dashboard

**Dashboard**
- page title is correct and all sections render *(header greeting, 4 KPI cards, Budget Status, Daily + Weekly spend charts, Category Chart, 6-Month Trend, Upcoming Charges)*
- Budget Status card renders the new table or the empty state *(when budgets exist, asserts the `.budget-status-table`, a category row's `.pct-pill` carries `pct-ok|warn|over` and shows an `N%` label, and the Overall row is the last row rendered as a `.budget-status-summary` footer)*
- month-end reminder banner is conditional on days remaining in month

**Dashboard — Upcoming Charges column sorting**
- sortable headers present and Due Date toggles direction

**Dashboard — refresh on resume after idle**
- refetches data when resumed after a long background period *(uses `page.clock` to simulate the tab being hidden > 5 min, then asserts a fresh `/rest/v1/expenses` request fires on return)*
- does not refetch after a brief background period *(hidden < 5 min → no refetch)*

---

### `expenses.spec.ts` — Expenses

**Expenses page**
- page renders heading, add button, and search/filter controls
- clicking Add Expense opens the modal with correct heading
- required fields have required attribute in modal
- modal closes on Cancel, Escape, and backdrop click
- submitting an empty or negative amount keeps modal open and shows inline error
- searching with no matches shows the no-results message; clearing restores the list

**Expenses — delete confirmation modal**
- delete modal renders with correct content and buttons *(heading, message, Yes/No/X buttons)*
- X, "No, keep it", and backdrop each close the modal without deleting

**Expenses — month group collapse behaviour**
- default expansion state: current month expanded, past months collapsed
- toggling a month header expands a collapsed group and collapses an expanded one

**Expenses — column sorting**
- Date, Category, Merchant and Amount headers are sortable
- Amount sort toggles direction and a different header moves the active indicator

**Expenses — List / Grid / Calendar view**
- view toggle shows List, Grid, Calendar in order with List active by default
- switching to Grid shows the grid, switching back to List hides it
- Grid view shows the no-match page message when a search matches nothing
- switching to Calendar shows the grid and nav, switching back to List hides it
- calendar month navigation changes the displayed month
- the three-way toggle and Grid view are reachable at a mobile viewport

---

### `income.spec.ts` — Income

**Income page**
- page renders heading, add button, and four summary cards
- amounts are hidden by default and the (global) eye toggle reveals them
- each summary card has its own eye that reveals only that card
- Add Source modal opens with type, name, balance fields and capitalised type options
- selecting Cash on Hand hides the name field
- empty required fields show inline errors
- a section collapse-header is a themed band (non-white background) with white title text

**Transaction History**
- the "Transaction History" button navigates to `/income/history` (heading, back link, "Show archived" toggle, month-grouped 5-column tables or empty state)

---

### `maya-savings.spec.ts` — Maya Weekly Savings

**Maya Weekly Savings page**
- the Income header "💜 Maya Savings" link navigates to `/income/maya`
- page renders heading, four summary cards (Total Saved, Weeks Completed N/51, Year-End Goal, Remaining), and the progress bar
- the "This Friday" card shows the current week with a mark/undo toggle
- the weekly schedule table renders Week / Friday / Transfer / Running Total / Done columns and exactly 51 rows (week 1 ₱100, week 51 ₱5,100 / ₱132,600 goal)
- a DB-seeded empty state shows ₱0 / 0 of 51 / 0%; a full 51-week state shows the goal at 100%
- deep-linking `/income/maya` while logged out redirects to `/login`

---

### `notifications.spec.ts` — Notifications

**Notifications page**
- page renders heading and the Add Reminder button
- Add Reminder form opens with title, repeat, date fields and cadence options
- submitting an empty reminder shows an inline error
- the Add Reminder button toggles the form open and closed

---

### `site-header.spec.ts` — Site header

**Site header**
- shows a time-based greeting with the user first name
- shows the personalized today date line in `Today is yyyy/mm/dd, DDD` format
- theme pill toggles the `data-theme` attribute (resets to light)
- notification bell links to the notifications page

**Site header — unauthenticated**
- hides the header date line on the login page

---

### `pwa.spec.ts` — PWA (unauthenticated)

**PWA**
- web manifest is public and valid *(name, display: standalone, icons)*
- apple touch icon is a public image
- app icon SVG is public
- service worker script is public

---

### `footer.spec.ts` — Site footer

**Site footer**
- shows About, Contact, and a copyright line on an authed page
- About opens a dialog with the "Created by Vegil Camilon & Claude Code" credit and a `v{major}.{minor}.{patch}` version line, closes on Escape
- About modal header is a themed band (non-white background) with a white title
- Contact opens a dialog with `mailto:` and `tel:` links, closes via the ✕ button

**Site footer — unauthenticated**
- footer is absent on the login page when logged out

---

### `loading.spec.ts` — Themed loading spinner

**Themed loading spinner**
- shows the themed spinner with 12 bars while data loads *(delays `/rest/v1/` requests to hold the transient state; asserts `.loading-screen`, `role="status"`, `.spinner`, 12 bars, and the "Loading" label)*

---

### `recurring.spec.ts` — Recurring Expenses

**Recurring Expenses page**
- page renders with heading, description and add button
- modal form has required fields and capitalized cadence options
- modal closes on Cancel and Escape key
- submitting without name keeps modal open and shows inline error
- submitting with zero amount shows inline error below amount field
- card section title carries the accent left bar
- table header is a themed band (non-white background) with white title text

**Recurring Expenses — payment confirmation flow**
- a due item shows the Due badge and a Confirm Payment button
- clicking Confirm Payment opens confirmation modal with item details
- confirmation modal closes on X button without advancing the date
- clicking No opens reminder modal with OK button
- reminder modal is not dismissible by backdrop click or Escape key

**Recurring Expenses — delete confirmation modal**
- delete modal renders with correct content and buttons *(heading, message, Yes/No/X buttons)*
- X and "No, keep it" each close the modal without deleting the record

**Recurring Expenses — pay now button**
- Pay Now button is visible and opens confirmation modal with item details *(button present for future-dated items, Confirm Payment absent, modal has heading/name/confirm/cancel)*
- Pay Now modal closes on Cancel, X button, and backdrop click

**Recurring Expenses — column sorting**
- Name, Category, Cadence, Next Charge, Amount, Active headers are sortable
- Name sort activates and toggles direction

---

### `reports.spec.ts` — Reports

**Reports page**
- page renders with all required controls and sections *(heading, period select, date input, stat cards, By Category, date range, mode buttons, compare checkbox)*
- period select options are capitalized
- changing period updates the date range text
- Date Range toggle shows custom inputs and Preset restores select
- compare checkbox shows and hides Period Comparison section
- custom date range updates the Showing text

**Reports — By Category column sorting**
- Category, Count, Total and % headers are sortable
- Total active by default; Category moves the indicator; Total toggles direction

---

### `budgets.spec.ts` — Budgets

**Budgets page**
- page renders with heading, form, and budget sections *(description, Category label, Monthly Limit input, Save Budget button, Current Budgets heading)*
- each budget row has Edit and Delete buttons
- edit mode populates form, disables category, and Cancel restores default state
- invalid Monthly Limit values show inline error *(empty and negative)*

**Budgets — column sorting**
- Category and Monthly Limit headers are sortable; Monthly Limit toggles direction

---

### `settings.spec.ts` — Settings

**Settings — Session Expiry section**
- all timeout options are present and Never is selected by default
- selecting an option checks it and switching back to Never unchecks it
- selected timeout persists across page reload after saving

**Settings — global save / cancel**
- editing first name shows the unsaved changes bar
- Cancel reverts the first name to its original value
- changing session timeout or theme color shows the unsaved bar

**Settings — navigation guard**
- navigating away with unsaved changes shows the guard modal
- "Stay on page" closes modal and keeps user on settings with changes intact
- "Leave without saving" navigates away and discards changes

**Settings — Change Password section**
- submitting with wrong current password shows error

**Settings page**
- all profile-page sections render (profile, theme, categories, change password) *(name inputs, all 6 swatches + light-mode note, category form + rows, change-password heading/button)*
- Default swatch is active on first visit
- clicking a color swatch marks it as active
- dark mode shows warning banner instead of note

**Settings — Categories section**
- submitting with empty name keeps the list unchanged

**Settings — past expense editing toggle**
- expense editing section renders with toggle off and note hidden
- checking the toggle shows the enabled note and unchecking hides it
- toggle persists across page reload after saving

**Settings — access (desktop)**
- profile card is visible and the sidebar Settings link navigates to /settings

**Settings — access (mobile)**
- header avatar opens the profile popup and Settings navigates to /settings

---

### `expenses.regression.spec.ts` — Expenses CRUD

**Expenses — CRUD regression**
- create, edit, and delete a current-month expense *(delete confirmation uses the shared `.modal-header` band)*

**Expenses — past-month lock (allow-past-edit disabled)**
- past-month expense shows lock icon and no Edit or Delete buttons

**Expenses — past-month lock (allow-past-edit enabled)**
- past-month expense shows Edit and Delete when allow-past-edit is on

---

### `expenses-grid.regression.spec.ts` — Expenses Grid view

**Expenses Grid — card rendering**
- a receipt card renders its fields and the green receipt pill *(category, amount, merchant, description + receipt pill)*
- an overseas manual card shows the ≈PHP conversion and no receipt pill

**Expenses Grid — search and filter**
- search narrows the grid to matching cards
- a search that matches nothing shows the no-match message, not the grid empty state

**Expenses Grid — edit and delete from a card**
- Edit on a card opens the Edit Expense modal and saves changes
- Delete on a card confirms and removes the card

**Expenses Grid — Load More pagination**
- shows one page of 20 cards with an accent-styled Load More button *(count, label, accent text + border colour)*
- clicking Load More reveals the remaining cards and hides the button

**Expenses Grid — past-month lock (allow-past-edit disabled / enabled)**
- a past-month card shows the lock icon and no Edit or Delete buttons
- a past-month card shows Edit and Delete when allow-past-edit is on

---

### `budgets.regression.spec.ts` — Budgets CRUD

**Budgets — edit regression**
- editing a per-category budget updates its displayed limit
- read-only Overall footer row reflects the sum of category limits and has no actions
- dashboard Budget Status table shows the category row and the computed Overall row last, as the `.budget-status-summary` footer row

---

### `recurring.regression.spec.ts` — Recurring CRUD

**Recurring Expenses — CRUD regression**
- create, edit, and delete a recurring expense

**Recurring Expenses — confirm YES adds expense**
- confirming payment creates an expense record and advances the charge date

**Recurring Expenses — confirm NO skips expense**
- declining payment advances charge date without creating an expense record

**Recurring Expenses — pay now**
- recording early payment creates expense and advances charge date

---

### `settings.regression.spec.ts` — Settings CRUD

**Settings — category CRUD regression**
- add a category with a custom icon, then delete it
- add a category without an icon uses the default icon

**Settings — deleting a category does not delete linked expenses**
- expense survives category deletion and still shows the original category name

---

### `income.regression.spec.ts` — Income CRUD & transfer

**Income — CRUD**
- create, edit, and delete a bank source

**Income — transfer between sources**
- transferring moves the balance from one source to another
- transfer rejects an amount greater than the source balance

**Income — add money (top-up)**
- adding money increments the source balance, section total, and Grand Total
- add money rejects a non-positive amount inline

**Income — Transaction History** (on the `/income/history` page)
- Add Money logs a newest-first `+` row; expense deduction logs a `−` (red) row carrying the merchant note
- transfer logs a single "From → To" row with a `−` amount; balance edit logs a "before → after" row
- rows are grouped under a month heading (e.g. "June 2026")
- deleting a source retains its history rows (snapshot label persists)
- "Show archived" reveals/hides archived rows (tagged `(archived)`); the privacy eye masks history amounts (incl. `•••••• → ••••••`)
- a name-only edit and a same-value balance edit log no new row

---

### `maya-savings.regression.spec.ts` — Maya Weekly Savings state

**Maya Weekly Savings — done-state persistence** (DB-backed via the `maya_savings` row)
- a DB-seeded `[1,2,3]` state drives Total Saved (₱600), Weeks Completed (3/51), Remaining, and the "Saved" badges
- an empty-array state is honored (0 saved)
- toggling a checkbox updates the summary and writes the row back (read from the DB, sorted + deduped)
- the "This Friday" card button marks/undoes the current week and persists
- first visit with no row seeds every Friday before today and creates exactly one row
- a save failure shows the `.field-error` banner and resyncs the UI to the DB; a load failure shows the banner-only view (heading + Back link, no table)

---

### `notifications.regression.spec.ts` — Reminders CRUD

**Notifications — reminders CRUD**
- create a one-time reminder, see it listed, and delete it
- marking a due one-time reminder Done removes it
- marking a due recurring reminder Done advances its next date

---

## Configuration

`apps/e2e/playwright.config.ts` key settings:

| Setting | Value | Reason |
|---|---|---|
| `workers` | 1 | Single worker prevents race conditions on shared test data |
| `retries` | 0 | Failures reported immediately — no silent retries |
| `timeout` | 60 s | Per-test cap for slow remote deployments |
| `expect.timeout` | 20 s | Assertion wait — covers Supabase cold-start latency |
| `navigationTimeout` | 30 s | Page navigation cap |
| `actionTimeout` | 15 s | Click / fill / select cap |
| `trace` | `retain-on-failure` | Trace files saved only when a test fails |
| `screenshot` | `only-on-failure` | Screenshots saved only on failure |

**Local runs** (`FULL_BROWSERS=1`) use three projects: Chromium, Firefox, and Pixel 5 (mobile Chrome).  
**CI runs** use Chromium only via `--project=chromium`.

---

## Authentication in Tests

All tests except `auth.spec.ts` run as an authenticated user. A **global setup** step (`tests/global-setup.ts`) runs once before any test:

1. Attempts to log in as the E2E test user (`e2e_tester` by default).
2. If the user doesn't exist, registers it automatically.
3. Saves the session cookie to `apps/e2e/auth.json` and the user ID to `apps/e2e/e2e-user.json`.
4. All subsequent test pages load with that session via `storageState` in `playwright.config.ts`.

Seed/cleanup helpers in `tests/helpers/supabase.ts` read `user_id` from `e2e-user.json` and scope all inserts and deletes to that user.

**Required secrets for CI:**
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — for seed/cleanup helpers (same values as Vercel)
- `E2E_USERNAME` — defaults to `e2e_tester`
- `E2E_PASSWORD` — defaults to `E2eTestPass123`

`auth.spec.ts` tests clear storage state via `test.use({ storageState: { cookies: [], origins: [] } })` to exercise the unauthenticated paths.

---

## CI / CD Integration

Tests trigger automatically via GitHub Actions (`.github/workflows/e2e.yml`).

**Triggers:**
- `deployment_status` event — Vercel fires this after every successful deployment. Condition: `github.event.deployment_status.state == 'success'`. Both jobs run against the just-deployed URL (`deployment_status.target_url`).
- `workflow_dispatch` — run the suite manually from the **Actions** tab. Two inputs:
  - **base_url** — URL to test against (defaults to the production alias `https://expense-tool-web.vercel.app`).
  - **suite** — `both` (default), `smoke`, or `regression`. Only the selected job(s) run.

**Running manually:**
1. Repo → **Actions** tab → **E2E Tests** workflow → **Run workflow**.
2. Pick the branch, optionally override **base_url**, and choose **suite**.
3. Click **Run workflow**. Or from the CLI: `gh workflow run e2e.yml -f suite=smoke -f base_url=https://expense-tool-web.vercel.app`.

Two jobs run **in parallel** (on a `deployment_status` event both always run; on manual dispatch only the selected suite runs):

| Job | Specs | Timeout | Artifact |
|---|---|---|---|
| `e2e-smoke` | All non-regression specs (`SMOKE_ONLY=1`) | 15 min | `playwright-report-smoke-<run_id>` |
| `e2e-regression` | All `*.regression.spec.ts` files | 20 min | `playwright-report-regression-<run_id>` |

To view results after a deployment:
1. Go to the repo → **Actions** tab → find the **E2E Tests** workflow run.
2. Each job shows pass/fail independently.
3. The run **summary page** shows a per-job markdown report (passed / failed / skipped counts, duration, and a collapsible error block for each failed test) — no download needed for a quick overview.
4. Download the `playwright-report-smoke-*` or `playwright-report-regression-*` artifact for the full HTML report with traces and screenshots.

**Test summary on the run page:** each job runs `node scripts/github-summary.js "<Smoke|Regression> tests"` (a `if: always()` step) which parses `test-results.json` (written by the JSON reporter) and appends a markdown table plus failed-test details to `$GITHUB_STEP_SUMMARY`. The step is dependency-free — it reuses the same parsing as `scripts/generate-dashboard.js`.

When tests fail, use the **`playwright-test-healer`** Playwright agent to diagnose and fix. It runs the failing tests in a live browser, inspects the broken selector or assertion, edits the page object, and re-runs until green.

---

## Test Data & Cleanup

Regression specs write real rows to the production database. Every regression spec must:

1. Call `cleanup.expenses()` / `cleanup.recurring()` in **`beforeAll`** (remove any stale rows from a previous aborted run).
2. Call the same cleanup in **`afterAll`** (remove rows created by this run).

Tag test data so cleanup helpers can find it:

| Job | Feature | Tag | Cleanup helper |
|---|---|---|---|
| Regression | Expenses | `merchant = 'E2E-TEST'` | `cleanup.expenses()` (filter: `E2E*`) |
| Regression | Recurring expenses | `name = 'E2E Test Subscription'` | `cleanup.recurring()` (filter: `E2E*`) |
| Smoke | Expenses (delete modal) | `merchant = 'SMOKE-TEST'` | `cleanup.smokeExpenses()` (filter: `SMOKE*`) |

**Important:** smoke and regression CI jobs run in parallel and share the same database. Using distinct merchant prefixes (`E2E-*` vs `SMOKE-*`) prevents each job's cleanup from deleting the other job's live test data. Never use `cleanup.expenses()` (the `E2E*` filter) in smoke specs — use `cleanup.smokeExpenses()` instead.

Cleanup helpers are exported from `tests/helpers/supabase.ts` and call the Supabase REST API directly using `SUPABASE_URL` and `SUPABASE_ANON_KEY`. If these env vars are unset, cleanup warns and skips.

---

## Adding New Tests

1. Create `tests/<feature>.spec.ts` for smoke tests and `tests/<feature>.regression.spec.ts` for CRUD tests.
2. Add a corresponding page object in `tests/pages/<Feature>Page.ts` extending `BasePage`. All locators are methods — no raw `page.locator()` calls in spec files.
3. Use `waitForLoad()` from `BasePage` after navigation — never `waitForLoadState('networkidle')`.
4. Scope locators to their container: `dialog.getByRole('button', ...)` not `page.getByRole('button', ...)`.
5. Use `exact: true` on nav link locators to avoid partial matches (e.g. "Expenses" vs other link text).
6. New navbar/sidebar controls need tests in **both** the desktop sidebar describe block and the mobile bottom-tab-bar describe block.

---

## Troubleshooting

**`Executable doesn't exist at .../ms-playwright/chromium...`**  
Browser binaries not downloaded. Run `npm run install:browsers` from the repo root.

**`Cannot navigate to invalid URL`**  
Tests were run from the repo root instead of `apps/e2e/`. The config file (and `baseURL`) is only loaded when Playwright runs from `apps/e2e/`.

**Tests time out on the `Loading…` wait**  
Supabase may be unreachable, or the deployment URL is cold-starting. Check Supabase status and confirm `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel.

**Strict mode violation: locator resolved to N elements**  
Locator is too broad. Scope to a parent container or add `.filter()`.

**`getByLabel` not finding a form element**  
The label uses implicit association (`<select>` inside `<label>`). Use `page.locator('label').filter({ hasText: 'Label Text' }).locator('select')` instead.

**`.field-error` not in red inside a modal**  
`.modal p` has higher CSS specificity than `.field-error`. The class uses `color: var(--bad) !important` to override — if you see the wrong colour, verify the class name is exactly `field-error`.

**Cleanup skipped in CI**  
Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repository secrets (same values used in Vercel).
