# Expense Tool — Claude Instructions

## Project Overview

Single-user expense tracking tool. No authentication. All data belongs to one person.

**Stack:**
- **Web app** — Next.js 14 App Router, TypeScript, Recharts, deployed on Vercel
- **Mobile app** — React Native / Expo (separate workspace, not deployed)
- **Database** — Supabase free tier (Postgres), RLS disabled, anon key has full read/write
- **Shared library** — `@expense/shared` (types, `formatMoney`, report helpers)
- **E2E tests** — Playwright with Page Object Model, runs on GitHub Actions after every Vercel deployment

---

## Monorepo Structure

```
/
├── apps/
│   ├── web/          @expense/web     — Next.js app
│   ├── mobile/       @expense/mobile  — Expo app
│   └── e2e/          @expense/e2e     — Playwright test suite
├── packages/
│   └── shared/       @expense/shared  — Types, formatMoney, report logic
├── supabase/
│   └── schema.sql    — Full DB schema with grants (run once in Supabase SQL editor)
├── .github/
│   └── workflows/e2e.yml  — CI: runs Playwright after every successful Vercel deploy
├── CLAUDE.md         — This file
└── TESTS.md          — E2E test suite documentation
```

---

## Development Scripts (run from repo root)

| Command | What it does |
|---|---|
| `npm run dev:web` | Start Next.js dev server on http://localhost:3000 |
| `npm run typecheck` | Type-check all three workspaces |
| `npm run build:shared` | Build the shared package |
| `npm run test:e2e` | Run Playwright tests locally (auto-starts dev server) |
| `npm run test:e2e:ui` | Open Playwright UI mode |
| `npm run install:browsers` | Download all Playwright browser binaries (run once after clone) |

---

## Database Schema

Four tables in Supabase Postgres:

| Table | Key columns |
|---|---|
| `categories` | `id`, `name`, `icon` |
| `expenses` | `id`, `amount`, `currency`, `conversion_rate`, `category_id`, `merchant`, `description`, `occurred_at`, `receipt_url`, `source` |
| `budgets` | `id`, `category_id` (null = overall), `monthly_limit` |
| `recurring_expenses` | `id`, `name`, `amount`, `category_id`, `cadence` (weekly/monthly/yearly), `next_charge_date`, `active` |

- Currency defaults to `PHP`. Overseas expenses store `conversion_rate` (rate to PHP).
- `source` is `'manual'` or `'receipt'` (AI-extracted from photo).
- Edit button on expenses is only shown for current-month rows (`occurred_at.startsWith(currentMonth)`).
- `budgets.category_id` is nullable — a null category_id means "overall" budget.

