# Expense Tool — Claude Instructions

## Project Overview

Multi-user expense tracking tool with custom authentication. Each user's data is fully isolated. No Supabase Auth — a custom `users` table with bcrypt-hashed passwords and JWT session cookies is used instead.

**Stack:**
- **Web app** — Next.js 14 App Router, TypeScript, Recharts, deployed on Vercel. Installable as a **PWA** (web manifest at `src/app/manifest.ts`, maskable `public/icon.svg`, iOS icon via `src/app/apple-icon.tsx`, service worker `public/sw.js` registered by `ServiceWorkerRegister`). The SW is network-first and never caches `/api/*` or Supabase; PWA appearance/theme-color/safe-area live in `layout.tsx` `metadata`/`viewport` exports.
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
│   │   └── src/
│   │       ├── app/                  — Next.js pages (one directory per route)
│   │       ├── components/           — Shared UI components
│   │       ├── contexts/             — React context providers (AuthContext, NavigationGuardContext)
│   │       └── lib/                  — DB access, auth helpers, AI providers, utilities
│   ├── mobile/       @expense/mobile  — Expo app
│   └── e2e/          @expense/e2e     — Playwright test suite
├── packages/
│   └── shared/       @expense/shared  — Types, formatMoney, report logic
├── supabase/
│   └── schema.sql    — Full DB schema with grants (run once in Supabase SQL editor)
├── .github/
│   └── workflows/e2e.yml  — CI: runs Playwright after every successful Vercel deploy
├── CLAUDE.md             — This file
├── CODING_STANDARDS.md   — Naming, TypeScript, form, CSS, and test conventions
└── TESTS.md              — E2E test suite documentation
```

---

## Development Scripts (run from repo root)

| Command | What it does |
|---|---|
| `npm run dev:web` | Start Next.js dev server on http://localhost:3000 |
| `npm run typecheck` | Type-check all three workspaces |
| `npm run build:shared` | Build the shared package |
| `npm run test:unit` | Run Vitest unit tests (packages/shared logic, ~400 ms) |
| `npm run test:e2e` | Run full Playwright smoke suite locally (auto-starts dev server) |
| `npm run test:e2e:ui` | Open Playwright UI mode |
| `npm run test:dashboard` | Generate `apps/e2e/test-dashboard.html` from the last test run — open in any browser |
| `npm run install:browsers` | Download all Playwright browser binaries (run once after clone) |

---

## Database Schema

Five tables in Supabase Postgres:

| Table | Key columns |
|---|---|
| `users` | `id`, `username`, `first_name`, `last_name`, `password_hash`, `avatar_url`, `birth_date` |
| `categories` | `id`, `user_id`, `name`, `icon`, `active` |
| `expenses` | `id`, `user_id`, `amount`, `currency`, `conversion_rate`, `category_id`, `merchant`, `description`, `occurred_at`, `receipt_url`, `source` |
| `budgets` | `id`, `user_id`, `category_id` (null = overall), `monthly_limit` |
| `recurring_expenses` | `id`, `user_id`, `name`, `amount`, `category_id`, `cadence` (weekly/monthly/yearly), `next_charge_date`, `active` |
| `income_sources` | `id`, `user_id`, `type` (bank/ewallet/cash), `name` (null for cash), `balance` |
| `reminders` | `id`, `user_id`, `title`, `remind_date`, `cadence` (once/weekly/monthly/yearly), `active` |

- Every table except `users` has a `user_id` FK. All DB functions in `lib/db.ts` accept `userId: string` and filter by it — RLS is disabled, isolation is enforced in application code.
- Currency defaults to `PHP`. Overseas expenses store `conversion_rate` (rate to PHP).
- `source` is `'manual'`, `'receipt'` (AI-extracted from photo), or `'recurring'` (auto-created by the daily cron).
- `income_sources.type` is `'bank'`, `'ewallet'`, or `'cash'`. Only one `cash` entry is allowed per user (enforced in app code). When an expense is **created** (not edited), the user may optionally select an income source to deduct from; `deductFromIncomeSource` is called immediately after `createExpense`. No restoration occurs on edit or delete. `transferIncome(fromId, toId, amount)` moves money between two sources (deduct + add).
- `reminders` power the user-created notifications on the `/notifications` page. `cadence` is `'once'` (deleted when marked Done) or `'weekly'`/`'monthly'`/`'yearly'` (`remind_date` advances via `advanceDate` when marked Done). `computeNotifications(recurring, reminders, today, incomeReminderDismissed)` in `lib/notifications.ts` is pure and emits a notification for any active reminder whose `remind_date <= today`.
- Edit button on expenses is shown for current-month rows by default. If the user enables "Allow past expense editing" in Settings (`localStorage` key `allow-past-edit`), edit is shown on all rows.
- `budgets.category_id` is nullable — a null category_id means "overall" budget.

**Environment variables required (set in Vercel and `apps/web/.env.local`):**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
AUTH_SECRET=            # JWT signing secret — min 32 chars, generate with: openssl rand -base64 32
AI_PROVIDER=gemini      # or "anthropic"
GOOGLE_API_KEY=         # required when AI_PROVIDER=gemini (free tier)
ANTHROPIC_API_KEY=      # required when AI_PROVIDER=anthropic (paid)
```

