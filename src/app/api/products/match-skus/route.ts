import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
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

  const { skus }: { skus: string[] } = await req.json()
  if (!Array.isArray(skus) || skus.length === 0) {
    return NextResponse.json({ matches: {} })
  }

  const normalised = [...new Set(skus.map((s) => s.trim().toUpperCase()))]

  type ListingRow = { id: string; colour_name: string; colour_code: string | null; rrp: number | null }
  type AttrRow = { key: string; value: string }
  type MatchEntry = {
    productId: string
    productTitle: string
    sku: string
    colourways: { id: string; name: string; code: string | null; rrp: number | null }[]
    attributes: Record<string, string>
    gender: string | null
    season: string | null
    category: string | null
  }

  const { data: products } = await service
    .from('products')
    .select('id, sku, title, category, gender, season, product_attributes(key, value), product_listings(id, colour_name, colour_code, rrp)')
    .eq('org_id', member.org_id)
    .in('sku', normalised)

  const matches: Record<string, MatchEntry> = {}

  for (const p of products ?? []) {
    const attrs: Record<string, string> = {}
    for (const a of (p.product_attributes as AttrRow[])) attrs[a.key] = a.value
    matches[p.sku] = {
      productId: p.id,
      productTitle: p.title ?? p.sku,
      sku: p.sku,
      colourways: (p.product_listings as ListingRow[]).map((cw) => ({ id: cw.id, name: cw.colour_name, code: cw.colour_code, rrp: cw.rrp })),
      attributes: attrs,
      gender: p.gender ?? null,
      season: p.season ?? null,
      category: p.category ?? null,
    }
  }

  return NextResponse.json({ matches })
}
