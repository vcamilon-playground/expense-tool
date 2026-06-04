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
| `tests/navigation.spec.ts` | Smoke | Nav links, active state, brand link, sidebar collapse, mobile hamburger, profile menu, logout/switch-user modals |
| `tests/dashboard.spec.ts` | Smoke | Page heading, four KPI stat cards, Budget Status, Category Chart, 6-month Trend, Upcoming Charges sections |
| `tests/expenses.spec.ts` | Smoke | Page load, Add Expense modal, required fields, inline validation errors, search/filter, delete modal, month group collapse, column sorting |
| `tests/recurring.spec.ts` | Smoke | Page load, Add Recurring modal, required fields, inline validation errors, payment confirmation flow, delete modal, column sorting |
| `tests/reports.spec.ts` | Smoke | Page load, period select, preset/date-range mode toggle, compare period, column sorting |
| `tests/budgets.spec.ts` | Smoke | Page load, form labels, edit/cancel flow, inline validation errors, column sorting |
| `tests/settings.spec.ts` | Smoke | Session expiry, profile section, global save/cancel, navigation guard, change password, theme colours, categories, past-edit toggle, profile menu |
| `tests/expenses.regression.spec.ts` | Regression | Create/edit/delete expense; past-month lock with allow-past-edit off and on |
| `tests/budgets.regression.spec.ts` | Regression | Edit overall budget and verify updated limit |
| `tests/recurring.regression.spec.ts` | Regression | Create/edit/delete recurring expense; confirm YES adds expense + advances date; confirm NO advances date without adding expense |
| `tests/settings.regression.spec.ts` | Regression | Add category with custom icon; add category without icon uses default; deleting category does not delete linked expenses |

---

## Test Catalogue

### `auth.spec.ts` — Login & Register

**Login page**
- redirects to /login when not authenticated
- login page renders all required elements *(heading, username, password, sign-in button, register link)*
- invalid credentials show an error

**Register page**
- register page renders all required elements *(heading, first/last name, username, create account button, sign-in link)*

**Auth — authenticated access**
- dashboard is accessible when logged in

---

### `navigation.spec.ts` — Navigation

**Navigation**
- brand link navigates to dashboard
- nav links navigate to correct pages
- active nav link is highlighted on expenses page
- active nav link is highlighted on reports page
- footer is visible on all pages
- user info block is visible in sidebar

**Navigation — logout/switch-user modals**
- profile menu opens when avatar is clicked
- profile menu closes when clicking outside
- profile menu contains Settings, Switch User, Log Out
- logout button opens confirmation modal
- switch user button opens confirmation modal
- logout modal cancel button closes it without logging out
- switch user modal cancel button closes it
- clicking overlay backdrop closes logout modal

**Navigation — sidebar collapse**
- collapse button is visible on desktop
- clicking collapse adds collapsed class to sidebar
- nav labels are hidden when collapsed
- expand button restores the sidebar
- nav links still navigate in collapsed mode
- brand text is visible when expanded
- brand text is hidden when collapsed
- collapse state persists across page navigations
- theme toggle is visible in expanded sidebar
- theme toggle is visible in collapsed sidebar

**Navigation — mobile hamburger**
- theme toggle is visible in mobile top bar
- hamburger toggle opens and closes the nav menu
- clicking a nav link in mobile menu closes it
- nav link text is readable when mobile menu is open
- collapse button is not visible on mobile
- all nav links are accessible from mobile hamburger menu
- profile avatar is not visible in mobile top bar
- profile entry is visible in hamburger dropdown
- profile entry shows user name and handle in hamburger dropdown
- logout button is visible after opening profile menu on mobile
- switch user button is visible after opening profile menu on mobile

---

### `dashboard.spec.ts` — Dashboard

**Dashboard**
- page title is correct
- all page sections render correctly *(h1, 4 KPI cards, Budget Status, Category Chart, 6-Month Trend, Upcoming Charges)*
- month-end reminder banner is conditional on days remaining in month

**Dashboard — Upcoming Charges column sorting**
- sortable headers present and Due Date toggles direction

---

### `expenses.spec.ts` — Expenses

**Expenses page**
- page renders with heading and add button
- search and filter controls are present
- clicking Add Expense opens the modal with correct heading
- required fields have required attribute in modal
- modal closes on Cancel, Escape, and backdrop click
- submitting empty form keeps modal open and shows inline errors
- submitting with negative amount keeps modal open and shows inline error
- typing in search filters to no results message when nothing matches
- clearing search restores the expense list

**Expenses — delete confirmation modal**
- delete modal renders with correct content and buttons *(heading, message, Yes/No/X buttons)*
- X button closes the modal without deleting the record
- No, keep it button closes the modal without deleting the record
- clicking the backdrop closes the modal without deleting the record

**Expenses — month group collapse behaviour**
- current month group is expanded by default
- past month groups are collapsed by default
- clicking a collapsed month header expands it
- clicking an expanded month header collapses it

