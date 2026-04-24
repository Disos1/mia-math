-- Mia Math Tool — Auth & Row Level Security
-- Run this migration after 001_initial_schema.sql.
--
-- What this does:
--   1. Links every profile to a Supabase Auth user (auth_user_id column).
--   2. Enables Row Level Security on all tables.
--   3. Creates policies so each authenticated user can only access
--      their own profile and all data belonging to that profile.
--
-- How to apply:
--   Supabase Dashboard → SQL Editor → paste and run.
--   OR: supabase db push (if using the CLI with a linked project).

-- ─── Link profiles to Supabase Auth ──────────────────────────────────────────

alter table profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists profiles_auth_user_id_idx
  on profiles (auth_user_id);

-- ─── Enable RLS on every table ────────────────────────────────────────────────

alter table profiles           enable row level security;
alter table diagnostic_sessions enable row level security;
alter table diagnostic_attempts enable row level security;
alter table error_signatures    enable row level security;
alter table mastery_records     enable row level security;
alter table session_records     enable row level security;
alter table session_attempts    enable row level security;
alter table item_cache          enable row level security;

-- ─── Profiles policy ──────────────────────────────────────────────────────────
-- Users can fully manage their own profile row.

create policy "profiles: own row"
  on profiles for all
  using (auth_user_id = auth.uid());

-- ─── Helper subquery (reused in all child-table policies) ────────────────────
-- Every child table uses:
--   profile_id in (select profile_id from profiles where auth_user_id = auth.uid())
-- This is one cheap index scan (profiles_auth_user_id_idx) per query.

-- ─── Diagnostic sessions ──────────────────────────────────────────────────────

create policy "diagnostic_sessions: own profile"
  on diagnostic_sessions for all
  using (
    profile_id in (
      select profile_id from profiles where auth_user_id = auth.uid()
    )
  );

-- ─── Diagnostic attempts ──────────────────────────────────────────────────────

create policy "diagnostic_attempts: own profile"
  on diagnostic_attempts for all
  using (
    profile_id in (
      select profile_id from profiles where auth_user_id = auth.uid()
    )
  );

-- ─── Error signatures ─────────────────────────────────────────────────────────

create policy "error_signatures: own profile"
  on error_signatures for all
  using (
    profile_id in (
      select profile_id from profiles where auth_user_id = auth.uid()
    )
  );

-- ─── Mastery records ──────────────────────────────────────────────────────────

create policy "mastery_records: own profile"
  on mastery_records for all
  using (
    profile_id in (
      select profile_id from profiles where auth_user_id = auth.uid()
    )
  );

-- ─── Session records ──────────────────────────────────────────────────────────

create policy "session_records: own profile"
  on session_records for all
  using (
    profile_id in (
      select profile_id from profiles where auth_user_id = auth.uid()
    )
  );

-- ─── Session attempts ─────────────────────────────────────────────────────────

create policy "session_attempts: own profile"
  on session_attempts for all
  using (
    profile_id in (
      select profile_id from profiles where auth_user_id = auth.uid()
    )
  );

-- ─── Item cache (shared read-only) ───────────────────────────────────────────
-- Future LLM-generated items are readable by any authenticated user.
-- Only service-role can insert/update.

create policy "item_cache: read for authenticated"
  on item_cache for select
  using (auth.role() = 'authenticated');
