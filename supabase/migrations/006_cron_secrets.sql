-- Locked store for the shared secret that authorizes the daily-summary trigger
-- (applied to production 2026-11-14 as migrations cron_secret +
-- cron_secret_service_role_readonly).
--
-- Only the SHA-256 hash of the secret is stored; the plaintext lives only in the
-- GitHub Actions secret MIA_EMAIL_CRON_SECRET. The hash row is inserted out of band
-- (not committed, since this repo is public):
--   insert into public.cron_secrets (name, secret_sha256) values ('daily-summary', '<sha256 hex>')
--   on conflict (name) do update set secret_sha256 = excluded.secret_sha256, created_at = now();
--
-- RLS on with no policies, no anon/authenticated grants; service_role may only SELECT.

create table if not exists public.cron_secrets (
  name          text primary key,
  secret_sha256 text not null check (secret_sha256 ~ '^[0-9a-f]{64}$'),
  created_at    timestamptz not null default now()
);

alter table public.cron_secrets enable row level security;
alter table public.cron_secrets force row level security;

revoke all on table public.cron_secrets from public, anon, authenticated, service_role;
grant select on table public.cron_secrets to service_role;

comment on table public.cron_secrets is 'Hashes of shared secrets for scheduled triggers. service_role read-only. No anon/authenticated access.';
