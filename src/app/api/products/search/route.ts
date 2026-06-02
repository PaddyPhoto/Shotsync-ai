import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ data: [] })

  const service = createServiceClient()

  const { data: member } = await service
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!member) return NextResponse.json({ data: [] })

  const { data: products } = await service
    .from('products')
    .select('id, sku, title, category, gender, season, product_attributes(key, value), product_listings(id, colour_name, colour_code, rrp)')
    .eq('org_id', member.org_id)
    .or(`sku.ilike.${q}%,title.ilike.%${q}%`)
    .order('sku', { ascending: true })
    .limit(12)

  type ListingRow = { id: string; colour_name: string; colour_code: string | null; rrp: number | null }
  type AttrRow = { key: string; value: string }

  const data = (products ?? []).map((p: { id: string; sku: string; title: string | null; category: string | null; gender: string | null; season: string | null; product_attributes: AttrRow[]; product_listings: ListingRow[] }) => {
    const attrs: Record<string, string> = {}
    for (const a of (p.product_attributes as AttrRow[])) attrs[a.key] = a.value
    return {
      productId: p.id,
      productTitle: p.title ?? p.sku,
      sku: p.sku,
      colourways: (p.product_listings as ListingRow[]).map((cw) => ({
        id: cw.id,
        name: cw.colour_name,
        code: cw.colour_code,
        rrp: cw.rrp,
      })),
      attributes: attrs,
      gender: p.gender ?? null,
      season: p.season ?? null,
      category: p.category ?? null,
    }
  })

  return NextResponse.json({ data })
}
