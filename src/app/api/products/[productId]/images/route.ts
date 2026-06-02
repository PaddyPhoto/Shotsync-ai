import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'

type ImagePayload = {
  viewLabel: string
  sortOrder: number
  filename: string
  data: string  // base64-encoded JPEG
}

export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: member } = await service
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!member) return NextResponse.json({ error: 'No org' }, { status: 400 })

  // Verify product belongs to this org
  const { data: product } = await service
    .from('products')
    .select('id')
    .eq('id', params.productId)
    .eq('org_id', member.org_id)
    .single()
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const { listingId, images }: { listingId: string; images: ImagePayload[] } = await req.json()

  if (!listingId || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'Missing listingId or images' }, { status: 400 })
  }

  // Replace existing images for this colourway (re-confirm replaces previous set)
  await service.from('product_images').delete().eq('listing_id', listingId)

  const saved: string[] = []

  for (const img of images) {
    try {
      const ext = img.filename.split('.').pop()?.toLowerCase() ?? 'jpg'
      const storagePath = `product-images/${params.productId}/${listingId}/${String(img.sortOrder).padStart(2, '0')}-${img.viewLabel}.${ext}`

      const buffer = Buffer.from(img.data, 'base64')
      const { error: uploadErr } = await service.storage
        .from('shoots')
        .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true })

      if (uploadErr) continue

      const { data: { publicUrl } } = service.storage.from('shoots').getPublicUrl(storagePath)

      const { data: row } = await service
        .from('product_images')
        .insert({
          product_id: params.productId,
          listing_id: listingId,
          storage_path: storagePath,
          storage_url: publicUrl,
          angle: img.viewLabel,
          sort_order: img.sortOrder,
          original_filename: img.filename,
        })
        .select('id')
        .single()

      if (row) saved.push(row.id)
    } catch {
      // skip individual image failures — partial success is acceptable
    }
  }

  return NextResponse.json({ saved: saved.length })
}