---

## Code Conventions

> **Full coding standards are documented in [`CODING_STANDARDS.md`](CODING_STANDARDS.md).** This section summarises the most critical rules. When in doubt, read CODING_STANDARDS.md first.

- **TypeScript strict mode** across all workspaces — no `any`, no `!` assertions, no `as T` casts without justification.
- **No comments** unless the WHY is non-obvious. Never describe what the code does.
- **Custom auth** — `AuthContext` provides `user` to all pages. Every page reads `const { user } = useAuth()` and returns early if null. Passwords are bcrypt-hashed server-side; sessions are JWT cookies (30-day expiry).
- **No mocking** — tests run against the real Supabase production database.
- **Freeware-first** — stick to free tiers. Do not introduce paid services.
- Shared types live in `packages/shared/src/types.ts`. Import from `@expense/shared`, never by relative path.
- DB functions live in `apps/web/src/lib/db.ts`. Every function accepts `userId: string`. All Supabase calls go through here — never call `supabase` directly in components or pages.
- `formatMoney(amount, currency?)` from `@expense/shared` formats with `Intl.NumberFormat`.
- The web app is `'use client'` throughout — no server components fetch data.

### Form pattern (mandatory)

Every form with custom JS validation must follow this pattern:

```tsx
// 1. noValidate disables browser tooltips so JS validation always fires
<form onSubmit={handleSubmit} noValidate>

// 2. Per-field error state object (not a single string)
const [fieldErrors, setFieldErrors] = useState<{ amount?: string; date?: string }>({});

// 3. Clear field error on change
onChange={(e) => { setValue(e.target.value); setFieldErrors((p) => ({ ...p, amount: undefined })); }}

// 4. Show error inline below the input using the .field-error class
{fieldErrors.amount && <p className="field-error">{fieldErrors.amount}</p>}
```

- Load/fetch errors → `loadError` / `setLoadError` state, rendered as a page-level banner.
- API/submit errors → `submitError` / `setSubmitError` state, rendered below the submit button.
- Never use abbreviated state names (`err`, `val`, `res`). See naming rules in CODING_STANDARDS.md.

### CSS convention

Never hardcode color values in JSX `style` props. Always use CSS variables:

```tsx
// correct
<p className="field-error">{error}</p>

// wrong
<p style={{ color: '#c0392b' }}>{error}</p>
```

Key variables: `var(--bad)` for errors, `var(--muted)` for secondary text, `var(--text)` for primary, `var(--accent)` for themed actions.

---

## E2E Test Suite

### Page Object Model

All locators and actions are centralised in `apps/e2e/tests/pages/`:

