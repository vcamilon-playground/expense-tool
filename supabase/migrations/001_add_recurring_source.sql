-- Add 'recurring' to the expenses.source check constraint.
-- Required for the manual payment confirmation flow on the Recurring page.
-- Run once in the Supabase SQL Editor if your DB was created before this was added.
alter table expenses drop constraint if exists expenses_source_check;
alter table expenses add constraint expenses_source_check check (source in ('manual','receipt','recurring'));
