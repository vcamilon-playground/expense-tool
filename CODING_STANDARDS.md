# Coding Standards

Applies to all code in this repository — web app, mobile app, shared package, and E2E tests.
When a rule here conflicts with an external style guide, this document wins.

---

## Naming

### Files

| What | Convention | Example |
|---|---|---|
| React component | `PascalCase.tsx` | `ExpenseForm.tsx`, `NavBar.tsx` |
| Utility / library | `kebab-case.ts` (multi-word) or single lowercase word `.ts` | `expense-utils.ts`, `db.ts`, `auth.ts` |
| File with JSX exports | `.tsx` regardless of purpose | `sort.tsx` (exports `SortIcon` + `useSortState`) |
| Next.js page | `page.tsx` (required by framework) | `apps/web/src/app/expenses/page.tsx` |
| Next.js API route | `route.ts` inside a `kebab-case/` directory | `api/extract-receipt/route.ts` |
| Unit test | `<subject>.test.ts(x)` alongside the file it tests | `expense-utils.test.ts` |
| E2E smoke spec | `<feature>.spec.ts` | `expenses.spec.ts` |
| E2E regression spec | `<feature>.regression.spec.ts` | `expenses.regression.spec.ts` |
| Page object | `PascalCasePage.ts` (non-page helpers keep original name) | `ExpensesPage.ts`, `NavBar.ts` |

### TypeScript identifiers

| What | Convention | Example |
|---|---|---|
| Type / interface | `PascalCase` | `Expense`, `Budget`, `RecurringCadence` |
| Write-input type | `EntityInput` suffix | `ExpenseInput`, `RecurringInput` |
| Module-level constant | `UPPER_SNAKE_CASE` | `PUBLIC_PATHS`, `DEFAULT_CATEGORIES`, `MODEL` |
| Function / variable | `camelCase` | `formatMoney`, `handleSubmit` |
| React component | `PascalCase` | `ExpenseForm`, `DeleteModal` |
| Custom hook | `use` prefix, `camelCase` | `useAuth`, `useSortState` |
| React context object | `PascalCase` + `Context` suffix | `AuthContext`, `NavigationGuardContext` |
| DB function | verb-first `camelCase` | `listExpenses`, `createExpense`, `updateExpense`, `deleteExpense`, `upsertBudget` |
| Event handler function | `handle` prefix | `handleSubmit`, `handleSave`, `handleEdit` |
| Event handler prop | `on` prefix | `onConfirm`, `onCancel`, `onClose` |

### React state variables

Use descriptive names — avoid single-letter or abbreviated state names (`err`, `val`, `res`).

| State type | Name | Setter |
|---|---|---|
| Page data loading flag | `loading` | `setLoading` |
| Page-level fetch error | `loadError` | `setLoadError` |
| Form API / submit error | `submitError` | `setSubmitError` |
| Per-field validation errors | `fieldErrors` | `setFieldErrors` |
| Currently-edited item | `editing` | `setEditing` |
| Pending-delete item | `pendingDelete` | `setPendingDelete` |
| Modal visibility | `show{Name}` (e.g. `showAdd`, `showForm`) | `setShow{Name}` |
| Inline scoped error | `{context}Error` (e.g. `confirmError`, `limitError`) | `set{Context}Error` |

Booleans: use the plain descriptive noun or adjective — **no `is` prefix**.
```ts
const [loading, setLoading] = useState(true);   // not isLoading
const [open, setOpen] = useState(false);         // not isOpen
const [showAdd, setShowAdd] = useState(false);   // not isAddVisible
```

### CSS classes

All class names are `kebab-case`. State-modifier classes are plain adjectives or past participles — no `is-` prefix.

```css
.nav-mobile-profile { ... }   /* component class */
.field-error { ... }          /* utility class */
.open { ... }                 /* state modifier — not .is-open */
.sort-active { ... }          /* state modifier — not .is-sort-active */
.collapsed { ... }            /* state modifier */
```

---

## TypeScript

