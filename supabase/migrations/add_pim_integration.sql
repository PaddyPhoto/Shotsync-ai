-- PIM integration: enforce one channel listing per colourway per channel,
-- so upserts (publish / unpublish) update the existing row instead of creating duplicates.

alter table channel_listings
  add constraint channel_listings_colourway_channel_unique
  unique (colourway_id, channel);
