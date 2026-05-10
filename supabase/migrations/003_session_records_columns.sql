-- Add columns that sync.ts writes but were missing from the initial schema.
-- Safe to run multiple times (IF NOT EXISTS guards).

alter table session_records
  add column if not exists items_correct      integer not null default 0,
  add column if not exists primary_skill_code text    not null default '';
