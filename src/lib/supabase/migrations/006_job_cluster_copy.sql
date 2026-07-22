-- 006_job_cluster_copy.sql
-- Persist AI copy on job_clusters so it survives a cross-device reopen of a past
-- job. Until now copy lived only in the browser (IndexedDB) and was lost when a
-- job was reopened on another device. Stores the master copy (title/description/
-- bullets = the Shopify/long version) plus the per-channel variants (marketplace,
-- feed) as JSON. All nullable — old rows and copy-less jobs are unaffected.

ALTER TABLE job_clusters
  ADD COLUMN IF NOT EXISTS copy_title       text,
  ADD COLUMN IF NOT EXISTS copy_description text,
  ADD COLUMN IF NOT EXISTS copy_bullets     jsonb,
  ADD COLUMN IF NOT EXISTS copy_variants    jsonb;
