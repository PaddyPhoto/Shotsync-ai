import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getAuthUser } from '@/lib/supabase/server'
import { ShopifyClient, type ShopifyMetafield } from '@/lib/shopify/client'

export const maxDuration = 60

/**
 * POST /api/shopify/upload
 *
 * Creates Shopify draft product listings from confirmed clusters.
 * Images are passed as public Supabase Storage URLs.
 * Full enrichment flows through: price, product_type, and metafields
 * for all style list metadata (composition, care, fit, etc.).
 */
export async function POST(req: NextRequest) {
  console.log('[shopify-upload] POST received')
  const user = await getAuthUser(req)
  if (!user) {
    console.log('[shopify-upload] auth failed — no user')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  const body = await req.json()
  const { brand_id, vendor = '', clusters, tempPaths = [] } = body as {
    brand_id: string
    vendor?: string
    clusters: {
      sku: string
      productName: string
      color: string
      colourCode?: string
      styleNumber?: string
      garmentCategory?: string | null
      images: { src?: string; base64?: string; filename: string }[]
      copy?: { title: string; description: string; bullets: string[] }
      styleEntry?: {
        composition?: string
        care?: string
        fit?: string
        length?: string
        rrp?: string
        season?: string
        occasion?: string
        gender?: string
        subCategory?: string
        origin?: string
        sizeRange?: string
      }
    }[]
    tempPaths?: string[]
  }

  if (!brand_id || !Array.isArray(clusters) || clusters.length === 0) {
    return NextResponse.json({ error: 'brand_id and clusters are required' }, { status: 400 })
  }

  const { data: brand, error: brandErr } = await service
    .from('brands')
    .select('shopify_store_url, shopify_access_token, name')
    .eq('id', brand_id)
    .single()

  if (brandErr || !brand?.shopify_store_url || !brand?.shopify_access_token) {
    return NextResponse.json({ error: 'Brand has no Shopify credentials configured' }, { status: 400 })
  }

  const client = new ShopifyClient(brand.shopify_store_url, brand.shopify_access_token)
  const brandVendor = vendor || brand.name || ''

  const results: {
    sku: string
    status: 'created' | 'updated' | 'error'
    adminUrl?: string
    message?: string
  }[] = []

  for (const cluster of clusters) {
    try {
      const existing = await client.findProductBySku(cluster.sku)

      if (existing) {
        await client.appendImages(existing.id, cluster.images)
        results.push({ sku: cluster.sku, status: 'updated', adminUrl: existing.adminUrl })
      } else {
        const se = cluster.styleEntry ?? {}

        // AI copy → body HTML
        let bodyHtml = ''
        if (cluster.copy?.description) {
          const bulletHtml = cluster.copy.bullets?.length
            ? `<ul>${cluster.copy.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`
            : ''
          bodyHtml = `<p>${cluster.copy.description}</p>${bulletHtml}`
        }

        // RRP → variant price
        const price = se.rrp ? parseFloat(se.rrp.replace(/[^0-9.]/g, '')) || 0 : 0

        // Build metafields from all available enrichment
        const metafields: ShopifyMetafield[] = []
        const addMeta = (key: string, value: string | undefined) => {
          if (value) metafields.push({ namespace: 'custom', key, value, type: 'single_line_text_field' })
        }
        addMeta('composition', se.composition)
        addMeta('care_instructions', se.care)
        addMeta('fit', se.fit)
        addMeta('length', se.length)
        addMeta('season', se.season)
        addMeta('gender', se.gender)
        addMeta('occasion', se.occasion)
        addMeta('sub_category', se.subCategory)
        addMeta('country_of_origin', se.origin)
        addMeta('size_range', se.sizeRange)
        addMeta('colour_code', cluster.colourCode)
        addMeta('style_number', cluster.styleNumber)

        const result = await client.createProduct({
          title: cluster.copy?.title || cluster.productName || cluster.sku,
          sku: cluster.sku,
          vendor: brandVendor,
          color: cluster.color || undefined,
          bodyHtml,
          price,
          productType: cluster.garmentCategory || '',
          metafields,
          images: cluster.images,
        })

        if (!result) {
          results.push({ sku: cluster.sku, status: 'error', message: 'Shopify API rejected the product' })
        } else {
          results.push({ sku: cluster.sku, status: 'created', adminUrl: result.adminUrl })
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      results.push({ sku: cluster.sku, status: 'error', message })
    }
  }

  if (tempPaths.length > 0) {
    await service.storage.from('shopify-temp').remove(tempPaths).catch(() => {})
  }

  const created = results.filter((r) => r.status === 'created').length
  const failed = results.filter((r) => r.status === 'error').length

  return NextResponse.json({ data: { results, created, failed } })
}
