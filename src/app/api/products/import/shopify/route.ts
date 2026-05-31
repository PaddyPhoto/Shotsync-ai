import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'
import { ShopifyClient, type ShopifyProductRaw } from '@/lib/shopify/client'
import { getShopifyToken } from '@/lib/shopify/get-token'
import { upsertProducts } from '@/lib/products/upsert'
import type { ImportRow } from '@/lib/products/upsert'

export const maxDuration = 60

// Extract a base parent SKU from an array of variant SKUs by finding the common prefix.
// e.g. ["NS27502-NAVY-XS","NS27502-NAVY-S","NS27502-BLACK-S"] → "NS27502"
function extractBaseSku(skus: string[]): string {
  const valid = skus.filter(Boolean)
  if (!valid.length) return ''
  if (valid.length === 1) return valid[0]
  let prefix = valid[0]
  for (const sku of valid.slice(1)) {
    let i = 0
    while (i < prefix.length && i < sku.length && prefix[i] === sku[i]) i++
    prefix = prefix.slice(0, i)
  }
  return prefix.replace(/[-_\s]+$/, '')
}

function shopifyToImportRows(products: ShopifyProductRaw[]): ImportRow[] {
  const rows: ImportRow[] = []

  for (const product of products) {
    const colorIdx = product.options.findIndex((o) => /colou?r/i.test(o.name))
    const sizeIdx  = product.options.findIndex((o) => /size/i.test(o.name))

    // option values are option1/2/3 in order of the product.options array
    const getOpt = (v: ShopifyProductRaw['variants'][0], idx: number) =>
      idx === 0 ? v.option1 : idx === 1 ? v.option2 : idx === 2 ? v.option3 : null

    const baseSku = extractBaseSku(product.variants.map((v) => v.sku))
      || String(product.id)

    // Group variants by colour
    const byColor = new Map<string, ShopifyProductRaw['variants']>()
    for (const variant of product.variants) {
      const color = colorIdx >= 0 ? (getOpt(variant, colorIdx) ?? 'Default') : 'Default'
      if (!byColor.has(color)) byColor.set(color, [])
      byColor.get(color)!.push(variant)
    }

    for (const [color, variants] of byColor) {
      const sizes = sizeIdx >= 0
        ? [...new Set(variants.map((v) => getOpt(v, sizeIdx)).filter(Boolean))].join('|')
        : undefined
      rows.push({
        sku: baseSku,
        title: product.title,
        category: product.product_type || undefined,
        colourway: color,
        rrp: variants[0]?.price || undefined,
        sizes: sizes || undefined,
      })
    }
  }

  return rows
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
    .select('id, shopify_store_url')
    .eq('org_id', member.org_id)
    .limit(1)
    .single()

  if (!brand?.shopify_store_url) {
    return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 })
  }

  const token = await getShopifyToken(brand.id, service)
  if (!token) {
    return NextResponse.json({ error: 'Shopify token unavailable — reconnect in Brand Settings' }, { status: 400 })
  }

  const client = new ShopifyClient(brand.shopify_store_url, token)
  const shopifyProducts = await client.listProducts()

  if (!shopifyProducts.length) {
    return NextResponse.json({ created: 0, updated: 0, errors: [], total: 0 })
  }

  const rows = shopifyToImportRows(shopifyProducts)
  const result = await upsertProducts(rows, member.org_id, brand.id)
  return NextResponse.json({ ...result, fetched: shopifyProducts.length })
}
