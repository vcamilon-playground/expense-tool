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

## Adding a New Feature

1. Add or update types in `packages/shared/src/types.ts`.
2. Add DB functions in `apps/web/src/lib/db.ts`.
3. Build the page in `apps/web/src/app/<route>/page.tsx`.
4. Update the relevant page object in `apps/e2e/tests/pages/` if selectors change.
5. Add smoke tests to the existing `<feature>.spec.ts`.
6. Add CRUD regression tests to `<feature>.regression.spec.ts` if the feature writes data, following the cleanup pattern in `tests/helpers/supabase.ts`.

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
