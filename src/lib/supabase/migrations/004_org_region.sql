-- ── Migration 004: org region (AU vs rest-of-world) ──────────────────────────
-- Adds a binary region flag to orgs so the app can show region-appropriate export
-- destinations. 'au' = Australia (ANZ marketplaces), 'us' = everyone else for now
-- (rest-of-world; UK/EU to be scoped later).
--
-- Run once in the Supabase SQL editor.

-- 1. Add the column. Adding a NOT NULL column with default 'au' backfills every
--    EXISTING org to 'au' (all current customers are Australian). Then flip the
--    default to 'us' so NEW orgs default to rest-of-world.
alter table public.orgs
  add column if not exists region text not null default 'au'
  check (region in ('au', 'us'));

alter table public.orgs
  alter column region set default 'us';

-- 2. New-user trigger: set the org's region from signup metadata (timezone-inferred
--    on the client), validated to the allowed set, defaulting to 'us'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_org_id uuid;
  brand_name text;
  org_region text;
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

  -- Region from metadata (client-inferred), validated; default 'us'
  org_region := case
    when new.raw_user_meta_data->>'region' = 'au' then 'au'
    else 'us'
  end;

  -- Create personal org
  insert into public.orgs (name, owner_id, region)
  values (brand_name, new.id, org_region)
  returning id into new_org_id;

  -- Add user as owner
  insert into public.org_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

-- 3. Dedicated RPC to read the caller's org region (SECURITY DEFINER bypasses the
--    PostgREST schema cache, same pattern as get_org_for_user). Picks the user's
--    first org.
create or replace function public.get_org_region(p_user_id uuid)
returns text language sql security definer stable as $$
  select o.region
  from public.orgs o
  join public.org_members m on m.org_id = o.id
  where m.user_id = p_user_id
  order by m.created_at asc
  limit 1;
$$;

grant execute on function public.get_org_region(uuid) to authenticated, anon, service_role;