| File | Covers |
|---|---|
| `BasePage.ts` | `page: Page`, `waitForLoad()` |
| `NavBar.ts` | Desktop sidebar: `nav()`, `link()` (scoped to "Sidebar navigation"), `profileCard()`, `userName()`, `userHandle()`, `sidebarSwitchUserButton()`, `sidebarLogoutButton()`. Mobile: `bottomNav()`, `bottomTab()`, `headerAvatar()`, `openMobileProfileMenu()`, `profileMenu()`, `settingsMenuItem()`/`switchUserMenuItem()`/`logoutMenuItem()`. Shared: `logoutModal()`, `switchUserModal()`, `footer()`. Site header: `greeting()`, `themePill()`, `themePillButton()`, `notifBell()`, `notifBadge()` |
| `LoginPage.ts` | `goto()`, `usernameInput()`, `passwordInput()`, `submitButton()` |
| `DashboardPage.ts` | `goto()`, `heading()`, `statLabel()`, section headings |
| `ExpensesPage.ts` | `goto()`, `openAddModal()`, `fillForm()`, `submitAdd()`, `editRow()`, `deleteRow()`; List/Calendar: `viewToggle()`, `listViewButton()`, `calendarViewButton()`, `calendarGrid()`, `calendarMonthLabel()`, `calendarPrevButton()`, `calendarNextButton()` |
| `RecurringPage.ts` | `goto()`, `openAddModal()`, `fillForm()`, `fillAmount()`, `editRow()`, `deleteRow()`, `dueBadge()`, `confirmPaymentButton()`, `confirmModal()`, `confirmYesButton()`, `confirmNoButton()`, `reminderModal()`, `reminderOkButton()`, `payEarlyButton()`, `earlyPayModal()`, `earlyPayConfirmButton()`, `earlyPayCancelButton()` |
| `ReportsPage.ts` | `goto()`, `periodSelect()`, `exportCsvButton()`, `selectPeriod()` |
| `BudgetsPage.ts` | `goto()`, `addBudgetButton()`, `openAddModal()`, `dialog()`, `saveBudgetButton()`, `monthlyLimitInput()`, `categorySelect()` — add/edit is a modal |
| `SettingsPage.ts` | `goto()`, `heading()`, `firstNameInput()`, `lastNameInput()` (label-scoped), `avatarUrlInput()`, `saveChangesButton()`, `cancelChangesButton()`, `unsavedBar()`, `sessionTimeoutRadio()`, `colorSwatch()`, `pastEditToggle()`, `changePasswordHeading()`, `updatePasswordButton()`, `navGuardModal()` |
| `IncomePage.ts` | `goto()`, `addSourceButton()`, `openAddModal()`, `typeSelect()`, `nameInput()`, `balanceInput()`, `addBankSource()`, `row()`, `editButton()`, `deleteRow()`, `privacyToggle()`, `summaryValue()`, `openTransfer()`, `transferFromSelect()`, `transferToSelect()`, `transferAmountInput()`, `transferSubmit()` |
| `NotificationsPage.ts` | `goto()`, `addReminderButton()`, `openForm()`, `titleInput()`, `repeatSelect()`, `dateInput()`, `addReminder()`, `yourRemindersHeading()`, `reminderRow()`, `deleteReminderButton()`, `doneButton()` |

**Rules for writing tests:**
- Import and instantiate the relevant page object at the top of the test or in `beforeEach`.
- Use `let page!: MyPage` (definite assignment) when assigning in `beforeEach`.
- Keep `expect()` calls in the spec file — page objects contain interactions only.
- Never use `waitForLoadState('networkidle')` — Next.js keeps connections open. Use `waitForLoad()` instead.
- Scope locators to dialogs: `expenses.dialog().getByRole('button', { name: '...' })`.
- Use `exact: true` on nav link locators to avoid partial matches (e.g. "Expenses" vs other link text); scope to the "Sidebar navigation" nav via `NavBar.link()`.
- **`toBeVisible()` is blind to CSS color and contrast.** An element with white text on a white background passes `toBeVisible()` because it is DOM-visible. When the bug could be a color or contrast issue (text on a colored background, elements hidden by matching fg/bg), use `evaluate()` to read the computed style instead:
  ```ts
  const color = await locator.evaluate(el => window.getComputedStyle(el).color);
  expect(color).not.toMatch(/^rgba?\(255,\s*255,\s*255/); // not white
  ```

### Test Data Cleanup

Regression specs write real rows to the production database. Cleanup rules:

