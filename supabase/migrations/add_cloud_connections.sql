-- Add cloud_connections JSONB column to brands table
-- Run this in Supabase SQL Editor before using cloud storage integrations

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS cloud_connections JSONB DEFAULT NULL;

-- Optional: add a comment describing the schema
COMMENT ON COLUMN brands.cloud_connections IS
'Cloud storage credentials per brand. Shape: { dropbox?: { access_token, refresh_token, account_email, expires_at }, google_drive?: { access_token, refresh_token, email, expires_at }, s3?: { bucket, region, access_key_id, secret_access_key, prefix } }';
