import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getAuthUser } from '@/lib/supabase/server'

export const maxDuration = 30

/**
 * POST /api/shopify/stage-image
 * Accepts a single JPEG image as FormData, uploads it to the shopify-temp
 * Supabase Storage bucket using the service client (bypasses RLS), and returns
 * the public URL for Shopify to fetch.
 *
 * FormData fields:
 *   file     — the JPEG blob
 *   path     — the storage path (e.g. "temp/brand-id/timestamp_filename.jpg")
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as Blob | null
  const path = form.get('path') as string | null

  if (!file || !path) {
    return NextResponse.json({ error: 'file and path are required' }, { status: 400 })
  }

  const service = createServiceClient()
  const arrayBuffer = await file.arrayBuffer()
  const { error } = await service.storage
    .from('shopify-temp')
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (error) {
    return NextResponse.json({ error: `Storage upload failed: ${error.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = service.storage.from('shopify-temp').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, path })
}