- **Expenses**: tagged with `merchant = 'E2E-TEST'`. Cleaned by `cleanup.expenses()`.
- **Recurring**: tagged with `name = 'E2E Test Subscription'`. Cleaned by `cleanup.recurring()`.
- **Income sources**: tagged with a `name` starting `E2E` (e.g. `E2E Alpha Bank`). Cleaned by `cleanup.incomeSources()`; seed via `seed.incomeSource(name, balance)`.
- **Reminders**: tagged with a `title` starting `E2E` (e.g. `E2E Test Reminder`). Cleaned by `cleanup.reminders()`; seed via `seed.reminder(title, cadence, remind_date)`.
- Always call cleanup in both `beforeAll` (remove leftovers) and `afterAll` (remove what this run created).
- `cleanup` is exported from `tests/helpers/supabase.ts` and calls the Supabase REST API directly.
- Cleanup requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars. If unset, it warns and skips.
- For local runs: export `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your shell, or add them to a local `.env` file in `apps/e2e/`.
- For CI: add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repository secrets (same values as Vercel).

### Mobile viewport handling

**On desktop (>640px):** `nav.sidenav` is a fixed left sidebar with a **profile card at the top** (avatar + name + handle), the nav links (Home, Income, Expenses, Recurring, Budgets, Reports, Settings), and **Switch User / Log Out** buttons at the bottom. There is no popup on desktop — Settings is a direct link. The greeting, theme pill, and notification bell live in the **site header** (`.site-header`) above the page content, not in the sidebar.

**On mobile (≤640px):** The sidebar is hidden (`display: none`). A fixed **bottom tab bar** (`.bottom-nav`) is shown instead with **6 tabs** (no FAB): Home, Income, Expenses, Budgets, Recurring, Reports.
- The profile popup is opened by tapping the **avatar in the site header** (`.header-avatar`, mobile-only), which dispatches an `open-profile-menu` event the NavBar listens for. The popup contains Settings, Switch User, Log Out.
- The hamburger toggle (`.nav-toggle`) is still in the DOM but hidden by CSS on both desktop and mobile (legacy, unused).

**Cross-viewport coverage rule:** Whenever a navbar or sidebar element is added, removed, or restyled, tests must cover **both** viewports:
- Desktop tests live in the `Navigation — desktop sidebar` and `Navigation — logout / switch-user (desktop)` describe blocks (no `test.use` override → default 1280px).
- Mobile tests live in the `Navigation — mobile bottom tab bar` describe block (`test.use({ viewport: { width: 390, height: 844 } })`).

For every new control in the sidebar, ask two questions:
1. Is there a desktop test asserting it is **visible**?
2. Is there a mobile test asserting it is **visible** (if it should appear on mobile) or **not visible** (if it is intentionally hidden by the mobile media query)?

Failure to answer both questions is what allows a feature that works on desktop to silently disappear on mobile (or vice versa).

### CI/CD

- Triggers:
  - `deployment_status` event — Vercel fires this after every successful deployment (condition: `github.event.deployment_status.state == 'success'`). Both jobs run against `deployment_status.target_url`.
  - `workflow_dispatch` — manual run from the Actions tab (or `gh workflow run e2e.yml -f suite=<both|smoke|regression> -f base_url=<url>`). Inputs: `base_url` (defaults to the production alias `https://expense-tool-web.vercel.app`) and `suite` (`both`/`smoke`/`regression` — only the selected job runs).
- Two jobs run **in parallel** on every deployment (manual dispatch runs only the selected suite):
  - `e2e-smoke` — smoke specs only (`SMOKE_ONLY=1`), 15-minute timeout.
  - `e2e-regression` — all `*.regression.spec.ts` files, 20-minute timeout.
- Both jobs run Chromium only. Local runs add Firefox and Pixel 5 (mobile Chrome).
- Reports uploaded as separate artifacts (`playwright-report-smoke-*`, `playwright-report-regression-*`), retained 14 days.
- There is no automated autoheal job. When tests fail, use the `playwright-test-healer` agent (shipped with the Playwright MCP package) to diagnose and fix failures interactively.
- Vercel Authentication must be **disabled** in project settings (Settings → Deployment Protection → Vercel Authentication → Off) so the CI runner can reach the app without logging in.
- Required GitHub secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `E2E_USERNAME`, `E2E_PASSWORD`. Note: `AUTH_SECRET` is a Vercel server secret — the test runner does not need it.

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

Before committing, review every changed file against these rules. For the full standards, read `CODING_STANDARDS.md`.

- No unused imports, variables, or dead code.
- No hardcoded values that belong in constants or config.
- No hardcoded color values — use CSS variables (`var(--bad)`, `var(--muted)`, etc.).
- TypeScript strict mode — no `any`, no `!` non-null assertions, no `as T` casts without justification.
- State variables follow naming conventions: `loadError`, `submitError`, `fieldErrors` — never `err`, `val`, `res`.
- Forms with JS validation have `noValidate`. Validation errors use `<p className="field-error">` inline below the input.
- All Supabase calls go through `lib/db.ts`. Every DB function takes `userId: string`.
- Follows existing code conventions (no comments unless WHY is non-obvious, no new paid services).
- If a page object or E2E test is affected, verify locators still match the UI.

