-- Add Investment and Savings categories for tracking money movement out of a bank account.
-- These are not traditional expenses but represent transfers to investment or savings accounts.
insert into categories (name, icon) values
  ('Investment', '📈'),
  ('Savings', '🏦')
on conflict (name) do nothing;
