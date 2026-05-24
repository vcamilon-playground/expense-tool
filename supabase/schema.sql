-- Expense Tool schema (Supabase Postgres, free tier, no auth)
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

-- ---------- categories ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  created_at timestamptz not null default now()
);

-- ---------- expenses ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  category_id uuid references categories(id) on delete set null,
  merchant text,
  description text,
  occurred_at date not null default current_date,
  receipt_url text,
  source text not null default 'manual' check (source in ('manual','receipt')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_occurred_at_idx on expenses (occurred_at desc);
create index if not exists expenses_category_id_idx on expenses (category_id);

-- ---------- budgets ----------
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  monthly_limit numeric(12,2) not null check (monthly_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id)
);

-- ---------- recurring expenses ----------
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
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

-- ---------- default categories ----------
insert into categories (name, icon) values
  ('Groceries', '🛒'),
  ('Dining', '🍽️'),
  ('Transport', '🚗'),
  ('Utilities', '💡'),
  ('Rent', '🏠'),
  ('Entertainment', '🎬'),
  ('Shopping', '🛍️'),
  ('Health', '💊'),
  ('Travel', '✈️'),
  ('Subscriptions', '🔁'),
  ('Education', '📚'),
  ('Other', '📦')
on conflict (name) do nothing;

-- ---------- RLS: disabled, single-user, no auth ----------
-- The anon key gets full read/write. Do NOT expose this DB beyond your own use.
alter table categories disable row level security;
alter table expenses disable row level security;
alter table budgets disable row level security;
alter table recurring_expenses disable row level security;

-- ---------- Storage bucket for receipts ----------
-- Run in Supabase Dashboard > Storage:
--   1. Create a bucket named "receipts"
--   2. Make it PUBLIC (so receipt_url works without signed URLs)
--   3. Policies: allow anon insert + select on the bucket.
