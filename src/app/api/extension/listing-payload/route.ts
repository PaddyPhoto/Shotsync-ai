import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

async function resolveOrgId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const service = createServiceClient()
  const user = await getAuthUser(req)
  if (user) {
    const { data: member } = await service.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
    return member?.org_id ?? null
  }
  if (token.startsWith('ss_')) {
    const { data: org } = await service.from('orgs').select('id').eq('extension_token', token).single()
    return org?.id ?? null
  }
  return null
}

export async function POST(req: NextRequest) {
  const orgId = await resolveOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const { productId, listingId, channel } = await req.json()
  if (!productId || !listingId || !channel) {
    return NextResponse.json({ error: 'Missing productId, listingId or channel' }, { status: 400, headers: CORS })
  }

  const service = createServiceClient()

  const { data: product } = await service
    .from('products')
    .select(`
      id, sku, title, category, gender, season,
      product_attributes ( key, value ),
      product_listings (
        id, colour_name, colour_code, rrp, listing_title, listing_description,
        product_images ( id, storage_url, angle, sort_order, original_filename ),
        product_variants ( id, size, barcode, stock, price )
      )
    `)
    .eq('id', productId)
    .eq('org_id', orgId)
    .single()

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: CORS })

  const colourway = (product.product_listings as {
    id: string; colour_name: string; colour_code: string | null; rrp: number | null
    listing_title: string | null; listing_description: string | null
    product_images: { storage_url: string | null; angle: string; sort_order: number; original_filename: string | null }[]
    product_variants: { size: string; barcode: string | null; stock: number | null; price: number | null }[]
  }[]).find((cw) => cw.id === listingId)

  if (!colourway) return NextResponse.json({ error: 'Listing not found' }, { status: 404, headers: CORS })

  const attrs: Record<string, string> = {}
  for (const a of (product.product_attributes as { key: string; value: string }[])) attrs[a.key] = a.value

  const images = [...(colourway.product_images ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({ angle: img.angle, url: img.storage_url ?? '', filename: img.original_filename ?? '' }))

  const variants = (colourway.product_variants ?? []).map((v) => ({
    size: v.size,
    barcode: v.barcode ?? '',
    stock: v.stock ?? 0,
    price: v.price ?? colourway.rrp ?? 0,
  }))

  const payload = {
    title: colourway.listing_title ?? `${product.title ?? product.sku} — ${colourway.colour_name}`,
    description: colourway.listing_description ?? '',
    category: product.category ?? '',
    gender: product.gender ?? '',
    colour: colourway.colour_name,
    rrp: colourway.rrp ?? null,
    attributes: attrs,
    variants,
    images,
    channel,
  }

  return NextResponse.json(payload, { headers: CORS })
}
