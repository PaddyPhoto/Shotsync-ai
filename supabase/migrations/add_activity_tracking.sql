-- Track last dashboard activity per org (used for re-engagement emails)
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS re_engagement_sent_at timestamptz;
