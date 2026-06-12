# E2E Test Suite

Playwright smoke tests for the Expense Tool web app. Tests run automatically after every successful Vercel deployment.

---

## First-time Setup

`npm install` downloads the `@playwright/test` package but **does not** download the browser binaries. Run this once after cloning or after upgrading Playwright:

```bash
npm run install:browsers
```

This downloads the Chromium binary (~260 MB) to your local Playwright cache. You only need to re-run it when the Playwright version changes.

---

## Running Tests

### Against the local dev server

Start the dev server first, then run tests:

```bash
# From repo root
npm run dev:web

# In a separate terminal
npm run test:e2e
```

Or let Playwright start the server automatically (it will if `BASE_URL` is not set):

```bash
npm run test:e2e
```

### Against a deployed URL

```bash
BASE_URL=https://your-app.vercel.app npm run test:e2e
```

### Interactive UI mode (local only)

```bash
npm run test:e2e:ui
```

### View the last HTML report

```bash
cd apps/e2e && npx playwright show-report
```

---

## Test Files

| File | What it covers |
|---|---|
| `tests/navigation.spec.ts` | Nav links, active state highlighting, brand link, mobile hamburger menu |
| `tests/dashboard.spec.ts` | Dashboard heading, KPI stat cards, Budget Status / Category Chart / Trend sections |
| `tests/expenses.spec.ts` | Page load, Add Expense modal open/close, required fields, Escape key, backdrop dismiss |
| `tests/expenses.regression.spec.ts` | Full CRUD: create → verify → edit → verify → delete → verify; cleans up via API |
| `tests/expenses-grid.regression.spec.ts` | Grid view: card field rendering (category, amount, merchant, description, receipt pill, overseas PHP conversion), search/filter, edit & delete from a card, past-month lock, and **Load More pagination** (first 20 cards, "Load More…" reveals 20 more per click); cleans up via API |
| `tests/recurring.spec.ts` | Page load, Add Recurring modal, required fields, cadence dropdown capitalization |
| `tests/recurring.regression.spec.ts` | Full CRUD: create → verify → edit → verify → delete → verify; cleans up via API |
| `tests/reports.spec.ts` | Page load, Period select, export buttons (CSV/Excel/PDF), period change updates range |
| `tests/budgets.spec.ts` | Page load, inline budget form, Save Budget button, Current Budgets section |
| `tests/helpers/supabase.ts` | Shared Supabase REST helper — tags and deletes E2E test rows after each run |

---

## Configuration

`playwright.config.ts` key settings:

| Setting | Value | Reason |
|---|---|---|
| `workers` | 3 (CI) / 1 (local) | Vercel handles 3 concurrent browsers; Next.js dev server does not |
| `retries` | 0 | No retries — failures are reported immediately |
| `timeout` | 60 s | Per-test cap for slow remote deployments |
| `expect.timeout` | 20 s | Assertion wait (covers Supabase cold-start latency) |
| `navigationTimeout` | 30 s | Page navigation cap |
| `actionTimeout` | 15 s | Click / fill / select cap |
| `trace` | `retain-on-failure` | Trace files saved only when a test fails |
| `screenshot` | `only-on-failure` | Screenshots saved only on failure |

**Local runs** use Chromium only by default (matches CI). Set `FULL_BROWSERS=true` to also run Firefox and Pixel 5 (mobile Chrome):

```bash
FULL_BROWSERS=true npm run test:e2e
```

**CI runs** (`BASE_URL` set) always use Chromium only.

---

## CI / CD Integration

Tests trigger automatically via GitHub Actions (`.github/workflows/e2e.yml`).

**Trigger:** `deployment_status` event — Vercel's GitHub integration fires this whenever a deployment succeeds.  
**Condition:** `github.event.deployment_status.state == 'success'`  
**Target URL:** `github.event.deployment_status.target_url` (the Vercel deployment URL)

The workflow:
1. Checks out the repo
2. Installs dependencies (`npm ci`)
3. Installs Playwright Chromium with OS dependencies
4. Runs tests against the deployed URL
5. Uploads the HTML report as a GitHub Actions artifact (retained 14 days)

To view results after a deployment:
1. Go to the repo → **Actions** tab
2. Find the **E2E Tests** workflow run
3. Click through to see pass/fail per test
4. Download the `playwright-report-*` artifact for the full HTML report with screenshots

---

## Adding New Tests

1. Create a `tests/<feature>.spec.ts` file.
2. Use `page.goto('/<route>')` and wait for a stable element before asserting — do **not** use `waitForLoadState('networkidle')` as Next.js keeps background connections open.
3. For pages with a Supabase data fetch, wait for the loading state to clear:

```ts
await expect(page.getByText('Loading…')).toBeHidden({ timeout: 20_000 });
```

4. Prefer role-based selectors (`getByRole`, `getByRole` scoped to a container) over CSS class selectors.
5. When a locator could match multiple elements, scope it — e.g. `dialog.getByRole('button', ...)` instead of `page.getByRole('button', ...)`.

### Tests that write data

Regression tests (`*.regression.spec.ts`) run full CRUD cycles against the live production Supabase database. They use a shared cleanup helper at `tests/helpers/supabase.ts` to ensure no test data is left behind:

- **Expenses** are tagged with `merchant = 'E2E-TEST'` and deleted via `cleanup.expenses()`.
- **Recurring** items are named `'E2E Test Subscription'` and deleted via `cleanup.recurring()`.
- Both `beforeAll` (to clear leftovers from a previous failed run) and `afterAll` (to clean up after the current run) call the cleanup functions — so the database is always clean regardless of whether the test passes or fails.

The cleanup uses the Supabase REST API directly (no SDK) with a `DELETE` request scoped to the tagged rows. For CI, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repository secrets (same values as your Vercel `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`). For local runs, export them in your shell or `.env` file.

---

## Troubleshooting

**`Executable doesn't exist at .../ms-playwright/chromium...`**  
Browser binaries aren't downloaded yet. Run `npm run install:browsers` from the repo root (or `npx playwright install chromium` inside `apps/e2e`). This is a one-time step after cloning or upgrading Playwright.

**Tests time out on the `Loading…` wait**  
Supabase may be unreachable from the CI runner, or the deployment URL has a cold start. Check Supabase status and confirm `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel.

**Strict mode violation: locator resolved to N elements**  
The locator is too broad. Scope it to a parent container (e.g. `page.getByRole('dialog').getByRole('button', ...)`) or add a `.filter()`.

**`getByLabel` not finding a form element**  
The label uses an implicit association (`<select>` inside `<label>`) with the label text in a child `<div>`. Use `page.locator('label').filter({ hasText: 'Label Text' }).locator('select')` instead.
