-- ShotSync.ai Database Schema
-- Run this in your Supabase SQL editor
-- Last updated: April 2026

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ─── Organisations ────────────────────────────────────────────────────────────
create table if not exists orgs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  stripe_customer_id text,
  stripe_subscription_status text,
  created_at timestamptz not null default now()
);

create table if not exists org_members (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique(org_id, user_id)
);

create table if not exists org_invites (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token text not null unique,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table orgs enable row level security;
alter table org_members enable row level security;
alter table org_invites enable row level security;

create policy "Org members can view their org"
  on orgs for select using (
    exists (select 1 from org_members where org_id = orgs.id and user_id = auth.uid())
  );

create policy "Org owners can update their org"
  on orgs for update using (
    exists (select 1 from org_members where org_id = orgs.id and user_id = auth.uid() and role = 'owner')
  );

create policy "Members can view org membership"
  on org_members for select using (
    exists (select 1 from org_members om2 where om2.org_id = org_members.org_id and om2.user_id = auth.uid())
  );

create policy "Owners can manage org members"
  on org_members for all using (
    exists (select 1 from org_members om2 where om2.org_id = org_members.org_id and om2.user_id = auth.uid() and om2.role = 'owner')
  );

create policy "Invites visible to org members"
  on org_invites for select using (
    exists (select 1 from org_members where org_id = org_invites.org_id and user_id = auth.uid())
  );

-- ─── Brands ───────────────────────────────────────────────────────────────────
create table if not exists brands (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  brand_code text not null,
  shopify_store_url text,
  shopify_access_token text,
  logo_color text not null default '#e8d97a',
  images_per_look int not null default 4,
  naming_template text not null default '{BRAND}_{SEQ}_{VIEW}',
  gm_position text check (gm_position in ('first', 'last')),
  created_at timestamptz not null default now()
);

alter table brands enable row level security;

create policy "Org members can manage brands"
  on brands for all using (
    exists (select 1 from org_members where org_id = brands.org_id and user_id = auth.uid())
  );

-- ─── Jobs ────────────────────────────────────────────────────────────────────
create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Untitled Shoot',
  status text not null default 'uploading'
    check (status in ('uploading','processing','grouping','matching','review','exporting','complete','error')),
  pipeline_step int not null default 0,
  total_images int not null default 0,
  processed_images int not null default 0,
  cluster_count int not null default 0,
  error_message text,
  shopify_connected boolean not null default false,
  selected_marketplaces text[] default '{}',
  brand_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Images ──────────────────────────────────────────────────────────────────
create table if not exists images (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references jobs(id) on delete cascade,
  original_filename text not null,
  storage_path text not null,
  storage_url text not null,
  embedding_vector vector(1536),
  cluster_id uuid,
  view_label text not null default 'unknown'
    check (view_label in ('front','back','side','detail','unknown')),
  view_confidence float not null default 0,
  renamed_filename text,
  file_size int not null default 0,
  width int,
  height int,
  status text not null default 'uploaded'
    check (status in ('uploaded','processing','clustered','labeled','renamed')),
  created_at timestamptz not null default now()
);

-- ─── Clusters ────────────────────────────────────────────────────────────────
create table if not exists clusters (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references jobs(id) on delete cascade,
  assigned_sku text,
  assigned_product_name text,
  suggested_skus jsonb not null default '[]',
  missing_views text[] default '{}',
  detected_views text[] default '{}',
  brand text,
  color text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','exported')),
  image_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Add FK from images to clusters
alter table images
  add constraint fk_images_cluster
  foreign key (cluster_id) references clusters(id) on delete set null;

-- ─── SKUs (from Shopify cache) ────────────────────────────────────────────────
create table if not exists skus (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  sku text not null,
  product_name text not null,
  colour text,
  variants jsonb not null default '[]',
  shopify_product_id text not null,
  shopify_handle text not null,
  image_url text,
  synced_at timestamptz not null default now(),
  unique(user_id, sku)
);

-- ─── Exports ─────────────────────────────────────────────────────────────────
create table if not exists exports (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references jobs(id) on delete cascade,
  cluster_id uuid references clusters(id) on delete set null,
  marketplace text not null,
  output_files jsonb not null default '[]',
  download_url text,
  file_size_bytes bigint not null default 0,
  image_count int not null default 0,
  status text not null default 'pending'
    check (status in ('pending','processing','ready','error')),
  created_at timestamptz not null default now()
);

-- ─── RLS Policies ────────────────────────────────────────────────────────────
alter table jobs enable row level security;
alter table images enable row level security;
alter table clusters enable row level security;
alter table skus enable row level security;
alter table exports enable row level security;

-- Jobs: users own their jobs
create policy "Users can manage own jobs"
  on jobs for all using (auth.uid() = user_id);

-- Images: users access images via their jobs
create policy "Users can manage own images"
  on images for all using (
    exists (select 1 from jobs where jobs.id = images.job_id and jobs.user_id = auth.uid())
  );

-- Clusters: via jobs
create policy "Users can manage own clusters"
  on clusters for all using (
    exists (select 1 from jobs where jobs.id = clusters.job_id and jobs.user_id = auth.uid())
  );

-- SKUs: per user
create policy "Users can manage own skus"
  on skus for all using (auth.uid() = user_id);

-- Exports: via jobs
create policy "Users can manage own exports"
  on exports for all using (
    exists (select 1 from jobs where jobs.id = exports.job_id and jobs.user_id = auth.uid())
  );

-- ─── Storage Buckets (run via Supabase dashboard or API) ─────────────────────
-- Create bucket: "shoots" (private)
-- Create bucket: "exports" (private)

-- ─── Updated_at trigger ───────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_jobs_updated_at
  before update on jobs
  for each row execute function update_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_images_job_id on images(job_id);
create index if not exists idx_images_cluster_id on images(cluster_id);
create index if not exists idx_clusters_job_id on clusters(job_id);
create index if not exists idx_exports_job_id on exports(job_id);
create index if not exists idx_skus_user_id on skus(user_id);