**Expenses — column sorting**
- Date, Category, Merchant and Amount headers are sortable
- Amount sort activates and toggles direction
- clicking a different header moves the active indicator

---

### `recurring.spec.ts` — Recurring Expenses

**Recurring Expenses page**
- page renders with heading, description and add button
- modal form has required fields and capitalized cadence options
- modal closes on Cancel and Escape key
- submitting without name keeps modal open and shows inline error
- submitting with zero amount shows inline error below amount field

**Recurring Expenses — payment confirmation flow**
- due badge is visible on an item whose charge date has arrived
- Confirm Payment button is visible for a due item
- clicking Confirm Payment opens confirmation modal with item details
- confirmation modal closes on X button without advancing the date
- clicking No opens reminder modal with OK button
- reminder modal does not close on backdrop click
- reminder modal does not close on Escape key

**Recurring Expenses — delete confirmation modal**
- delete modal renders with correct content and buttons *(heading, message, Yes/No/X buttons)*
- X button closes the modal without deleting the record
- No, keep it button closes the modal without deleting the record

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
- Total is active by default and clicking Category moves the indicator
- clicking Total twice toggles sort direction

---

### `budgets.spec.ts` — Budgets

**Budgets page**
- page renders with heading, form, and budget sections *(description, Category label, Monthly Limit input, Save Budget button, Current Budgets heading)*
- each budget row has Edit and Delete buttons
- edit mode populates form, disables category, and Cancel restores default state
- invalid Monthly Limit values show inline error *(empty and negative)*

**Budgets — column sorting**
- Category and Monthly Limit headers are sortable
- Monthly Limit sort activates and toggles direction

---

### `settings.spec.ts` — Settings

**Settings — Session Expiry section**
- all timeout options are present and Never is selected by default
- selecting an option checks it and switching back to Never unchecks it
- selected timeout persists across page reload after saving

**Settings — Profile section**
- profile section renders with heading and pre-filled name inputs

**Settings — global save / cancel**
- unsaved changes bar is hidden on load
- editing first name shows the unsaved changes bar
- Cancel reverts the first name to its original value
- changing session timeout shows unsaved bar
- changing theme color shows unsaved bar

**Settings — navigation guard**
- navigating away with unsaved changes shows the guard modal
- "Stay on page" closes modal and keeps user on settings with changes intact
- "Leave without saving" navigates away and discards changes

**Settings — Change Password section**
- change password section renders with heading and button
- submitting with wrong current password shows error

**Settings page**
- page renders with heading, theme section, swatches, and light mode note *(all 6 swatches, no dark mode banner)*
- Default swatch is active on first visit
- clicking a color swatch marks it as active
- dark mode shows warning banner instead of note

**Settings — Categories section**
- categories section renders with form inputs and existing entries *(heading, Add button, name/icon inputs, Groceries, Dining, Delete button)*
- submitting with empty name keeps the list unchanged

**Settings — past expense editing toggle**
- expense editing section renders with toggle off and note hidden
- checking the toggle shows the enabled note and unchecking hides it
- toggle persists across page reload after saving

**Settings — profile menu access (desktop)**
- avatar is visible in sidebar and opens profile menu with Settings link
- profile menu trigger remains visible in collapsed sidebar

**Settings — profile menu access (mobile)**
- profile menu trigger is visible in hamburger dropdown on mobile
- clicking avatar on mobile opens profile menu and Settings navigates to /settings

---

### `expenses.regression.spec.ts` — Expenses CRUD

**Expenses — CRUD regression**
- create, edit, and delete a current-month expense

**Expenses — past-month lock (allow-past-edit disabled)**
- past-month expense shows lock icon and no Edit or Delete buttons

**Expenses — past-month lock (allow-past-edit enabled)**
- past-month expense shows Edit and Delete when allow-past-edit is on

---

### `budgets.regression.spec.ts` — Budgets CRUD

**Budgets — edit regression**
- edit overall budget updates the displayed limit

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

**Trigger:** `deployment_status` event — Vercel fires this after every successful deployment.  
**Condition:** `github.event.deployment_status.state == 'success'`

Two jobs run **in parallel**:

| Job | Specs | Timeout | Artifact |
|---|---|---|---|
| `e2e-smoke` | All non-regression specs (`SMOKE_ONLY=1`) | 15 min | `playwright-report-smoke-<run_id>` |
| `e2e-regression` | All `*.regression.spec.ts` files | 20 min | `playwright-report-regression-<run_id>` |

To view results after a deployment:
1. Go to the repo → **Actions** tab → find the **E2E Tests** workflow run.
2. Each job shows pass/fail independently.
3. Download the `playwright-report-smoke-*` or `playwright-report-regression-*` artifact for the full HTML report with traces and screenshots.

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
5. Use `exact: true` on nav link locators to avoid matching the brand link.
6. New navbar/sidebar controls need tests in **both** the desktop describe block and the mobile hamburger describe block.

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
