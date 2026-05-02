import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getAuthUser } from '@/lib/supabase/server'
import { ShopifyClient } from '@/lib/shopify/client'

export const maxDuration = 60

/**
 * POST /api/shopify/upload
 *
 * Creates Shopify draft product listings from confirmed clusters.
 * Images are passed as public Supabase Storage URLs (uploaded directly
 * from the browser — no image data passes through this function).
 * Temp storage files are deleted after Shopify confirms each product.
 *
 * Body:
 * {
 *   brand_id: string
 *   vendor?: string
 *   clusters: [{
 *     sku: string
 *     productName: string
 *     color: string
 *     images: [{ src: string; filename: string }]
 *     copy?: { title: string; description: string; bullets: string[] }
 *   }]
 *   tempPaths: string[]   // Supabase Storage paths to delete after upload
 * }
 */
export async function POST(req: NextRequest) {
  console.log('[shopify-upload] POST received')
  const user = await getAuthUser(req)
  if (!user) {
    console.log('[shopify-upload] auth failed — no user')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.log('[shopify-upload] authed as', user.id)

  const service = createServiceClient()

  const body = await req.json()
  const { brand_id, vendor = '', clusters, tempPaths = [] } = body as {
    brand_id: string
    vendor?: string
    clusters: {
      sku: string
      productName: string
      color: string
      images: { src?: string; base64?: string; filename: string }[]
      copy?: { title: string; description: string; bullets: string[] }
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
    status: 'created' | 'error'
    adminUrl?: string
    message?: string
  }[] = []

  for (const cluster of clusters) {
    try {
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

  // Clean up temp Supabase Storage files regardless of Shopify outcome
  if (tempPaths.length > 0) {
    await service.storage.from('shopify-temp').remove(tempPaths).catch(() => {})
  }

  const created = results.filter((r) => r.status === 'created').length
  const failed = results.filter((r) => r.status === 'error').length

  return NextResponse.json({ data: { results, created, failed } })
}
