-- ── Migration 005: background-removal usage log ─────────────────────────────
-- Optional audit trail for metered background removal ($0.16 AUD/image). Stripe
-- invoice items are the source of truth for billing; this table is a local log
-- for reconciliation/analytics. The billing route writes it best-effort, so
-- billing works even before this is run — run it to start logging.
--
-- Run once in the Supabase SQL editor.

create table if not exists public.bg_removal_usage (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.orgs(id) on delete cascade,
  images_count integer not null,
  job_name text,
  stripe_invoice_item_id text,
  created_at timestamptz default now()
);

create index if not exists bg_removal_usage_org_id_idx on public.bg_removal_usage(org_id);

-- Written only by the service role (billing route); not read by clients directly.
-- Enable RLS with no policies so it is never exposed to anon/authenticated.
alter table public.bg_removal_usage enable row level security;
