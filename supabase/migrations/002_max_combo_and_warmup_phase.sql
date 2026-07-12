-- Migration 002 — 2026-07-12
--
-- 1. session_records.max_combo: carry the in-session combo to the cloud so
--    star bonuses survive a device swap. The client already pushes this field
--    and silently retries without it until this migration is applied.
--
-- 2. session_attempts phase check: the session runner has a 'warmup' phase
--    that predates the constraint. Until applied, the client maps warmup →
--    new_material on push; after applying, warmup rows arrive honestly.
--
-- Apply via: supabase db push, or the Supabase dashboard SQL editor.

ALTER TABLE public.session_records
  ADD COLUMN IF NOT EXISTS max_combo integer;

ALTER TABLE public.session_attempts
  DROP CONSTRAINT IF EXISTS session_attempts_session_phase_check;
ALTER TABLE public.session_attempts
  ADD CONSTRAINT session_attempts_session_phase_check
  CHECK (session_phase = ANY (ARRAY['warmup'::text, 'new_material'::text, 'blocked_practice'::text, 'spaced_retrieval'::text, 'interleaved'::text]));
