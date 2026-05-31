-- Soft-delete support for categories.
-- Adds an active flag so "deleted" categories are hidden from dropdowns
-- but their FK references remain intact on existing expense records.
alter table categories add column if not exists active boolean not null default true;
