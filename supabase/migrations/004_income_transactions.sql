-- Income transaction history.
-- Records every money movement on income sources (deduct / add / transfer /
-- balance edit). Rows are retained when a source is deleted (source_id is set
-- null, snapshot labels persist) and archived (not deleted) after 3 months.
-- Run once in the Supabase SQL Editor if your DB was created before this.
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

alter table income_transactions disable row level security;
grant select, insert, update, delete on income_transactions to anon;