### 4 — Review and update all documentation files

**This step is mandatory after every change.** Read each file below and decide whether it needs updating. Do not rely on memory — open the file and check its current content against what was just changed.

```
README.md
TESTS.md
CODING_STANDARDS.md
CLAUDE.md   ← this file
```

For each file, ask: "Does anything in this file contradict, omit, or misrepresent what was just changed?" If yes, update it before committing. If no, leave it alone — do not pad files with trivial changes.

**`README.md` — update when:**
- A new feature is added or an existing one is removed/renamed.
- The stack changes (new dependency, new AI provider, new service).
- Setup steps change (new env vars, new scripts, new one-time commands).
- A behaviour or limitation worth noting changes (e.g. auth, storage, free-tier limits).

**`TESTS.md` — update when:**
- A new test file is added or removed.
- The CI/CD pipeline changes (triggers, jobs, artifact behaviour).
- Playwright configuration changes (timeouts, browsers, retry policy).
- A new troubleshooting case is discovered.

**`CODING_STANDARDS.md` — update when:**
- A new code pattern is established that all developers should follow.
- An existing rule is revised or found to be wrong.
- A new naming convention is decided.

**`CLAUDE.md` (this file) — update when:**
- The database schema changes (new table, new column, changed behaviour).
- New environment variables are required.
- A new page object is added or an existing one gains significant new methods.
- A page or feature changes behaviour in a way that affects how Claude should approach it.
- Any of the other three files is updated — check whether the corresponding section here is still accurate.

### 5 — Type-check

```bash
npm run typecheck
```

All workspaces must pass with zero errors before committing.

### 5b — Unit tests

Always run unit tests after any code change:

```bash
npm run test:unit
```

Unit tests cover pure logic in `packages/shared/` (e.g. `advanceDate`). They run in under a second — there is no reason to skip them. If you add new pure logic to `packages/shared/`, write a corresponding `*.test.ts` file alongside it before committing.

### 6 — Update and run targeted tests

#### 6a — Fix affected tests

Before running, update every file that could break:
- Page objects in `apps/e2e/tests/pages/` whose locators reference changed UI elements (text, roles, classes, routes).
- Smoke spec assertions against changed copy, button labels, headings, or modal content.

#### 6b — Run only the smoke spec(s) for changed feature areas

Do NOT run the full smoke suite locally. Run only the spec file(s) whose page or component was touched. The full suite runs in CI after every Vercel deployment — running it all locally before every commit is unnecessary and slow.

| Changed area | Smoke spec to run |
|---|---|
| `apps/web/src/app/expenses/` or `ExpensesPage.ts` | `tests/expenses.spec.ts` |
| `apps/web/src/app/recurring/` or `RecurringPage.ts` | `tests/recurring.spec.ts` |
| `apps/web/src/app/budgets/` or `BudgetsPage.ts` | `tests/budgets.spec.ts` |
| `apps/web/src/app/reports/` or `ReportsPage.ts` | `tests/reports.spec.ts` |
| `apps/web/src/app/` (dashboard) or `DashboardPage.ts` | `tests/dashboard.spec.ts` |
| `apps/web/src/app/settings/` or `SettingsPage.ts` | `tests/settings.spec.ts` |
| `apps/web/src/app/income/` or `IncomePage.ts` | `tests/income.spec.ts` |
| `apps/web/src/app/notifications/` or `NotificationsPage.ts` | `tests/notifications.spec.ts` |
| `apps/web/src/app/login/` or `apps/web/src/app/register/` or `LoginPage.ts` | `tests/auth.spec.ts` |
| `apps/web/src/components/NavBar.tsx` or `NavBar.ts` | `tests/navigation.spec.ts` |
| `apps/web/src/components/SiteHeader.tsx` (greeting, theme pill, bell) | `tests/site-header.spec.ts` |
| `apps/web/src/app/manifest.ts`, `apple-icon.tsx`, `public/sw.js`, `src/middleware.ts` (PWA) | `tests/pwa.spec.ts` |
| Shared component used across multiple pages | all spec files that use it |
| `packages/shared/` logic only | unit tests only — no smoke needed |
| API routes, DB lib, cron, config | no smoke needed |
| Docs, styles only | skip |

