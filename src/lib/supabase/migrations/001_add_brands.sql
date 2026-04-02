-- Migration 001: Multi-brand support
-- Run this in your Supabase SQL editor after the base schema.sql

-- ─── Brands ───────────────────────────────────────────────────────────────────
create table if not exists brands (
  id                   uuid primary key default uuid_generate_v4(),
  org_id               uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  brand_code           text not null check (char_length(brand_code) <= 6),
  shopify_store_url    text,
  shopify_access_token text,
  logo_color           text not null default '#e8d97a',
  created_at           timestamptz not null default now(),
  unique(org_id, brand_code)
);

-- ─── Add brand_id to jobs ─────────────────────────────────────────────────────
alter table jobs
  add column if not exists brand_id uuid references brands(id) on delete set null;

create index if not exists idx_brands_org_id on brands(org_id);
create index if not exists idx_jobs_brand_id on jobs(brand_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table brands enable row level security;

create policy "Users manage own brands"
  on brands for all using (auth.uid() = org_id);
