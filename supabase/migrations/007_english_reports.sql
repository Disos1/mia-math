-- One-way daily summaries from the Mia English exam-prep app
-- (https://disos1.github.io/mia-english/), shown in the daily-summary email.
--
-- The English app keeps its real progress on the tablet (Dima's choice). It only
-- POSTs a small, validated summary to the `english-report` Edge Function, which
-- authenticates the tablet by a pairing key. Only the SHA-256 of that key is
-- stored here; the plaintext lives on the tablet. The key row is inserted out of
-- band (not committed, since this repo is public):
--   insert into public.english_report_keys (key_sha256, profile_id) values ('<sha256 hex>', '<profile uuid>');
--
-- RLS on with no policies and no anon/authenticated grants: only the Edge
-- Functions (service_role) can read or write.

create table if not exists public.english_report_keys (
  key_sha256  text primary key check (key_sha256 ~ '^[0-9a-f]{64}$'),
  profile_id  uuid not null references public.profiles(profile_id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.english_reports (
  profile_id  uuid not null references public.profiles(profile_id) on delete cascade,
  report_day  date not null,
  summary     jsonb not null check (pg_column_size(summary) < 8192),
  updated_at  timestamptz not null default now(),
  primary key (profile_id, report_day)
);

alter table public.english_report_keys enable row level security;
alter table public.english_report_keys force row level security;
alter table public.english_reports enable row level security;
alter table public.english_reports force row level security;

revoke all on table public.english_report_keys from public, anon, authenticated, service_role;
revoke all on table public.english_reports from public, anon, authenticated, service_role;
grant select on table public.english_report_keys to service_role;
grant select, insert, update on table public.english_reports to service_role;

comment on table public.english_report_keys is 'SHA-256 of pairing keys for the Mia English app. service_role read-only.';
comment on table public.english_reports is 'Daily one-way summaries from the Mia English app, for the summary email. service_role only.';