**Important:** Playwright tests must be run from the `apps/e2e/` directory, not from the repo root:

```bash
cd apps/e2e && SMOKE_ONLY=1 npx playwright test tests/<feature>.spec.ts
```

All targeted specs must pass before proceeding.

#### 6c — Run only the regression spec(s) for changed feature areas

Regression tests hit the real database and are slow. Only run the spec(s) whose feature was changed:

| Changed area | Regression spec to run |
|---|---|
| `apps/web/src/app/expenses/` or `ExpensesPage.ts` | `tests/expenses.regression.spec.ts` |
| `apps/web/src/app/budgets/` or `BudgetsPage.ts` | `tests/budgets.regression.spec.ts` |
| `apps/web/src/app/recurring/` or `RecurringPage.ts` | `tests/recurring.regression.spec.ts` |
| `apps/web/src/app/settings/` or `SettingsPage.ts` | `tests/settings.regression.spec.ts` |
| `apps/web/src/app/income/` or `IncomePage.ts` | `tests/income.regression.spec.ts` |
| `apps/web/src/app/notifications/` or `NotificationsPage.ts` | `tests/notifications.regression.spec.ts` |
| Shared component used across pages | all regression specs |
| Docs, styles, or config only | skip regression |

```bash
cd apps/e2e && npx playwright test tests/<feature>.regression.spec.ts
```

Or run all regression specs at once:

```bash
npm run test:e2e:regression
```

If a test fails, follow this diagnosis order — **always check the app code first, then the test**:

1. **Read the full failure output.** Note the locator, the expected value, and the actual value (or "element not found").
2. **Check the app code first.** Ask: does the failure reflect a real problem in the application?
   - The page renders the wrong text, a missing element, a broken flow, or a data error → **fix the app code**.
   - Examples: a timing bug (page renders before auth resolves), a missing CSS rule, a broken DB query, a race condition.
3. **Check the test second.** Only if the app is behaving correctly, ask: is the test wrong?
   - A locator targets a renamed element, a label changed, a route moved → **fix the test / page object**.
   - A locator is too broad and matches multiple elements → **tighten the selector**.
   - The test asserts stale behaviour that was intentionally changed → **update the assertion**.
4. **Never skip or weaken a test to make it pass.** If an assertion fails because the feature broke, fix the feature.
5. **Re-run the failing spec.** Only proceed to commit once it is green.

#### 6d — Review and update existing scenarios, then add missing ones (mandatory for every change)

After every feature, bug fix, or UI change, run **both** parts of this assessment before moving to step 7. Neither part is optional.

---

**Part A — Review existing scenarios for accuracy**

Open every spec file and page object that touches the changed area and ask for each existing test:

1. **Is this test still accurate?** If the UI changed (new text, new class name, restructured HTML, removed element), the test may pass for the wrong reason or silently test nothing. Update it to reflect the current behaviour.
2. **Is this test still needed?** If the feature the test covered was removed or replaced, delete the test rather than leaving a false-positive.
3. **Is the assertion specific enough?** A test that only checks an element is visible may miss a regression in its content. Tighten it if the change makes a more precise assertion possible.
4. **Does any existing test now have a missing counterpart?** For example, if there is a test that an element is visible in state A, there should also be a test that it is hidden in state B — add the counterpart if it is absent.

Signs an existing test needs updating:
- It references a CSS class, label, heading, or copy that was renamed or removed.
- It tests a default state that changed (e.g., default theme switched, default mode changed).
- It was written for an old layout and now targets a wrapper element that no longer exists.
- A positive-only test exists for a toggle/conditional element but no negative case does.

---

**Part B — Add new scenarios for gaps**

Ask: **"Does this change expose coverage that does not exist at all?"**

**For new features:**
- Are all new interactive elements (buttons, inputs, toggles) covered by a smoke test?
- Is every new conditional UI state (empty state, hidden element, mode switch) tested?
- If the feature writes to the database, is there a regression spec?

**For bug fixes:**
- Write a test that would have caught the bug *before* the fix was applied. If the test passes after the fix and would have failed before, it is the right test.
- Add it to the smoke spec if the bug was a UI/CSS/visibility issue (no DB involved).
- Add it to the regression spec if the bug was in a CRUD or data flow.

