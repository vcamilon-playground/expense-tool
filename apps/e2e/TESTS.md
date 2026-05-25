# E2E Test Suite

Playwright smoke tests for the Expense Tool web app. Tests run automatically after every successful Vercel production deployment.

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
| `tests/recurring.spec.ts` | Page load, Add Recurring modal, required fields, cadence dropdown capitalization |
| `tests/reports.spec.ts` | Page load, Period select, export buttons (CSV/Excel/PDF), period change updates range |
| `tests/budgets.spec.ts` | Page load, inline budget form, Save Budget button, Current Budgets section |

---

## Configuration

`playwright.config.ts` key settings:

| Setting | Value | Reason |
|---|---|---|
| `workers` | 3 | Parallel execution across test files |
| `retries` | 0 | No retries — failures are reported immediately |
| `timeout` | 60 s | Per-test cap for slow remote deployments |
| `expect.timeout` | 20 s | Assertion wait (covers Supabase cold-start latency) |
| `navigationTimeout` | 30 s | Page navigation cap |
| `actionTimeout` | 15 s | Click / fill / select cap |
| `trace` | `retain-on-failure` | Trace files saved only when a test fails |
| `screenshot` | `only-on-failure` | Screenshots saved only on failure |

**Local runs** use three browser projects: Chromium, Firefox, and Pixel 5 (mobile Chrome).  
**CI runs** (`BASE_URL` set) use Chromium only — faster, sufficient for smoke testing.

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

---

## Troubleshooting

**Tests time out on the `Loading…` wait**  
Supabase may be unreachable from the CI runner, or the deployment URL has a cold start. Check Supabase status and confirm `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel.

**Strict mode violation: locator resolved to N elements**  
The locator is too broad. Scope it to a parent container (e.g. `page.getByRole('dialog').getByRole('button', ...)`) or add a `.filter()`.

**`getByLabel` not finding a form element**  
The label uses an implicit association (`<select>` inside `<label>`) with the label text in a child `<div>`. Use `page.locator('label').filter({ hasText: 'Label Text' }).locator('select')` instead.
