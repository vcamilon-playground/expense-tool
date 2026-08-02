-- Expense Tool schema (Supabase Postgres, free tier)
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

-- ---------- users (custom auth, no Supabase auth / no email required) ----------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  profile_picture_url text,
  birth_date date,
  created_at timestamptz not null default now()
);

-- Add appearance preference columns (run once; safe to re-run)
alter table users add column if not exists accent_color text not null default 'default';
alter table users add column if not exists theme text not null default 'light';

-- Add email + password-reset columns (run once; safe to re-run).
-- email is optional but unique when present — used for login and password reset.
alter table users add column if not exists email text;
create unique index if not exists users_email_lower_key on users (lower(email)) where email is not null;
alter table users add column if not exists reset_token_hash text;
alter table users add column if not exists reset_token_expires_at timestamptz;

-- ---------- categories ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------- expenses ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'PHP',
  conversion_rate numeric(12,6),
  category_id uuid references categories(id) on delete set null,
  merchant text,
  description text,
  occurred_at date not null default current_date,
  receipt_url text,
  source text not null default 'manual' check (source in ('manual','receipt','recurring')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_occurred_at_idx on expenses (occurred_at desc);
create index if not exists expenses_category_id_idx on expenses (category_id);
create index if not exists expenses_user_id_idx on expenses (user_id);

-- ---------- budgets ----------
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  monthly_limit numeric(12,2) not null check (monthly_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

-- ---------- recurring expenses ----------
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category_id uuid references categories(id) on delete set null,
  cadence text not null check (cadence in ('weekly','monthly','yearly')),
  next_charge_date date not null,
  active boolean not null default true,
  -- When true the amount is not fixed; `amount` holds an optional estimate (may be 0)
  -- and the real amount is entered at pay time on the Recurring page.
  is_variable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Migration for existing databases (run once in the Supabase SQL editor):
--   alter table recurring_expenses add column if not exists is_variable boolean not null default false;

-- ---------- updated_at trigger ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_expenses_updated_at on expenses;
create trigger trg_expenses_updated_at before update on expenses
  for each row execute function set_updated_at();

drop trigger if exists trg_budgets_updated_at on budgets;
create trigger trg_budgets_updated_at before update on budgets
  for each row execute function set_updated_at();

drop trigger if exists trg_recurring_updated_at on recurring_expenses;
create trigger trg_recurring_updated_at before update on recurring_expenses
  for each row execute function set_updated_at();

-- ---------- default categories helper ----------
-- Called via a Postgres function so API routes can seed categories on registration.
create or replace function seed_default_categories(p_user_id uuid) returns void as $$
begin
  insert into categories (user_id, name, icon) values
    (p_user_id, 'Groceries', '🛒'),
    (p_user_id, 'Dining', '🍽️'),
    (p_user_id, 'Transport', '🚗'),
    (p_user_id, 'Utilities', '💡'),
    (p_user_id, 'Rent', '🏠'),
    (p_user_id, 'Entertainment', '🎬'),
    (p_user_id, 'Shopping', '🛍️'),
    (p_user_id, 'Health', '💊'),
    (p_user_id, 'Travel', '✈️'),
    (p_user_id, 'Subscriptions', '🔁'),
    (p_user_id, 'Education', '📚'),
    (p_user_id, 'Investment', '📈'),
    (p_user_id, 'Savings', '🏦'),
    (p_user_id, 'Other', '📦')
  on conflict (user_id, name) do nothing;
end;
$$ language plpgsql;

-- ---------- income sources ----------
create table if not exists income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('bank', 'ewallet', 'cash')),
  name text,
  brand text,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now()
);
create index if not exists income_sources_user_id_idx on income_sources (user_id);
-- Migration for existing databases: add the brand (company) column if missing.
alter table income_sources add column if not exists brand text;

-- ---------- income transactions (history) ----------
-- Audit log of money movements on income sources: deductions, add-money,
-- transfers, and balance edits. Rows are NEVER deleted when a source is
-- removed (source_id is set null, snapshot labels persist) and are archived
-- (hidden from the default view, not deleted) once older than 3 months.
create table if not exists income_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source_id uuid references income_sources(id) on delete set null,
  source_label text not null,
  counterparty_id uuid references income_sources(id) on delete set null,
  counterparty_label text,
  kind text not null check (kind in ('deduct', 'add', 'transfer', 'edit')),
  amount numeric(12,2) not null,
  balance_before numeric(12,2),
  balance_after numeric(12,2),
  note text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists income_transactions_user_id_idx on income_transactions (user_id);
create index if not exists income_transactions_created_at_idx on income_transactions (created_at desc);