**Strict mode is non-negotiable.** All three workspaces run `tsc --strict`. Keep it that way.

| Rule | Why |
|---|---|
| No `any` | Defeats type-checking; use `unknown` and narrow it. |
| No `!` non-null assertions | Hides real bugs; guard with `if` or `??`. |
| No `as T` casts without justification | A cast is a lie to the compiler; comment the WHY if you must use one. |
| Domain types from `@expense/shared` | `Expense`, `Budget`, `Category`, `RecurringExpense` live in `packages/shared/src/types.ts`. Import from the package, never by relative path. |
| Write-input types follow the `Input` convention | `ExpenseInput = Omit<Expense, 'id' \| 'created_at' \| 'updated_at'>`. New entity types get a corresponding `Input` type. |
| Reusable types go in `packages/shared/src/types.ts` | Local one-off types stay inline in the file that uses them. |

---

## Data Access

All Supabase queries go through **`apps/web/src/lib/db.ts`**. No exceptions.

```ts
// correct
import { listExpenses } from '@/lib/db';

// wrong — direct supabase call in a component
import { supabase } from '@/lib/supabase';
const { data } = await supabase.from('expenses').select('*');
```

| Rule |
|---|
| Every DB function accepts `userId: string` as an explicit parameter — it never reads auth state internally. |
| Throw Supabase `error` objects directly: `if (error) throw error;` — no wrapping or message-mangling. |
| Return `data ?? []` (not `data!`) for list queries. |
| Use the singleton from `lib/supabase.ts` — never call `createClient(...)` again. |
| Group functions by table with a `// ---------- TableName ----------` divider comment. |

---

## React & Next.js

The web app is **`'use client'` throughout** — all data fetching happens in the browser.

```ts
// every page component starts with this pattern
const { user } = useAuth();
if (!user || loading) return <p className="muted">Loading…</p>;
```

| Rule |
|---|
| Every page reads `const { user } = useAuth()` and returns the loading state if null. |
| A page that fetches data also reads `const { refreshKey } = useDataRefresh()` and adds `refreshKey` to its load-effect deps (`}, [user, refreshKey]);`) so it refetches when the app resumes after a long idle period. |
| No server components that fetch data — all Supabase calls are client-side. |
| No new React context providers without a strong reason; `AuthContext`, `NavigationGuardContext`, and `DataRefreshContext` cover the current needs. |
| Shared UI components go in `apps/web/src/components/`. Only extract a component if it is used in two or more places. |
| Page-specific logic stays in the page file — don't create a component for something used once. |

---

## State Management

### Loading and error states

```ts
// correct — separate concerns
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState<string | null>(null);   // page-level
const [fieldErrors, setFieldErrors] = useState<{ amount?: string; date?: string }>({});  // form
const [submitError, setSubmitError] = useState<string | null>(null); // API error

// wrong — single error string for everything
const [error, setError] = useState<string | null>(null);
```

| Rule |
|---|
| Load/fetch errors are separate state from form validation errors. |
| Field validation errors use a per-field object `{ fieldName?: string }`, never a single string. |
| Load errors render as a page-level banner (outside the form). Field errors render inline below the input. |
| API/server errors (from failed DB calls) render below the form submit button, not as field errors. |

### Clearing errors

```ts
// clear a specific field error on change — not the whole object
onChange={(e) => { setValue(e.target.value); setFieldErrors((p) => ({ ...p, amount: undefined })); }}

// clear all field errors on successful submit or modal close/reset
function reset() {
  setValue('');
  setFieldErrors({});
}
```

---

## Forms

```tsx
<form onSubmit={handleSubmit} noValidate>
  <label>
    <div className="muted">Amount *</div>
    <input
      type="number"
      value={amount}
      onChange={(e) => { setAmount(e.target.value); setFieldErrors((p) => ({ ...p, amount: undefined })); }}
      aria-invalid={!!fieldErrors.amount}
      required
    />
    {fieldErrors.amount && <p className="field-error">{fieldErrors.amount}</p>}
  </label>
</form>
```

