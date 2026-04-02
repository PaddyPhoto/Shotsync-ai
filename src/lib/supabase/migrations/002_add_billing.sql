-- Migration 002: Add billing / plan support
-- Run after 001_add_brands.sql

-- ── Profiles table ────────────────────────────────────────────────────────────
-- Synced 1-to-1 with auth.users. Stores plan and billing state.

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  plan          text not null default 'free'
                  check (plan in ('free', 'pro', 'business')),
  stripe_customer_id       text unique,
  stripe_subscription_id   text unique,
  stripe_subscription_status text,   -- active, canceled, past_due, etc.
  plan_expires_at          timestamptz,
  exports_this_month       int not null default 0,
  usage_reset_at           timestamptz not null default date_trunc('month', now()),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function update_profiles_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function update_profiles_updated_at();

-- Reset exports_this_month on the 1st of each month (requires pg_cron)
-- Schedule: select cron.schedule('reset-monthly-exports', '0 0 1 * *',
--   'update public.profiles set exports_this_month = 0, usage_reset_at = date_trunc(''month'', now())');

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role (used by webhook) can upsert any profile
-- (Relies on service_role key bypassing RLS)

-- ── Increment exports counter (call from export API) ─────────────────────────
create or replace function increment_exports(user_uuid uuid)
returns void language plpgsql security definer as $$
begin
  -- Reset counter if it's a new month
  update public.profiles
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
  where id = user_uuid;
end;
$$;
