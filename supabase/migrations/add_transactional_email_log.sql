-- Tracks transactional emails sent per user so re-engagement sequences
-- don't repeat. Without this table the history check always returns empty
-- and email 1 fires on every daily cron run.

create table if not exists public.transactional_email_log (
  id              uuid primary key default uuid_generate_v4(),
  email           text not null,
  template        text not null,
  sequence_number int  not null default 1,
  sent_at         timestamptz not null default now()
);

create index if not exists idx_email_log_email_template
  on public.transactional_email_log (email, template);

alter table public.transactional_email_log enable row level security;

-- Only the service role (used by cron + admin routes) can read/write.
-- No user-facing policies needed.
grant select, insert on public.transactional_email_log to service_role;