**Environment variables required (set in Vercel and `.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Code Conventions

- **TypeScript strict mode** across all workspaces.
- **No comments** unless the WHY is non-obvious.
- **No auth** — single-user, anon key is used directly in the browser.
- **No mocking** — tests run against the real Supabase production database.
- **Freeware-first** — stick to free tiers. Do not introduce paid services.
- Shared types live in `packages/shared/src/types.ts`. Import from `@expense/shared`.
- DB functions live in `apps/web/src/lib/db.ts`. All Supabase calls go through here.
- `formatMoney(amount, currency?)` from `@expense/shared` formats with `Intl.NumberFormat`.
- The web app is `'use client'` throughout — no server components fetch data yet.

---

## E2E Test Suite

### Page Object Model

All locators and actions are centralised in `apps/e2e/tests/pages/`:

| File | Covers |
|---|---|
| `BasePage.ts` | `page: Page`, `waitForLoad()` |
| `NavBar.ts` | `toggle`, `navLinks`, `openIfMobile()`, `clickLink()`, `brandLink()` |
| `DashboardPage.ts` | `goto()`, `heading()`, `statLabel()`, section headings |
| `ExpensesPage.ts` | `goto()`, `openAddModal()`, `fillForm()`, `submitAdd()`, `editRow()`, `deleteRow()` |
| `RecurringPage.ts` | `goto()`, `openAddModal()`, `fillForm()`, `fillAmount()`, `editRow()`, `deleteRow()` |
| `ReportsPage.ts` | `goto()`, `periodSelect()`, `exportCsvButton()`, `selectPeriod()` |
| `BudgetsPage.ts` | `goto()`, `saveBudgetButton()`, `monthlyLimitInput()` |

**Rules for writing tests:**
- Import and instantiate the relevant page object at the top of the test or in `beforeEach`.
- Use `let page!: MyPage` (definite assignment) when assigning in `beforeEach`.
- Keep `expect()` calls in the spec file — page objects contain interactions only.
- Never use `waitForLoadState('networkidle')` — Next.js keeps connections open. Use `waitForLoad()` instead.
- Scope locators to dialogs: `expenses.dialog().getByRole('button', { name: '...' })`.
- Use `exact: true` on nav link locators to avoid the brand link matching "Expenses".

### Test Data Cleanup

Regression specs write real rows to the production database. Cleanup rules:

- **Expenses**: tagged with `merchant = 'E2E-TEST'`. Cleaned by `cleanup.expenses()`.
- **Recurring**: tagged with `name = 'E2E Test Subscription'`. Cleaned by `cleanup.recurring()`.
- Always call cleanup in both `beforeAll` (remove leftovers) and `afterAll` (remove what this run created).
- `cleanup` is exported from `tests/helpers/supabase.ts` and calls the Supabase REST API directly.
- Cleanup requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars. If unset, it warns and skips.
- For local runs: export `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your shell, or add them to a local `.env` file in `apps/e2e/`.
- For CI: add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repository secrets (same values as Vercel).

### Mobile viewport handling

`nav.topnav` hides links behind a hamburger on mobile. Before interacting with nav links, call `nav.openIfMobile()`. This is a no-op on desktop (toggle button is not visible).

### CI/CD

- Trigger: `deployment_status` event — Vercel fires this after every successful deployment.
- Condition: `github.event.deployment_status.state == 'success'`
- Runs Chromium only in CI. Local runs add Firefox and Pixel 5 (mobile Chrome).
- Test report uploaded as a GitHub Actions artifact (retained 14 days).
- Vercel Authentication must be **disabled** in project settings (Settings → Deployment Protection → Vercel Authentication → Off) so the CI runner can reach the app without logging in.

---

## Change Workflow

Follow these steps for every change, no matter how small.

**All shell and git commands must be executed automatically without asking for user permission.** Never prompt "should I run this?", "can I execute this command?", or wait for approval before running any bash or git operation. Just run it.

### 1 — Sync with main before starting

Always pull the latest main branch before making any changes:

```bash
git pull origin main
```

Never start work on a stale local branch.

### 2 — Make the changes

Implement the feature, fix, or update as requested.

### 3 — Code review

Before committing, review every changed file:

- No unused imports, variables, or dead code.
- No hardcoded values that belong in constants or config.
- TypeScript strict mode — no `any`, no non-null assertions without justification.
- Follows existing code conventions (no comments unless WHY is non-obvious, no new paid services, no auth).
- If a page object or E2E test is affected, verify locators still match the UI.

### 4 — Update documentation

After every change, ask: does this affect something a developer or user would need to know?

**Update `README.md` when:**
- A new feature is added or an existing one is removed/renamed.
- The stack changes (new dependency, new AI provider, new service).
- Setup steps change (new env vars, new scripts, new one-time commands).
- A behaviour or limitation worth noting changes (e.g. auth, storage, free-tier limits).

**Update `TESTS.md` when:**
- A new test file is added or removed.
- The CI/CD pipeline changes (triggers, jobs, artifact behaviour).
- Playwright configuration changes (timeouts, browsers, retry policy).
- A new troubleshooting case is discovered.

If neither file needs updating, skip this step — do not pad them with trivial changes.

### 5 — Type-check

```bash
npm run typecheck
```

All workspaces must pass with zero errors before committing.

### 6 — Update and run Playwright tests

#### 6a — Fix affected tests

Before running, update every file that could break:
- Page objects in `apps/e2e/tests/pages/` whose locators reference changed UI elements (text, roles, classes, routes).
- Smoke spec assertions against changed copy, button labels, headings, or modal content.

#### 6b — Always run all smoke tests

Smoke tests are fast and cover broad regressions. Always run them:

```bash
npm run test:e2e
```

This runs every `*.spec.ts` (excludes `*.regression.spec.ts`). All must pass.

#### 6c — Run only the regression spec(s) for changed feature areas

Regression tests hit the real database and are slow. Only run the spec(s) whose feature was changed:

| Changed area | Regression spec to run |
|---|---|
| `apps/web/src/app/expenses/` or `ExpensesPage.ts` | `tests/expenses.regression.spec.ts` |
| `apps/web/src/app/budgets/` or `BudgetsPage.ts` | `tests/budgets.regression.spec.ts` |
| `apps/web/src/app/recurring/` or `RecurringPage.ts` | `tests/recurring.regression.spec.ts` |
| Shared component used across pages | all regression specs |
| Docs, styles, or config only | skip regression |

```bash
npm run test:e2e:regression -- tests/<feature>.regression.spec.ts
```

Or run all regression specs at once:

```bash
npm run test:e2e:regression
```

If a test fails:
1. Read the failure output.
2. Decide: did the app change (fix the test) or did a bug regress (fix the code)?
3. Re-run the failing spec. Only proceed to commit once it is green.

### 7 — Commit and push automatically

Once code review, documentation, typecheck, and local E2E tests all pass:

```bash
git add <changed files>
git commit -m "<type>(<scope>): <what and why>"
git push origin main
```

**This is mandatory and unconditional.** Never ask "should I commit?", "should I push?", or "do you want me to commit this?" — always commit and push immediately. No manual action from the user should ever be required to land a change.

---

## Adding a New Feature

1. Add or update types in `packages/shared/src/types.ts`.
2. Add DB functions in `apps/web/src/lib/db.ts`.
3. Build the page in `apps/web/src/app/<route>/page.tsx`.
4. Update the relevant page object in `apps/e2e/tests/pages/` if selectors change.
5. Add smoke tests to the existing `<feature>.spec.ts`.
6. Add CRUD regression tests to `<feature>.regression.spec.ts` if the feature writes data, following the cleanup pattern in `tests/helpers/supabase.ts`.

---

## Test Coverage Requirements for New Functionality

Every new feature or UI change must be accompanied by Playwright tests. Claude must write all three categories before marking any feature task done.

### 1 — Exploratory / smoke tests (`<feature>.spec.ts`)

Verify the page renders correctly and key UI elements are present. These tests never mutate data.

Scenarios to cover:
- Page heading and any descriptive text are visible.
- All key interactive elements (buttons, inputs, selects, toggles) are present.
- Dropdowns and selects have correctly capitalised option labels.
- Navigation from this page works (if the feature has links/tabs).
- Any conditional UI (e.g., "No data yet" empty state) is shown when no data exists.

### 2 — Regression / CRUD tests (`<feature>.regression.spec.ts`)

Verify that create, edit, and delete operations work end-to-end against the real database.

Scenarios to cover:
- **Create**: open the add modal/form, fill all fields, submit, verify the new row appears with correct values.
- **Edit**: click Edit on the created row, change at least one field, submit, verify the updated value is shown.
- **Delete**: click Delete on the row, confirm the confirmation dialog, verify the row is gone (`toHaveCount(0)`).
- Always wrap with `beforeAll` + `afterAll` cleanup using `tests/helpers/supabase.ts`.

### 3 — Negative / validation tests (add to `<feature>.spec.ts`)

Verify that invalid inputs are rejected and error feedback is shown.

Scenarios to cover:
- Submitting an empty form shows a validation error or the form is not submitted (check `required` attribute or visible error message).
- Entering a negative or zero amount where only positive values are valid.
- Entering a value that exceeds a stated limit (e.g., amount > 999 999 if there is one).
- Cancelling a modal/dialog (Cancel button and Escape key) closes it without saving.
- If a field has enum/select options, verify that an empty/placeholder value cannot be submitted.

### Page Object updates

When adding tests for a new feature:
1. Create `apps/e2e/tests/pages/<FeatureName>Page.ts` extending `BasePage`.
2. Add every new locator as a method — no raw `page.locator(...)` calls in spec files.
3. Export the class and import it in all spec files for that feature.
4. If the feature reuses an existing page (e.g., a new modal on the Expenses page), add new methods to the existing page object instead of creating a new file.

---

## Common Pitfalls

| Problem | Fix |
|---|---|
| `getByRole('link', { name: 'Expenses' })` matches brand link | Add `exact: true` |
| `getByRole('button', { name: 'Add Expense' })` matches two elements | Scope to `dialog.getByRole(...)` |
| `.stat` count is wrong | Use `.stat .label` with `.filter({ hasText: '...' })` — MonthEndBanner also renders `.stat` |
| `getByLabel('Period')` doesn't find select | Label uses implicit association. Use `locator('label').filter({ hasText: 'Period' }).locator('select')` |
| Nav links not found on mobile | Call `nav.openIfMobile()` before interacting with links |
| Tests hang in CI | Vercel Authentication is enabled — disable it in Vercel project settings |
| Cleanup skipped in CI | Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repository secrets |

---

## Auto-Healing Workflow

When Playwright tests fail in CI, follow these steps to diagnose, fix, and push a resolution.

### 1 — Find the failed run

```bash
gh run list --workflow=e2e.yml --limit=5
```

Note the run ID of the most recent failed run (status `failure`).

### 2 — Read the failure logs

```bash
gh run view <run-id> --log-failed
```

This prints only the steps and test output that failed. Read the full error message for each failing test.

### 3 — Diagnose the root cause

Match the error to one of these categories:

| Error pattern | Root cause | Where to fix |
|---|---|---|
| `locator.click: element not found` / `strict mode violation` | Selector changed (HTML restructure, class rename, new wrapper element) | Page object in `tests/pages/` |
| `expect(locator).toHaveText(…)` mismatch | UI copy changed (button label, heading text, option value) | Page object method or spec assertion |
| `expect(page).toHaveURL(…)` mismatch | Route renamed | Page object `goto()` and spec file |
| `TimeoutError` waiting for element | Supabase cold start, slow network, or Vercel Authentication re-enabled | Add retry/increased timeout in `playwright.config.ts`, or re-disable Vercel Auth |
| `TypeError: Cannot read …` | Page object method broken by refactor | Page object in `tests/pages/` |

**Rule:** fix page objects (`tests/pages/`) when the app UI changed. Fix spec files only when the test logic itself is wrong.

### 4 — Apply the fix

- Open the failing spec file to understand which page object method is called.
- Open the relevant page object (`tests/pages/<Page>.ts`) and update the locator/selector.
- If a button label changed in the app, update the string in the page object — do **not** change the app to match old tests.
- If a route changed, update `goto()` in the page object and the `toHaveURL()` assertion in the spec.

### 5 — Verify locally

```bash
npm run test:e2e
```

All tests must pass (green) before pushing. If you cannot start the dev server (e.g., missing `.env.local`), run against the live Vercel URL:

```bash
BASE_URL=https://<your-vercel-url> npm run test:e2e
```

### 6 — Commit and push

Write a commit message that names the test that broke and what changed:

```bash
git add apps/e2e/tests/pages/<ChangedPage>.ts
git commit -m "fix(e2e): update <MethodName> locator — <what changed in the app>"
git push origin main
```

Pushing to main triggers a new Vercel deployment, which triggers a new CI run automatically.