**For UI/layout changes:**
- Is the changed visual state (class toggled, element shown/hidden, text content) covered?
- Add a positive case ("X is visible when Y") and a negative case ("X is hidden when Z") for every toggled element.
- **If the change affects the navbar or sidebar:** update both the desktop describe block and the mobile describe block. A desktop-only test does not guard mobile layout. See the cross-viewport coverage rule in the Mobile viewport handling section.

---

**Deciding smoke vs regression:**

| Scenario type | Where to add |
|---|---|
| Element visible / hidden, class toggled, text content | Smoke (`<feature>.spec.ts`) |
| Navigation, URL change, page heading | Smoke (`<feature>.spec.ts`) |
| localStorage state, session behaviour | Smoke (`<feature>.spec.ts`) |
| Create / edit / delete against real DB | Regression (`<feature>.regression.spec.ts`) |

All updates and additions must be written and passing **before** step 7. Never defer to a follow-up commit.

### 7 — Bump the version (mandatory before every commit)

**Every commit that changes app behaviour or UI must increment `apps/web/package.json`.**
This is how deployments are tracked and rollbacks are targeted. There are no exceptions.

| Change type | Bump | Example |
|---|---|---|
| Bug fix, small UI tweak, refactor | patch | `1.0.1` → `1.0.2` |
| New feature, significant UX change | minor | `1.0.2` → `1.1.0` |
| Breaking change or major redesign | major | `1.1.0` → `2.0.0` |

Edit `apps/web/package.json` directly and include it in the same commit as the change. Do **not** use the release scripts (`npm run release:*`) for this — those create a separate tag commit. Just bump the `version` field inline.

Commits that skip the version bump (docs-only, test-only, CI config, `CLAUDE.md` edits) are the only exceptions.

### 8 — Commit and push automatically

Once code review, documentation, typecheck, local E2E tests, and version bump all pass:

```bash
git add <changed files>
git commit -m "<type>(<scope>): <what and why>"
git push origin main
```

**This is mandatory and unconditional.** Never ask "should I commit?", "should I push?", or "do you want me to commit this?" — always commit and push immediately. No manual action from the user should ever be required to land a change.

---

## Versioning

The app version lives in `apps/web/package.json` (`version` field). It is injected at build time into `NEXT_PUBLIC_APP_VERSION` via `next.config.js` and displayed in the site footer alongside the build SHA (`NEXT_PUBLIC_BUILD_SHA`). In Vercel production builds, the SHA comes from `VERCEL_GIT_COMMIT_SHA`; locally it falls back to `git rev-parse --short HEAD`.

### Version bump rule

**Every commit that changes app behaviour or UI must bump `apps/web/package.json`.** Edit the `version` field directly and include it in the same commit. See step 7 of the Change Workflow for the patch/minor/major decision table.

### Cutting a tagged release (optional)

The release scripts create an annotated git tag on top of the normal version bump — useful for marking a milestone:

| Command | Effect |
|---|---|
| `npm run release:patch` | Bumps patch, commits `chore(release): vX.Y.Z`, tags, pushes |
| `npm run release:minor` | Bumps minor, commits `chore(release): vX.Y.Z`, tags, pushes |
| `npm run release:major` | Bumps major, commits `chore(release): vX.Y.Z`, tags, pushes |

Only run these when the user explicitly asks for a tagged release. For routine commits, bump the version field directly (step 7) — do not use the release scripts.

### Rolling back

1. In the Vercel dashboard → Deployments → find the target deployment → "Promote to Production".
2. Or `vercel rollback` from the CLI (rolls back to the previous production deployment).
3. To find which deployment corresponds to a version: `git log --oneline --decorate | grep "tag: v"`.

---

## Adding a New Feature

1. Add or update types in `packages/shared/src/types.ts`.
2. Add DB functions in `apps/web/src/lib/db.ts`. Each function must accept `userId: string`.
3. Build the page in `apps/web/src/app/<route>/page.tsx`. Read `const { user } = useAuth()` at the top; return early if null.
4. Update the relevant page object in `apps/e2e/tests/pages/` if selectors change.
5. Add smoke tests to the existing `<feature>.spec.ts`.
6. Add CRUD regression tests to `<feature>.regression.spec.ts` if the feature writes data, following the cleanup pattern in `tests/helpers/supabase.ts`.

---

## Test Coverage Requirements for Every Change

