-- Where the class is in the textbook, per strand — so the parent sets it once
-- and it follows the child to every device (tablet, phone, any browser).
--
-- Shape (written by src/lib/curriculum/classPosition.ts):
--   { "units":  { "numbers": "numbers.digit_value", ... },
--     "source": { "numbers": "parent" | "estimate", ... },
--     "setAt":  "2026-09-20T09:00:00.000Z" }
--
-- jsonb, not columns: the strand list belongs to the curriculum file and will
-- grow. Safe to run more than once.

alter table profiles
  add column if not exists class_position jsonb;
