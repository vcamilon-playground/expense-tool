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
| `expect()` calls belong in spec files, not page objects. Page objects contain **actions and getters only**. |
| Use `let page!: MyPage` (definite assignment) when assigning in `beforeEach`. |
| Reuse an existing page object when a feature reuses its page (e.g. a new modal on Expenses). |

---

## 3. Selectors & locators (robust)

- Prefer `data-testid` / `data-test` attributes and Playwright's built-in **semantic/role** selectors. **Reconciliation with this repo:** the app currently has few/no `data-testid`s, so today's specs lean on role/label selectors — that's acceptable (they're the sanctioned semantic selectors). When you add or change a component and a stable hook would remove ambiguity, **add a `data-testid` in the app code** and use it.
- Avoid text-based selectors unless the text is static; avoid deeply nested/brittle CSS or XPath; **never use index-based locators**.
- **Parameterise** locators in the page object rather than duplicating:
  ```ts
  getOptionByText(option: string) {
    return this.page.getByRole('option', { name: option, exact: true });
  }
  ```
- Scope locators inside dialogs/modals to the dialog element; use `exact: true` on nav links so `"Expenses"` doesn't match the brand link `"Expense Tool"`:
  ```ts
  await expenses.dialog().getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: 'Expenses', exact: true });
  ```

---

## 4. Waits

- Use **explicit** waits — `waitForSelector`, `waitForResponse`, `waitForFunction`, `waitForLoad()` — and wait on network/page state.
- **Never** `waitForLoadState('networkidle')` (Next.js keeps connections open) — use `waitForLoad()` from `BasePage`.
- **Never** `page.waitForTimeout(...)` except while actively debugging — a fixed wait hides real flakiness.

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
- **Keep assertions in specs:** page objects expose actions/getters only; all `expect()` live in the spec.
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
| `.stat` count wrong | Use `.stat .label` with `.filter({ hasText })` — MonthEndBanner also renders `.stat` |
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
| Put `expect()` inside a page object | Keep assertions in the spec file |
| Assert `toBeVisible()` on colored text | Use `evaluate(el => getComputedStyle(el).color)` |
| Delete rows by ID in cleanup | Use the tag-based cleanup helpers |
