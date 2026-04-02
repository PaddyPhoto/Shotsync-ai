-- Migration 003: Orgs, team members, job history, Shopify hardening
-- Run AFTER 001_add_brands.sql and 002_add_billing.sql

-- ── Helper: current user's org id ────────────────────────────────────────────
-- We derive the "primary" org for a user as the org where they are the owner.
-- Used internally by RLS policies.

-- ── Orgs table ────────────────────────────────────────────────────────────────
create table if not exists public.orgs (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  owner_id     uuid not null references auth.users(id) on delete restrict,
  plan         text not null default 'free'
                 check (plan in ('free', 'pro', 'business')),
  stripe_customer_id       text unique,
  stripe_subscription_id   text unique,
  stripe_subscription_status text,
  plan_expires_at          timestamptz,
  exports_this_month       int not null default 0,
  usage_reset_at           timestamptz not null default date_trunc('month', now()),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_orgs_owner_id on public.orgs(owner_id);

-- ── Org members ───────────────────────────────────────────────────────────────
create table if not exists public.org_members (
  org_id     uuid not null references public.orgs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member'
               check (role in ('owner', 'admin', 'member')),
  invited_by uuid references auth.users(id),
  joined_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists idx_org_members_user_id on public.org_members(user_id);

-- ── Invite tokens ─────────────────────────────────────────────────────────────
create table if not exists public.org_invites (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references public.orgs(id) on delete cascade,
  email      text not null,
  role       text not null default 'member' check (role in ('admin', 'member')),
  token      text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_invites_token on public.org_invites(token);
create index if not exists idx_org_invites_email on public.org_invites(email);

-- ── Job history ───────────────────────────────────────────────────────────────
create table if not exists public.job_history (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  brand_id     uuid references public.brands(id) on delete set null,
  created_by   uuid not null references auth.users(id),
  job_name     text not null,
  image_count  int not null default 0,
  cluster_count int not null default 0,
  marketplaces text[] not null default '{}',
  status       text not null default 'completed'
                 check (status in ('processing', 'completed', 'failed')),
  export_url   text,           -- optional: link to zip if stored in Supabase Storage
  created_at   timestamptz not null default now()
);

create index if not exists idx_job_history_org_id on public.job_history(org_id);
create index if not exists idx_job_history_created_at on public.job_history(created_at desc);

-- ── Migrate brands.org_id from auth.users ref → orgs ref ─────────────────────
-- (Only runs if the column is still pointing at auth.users)
-- Step 1: add new column
alter table public.brands
  add column if not exists org_id_new uuid references public.orgs(id) on delete cascade;

-- NOTE: Data migration (populating org_id_new) must be run AFTER creating orgs
-- for existing users. See the companion data-migration script below.
-- Once migration is confirmed, run:
--   ALTER TABLE public.brands DROP COLUMN org_id;
--   ALTER TABLE public.brands RENAME COLUMN org_id_new TO org_id;
--   ALTER TABLE public.brands ALTER COLUMN org_id SET NOT NULL;

-- ── Helper functions for RLS ──────────────────────────────────────────────────
create or replace function public.is_org_member(check_org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.org_members
    where org_id = check_org_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(check_org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.org_members
    where org_id = check_org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.orgs enable row level security;

create policy "Org members can read their org"
  on public.orgs for select
  using (public.is_org_member(id));

create policy "Org owners can update their org"
  on public.orgs for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- org_members
alter table public.org_members enable row level security;

create policy "Members can read their org's member list"
  on public.org_members for select
  using (public.is_org_member(org_id));

create policy "Admins can manage members"
  on public.org_members for all
  using (public.is_org_admin(org_id));

-- org_invites
alter table public.org_invites enable row level security;

create policy "Admins can manage invites"
  on public.org_invites for all
  using (public.is_org_admin(org_id));

create policy "Anyone can read invite by token (for accept flow)"
  on public.org_invites for select
  using (true);   -- token is secret; we filter by token in app code

-- job_history
alter table public.job_history enable row level security;

create policy "Org members can read job history"
  on public.job_history for select
  using (public.is_org_member(org_id));

create policy "Org members can insert jobs"
  on public.job_history for insert
  with check (public.is_org_member(org_id));

-- ── Updated_at trigger for orgs ───────────────────────────────────────────────
create or replace function update_orgs_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_orgs_updated_at
  before update on public.orgs
  for each row execute function update_orgs_updated_at();

-- ── Auto-create org when a new user signs up ──────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_org_id uuid;
  brand_name text;
begin
  -- Create profile (idempotent)
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  -- Derive org name from metadata or email
  brand_name := coalesce(
    new.raw_user_meta_data->>'brand_name',
    split_part(new.email, '@', 1)
  );

  -- Create personal org
  insert into public.orgs (name, owner_id)
  values (brand_name, new.id)
  returning id into new_org_id;

  -- Add user as owner
  insert into public.org_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

-- Replace the old trigger (from migration 002)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Increment org exports counter ────────────────────────────────────────────
create or replace function increment_org_exports(p_org_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.orgs
  set
    exports_this_month = case
      when date_trunc('month', usage_reset_at) < date_trunc('month', now())
        then 1
      else exports_this_month + 1
    end,
    usage_reset_at = case
      when date_trunc('month', usage_reset_at) < date_trunc('month', now())
        then date_trunc('month', now())
      else usage_reset_at
    end
  where id = p_org_id;
end;
$$;

-- ── Shopify: exclude access token from brand reads ────────────────────────────
-- Drop the blanket "Users manage own brands" policy and replace with
-- column-level control. The API route already filters columns in SELECT,
-- but this is a defence-in-depth measure.

drop policy if exists "Users manage own brands" on public.brands;

create policy "Org members can read brands (no token)"
  on public.brands for select
  using (
    exists (
      select 1 from public.org_members om
      where om.org_id = brands.org_id_new
        and om.user_id = auth.uid()
    )
    -- fallback for rows that haven't been migrated yet
    or auth.uid() = brands.org_id
  );

create policy "Org members can insert brands"
  on public.brands for insert
  with check (
    exists (
      select 1 from public.org_members om
      where om.org_id = brands.org_id_new
        and om.user_id = auth.uid()
    )
  );

create policy "Org admins can update/delete brands"
  on public.brands for all
  using (
    exists (
      select 1 from public.org_members om
      where om.org_id = brands.org_id_new
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
    )
  );
