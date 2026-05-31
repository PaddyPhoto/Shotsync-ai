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

  const { data: products } = await service
    .from('products')
    .select('id, sku, title, product_colourways(id, colour_name, colour_code)')
    .eq('org_id', member.org_id)
    .in('sku', normalised)

  type ColourwayRow = { id: string; colour_name: string; colour_code: string | null }
  const matches: Record<string, {
    productId: string
    productTitle: string
    colourways: { id: string; name: string; code: string | null }[]
  }> = {}

  for (const p of products ?? []) {
    matches[p.sku] = {
      productId: p.id,
      productTitle: p.title ?? p.sku,
      colourways: (p.product_colourways as ColourwayRow[]).map((cw) => ({
        id: cw.id,
        name: cw.colour_name,
        code: cw.colour_code,
      })),
    }
  }

  return NextResponse.json({ matches })
}
