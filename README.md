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
| Web | Next.js 14 (App Router) |
| Mobile | Expo + React Native |
| Shared | `@expense/shared` TS package (types, categories, report math) |
| DB / Storage | Supabase (Postgres + Storage) — free tier, no auth |
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
3. In **Storage**, create a bucket named `receipts` and mark it **Public**.
   Add a policy that lets `anon` `INSERT` and `SELECT` from this bucket.
4. In **Project Settings → API**, copy the `Project URL` and the `anon` public key.

> ⚠️ Because there's no auth, anyone who gets your URL + anon key can read /
> write your data. Keep them private; treat this as a single-user setup.

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

- **Dashboard** — totals for today / this week / this month / this year,
  category breakdown, budget status bars, monthly AI insight (on demand).
- **Expenses** — full CRUD. List, add, edit (tap on mobile), delete
  (long-press on mobile / confirm dialog on web).
- **Receipt scan (mobile)** — camera or gallery → AI vision extracts
  `amount`, `merchant`, `date`, `category guess`, `description`,
  `confidence`. You confirm before saving. Provider configurable via
  `AI_PROVIDER` (default Gemini, free).
- **Reports** — switch between day / week / month / year, with category
  totals and percentages.
- **Budgets** — overall or per-category monthly limits. Dashboard warns at
  ≥ 80% and flags over-budget.
- **Recurring** — track subscriptions (weekly / monthly / yearly) with
  the next charge date.

## Typecheck everything

```sh
npm run typecheck
```

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
- No auth means RLS is off; do not expose your DB URL beyond your own use.
  If you want a soft passcode layer later, add a `device_id` column +
  `eq()` filters in `lib/db.ts`.
- Charts are not included to keep the deps minimal. The dashboard uses
  tables and progress bars; add `recharts` to the web app if you want
  graphs.
