-- Mia Math Tool — Initial Schema
-- Phase 0: Profile-keyed data model from day one.
-- Social features (leaderboards, friend connections) are architecturally additive on top.
-- Run against a Supabase project in EU/IL region.

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table profiles (
  profile_id               uuid primary key default gen_random_uuid(),
  avatar_id                text not null,
  gender                   text not null default 'f' check (gender in ('f', 'm')),
  display_name             text not null,
  onboarding_complete      boolean not null default false,
  diagnostic_completed_at  timestamptz,
  diagnostic_version       integer,
  gap_profile_json         jsonb,
  sessions_completed       integer not null default 0,
  -- Future: parent_id uuid references parents(parent_id)
  created_at               timestamptz not null default now()
);

-- ─── Diagnostic sessions ──────────────────────────────────────────────────────
create table diagnostic_sessions (
  session_id      uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(profile_id) on delete cascade,
  type            text not null check (type in ('onboarding', 'rediagnostic')),
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  phase           text not null default 'entry'
                    check (phase in ('entry', 'verification', 'extension', 'complete')),
  items_answered  integer not null default 0
);

create index on diagnostic_sessions (profile_id);

-- ─── Diagnostic attempts (per-item, append-only) ──────────────────────────────
create table diagnostic_attempts (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(profile_id) on delete cascade,
  session_id        uuid not null references diagnostic_sessions(session_id) on delete cascade,
  item_id           text not null,
  skill_code        text not null,
  answer            jsonb not null,          -- preserves string/number type
  correct           boolean not null,
  signature_hit     text,                    -- ErrorSignatureCode or null
  time_to_answer_ms integer not null,
  sequence_number   integer not null,
  phase             text not null check (phase in ('entry', 'verification', 'extension')),
  created_at        timestamptz not null default now()
);

create index on diagnostic_attempts (profile_id, session_id);
create index on diagnostic_attempts (profile_id, skill_code);

-- ─── Error signatures (one row per misconception per profile) ─────────────────
create table error_signatures (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references profiles(profile_id) on delete cascade,
  signature_code      text not null,         -- ErrorSignatureCode
  confidence          text not null check (confidence in ('confirmed', 'suspected', 'ruled_out')),
  first_detected_at   timestamptz not null default now(),
  last_verified_at    timestamptz not null default now(),
  detection_evidence  jsonb not null default '[]', -- array of item IDs

  unique (profile_id, signature_code)
);

create index on error_signatures (profile_id);

-- ─── Mastery records (one row per skill per profile) ──────────────────────────
create table mastery_records (
  id                      uuid primary key default gen_random_uuid(),
  profile_id              uuid not null references profiles(profile_id) on delete cascade,
  skill_code              text not null,
  status                  text not null check (status in ('שליטה', 'בתהליך', 'טרם נלמד')),
  first_attempt_accuracy  numeric(5,4) not null default 0,  -- 0.0000–1.0000
  item_count              integer not null default 0,
  session_count           integer not null default 0,
  last_practiced_at       timestamptz not null default now(),
  needs_retention_probe   boolean not null default false,
  retention_probe_due_at  timestamptz,

  unique (profile_id, skill_code)
);

create index on mastery_records (profile_id);
create index on mastery_records (profile_id, status);
create index on mastery_records (profile_id, needs_retention_probe)
  where needs_retention_probe = true;

-- ─── Session records (regular practice sessions) — Phase 4 ───────────────────
create table session_records (
  session_id       uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles(profile_id) on delete cascade,
  mode             text not null check (mode in ('time', 'quantity', 'open')),
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  items_answered   integer not null default 0,
  phase_breakdown  jsonb                          -- {new_material: N, blocked: N, ...}
);

create index on session_records (profile_id);

-- ─── Session attempts (per-item during regular sessions) — Phase 4 ───────────
create table session_attempts (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(profile_id) on delete cascade,
  session_id        uuid not null references session_records(session_id) on delete cascade,
  item_id           text not null,
  skill_code        text not null,
  session_phase     text not null check (session_phase in
                      ('new_material', 'blocked_practice', 'spaced_retrieval', 'interleaved')),
  cpa_layer         text not null check (cpa_layer in ('concrete', 'pictorial', 'abstract')),
  answer            jsonb not null,
  correct           boolean not null,
  first_attempt     boolean not null default true,
  time_to_answer_ms integer not null,
  created_at        timestamptz not null default now()
);

create index on session_attempts (profile_id, skill_code);
create index on session_attempts (profile_id, session_id);

-- ─── Item cache — Phase 2 (LLM-generated items, pre-validated) ───────────────
create table item_cache (
  item_id          uuid primary key default gen_random_uuid(),
  skill_code       text not null,
  difficulty       integer not null check (difficulty between 1 and 5),
  error_target     text,                         -- ErrorSignatureCode or null
  cpa_layer        text not null,
  item_json        jsonb not null,               -- full item object
  validated_at     timestamptz not null default now(),
  validation_pass  boolean not null default true,
  times_seen       integer not null default 0
);

create index on item_cache (skill_code, difficulty, cpa_layer);
create index on item_cache (skill_code, error_target) where error_target is not null;
