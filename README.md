# Expense Tool — Web + Mobile + Claude AI

Track expenses across a Next.js web app and an Expo (React Native) mobile app.
Capture receipts with your phone camera, let Claude extract the fields, then
review/edit/delete from either device. Daily / weekly / monthly / yearly
reports, budgets with overspend alerts, recurring subscriptions, and a monthly
AI insight card on the dashboard.

All TypeScript. Free-tier friendly (Supabase + Anthropic).

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js 14 (App Router), Recharts |
| Mobile | Expo + React Native |
| Shared | `@expense/shared` TS package (types, categories, report math) |
| DB / Storage | Supabase (Postgres + Storage) — free tier, custom auth (no email) |
| AI | **Google Gemini** (`gemini-2.0-flash`, free tier) — default. Anthropic Claude (`claude-opus-4-7`) optional via env switch. |
| Mono | npm workspaces |

## Repo layout

```
expense_tool_claude/
├── package.json                 # npm workspaces root
├── tsconfig.base.json
├── supabase/schema.sql          # run once in Supabase SQL editor
├── packages/shared/             # types, default categories, report helpers
└── apps/
    ├── web/                     # Next.js dashboard, CRUD, reports
    │   └── src/
    │       ├── lib/
    │       │   ├── ai.ts                    # provider dispatcher (AI_PROVIDER)
    │       │   └── providers/
    │       │       ├── gemini.ts            # Google Gemini (default, free)
    │       │       ├── anthropic.ts         # Claude (optional, paid)
    │       │       └── prompts.ts           # shared system prompts
    │       └── app/api/
    │           ├── extract-receipt/route.ts # vision OCR (server)
    │           └── insights/route.ts        # monthly insight (server)
    └── mobile/                  # Expo: camera, gallery, list, edit, delete
```

The AI API key lives **only** on the Next.js server. The mobile app
POSTs receipt images to `/api/extract-receipt` so the key is never shipped in
the mobile bundle.

## 1. Create the Supabase project

1. Go to <https://supabase.com> → new project (free tier).
2. In **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it.
3. **If upgrading an existing (single-user) database**, follow the migration steps at the bottom of `schema.sql`.
4. In **Storage**, create two buckets:
   - `receipts` — mark it **Public** (for receipt images)
   - `avatars` — mark it **Public** (for profile pictures)
   
   Add a policy on each bucket that lets `anon` `INSERT` and `SELECT`.
5. In **Project Settings → API**, copy the `Project URL` and the `anon` public key.
6. Generate an `AUTH_SECRET` (see env vars below) and add it to your Vercel environment variables.

## 2. Get an AI API key

**Default — Google Gemini (free, no credit card)**

1. Go to <https://aistudio.google.com/apikey> and sign in with a Google account.
2. Click **Create API key** → copy it.
3. Free tier: 15 requests/min, 1500/day on `gemini-2.0-flash`. Plenty for personal use.

**Optional — Anthropic Claude (paid)**

If you'd rather use Claude later, get a key at <https://console.anthropic.com>
and set `AI_PROVIDER=anthropic` in `.env.local`. The default and recommended
setup is Gemini.

## 3. Install

```sh
cd expense_tool_claude
npm install
```

## 4. Configure env vars

### Web app — `apps/web/.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY

# Auth secret for JWT session signing (min 32 chars)
# Generate with: openssl rand -base64 32
AUTH_SECRET=your-random-secret-here

# Default: Gemini (free). Switch to "anthropic" only if you have Claude credits.
AI_PROVIDER=gemini
GOOGLE_API_KEY=AIza...
ANTHROPIC_API_KEY=
```

### Mobile app — `apps/mobile/.env`

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
EXPO_PUBLIC_WEB_API_URL=http://YOUR-LAPTOP-LAN-IP:3000
```

> For the mobile app to call the Claude OCR endpoint, set
> `EXPO_PUBLIC_WEB_API_URL` to a URL the phone can reach. On a LAN that's your
> laptop's IP (e.g. `http://192.168.1.10:3000`). Once you deploy the web app
> (Vercel free tier works), point this at the public URL.

## 5. Run

```sh
# Web (http://localhost:3000)
npm run dev:web

# Mobile (open Expo Go on your phone and scan the QR)
npm run dev:mobile
```

## Features

- **Multi-user auth** — register with first name, last name, username, password, profile picture (optional), birth date (optional). Login, logout, and switch-user from the sidebar. No email required. If a password is forgotten, reset it via Supabase SQL editor.
- **Dashboard** — totals for today / this week / this month / this year,
  category breakdown, budget status bars, monthly AI insight (on demand).
