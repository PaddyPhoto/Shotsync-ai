-- Temporary public bucket for Shopify image uploads.
-- Images are uploaded here from the browser, Shopify fetches them by URL,
-- then the API route deletes them. Max 20MB per file (Shopify's image limit).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shopify-temp',
  'shopify-temp',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own subfolder
CREATE POLICY "Users can upload to shopify-temp"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shopify-temp'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read (bucket is public, but explicit policy for clarity)
CREATE POLICY "Public read shopify-temp"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shopify-temp');

-- Users can delete their own files (client-side cleanup fallback)
CREATE POLICY "Users can delete their own shopify-temp files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shopify-temp'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