| Rule |
|---|
| Add `noValidate` to every form that has custom JS validation, so browser tooltips don't fire before JS errors do. |
| Validation happens in `handleSubmit` — not on blur or change. |
| Every required field gets an `aria-invalid={!!fieldErrors.fieldName}` attribute when in error state. |
| Validation error messages: `"X is required"`, `"Enter a valid positive amount"`. Keep them short and consistent. |
| Cancel / close resets both form values and all field errors. |

---

## CSS & Styling

**Never hardcode color values in JSX `style` props.** Use CSS variables from `globals.css`.

```tsx
// correct
<p className="field-error">{error}</p>
<p style={{ color: 'var(--muted)' }}>Loading…</p>

// wrong
<p style={{ color: '#c0392b' }}>{error}</p>
<p style={{ color: 'red' }}>{error}</p>
```

| Variable | Use |
|---|---|
| `var(--text)` | Primary body text |
| `var(--muted)` | Secondary / label text |
| `var(--bad)` | Error states, danger actions |
| `var(--warn)` | Warning states (budget 80%) |
| `var(--accent)` | Themed accent / primary buttons |
| `var(--bg)` | Page background |
| `var(--card)` | Card / surface background |
| `var(--border)` | Borders and dividers |

| Rule |
|---|
| Use `.field-error` class for inline validation errors — the color, size, and weight are set globally. |
| Modal title bars use the shared `.modal-header` class — a full-width band in the active accent (`var(--sidebar-bg)`) with white title and white close button. Don't hand-roll an inline modal header; reuse `.modal-header` so all modals stay consistent. |
| Add `!important` to global utility class properties that are expected to win specificity battles (e.g., `.field-error { color: var(--bad) !important; }`). |
| Dark-mode aware colors: always use CSS variables, never hardcode. Verify changes in both light and dark mode. |
| New design tokens (colors, spacing, radii) go in `:root` in `globals.css`, not scattered in component files. |

---

## Comments

```ts
// correct — explains a non-obvious constraint
// getBoundingClientRect().bottom positions the popup below the sticky nav bar
// on mobile, where the sidebar becomes a top bar at 60px height
const navBottom = navEl ? navEl.getBoundingClientRect().bottom : 60;

// wrong — describes what the code does (obvious from the names)
// get the nav element's bottom position
const navBottom = navEl.getBoundingClientRect().bottom;
```

| Rule |
|---|
| Default: no comments. |
| Add a comment only when the WHY is non-obvious: a hidden constraint, a workaround for a specific bug, a subtle invariant. |
| Never reference the current task, issue number, PR, or feature name in comments — those belong in the commit message. |
| Never write multi-line comment blocks or docstrings. One short line maximum. |

---

## General

| Rule |
|---|
| No unused imports, variables, or functions — remove them, don't comment them out. |
| No hardcoded strings or numbers that belong in a named constant or config. |
| No new paid services — free tiers only (Supabase free, Gemini free, Vercel hobby). |
| `formatMoney(amount, currency?)` from `@expense/shared` for all currency display — never roll your own. |
| Run `npm run typecheck` and `npm run test:unit` before every commit. Both must be green. |

---

---

## Test Standards

### Page Object Model

Every page or modal has a corresponding class in `apps/e2e/tests/pages/`.

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

| Rule |
|---|
| Extend `BasePage`. Call `this.waitForLoad()` at the end of every `goto()`. |
| Every locator is a method — no raw `page.locator()` or `page.getByRole()` calls in spec files. |
| `expect()` calls belong in spec files, not page objects. Page objects contain interactions only. |
| Use `let page!: MyPage` (definite assignment assertion) when assigning in `beforeEach`. |
| If a feature reuses an existing page (e.g., new modal on Expenses), add methods to the existing page object instead of creating a new file. |

---

### Smoke vs Regression

