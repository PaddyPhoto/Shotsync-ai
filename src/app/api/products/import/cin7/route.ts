import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'
import { Cin7Client, type Cin7ProductRaw } from '@/lib/cin7/client'
import { upsertProducts } from '@/lib/products/upsert'
import type { ImportRow } from '@/lib/products/upsert'

export const maxDuration = 60

function cin7ToImportRows(products: Cin7ProductRaw[]): ImportRow[] {
  return products
    .filter((p) => p.SKU?.trim() && p.Name?.trim())
    .map((p) => ({
      sku: p.SKU.trim().toUpperCase(),
      title: p.Name.trim(),
      category: p.Category?.trim() || undefined,
      colourway: p.Attributes?.['Colour']?.trim()
        || p.Attributes?.['Color']?.trim()
        || 'Default',
      rrp: p.Price ? String(p.Price) : undefined,
      composition: p.Attributes?.['Composition']?.trim()
        || p.Attributes?.['Material']?.trim()
        || undefined,
      fit: p.Attributes?.['Fit']?.trim() || undefined,
      origin: p.Attributes?.['Country Of Origin']?.trim()
        || p.Attributes?.['Origin']?.trim()
        || undefined,
    }))
}

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

  const { data: brand } = await service
    .from('brands')
    .select('id, cin7_account_id, cin7_application_key')
    .eq('org_id', member.org_id)
    .limit(1)
    .single()

  if (!brand?.cin7_account_id || !brand?.cin7_application_key) {
    return NextResponse.json({ error: 'Cin7 not connected' }, { status: 400 })
  }

  const client = new Cin7Client(brand.cin7_account_id, brand.cin7_application_key)
  const cin7Products = await client.listProducts()

  if (!cin7Products.length) {
    return NextResponse.json({ created: 0, updated: 0, errors: [], total: 0 })
  }

  const rows = cin7ToImportRows(cin7Products)
  const result = await upsertProducts(rows, member.org_id, brand.id)
  return NextResponse.json({ ...result, fetched: cin7Products.length })
}