- **Expenses** — full CRUD with two views: **List view** (grouped by month, collapsible, sortable) and **Calendar view** (monthly grid showing daily totals; click any day to see and edit that day's expenses). Filters (search, category) apply in both views.
- **Receipt scan (mobile)** — camera or gallery → AI vision extracts
  `amount`, `merchant`, `date`, `category guess`, `description`,
  `confidence`. You confirm before saving. Provider configurable via
  `AI_PROVIDER` (default Gemini, free).
- **Reports** — switch between day / week / month / year, with category
  totals and percentages.
- **Budgets** — overall or per-category monthly limits. Dashboard warns at
  ≥ 80% and flags over-budget.
- **Recurring** — track subscriptions (weekly / monthly / yearly) with
  the next charge date. Due items show a "Confirm Payment" flow (record or
  skip). Future-dated items have a "Pay Now" button to record the payment
  ahead of schedule and advance the next charge date.
- **Settings** — profile editing, password change, theme, category management.

## Development scripts

| Command | What it does |
|---|---|
| `npm run dev:web` | Start Next.js dev server on http://localhost:3000 |
| `npm run dev:mobile` | Start Expo (scan QR in Expo Go) |
| `npm run typecheck` | Type-check all three workspaces |
| `npm run build:shared` | Build the shared package |
| `npm run test:unit` | Vitest unit tests for `packages/shared/` (~400 ms) |
| `npm run test:e2e` | Full Playwright smoke suite (auto-starts dev server) |
| `npm run test:e2e:ui` | Open Playwright UI mode |
| `npm run install:browsers` | Download Playwright browser binaries (run once after clone) |

## Architecture — where things live

New to the codebase? Start here.

| File | Role |
|---|---|
| `apps/web/src/lib/db.ts` | **Every Supabase query goes through here.** Add new DB calls here, never in components. |
| `apps/web/src/lib/supabase.ts` | Supabase client initialisation (one instance, reused everywhere). |
| `apps/web/src/contexts/AuthContext.tsx` | App-wide auth state from the JWT cookie. Pages read `const { user } = useAuth()` and return early if null. |
| `apps/web/src/app/globals.css` | The entire design system — CSS variables, layout primitives, component styles. |
| `packages/shared/src/types.ts` | Shared TypeScript types (`Expense`, `Budget`, `Category`, …). Import from `@expense/shared`, never by relative path. |
| `packages/shared/src/` | `formatMoney`, report helpers, `advanceDate`. Pure functions with unit tests alongside them. |
| `supabase/schema.sql` | Full DB schema. Run once in the Supabase SQL editor; re-run after adding tables. |
| `apps/e2e/tests/pages/` | Playwright Page Object Model. All locators live here, never in spec files. |

**Key design decisions:**

- **No server components** — the web app is `'use client'` throughout. All Supabase calls happen in the browser via the anon key.
- **Custom auth, not Supabase Auth** — a `users` table with bcrypt-hashed passwords and JWT cookies. RLS is disabled; every query filters by `user_id` in application code.
- **Production DB in tests** — no mocking. E2E tests write real rows tagged `merchant = 'E2E-TEST'` and clean them up in `beforeAll`/`afterAll`. See `TESTS.md`.
- **Shared package** — `packages/shared/` is a compiled TS package. After editing it, run `npm run build:shared` before the web app picks up the changes.

## Testing

```sh
npm run test:unit          # fast unit tests for shared logic
npm run test:e2e           # full Playwright suite against localhost
```

See [`TESTS.md`](TESTS.md) for the full test suite breakdown, CI/CD setup, and troubleshooting guide.

## Coding standards

See [`CODING_STANDARDS.md`](CODING_STANDARDS.md) for TypeScript rules, data access conventions, form patterns, CSS variable usage, and test standards (Page Object Model, smoke vs regression, cleanup, cross-viewport coverage).

## Switching AI providers

In `apps/web/.env.local`:

```
AI_PROVIDER=gemini          # free; needs GOOGLE_API_KEY
AI_PROVIDER=anthropic       # paid; needs ANTHROPIC_API_KEY
```

Restart `npm run dev:web` after changing. The API responses include a
`provider` field so the client can see which one served the request.

## Notes & limits

- Receipt OCR quality depends on the photo. The provider returns a `confidence`
  field; if it's `low` you'll see `null`s — fall back to manual entry.
- The free Supabase tier gives 500 MB DB + 1 GB Storage, which is enough
  for years of personal expenses and thousands of receipt images.
- Auth uses a custom `users` table (not Supabase Auth). Passwords are bcrypt-hashed server-side. Sessions are JWT cookies (30-day expiry). RLS is still disabled — the anon key has full access, so keep your Supabase URL and key private.
- Forgot-password flow: an admin must run `UPDATE users SET password_hash = '...' WHERE username = '...'` in Supabase SQL editor with a new bcrypt hash.
- Each user's data (expenses, budgets, categories, recurring) is isolated by `user_id` filtered in every query.
- The dashboard uses Recharts for the category breakdown chart and trend charts.