Every new feature, bug fix, or UI change must be accompanied by Playwright tests. Claude must write all applicable categories and run them before marking any task done. **This applies equally to bug fixes — every fix must include a test that would have caught the regression.**

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
- Submitting an empty required field shows a `.field-error` paragraph inline below the input.
- Entering a negative or zero amount where only positive values are valid shows a `.field-error`.
- Entering a value that exceeds a stated limit shows the appropriate error.
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
| `getByRole('link', { name: 'Expenses' })` matches multiple links | Add `exact: true` and scope to the sidebar nav (`NavBar.link()`) |
| `getByRole('button', { name: 'Add Expense' })` matches two elements | Scope to `dialog.getByRole(...)` |
| `.stat` count is wrong | Use `.stat .label` with `.filter({ hasText: '...' })` — MonthEndBanner also renders `.stat` |
| `getByLabel('Period')` doesn't find select | Label uses implicit association. Use `locator('label').filter({ hasText: 'Period' }).locator('select')` |
| Nav links not found on mobile | On mobile the sidebar is hidden — use `NavBar.bottomTab(label)` (the `.bottom-nav` tab bar) instead of `link()`. |
| Profile avatar not found on mobile | Avatar is in the bottom tab bar's Profile tab (`.bottom-nav-avatar`). Click the Profile tab to open the popup. |
| Element is invisible due to matching fg/bg color but `toBeVisible()` passes | Use `evaluate(el => getComputedStyle(el).color)` to assert the computed color is not the same as the background |
| `.field-error` shows in wrong color inside a modal | `.modal p` has higher specificity — `.field-error` uses `color: var(--bad) !important` to override |
| Sidebar control works on desktop but missing on mobile (or vice versa) | Each sidebar control needs a test in both the desktop describe block and the mobile bottom tab bar describe block — see cross-viewport coverage rule |
| Tests hang in CI | Vercel Authentication is enabled — disable it in Vercel project settings |
| Cleanup skipped in CI | Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repository secrets |
| `page.goto` fails with "Cannot navigate to invalid URL" | Playwright must be run from `apps/e2e/` directory — `baseURL` is only set when the config file is loaded |

---

## Fixing Failing Tests

When CI reports a failure, use the `playwright-test-healer` Playwright agent to diagnose and fix it. The agent runs tests, pauses on failures, inspects the live page, edits the broken locator or assertion, and re-runs until green.

### 1 — Find the failed run

```bash
gh run list --workflow=e2e.yml --limit=5
gh run view <run-id> --log-failed
```

Read the full error for each failing test before touching any code.

### 2 — Diagnose the root cause

| Error pattern | Root cause | Where to fix |
|---|---|---|
| `locator.click: element not found` / `strict mode violation` | Selector changed (HTML restructure, class rename, new wrapper element) | Page object in `tests/pages/` |
| `expect(locator).toHaveText(…)` mismatch | UI copy changed (button label, heading text, option value) | Page object method or spec assertion |
| `expect(page).toHaveURL(…)` mismatch | Route renamed | Page object `goto()` and spec file |
| `TimeoutError` waiting for element | Supabase cold start, slow network, or Vercel Authentication re-enabled | Add retry/increased timeout in `playwright.config.ts`, or re-disable Vercel Auth |
| `TypeError: Cannot read …` | Page object method broken by refactor | Page object in `tests/pages/` |
| `Cannot navigate to invalid URL` | Tests run from wrong directory (must be `apps/e2e/`) or `baseURL` not set | Run `cd apps/e2e` before `npx playwright test` |

**Rule:** fix page objects (`tests/pages/`) when the app UI changed. Fix spec files only when the test logic itself is wrong. Never skip or weaken a test to make it pass.

### 3 — Verify the fix locally

```bash
cd apps/e2e && SMOKE_ONLY=1 npx playwright test tests/<affected>.spec.ts
```

If the dev server is unavailable, run against the live Vercel URL:

```bash
cd apps/e2e && BASE_URL=https://<your-vercel-url> npx playwright test tests/<affected>.spec.ts
```

### 4 — Commit and push

```bash
git add apps/e2e/tests/pages/<ChangedPage>.ts
git commit -m "fix(e2e): update <MethodName> locator — <what changed in the app>"
git push origin main
```

Pushing to main triggers a new Vercel deployment, which re-runs both CI jobs automatically.
