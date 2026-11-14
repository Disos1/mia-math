-- Device-local learning state that must follow the learner to a new device or
-- origin: CPA memory (adaptive start layers + struggle counters) and the
-- all-time mastered-skills high-water mark used by badges.
--
-- Shape (written by src/lib/localStateSync.ts):
--   { "v": 1,
--     "cpaMemory":    { "<skill_code>": { "layer": "pictorial", "struggleSessions": 1 }, ... },
--     "cpaUpdatedAt": "2026-11-14T18:00:00.000Z" | null,
--     "masteredHw":   12 }
--
-- Additive and nullable. Covered by the existing "profiles: own row" RLS
-- policy (auth_user_id = auth.uid()). Safe to run more than once.

alter table profiles
  add column if not exists local_state jsonb;
