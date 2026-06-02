import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function GET(req: NextRequest) {
  const orgId = await resolveOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const service = createServiceClient()

  const { data: products } = await service
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
    .eq('org_id', orgId)
    .order('sku', { ascending: true })

  type ProductRow = { id: string; sku: string; title: string | null; category: string | null; gender: string | null; season: string | null; product_attributes: { key: string; value: string }[]; product_listings: { id: string; colour_name: string; colour_code: string | null; rrp: number | null; listing_title: string | null; listing_description: string | null; product_images: { id: string; storage_url: string | null; angle: string; sort_order: number; original_filename: string | null }[]; product_variants: { id: string; size: string; barcode: string | null; stock: number | null; price: number | null }[] }[] }
  const result = (products ?? []).map((p: ProductRow) => {
    const attrs: Record<string, string> = {}
    for (const a of (p.product_attributes as { key: string; value: string }[]) ?? []) attrs[a.key] = a.value

    return {
      id: p.id,
      sku: p.sku,
      title: p.title ?? p.sku,
      category: p.category ?? null,
      gender: p.gender ?? null,
      season: p.season ?? null,
      attributes: attrs,
      colourways: (p.product_listings as {
        id: string; colour_name: string; colour_code: string | null; rrp: number | null
        listing_title: string | null; listing_description: string | null
        product_images: { id: string; storage_url: string | null; angle: string; sort_order: number; original_filename: string | null }[]
        product_variants: { id: string; size: string; barcode: string | null; stock: number | null; price: number | null }[]
      }[]).map((cw) => ({
        id: cw.id,
        name: cw.colour_name,
        hex: cw.colour_code ?? '#cccccc',
        rrp: cw.rrp ?? null,
        listingTitle: cw.listing_title ?? `${p.title ?? p.sku} — ${cw.colour_name}`,
        listingDescription: cw.listing_description ?? null,
        images: [...(cw.product_images ?? [])]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((img) => ({
            angle: img.angle,
            url: img.storage_url ?? '',
            filename: img.original_filename ?? '',
          })),
        variants: (cw.product_variants ?? []).map((v) => ({
          size: v.size,
          barcode: v.barcode ?? '',
          stock: v.stock ?? 0,
          price: v.price ?? cw.rrp ?? 0,
        })),
      })),
    }
  })

  return NextResponse.json(result, { headers: CORS })
}
