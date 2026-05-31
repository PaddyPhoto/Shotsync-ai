import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'

async function getOrgId(userId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.org_id ?? null
}

// GET /api/products — list products with colourways and channel status
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ data: [] })

  const service = createServiceClient()
  const { data, error } = await service
    .from('products')
    .select(`
      id, sku, title, category, gender, season, status,
      product_colourways (
        id, colour_name, colour_code,
        product_variants ( stock ),
        channel_listings ( channel, status )
      )
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}

// POST /api/products — create a new product
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ error: 'No org found' }, { status: 400 })

  const service = createServiceClient()

  // Get brand_id for this org
  const { data: brand } = await service
    .from('brands')
    .select('id')
    .eq('org_id', orgId)
    .limit(1)
    .single()

  if (!brand) return NextResponse.json({ error: 'No brand found' }, { status: 400 })

  const body = await req.json()
  const { sku, title, category, gender, season, attributes, colourways } = body

  if (!sku || !title) return NextResponse.json({ error: 'sku and title are required' }, { status: 400 })

  // Create the product
  const { data: product, error: productError } = await service
    .from('products')
    .insert({ org_id: orgId, brand_id: brand.id, sku, title, category, gender, season, status: 'draft' })
    .select('id')
    .single()

  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 })

  // Insert attributes
  if (attributes && Object.keys(attributes).length > 0) {
    await service.from('product_attributes').insert(
      Object.entries(attributes).map(([key, value]) => ({ product_id: product.id, key, value }))
    )
  }

  // Insert colourways + variants
  if (colourways?.length) {
    for (const cw of colourways) {
      const { data: colourway } = await service
        .from('product_colourways')
        .insert({ product_id: product.id, colour_name: cw.name, colour_code: cw.code, rrp: cw.rrp, listing_title: cw.listingTitle, listing_description: cw.listingDescription })
        .select('id')
        .single()

      if (colourway && cw.variants?.length) {
        await service.from('product_variants').insert(
          cw.variants.map((v: { size: string; barcode?: string; stock: number; price: number }) => ({
            product_id: product.id,
            colourway_id: colourway.id,
            size: v.size,
            barcode: v.barcode,
            stock: v.stock ?? 0,
            price: v.price,
          }))
        )
      }
    }
  }

  return NextResponse.json({ data: { id: product.id } }, { status: 201 })
}
