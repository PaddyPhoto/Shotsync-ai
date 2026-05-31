import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'

// GET /api/products/[productId] — full product detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await params
  const service = createServiceClient()

  const { data, error } = await service
    .from('products')
    .select(`
      id, sku, title, category, gender, season, status,
      product_attributes ( key, value ),
      product_colourways (
        id, colour_name, colour_code, rrp, listing_title, listing_description, listing_bullets,
        product_images ( id, storage_url, angle, sort_order, original_filename ),
        product_variants ( id, size, barcode, stock, price ),
        channel_listings ( channel, status, external_id, last_published_at, error )
      )
    `)
    .eq('id', productId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data })
}

// PATCH /api/products/[productId] — update product fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await params
  const body = await req.json()
  const service = createServiceClient()

  const { error } = await service
    .from('products')
    .update(body)
    .eq('id', productId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
