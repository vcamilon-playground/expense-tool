# Test Automation Standards

The single source of truth for **how Playwright E2E tests are written** in this repo (naming, Page Object Model, selectors, coverage, cross-viewport, cleanup, waits, pitfalls).

- **App development standards** (TypeScript, React/Next.js, forms, CSS, data access) live in [`CODING_STANDARDS.md`](CODING_STANDARDS.md) — not here.
- **The E2E suite catalogue and how to run it** live in [`TESTS.md`](TESTS.md).
- **The `e2e-author` agent** (`.claude/agents/e2e-author.md`) follows this file; its own doc covers only its *procedure* (job split, MCP execution, validation loop, report format) and points here for the conventions.

Tests run against the **real** Supabase production database — no mocking.

---

## 1. Naming conventions

| Thing | Format | Example |
|---|---|---|
| Test file (smoke) | `feature-name.spec.ts` — lowercase, hyphenated | `login.spec.ts`, `expenses.spec.ts` |
| Test file (regression) | `feature-name.regression.spec.ts` | `expenses.regression.spec.ts` |
| Page object file | `FeaturePage.ts` — PascalCase, **one class per file** | `LoginPage.ts`, `ExpensesPage.ts` |
| Selector method | `<elementName><elementType>` — camelCase | `usernameInput`, `loginButton`, `errorBanner` |
| Page object method | `action + element/purpose` — camelCase | `enterUsername()`, `clickLoginButton()`, `getErrorMessage()` |
| Test data / util / helper | hyphenated | `user-data.ts`, `products-mock.ts` |
| Local & global variables | camelCase, descriptive; prefix globals with context | `submitError`, `globalConfig`, `testContext` |
| Constants | `UPPER_SNAKE_CASE`, immutable values only | `DEFAULT_TIMEOUT` |

**Test titles** — `describe` block is `"Feature — subsection"`; test title is present-tense declarative:

```ts
test.describe('Expenses — column sorting', () => { ... });
test('page heading shows "Expenses"', ...);
test('submitting empty form shows inline error below Amount field', ...);
```

---

## 2. Page Object Model (mandatory)

All locators and actions live in `apps/e2e/tests/pages/` — **never** put a raw `page.locator(...)` / `page.getByRole(...)` in a spec file.

```ts
// correct — locator in page object
class ExpensesPage extends BasePage {
  addButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Expense' });
  }
}

// wrong — raw locator in spec file
await page.getByRole('button', { name: '+ Add Expense' }).click();
```

- `BasePage.ts` provides `page: Page` and `waitForLoad()`. Every page object extends it and calls `this.waitForLoad()` at the end of every `goto()`.
- Existing page objects: `NavBar`, `LoginPage`, `DashboardPage`, `ExpensesPage`, `RecurringPage`, `ReportsPage`, `BudgetsPage`, `SettingsPage`, `IncomePage`, `MayaSavingsPage`, `NotificationsPage`. Read the relevant file to see existing methods before adding new ones.
- New feature → create `tests/pages/<Feature>Page.ts` extending `BasePage`; add every locator as a method; import it in the spec(s). If the feature is a modal on an existing page, **add methods to that page object** instead of a new file.

| Rule |
|---|
| Every locator is a method — no raw `page.locator()` / `page.getByRole()` in spec files. |
| Test **assertions** (`expect()` that verifies the behaviour under test) live in spec files. A page object may use `expect(locator).toBeVisible()/toBeHidden()` or `locator.waitFor()` **only as a synchronization wait** after an action (e.g. waiting for a modal to open/close) — never to assert the thing under test. |
| Use `let page!: MyPage` (definite assignment) when assigning in `beforeEach`. |
| Reuse an existing page object when a feature reuses its page (e.g. a new modal on Expenses). |

---

## 3. Selectors & locators (robust)

**`data-testid` is the PRIMARY selector strategy.** The app carries stable `data-testid` hooks (added alongside the CSS `className`s, which are kept for styling), so container/row/table/toggle locators go through `getByTestId(...)`:

