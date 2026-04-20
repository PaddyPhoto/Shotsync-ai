import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getAuthUser } from '@/lib/supabase/server'
import { ShopifyClient } from '@/lib/shopify/client'

/**
 * POST /api/shopify/upload
 *
 * Creates new Shopify product listings as drafts from confirmed clusters.
 * Each cluster becomes one product with a variant SKU and all its images.
 * Products are created in Draft status so the ecommerce coordinator can
 * review, set pricing, and publish.
 *
 * Body:
 * {
 *   brand_id: string
 *   vendor: string              // brand name shown on Shopify product
 *   clusters: [{
 *     sku: string
 *     productName: string
 *     color: string
 *     images: [{
 *       filename: string
 *       base64: string          // base64-encoded image (no data: prefix)
 *     }]
 *     copy?: { title: string; description: string; bullets: string[] }
 *   }]
 * }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const body = await req.json()
  const { brand_id, vendor = '', clusters } = body as {
    brand_id: string
    vendor?: string
    clusters: {
      sku: string
      productName: string
      color: string
      images: { filename: string; base64: string }[]
      copy?: { title: string; description: string; bullets: string[] }
    }[]
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
    status: 'created' | 'error'
    adminUrl?: string
    message?: string
  }[] = []

  for (const cluster of clusters) {
    try {
      // Build body HTML from AI copy if available, otherwise empty
      let bodyHtml = ''
      if (cluster.copy?.description) {
        const bulletHtml = cluster.copy.bullets?.length
          ? `<ul>${cluster.copy.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`
          : ''
        bodyHtml = `<p>${cluster.copy.description}</p>${bulletHtml}`
      }

      const result = await client.createProduct({
        title: cluster.copy?.title || cluster.productName || cluster.sku,
        sku: cluster.sku,
        vendor: brandVendor,
        color: cluster.color || undefined,
        bodyHtml,
        images: cluster.images,
      })

      if (!result) {
        results.push({ sku: cluster.sku, status: 'error', message: 'Shopify API rejected the product' })
      } else {
        results.push({ sku: cluster.sku, status: 'created', adminUrl: result.adminUrl })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      results.push({ sku: cluster.sku, status: 'error', message })
    }
  }

  const created = results.filter((r) => r.status === 'created').length
  const failed = results.filter((r) => r.status === 'error').length

  return NextResponse.json({ data: { results, created, failed } })
}
