-- Support Shopify expiring offline tokens (issued after enabling token expiry in Partner Dashboard).
-- refresh_token is used to obtain a new access_token when it expires.
-- token_expires_at is null for legacy non-expiring tokens (those will 403 and need reconnect).
alter table brands
  add column if not exists shopify_refresh_token text,
  add column if not exists shopify_token_expires_at timestamptz;