```ts
expenseTable() { return this.page.getByTestId('expense-table'); }
expenseRow(merchant: string) { return this.page.getByTestId('expense-row').filter({ hasText: merchant }); }
viewToggle() { return this.page.getByTestId('view-toggle'); }
```

When you add or change a component that a spec needs to locate, **add a `data-testid` in the app code** and select on it — don't reach back to a CSS class or a positional `.first()`/`.nth()`.

**`data-testid` naming convention:** kebab-case, **area-prefixed**, and **mirror the semantic class name** where a good one exists. Examples: `expense-table`, `expense-row`, `expense-grid-card`, `view-toggle`, `modal-overlay`, `date-group`, `stat-tile`, `quick-actions`, `income-table`, `income-history-table`, `maya-schedule-table`, `recurring-table`, `reminders-table`, `budget-table`, `budget-status-table`, `sidebar-nav`, `bottom-nav-tab`, `nav-profile-menu`, `site-welcome`, `loading-screen`, `settings-save-bar`, `category-chip`, `auth-error-banner` / `auth-success-banner` / `auth-field-error`, `report-options-toggle`, `form-modal-header` / `delete-modal-header`.

**Selectors that are deliberately KEPT (do not migrate these to testids):**
- Playwright's built-in **semantic** selectors — `getByRole`, `getByLabel`, `getByText` — for buttons, links, inputs, and headings whose accessible name is stable. Use `exact: true` on nav links so `"Expenses"` doesn't match the brand link `"Expense Tool"`.
- **Semantic attribute selectors:** `input[type="number|date|search"]`, `[title*=…]`, `td[data-label=…]`.
- **`.card` containers located by their visible heading text** — e.g. `page.locator('.card').filter({ hasText: 'Budget Status' })` — then scoped further (often to a testid'd table inside).
- **`.field-error`** when scoped by a semantic parent — a dialog plus a label filter, e.g. `dialog().locator('label').filter({ hasText: 'Amount' }).locator('.field-error')`.
- **Generic layout / utility / functional primitives** — `.row`, `.muted`, `.label`, `.value`, `.pill`, `th.sortable`, `.sort-active` — but only when **scoped by a semantic or testid'd parent**, never on their own.
- Generic `.banner-*` utility classes are kept, **except on the public auth pages** (`/login`, `/register`, `/forgot-password`, `/reset-password`) where multiple banners collide — those use `auth-error-banner` / `auth-success-banner` / `auth-field-error` testids.

**Always avoid:** text-based selectors when the text is dynamic; deeply nested/brittle CSS or XPath; and **index-based locators (`.first()`, `.nth()`, `.last()`) — never use them to pick a specific element.**

- **Parameterise** locators in the page object rather than duplicating:
  ```ts
  getOptionByText(option: string) {
    return this.page.getByRole('option', { name: option, exact: true });
  }
  ```
- Scope locators inside dialogs/modals to the dialog element; combine a testid'd container with a semantic child:
  ```ts
  await expenses.dialog().getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: 'Expenses', exact: true });
  ```

---

## 4. Waits

- Use **explicit** waits — `waitForSelector`, `waitForResponse`, `waitForFunction`, `waitForLoad()` — and wait on network/page state.
- **Never** `waitForLoadState('networkidle')` (Next.js keeps connections open) — use `waitForLoad()` from `BasePage`.
- **Never** `page.waitForTimeout(...)` except while actively debugging — a fixed wait hides real flakiness.
- **Proving a negative** — asserting an event does *not* happen within a window (e.g. no refetch after a short resume) — is the one legitimate case for a single bounded wait. Keep it short and add a comment saying why.

---

## 5. Coverage requirements

Write every applicable category. **Bug fixes included** — every fix needs a test that would have **failed before** the fix and **passes after**.

**Smoke (`<feature>.spec.ts`)** — render/visibility, no data mutation:
- Page heading and descriptive text visible.
- All interactive elements (buttons, inputs, selects, toggles) present.
- Select/dropdown option labels correctly capitalised.
- Navigation from the page works.
- Conditional UI (empty states, hidden elements, mode switches) shown when expected.

**Regression (`<feature>.regression.spec.ts`)** — CRUD against the real DB:
- Create: open form, fill all fields, submit, assert the new row with correct values.
- Edit: change a field on the created row, submit, assert the update.
- Delete: confirm the dialog, assert `toHaveCount(0)`.
- Wrap with `beforeAll` + `afterAll` cleanup.

**Negative / validation (add to `<feature>.spec.ts`)**:
- Empty required field → inline error below the input.
- Negative/zero amount where only positive is valid → inline error.
- Over-limit value → appropriate error.
- Cancel (button and Escape) closes the modal without saving.
- Empty/placeholder select value cannot be submitted.

**Deciding smoke vs regression:**

| Scenario | Where |
|---|---|
| Element visible/hidden, class toggled, text content | Smoke |
| Navigation, URL change, page heading | Smoke |
| localStorage / session behaviour | Smoke |
| Create / edit / delete against real DB | Regression |

**Required tests by change type:**

| Change type | Required tests |
|---|---|
| New page / route | Smoke: heading, key elements visible, navigation works |
| New form | Smoke: required-field errors show inline; regression: create/edit/delete |
| New button or toggle | Smoke: visible in correct state; hidden in incorrect state |
| New sidebar/nav control | Smoke in **both** desktop and mobile describe blocks (see §8) |
| Bug fix | A test that would have failed before the fix and passes after |

---

## 6. Structure & best practices

- **Atomic tests:** one behaviour per test; don't combine validations — split into separate cases. Each test runs independently.
- **Seed/reset data via API, not UI:** use the Supabase helpers (`tests/helpers/supabase.ts` — `seed.*` / `cleanup.*`) to set up and tear down state instead of clicking through the UI. Only exercise the actual action **under test** through the UI.
- **Avoid redundant UI steps:** don't repeat a UI flow just to reach a precondition — reach it via the seed helpers.
- **Setup & teardown:** use `beforeAll`/`beforeEach`/`afterEach`/`afterAll` for a clean state per test; teardown must clear the rows the test created (see §7).
- **Soft assertions:** for a scenario checking several independent things, prefer `expect.soft(...)` so one failure doesn't hide the rest — but a genuinely blocking precondition still hard-asserts.
- **Keep assertions in specs:** all test `expect()` live in the spec. Page objects expose actions/getters; the only `expect()` permitted inside them is a **non-assertion synchronization wait** (e.g. `await expect(this.dialog()).toBeVisible()` to wait for a modal), never a behavioural assertion.
- **Simplify method signatures:** ≤ 3 parameters; group related values into an object/interface (`fillExpense({ amount, category, date })`).
- **Method documentation:** JSDoc every page-object method — purpose, `@param`s, return:
  ```ts
  /**
   * Logs in a user with the provided credentials.
   * @param username - account username
   * @param password - account password
   */
  async login(username: string, password: string): Promise<void> { /* ... */ }
  ```

---

## 7. Test data & cleanup (regression specs)

Regression specs write real rows to the production DB. Tag data so cleanup helpers (`tests/helpers/supabase.ts`) can find it; call cleanup in **both** `beforeAll` (clear stale leftovers from an aborted run) and `afterAll` (clear what this run created):

```ts
test.beforeAll(async () => { await cleanup.expenses(); });
test.afterAll(async () => { await cleanup.expenses(); });
```

| Data | Tag | Helper |
|---|---|---|
| Expenses | `merchant = 'E2E-TEST'` | `cleanup.expenses()` |
| Recurring | `name = 'E2E Test Subscription'` | `cleanup.recurring()` |
| Income sources | `name` starts `E2E` | `cleanup.incomeSources()` · seed via `seed.incomeSource(name, balance)` |
| Reminders | `title` starts `E2E` | `cleanup.reminders()` · seed via `seed.reminder(title, cadence, remind_date)` |

- **Never delete rows by ID** — use the tag-based cleanup helpers.
- Cleanup needs `SUPABASE_URL` and `SUPABASE_ANON_KEY` (export in shell or `apps/e2e/.env`; warns and skips if unset).

---

## 8. Cross-viewport coverage (navbar / sidebar changes)

The layout differs by viewport:
- **Desktop (>640px):** fixed left sidebar `nav.sidenav` (profile card; nav links Home/Income/Expenses/Recurring/Budgets/Reports/Settings; Switch User / Log Out). Greeting, theme pill, notification bell live in `.site-header`.
- **Mobile (≤640px):** sidebar hidden; fixed `.bottom-nav` with 6 tabs (Home, Income, Expenses, Budgets, Recurring, Reports). Profile popup opens by tapping `.header-avatar` (mobile-only), which fires an `open-profile-menu` event.

Any added/removed/restyled nav control needs a test in **both** the desktop describe block (`Navigation — desktop sidebar` / `Navigation — logout / switch-user (desktop)`, default 1280px) **and** the mobile block (`Navigation — mobile bottom tab bar`, `test.use({ viewport: { width: 390, height: 844 } })`) — asserting visible where it should appear and not-visible where the media query hides it.

```ts
// mobile override inside its own describe block
test.describe('...mobile...', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('settings link is visible in the bottom tab bar', ...);
});
```

---

## 9. Visibility vs color

`toBeVisible()` passes when an element exists and is not `display:none` — it does **not** check CSS color. White text on a white background still passes `toBeVisible()`. When a bug could be matching fg/bg color, assert the computed style:

```ts
const color = await locator.evaluate(el => window.getComputedStyle(el).color);
expect(color).not.toMatch(/^rgba?\(255,\s*255,\s*255/); // not white-on-white
```

---

## 10. Errors & logging

- Descriptive assertion messages with element name and expected vs actual: `expect(errorText, 'Login error message mismatch').toBe('Invalid login')`.
- Consistent, prefixed logs for traceability: `console.log('[LoginPage] attempting login…')`. Catch and log exceptions gracefully where it aids debugging.

---

## 11. Common locator pitfalls (repo-specific)

| Problem | Fix |
|---|---|
| `getByRole('link', { name: 'Expenses' })` matches multiple | `exact: true` + scope to `NavBar.link()` |
| `getByRole('button', { name: 'Add Expense' })` matches two | Scope to `dialog.getByRole(...)` |
| Stat tile count wrong | `getByTestId('stat-tile')` then `.locator('.label').filter({ hasText })` — MonthEndBanner renders `.stat` but has no `stat-tile` testid, so the testid disambiguates |
| `getByLabel('Period')` finds nothing | `locator('label').filter({ hasText: 'Period' }).locator('select')` |
| Nav links missing on mobile | Sidebar hidden — use `NavBar.bottomTab(label)` |
| Profile avatar missing on mobile | In the bottom tab's Profile tab (`.bottom-nav-avatar`) |
| `toBeVisible()` passes but element invisible (fg=bg) | Assert `getComputedStyle(el).color` ≠ background |
| `.field-error` wrong color in modal | `.modal p` wins specificity — `.field-error` uses `color: var(--bad) !important` |
| Desktop control missing on mobile (or vice versa) | Needs a test in both viewport describe blocks |
| `page.goto` "Cannot navigate to invalid URL" | Run from `apps/e2e/` — `baseURL` only set when the config loads |

---

## 12. What not to do

| Don't | Do instead |
|---|---|
| `test.skip()` a failing test | Fix the feature or the locator |
| Weaken an assertion (`toBeVisible` instead of `toHaveText`) to make it pass | Fix what broke |
| `page.waitForTimeout(2000)` | Find the right locator/event to wait for |
| Put a **behavioural** `expect()` (the thing under test) inside a page object | Keep test assertions in the spec; page objects may only `expect(...).toBeVisible()/toBeHidden()` as a sync-wait |
| Assert `toBeVisible()` on colored text | Use `evaluate(el => getComputedStyle(el).color)` |
| Delete rows by ID in cleanup | Use the tag-based cleanup helpers |
