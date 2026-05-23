-- Stores App Store installs so we can auto-connect when the merchant signs up.
create table if not exists shopify_app_installs (
  shop          text primary key,
  access_token  text not null,
  installed_at  timestamptz not null default now(),
  claimed_by    uuid references auth.users(id) on delete set null
);

-- Only service role can read/write (no merchant auth at install time).
alter table shopify_app_installs enable row level security;

grant all on shopify_app_installs to service_role;
