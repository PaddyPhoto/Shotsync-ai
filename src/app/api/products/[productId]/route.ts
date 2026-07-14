import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'

// Resolve the caller's org. Products are scoped by org_id, so every query must
// filter by it — the service client bypasses RLS, so this is the only guard.
async function callerOrgId(service: ReturnType<typeof createServiceClient>, userId: string) {
  const { data } = await service
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.org_id ?? null
}

// GET /api/products/[productId] — full product detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await params
  const service = createServiceClient()
  const orgId = await callerOrgId(service, user.id)
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const { data, error } = await service
    .from('products')
    .select(`
      id, sku, title, category, gender, season, status,
      product_attributes ( key, value ),
      product_listings (
        id, colour_name, colour_code, rrp, listing_title, listing_description, listing_bullets,
        product_images ( id, storage_url, angle, sort_order, original_filename ),
        product_variants ( id, size, barcode, stock, price ),
        channel_listings ( channel, status, external_id, last_published_at, error )
      )
    `)
    .eq('id', productId)
    .eq('org_id', orgId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data })
}

// Only these columns may be updated by the client — never org_id/brand_id/id.
const EDITABLE = ['sku', 'title', 'category', 'gender', 'season', 'status'] as const

// PATCH /api/products/[productId] — update product fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await params
  const body = await req.json()
  const service = createServiceClient()
  const orgId = await callerOrgId(service, user.id)
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => (EDITABLE as readonly string[]).includes(k)),
  )
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  const { data, error } = await service
    .from('products')
    .update(updates)
    .eq('id', productId)
    .eq('org_id', orgId)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