-- ---------- reminders ----------
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  remind_date date not null,
  cadence text not null default 'once' check (cadence in ('once', 'weekly', 'monthly', 'yearly')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists reminders_user_id_idx on reminders (user_id);

-- ---------- maya savings (weekly savings tracker) ----------
-- One row per user. done_weeks holds the 1-based week numbers already
-- transferred to Maya. Row ABSENCE means "not yet initialised" — the app seeds
-- the row on first open (every Friday before today), then edits it on each
-- toggle. Deterministic schedule/amounts live in app code (lib/maya-savings.ts),
-- so only the completed-week set is persisted. No money movement.
create table if not exists maya_savings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade unique,
  done_weeks integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists maya_savings_user_id_idx on maya_savings (user_id);

-- ---------- investments (portfolio: what you own) ----------
-- Track-only: no money movement, no link to income_sources. `principal` is the
-- total put in (cost basis) and `current_value` is what it is worth now — the
-- user updates the latter manually (no market-data API on the free tier).
-- Gain/loss is computed in app code (lib/portfolio.ts), never stored.
create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  type text not null default 'fund'
    check (type in ('fund', 'stocks', 'crypto', 'savings', 'retirement', 'other')),
  platform text,
  principal numeric(14,2) not null default 0 check (principal >= 0),
  current_value numeric(14,2) not null default 0 check (current_value >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists investments_user_id_idx on investments (user_id);

-- ---------- debts (portfolio: what you owe) ----------
-- Track-only, same as investments. `principal` is the original amount borrowed
-- and `balance` is what is still outstanding; payoff progress is derived from
-- the two. `due_day` is the day-of-month a payment falls due (1-31, optional).
create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  kind text not null default 'loan'
    check (kind in ('credit_card', 'loan', 'personal', 'installment', 'other')),
  lender text,
  principal numeric(14,2) not null default 0 check (principal >= 0),
  balance numeric(14,2) not null default 0 check (balance >= 0),
  monthly_payment numeric(14,2) not null default 0 check (monthly_payment >= 0),
  interest_rate numeric(6,3) check (interest_rate >= 0),
  due_day integer check (due_day between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists debts_user_id_idx on debts (user_id);

-- ---------- income snapshots (weekly grand-total trend) ----------
-- One row per user per week, keyed by the Sunday that ends the week. Captures the
-- grand total of all income source balances so the dashboard can chart the weekly
-- trend (the app stores only current balances, so this is snapshotted going forward
-- on dashboard load — see lib/income-trend.ts). No money movement.
create table if not exists income_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  week_ending date not null,
  total numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_ending)
);
create index if not exists income_snapshots_user_idx on income_snapshots (user_id, week_ending);
-- Migration for existing databases (run once in the Supabase SQL editor) — a NEW table
-- needs its own grant (the blanket grant below only covered tables that existed then):
--   create table if not exists income_snapshots (
--     id uuid primary key default gen_random_uuid(),
--     user_id uuid not null references users(id) on delete cascade,
--     week_ending date not null,
--     total numeric(12,2) not null,
--     created_at timestamptz not null default now(),
--     unique (user_id, week_ending)
--   );
--   create index if not exists income_snapshots_user_idx on income_snapshots (user_id, week_ending);
--   alter table income_snapshots disable row level security;
--   grant select, insert, update, delete on income_snapshots to anon;

-- ---------- RLS: disabled, anon key has full read/write ----------
-- The anon key gets full read/write. Do NOT expose this DB beyond your own use.
alter table users disable row level security;
alter table categories disable row level security;
alter table expenses disable row level security;
alter table budgets disable row level security;
alter table recurring_expenses disable row level security;
alter table income_sources disable row level security;
alter table income_transactions disable row level security;
alter table reminders disable row level security;
alter table maya_savings disable row level security;
alter table income_snapshots disable row level security;
alter table investments disable row level security;
alter table debts disable row level security;

-- ---------- Privileges for anon role ----------
grant usage on schema public to anon;
grant select, insert, update, delete on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon;
grant execute on function seed_default_categories(uuid) to anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon;
alter default privileges in schema public
  grant usage, select on sequences to anon;

-- ---------- Storage bucket for receipts ----------
-- Run in Supabase Dashboard > Storage:
--   1. Create a bucket named "receipts" (PUBLIC)
--   2. Create a bucket named "avatars" (PUBLIC)
--   3. Allow anon insert + select on both buckets.

-- ---------- Environment variables required ----------
-- NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
-- NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key
-- AUTH_SECRET                  — Random secret for JWT signing (min 32 chars)
--                                 Generate with: openssl rand -base64 32

-- ---------- Migration: existing single-user DB ----------
-- If upgrading from the pre-multi-user schema, run these steps in order:
-- 1. Create the users table above.
-- 2. Register your account via /register — note your new user id.
-- 3. Run: UPDATE categories SET user_id = '<your-user-id>' WHERE user_id IS NULL;
-- 4. Run: UPDATE expenses SET user_id = '<your-user-id>' WHERE user_id IS NULL;
-- 5. Run: UPDATE budgets SET user_id = '<your-user-id>' WHERE user_id IS NULL;
-- 6. Run: UPDATE recurring_expenses SET user_id = '<your-user-id>' WHERE user_id IS NULL;
-- 7. Alter columns to NOT NULL (after filling them):
--    ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
--    ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
--    ALTER TABLE budgets ALTER COLUMN user_id SET NOT NULL;
--    ALTER TABLE recurring_expenses ALTER COLUMN user_id SET NOT NULL;
-- 8. Drop old unique constraints and add new ones:
--    ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
--    ALTER TABLE categories ADD UNIQUE (user_id, name);
--    ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_id_key;
--    ALTER TABLE budgets ADD UNIQUE (user_id, category_id);