| Test type | File | Writes to DB? | When to use |
|---|---|---|---|
| **Smoke** | `<feature>.spec.ts` | No | UI visibility, text, navigation, localStorage state, form validation |
| **Regression** | `<feature>.regression.spec.ts` | Yes | Create / edit / delete against real database |

Run only the spec for the feature you changed:
```sh
# targeted smoke run
cd apps/e2e && SMOKE_ONLY=1 npx playwright test tests/<feature>.spec.ts

# targeted regression run
cd apps/e2e && npx playwright test tests/<feature>.regression.spec.ts
```

---

### Locator Rules

```ts
// scope button lookups to the dialog, not the whole page
await expenses.dialog().getByRole('button', { name: 'Save' }).click();

// exact: true prevents "Expenses" matching the brand link "Expense Tool"
await page.getByRole('link', { name: 'Expenses', exact: true });

// never use networkidle — Next.js keeps connections open
await this.page.waitForLoadState('networkidle'); // wrong
await this.waitForLoad();                        // correct
```

| Rule |
|---|
| Scope all locators inside dialogs/modals to the dialog element. |
| Use `exact: true` on nav link locators. |
| Never use `waitForLoadState('networkidle')` — use `waitForLoad()` from `BasePage`. |
| Never use `page.waitForTimeout()` — waiting for a fixed time hides real flakiness. |

---

### Visibility vs Color

`toBeVisible()` passes when an element exists in the DOM and is not `display:none` — it does **not** check CSS color. An element with white text on a white background passes `toBeVisible()`.

```ts
// when testing a color or contrast issue, read the computed style
const color = await locator.evaluate(el => window.getComputedStyle(el).color);
expect(color).not.toMatch(/^rgba?\(255,\s*255,\s*255/); // not white-on-white
```

---

### Test Data & Cleanup

```ts
// always wrap regression specs with cleanup
test.beforeAll(async () => { await cleanup.expenses(); });
test.afterAll(async () => { await cleanup.expenses(); });
```

| Rule |
|---|
| Tag test expenses: `merchant = 'E2E-TEST'`. |
| Tag test recurring: `name = 'E2E Test Subscription'`. |
| Call cleanup in `beforeAll` (remove stale leftovers from a previous aborted run) AND `afterAll` (remove what this run created). |
| Never delete rows by ID — use the tag-based cleanup helpers in `tests/helpers/supabase.ts`. |

---

### Cross-Viewport Coverage

Every navbar or sidebar control needs a test in **both** viewport contexts:

```ts
// desktop — default viewport (1280px), in the "sidebar collapse" describe block
test('settings link is visible in sidebar', ...);

// mobile — add test.use override, in the "mobile hamburger" describe block
test.describe('...mobile...', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('settings link is visible in hamburger dropdown', ...);
});
```

---

### Coverage Requirements

| Change type | Required tests |
|---|---|
| New page / route | Smoke: heading, key elements visible, navigation works |
| New form | Smoke: required-field errors show inline; regression: create/edit/delete |
| New button or toggle | Smoke: visible in correct state; hidden in incorrect state |
| Bug fix | A test that would have failed before the fix and passes after |
| New sidebar control | Smoke in desktop describe block **and** mobile describe block |

---

### Test Naming

```ts
// describe block — "Feature — subsection"
test.describe('Expenses — column sorting', () => { ... });

// test title — present-tense declarative
test('page heading shows "Expenses"', ...);
test('clicking Add Expense opens the modal', ...);
test('submitting empty form shows inline error below Amount field', ...);
```

---

### What Not to Do

| Don't | Do instead |
|---|---|
| `test.skip()` a failing test | Fix the feature or the locator |
| Weaken an assertion (`toBeVisible` instead of `toHaveText`) to make it pass | Fix what broke |
| Write `page.waitForTimeout(2000)` | Find the right locator/event to wait for |
| Put `expect()` calls inside a page object | Keep assertions in the spec file |
| Assert `toBeVisible()` on colored text | Use `evaluate(el => getComputedStyle(el).color)` |
