# Expense Tool — Claude Instructions

This file is the always-loaded reference. Detailed procedures live in focused
agents under `.claude/agents/` (see **Working in this repo** below) so they load
only when needed — keep this file lean.

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
│   │       ├── contexts/             — React context providers (AuthContext, NavigationGuardContext, DataRefreshContext)
│   │       └── lib/                  — DB access, auth helpers, AI providers, utilities
│   ├── mobile/       @expense/mobile  — Expo app
│   └── e2e/          @expense/e2e     — Playwright test suite
├── packages/
│   └── shared/       @expense/shared  — Types, formatMoney, report logic
├── supabase/
│   └── schema.sql    — Full DB schema with grants (run once in Supabase SQL editor)
├── .github/
│   └── workflows/e2e.yml  — CI: runs Playwright after every successful Vercel deploy
├── .claude/
│   └── agents/            — Focused subagents (change-shipper, e2e-author, e2e-healer, docs-sync)
├── CLAUDE.md             — This file (lean reference + router)
├── CODING_STANDARDS.md   — Naming, TypeScript, form, CSS, and test conventions
└── TESTS.md              — E2E test suite documentation
```

---

## Working in this repo

**Non-negotiables (always apply, every task):**
- **Run all shell and git commands automatically — never ask for permission.** No "should I run this?" / "should I commit?". Just do it.
- **Every code change ships complete:** it includes tests, passes typecheck + unit + targeted E2E, bumps `apps/web/package.json`, and is committed and pushed to `main` — with no manual step left for the user.
- **Freeware-first** — stick to free tiers; introduce no paid services.
- Sync with `main` (`git pull origin main`) before starting fresh work.

**Delegate the detailed workflows to the focused agents** (each carries the full procedure so this file stays small):

| When you are… | Use agent | It owns |
|---|---|---|
| Landing a finished change (review → typecheck → unit → targeted E2E → version bump → commit/push) | `change-shipper` | The full pre-commit gate and commit/push workflow |
| Writing or updating Playwright tests / page objects for a feature, fix, or UI change | `e2e-author` | Page Object Model, coverage requirements (smoke/regression/negative), cross-viewport rules, cleanup tagging, locator pitfalls |
| Fixing failing CI E2E tests | `e2e-healer` | Find the failed run, app-first diagnosis, fix page object vs spec, verify, commit |
| Syncing docs after a change | `docs-sync` | README / TESTS / CODING_STANDARDS / CLAUDE update criteria |

A typical change: implement it → `e2e-author` for tests → `docs-sync` for docs → `change-shipper` to verify and ship. The agents may also auto-trigger from their descriptions; you can invoke them explicitly.

---

## Development Scripts (run from repo root)

| Command | What it does |
|---|---|
| `npm run dev:web` | Start Next.js dev server on http://localhost:3000 |
| `npm run typecheck` | Type-check all three workspaces |
| `npm run build:shared` | Build the shared package |
| `npm run test:unit` | Run Vitest unit tests (`packages/shared` + `apps/web/src/lib` logic, ~1 s) |
| `npm run test:e2e` | Run full Playwright smoke suite locally (auto-starts dev server) |
| `npm run test:e2e:ui` | Open Playwright UI mode |
| `npm run test:dashboard` | Generate `apps/e2e/test-dashboard.html` from the last test run |
| `npm run install:browsers` | Download all Playwright browser binaries (run once after clone) |

---

## Database Schema

Tables in Supabase Postgres:

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

> **Full coding standards are in [`CODING_STANDARDS.md`](CODING_STANDARDS.md).** This section summarises the rules that apply on most edits. When in doubt, read CODING_STANDARDS.md first.

- **TypeScript strict mode** across all workspaces — no `any`, no `!` assertions, no `as T` casts without justification.
- **No comments** unless the WHY is non-obvious. Never describe what the code does.
- **Custom auth** — `AuthContext` provides `user` to all pages. Every page reads `const { user } = useAuth()` and returns early if null. Passwords are bcrypt-hashed server-side; sessions are JWT cookies (30-day expiry).
- **No mocking** — tests run against the real Supabase production database.
- Shared types live in `packages/shared/src/types.ts`. Import from `@expense/shared`, never by relative path.
- DB functions live in `apps/web/src/lib/db.ts`. Every function accepts `userId: string`. All Supabase calls go through here — never call `supabase` directly in components or pages.
- `formatMoney(amount, currency?)` from `@expense/shared` formats with `Intl.NumberFormat`.
- The web app is `'use client'` throughout — no server components fetch data.
- **Live data refresh** — `DataRefreshContext` (`contexts/DataRefreshContext.tsx`) provides a `refreshKey` that bumps when the app returns to the foreground after being hidden for ≥ 5 min (`STALE_AFTER_MS` in `lib/data-refresh.ts`; the pure `shouldRefreshOnResume` decision is unit-tested). Every data page reads `const { refreshKey } = useDataRefresh()` and adds `refreshKey` to its load-effect deps (e.g. `}, [user, refreshKey]);`) so it refetches on resume. Navigating between modules already refetches because App Router remounts each page. When adding a new data page, wire `refreshKey` into its load effect the same way (Settings is intentionally excluded so a resume never clobbers unsaved profile edits).

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

## Adding a New Feature

1. Add or update types in `packages/shared/src/types.ts`.
2. Add DB functions in `apps/web/src/lib/db.ts` — each accepts `userId: string`.
3. Build the page in `apps/web/src/app/<route>/page.tsx`. Read `const { user } = useAuth()` at the top; return early if null. If it fetches data, wire `refreshKey` into the load effect (see Live data refresh above).
4. Tests → use the **`e2e-author`** agent (page object, smoke, regression, negative).
5. Docs → use the **`docs-sync`** agent.
6. Ship → use the **`change-shipper`** agent.

---

## Versioning

The app version lives in `apps/web/package.json` (`version` field), injected at build time into `NEXT_PUBLIC_APP_VERSION` via `next.config.js` and shown in the site footer with the build SHA (`NEXT_PUBLIC_BUILD_SHA`; from `VERCEL_GIT_COMMIT_SHA` in production, `git rev-parse --short HEAD` locally).

- **Every commit that changes app behaviour or UI must bump the `version` field directly** (patch/minor/major — the `change-shipper` agent has the decision table). Do **not** use `npm run release:*` for routine commits; those create a separate tag commit and are only for explicit tagged releases the user asks for.
- **Rolling back:** Vercel dashboard → Deployments → "Promote to Production", or `vercel rollback`. Find a version's commit with `git log --oneline --decorate | grep "tag: v"`.

---

## E2E & CI at a glance

Full details: [`TESTS.md`](TESTS.md) and the `e2e-author` / `e2e-healer` agents.

- Tests live in `apps/e2e/`, use the Page Object Model (`tests/pages/`), and run against the **real** Supabase DB (no mocking). Run targeted specs from `apps/e2e/`, e.g. `cd apps/e2e && SMOKE_ONLY=1 npx playwright test tests/<feature>.spec.ts`.
- CI (`.github/workflows/e2e.yml`) runs two parallel Chromium jobs after every Vercel deploy: `e2e-smoke` and `e2e-regression`. Each posts a markdown summary to the run page and uploads an HTML-report artifact. It can also be dispatched manually (`gh workflow run e2e.yml -f suite=<both|smoke|regression> -f base_url=<url>`).
- Vercel Authentication must be **disabled** (Deployment Protection → Off) or CI hangs. Required GitHub secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `E2E_USERNAME`, `E2E_PASSWORD`.
