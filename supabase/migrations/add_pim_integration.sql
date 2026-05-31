-- PIM integration: enforce one channel listing per colourway per channel,
-- so upserts (publish / unpublish) update the existing row instead of creating duplicates.

alter table channel_listings
  add constraint channel_listings_colourway_channel_unique
  unique (colourway_id, channel);

-- Extend channel_listings with fields needed to track publish state on the product record.
-- The product is the permanent master; the shoot job is ephemeral and owns none of this.

-- Widen the status enum to include publish failures
alter table channel_listings
  drop constraint if exists channel_listings_status_check;

alter table channel_listings
  add constraint channel_listings_status_check
  check (status in ('draft', 'live', 'error', 'delisted'));

-- The channel's own ID for this product/listing (Shopify product ID, Iconic listing ID, etc.)
-- Used to update an existing listing rather than create a duplicate on republish.
alter table channel_listings
  add column if not exists external_id text;

-- When the listing was last successfully pushed to the channel.
alter table channel_listings
  add column if not exists last_published_at timestamptz;

-- Last error message from a failed publish attempt.
-- Cleared on next successful publish.
alter table channel_listings
  add column if not exists error text;

-- Index for fast lookup of all listings for a product (used by the product page).
create index if not exists channel_listings_product_id_idx
  on channel_listings (product_id);

-- Trigger: keep updated_at current whenever a listing row changes.
create or replace function update_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists channel_listings_updated_at on channel_listings;
create trigger channel_listings_updated_at
  before update on channel_listings
  for each row execute function update_updated_at();
