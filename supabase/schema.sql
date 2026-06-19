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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- ---------- RLS: disabled, anon key has full read/write ----------
-- The anon key gets full read/write. Do NOT expose this DB beyond your own use.
alter table users disable row level security;
alter table categories disable row level security;
alter table expenses disable row level security;
alter table budgets disable row level security;
alter table recurring_expenses disable row level security;
alter table income_sources disable row level security;
alter table reminders disable row level security;

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
