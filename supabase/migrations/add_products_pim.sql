-- PIM: Product, colourway, image, attribute, variant, and channel listing tables
-- Run in Supabase SQL editor (dev project only while testing)

-- ─── Products ─────────────────────────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  brand_id    uuid not null references brands(id) on delete cascade,
  org_id      uuid not null references orgs(id) on delete cascade,
  sku         text not null,
  title       text,
  category    text,
  gender      text,
  season      text,
  status      text not null default 'draft'
                check (status in ('draft', 'active', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(brand_id, sku)
);

-- ─── Product Colourways ───────────────────────────────────────────────────────
-- One row per colour variant. Listing copy lives here since copy can differ per colourway.
create table if not exists product_colourways (
  id                  uuid primary key default uuid_generate_v4(),
  product_id          uuid not null references products(id) on delete cascade,
  colour_name         text not null,
  colour_code         text,
  rrp                 numeric(10,2),
  listing_title       text,
  listing_description text,
  listing_bullets     jsonb default '[]',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Product Images ───────────────────────────────────────────────────────────
create table if not exists product_images (
  id                uuid primary key default uuid_generate_v4(),
  product_id        uuid not null references products(id) on delete cascade,
  colourway_id      uuid references product_colourways(id) on delete set null,
  storage_path      text,
  storage_url       text,
  angle             text not null default 'unknown',
  sort_order        int  not null default 0,
  original_filename text,
  created_at        timestamptz not null default now()
);

-- ─── Product Attributes ───────────────────────────────────────────────────────
-- Key/value spec data: composition, care, fit, origin, size_range, etc.
create table if not exists product_attributes (
  id         uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  key        text not null,
  value      text not null,
  created_at timestamptz not null default now(),
  unique(product_id, key)
);

-- ─── Product Variants ─────────────────────────────────────────────────────────
-- Size × colourway matrix with stock and price per cell.
create table if not exists product_variants (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references products(id) on delete cascade,
  colourway_id uuid not null references product_colourways(id) on delete cascade,
  size         text not null,
  barcode      text,
  stock        int  not null default 0,
  price        numeric(10,2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(colourway_id, size)
);

-- ─── Channel Listings ─────────────────────────────────────────────────────────
-- Tracks publish status of each product/colourway on each channel.
create table if not exists channel_listings (
  id                 uuid primary key default uuid_generate_v4(),
  product_id         uuid not null references products(id) on delete cascade,
  colourway_id       uuid references product_colourways(id) on delete cascade,
  channel            text not null,
  status             text not null default 'not_listed'
                       check (status in ('not_listed', 'draft', 'live', 'delisted')),
  channel_product_id text,
  channel_data       jsonb default '{}',
  last_synced_at     timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique(product_id, colourway_id, channel)
);

-- ─── Updated_at triggers ──────────────────────────────────────────────────────
create trigger trg_products_updated_at
  before update on products
  for each row execute function update_updated_at();

create trigger trg_product_colourways_updated_at
  before update on product_colourways
  for each row execute function update_updated_at();

create trigger trg_product_variants_updated_at
  before update on product_variants
  for each row execute function update_updated_at();

create trigger trg_channel_listings_updated_at
  before update on channel_listings
  for each row execute function update_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_products_brand_id    on products(brand_id);
create index if not exists idx_products_org_id      on products(org_id);
create index if not exists idx_products_sku         on products(brand_id, sku);
create index if not exists idx_colourways_product   on product_colourways(product_id);
create index if not exists idx_images_product       on product_images(product_id);
create index if not exists idx_images_colourway     on product_images(colourway_id);
create index if not exists idx_attributes_product   on product_attributes(product_id);
create index if not exists idx_variants_product     on product_variants(product_id);
create index if not exists idx_variants_colourway   on product_variants(colourway_id);
create index if not exists idx_channel_listings_product on channel_listings(product_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table products           enable row level security;
alter table product_colourways enable row level security;
alter table product_images     enable row level security;
alter table product_attributes enable row level security;
alter table product_variants   enable row level security;
alter table channel_listings   enable row level security;

create policy "Org members can manage products"
  on products for all using (
    exists (select 1 from org_members where org_id = products.org_id and user_id = auth.uid())
  );

create policy "Org members can manage product colourways"
  on product_colourways for all using (
    exists (
      select 1 from products p
      join org_members om on om.org_id = p.org_id
      where p.id = product_colourways.product_id and om.user_id = auth.uid()
    )
  );

create policy "Org members can manage product images"
  on product_images for all using (
    exists (
      select 1 from products p
      join org_members om on om.org_id = p.org_id
      where p.id = product_images.product_id and om.user_id = auth.uid()
    )
  );

create policy "Org members can manage product attributes"
  on product_attributes for all using (
    exists (
      select 1 from products p
      join org_members om on om.org_id = p.org_id
      where p.id = product_attributes.product_id and om.user_id = auth.uid()
    )
  );

create policy "Org members can manage product variants"
  on product_variants for all using (
    exists (
      select 1 from products p
      join org_members om on om.org_id = p.org_id
      where p.id = product_variants.product_id and om.user_id = auth.uid()
    )
  );

create policy "Org members can manage channel listings"
  on channel_listings for all using (
    exists (
      select 1 from products p
      join org_members om on om.org_id = p.org_id
      where p.id = channel_listings.product_id and om.user_id = auth.uid()
    )
  );

-- ─── Grants ───────────────────────────────────────────────────────────────────
grant all on products           to authenticated;
grant all on product_colourways to authenticated;
grant all on product_images     to authenticated;
grant all on product_attributes to authenticated;
grant all on product_variants   to authenticated;
grant all on channel_listings   to authenticated;
