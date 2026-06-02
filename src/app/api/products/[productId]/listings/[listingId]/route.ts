import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string; listingId: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, listingId } = await params
  const body = await req.json()
  const service = createServiceClient()

  const { data: member } = await service
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!member) return NextResponse.json({ error: 'No org' }, { status: 400 })

  // Verify the colourway belongs to a product in this org
  const { data: cw } = await service
    .from('product_listings')
    .select('id, product_id, products!inner(org_id)')
    .eq('id', listingId)
    .eq('product_id', productId)
    .single()

  if (!cw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ['listing_title', 'listing_description', 'listing_bullets', 'colour_name', 'colour_code', 'rrp']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const { error } = await service
    .from('product_listings')
    .update(update)
    .eq('id', listingId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
