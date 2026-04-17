import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getAuthUser } from '@/lib/supabase/server'
import { ShopifyClient } from '@/lib/shopify/client'

/**
 * POST /api/shopify/upload
 *
 * Uploads processed images directly to Shopify product listings.
 *
 * Body:
 * {
 *   brand_id: string
 *   replace: boolean           // whether to clear existing images first
 *   clusters: [{
 *     sku: string              // used to find the matching Shopify product
 *     images: [{
 *       filename: string
 *       base64: string         // base64-encoded JPEG (no data: prefix)
 *       position: number
 *     }]
 *   }]
 * }
 *
 * Returns per-cluster results so the client can show progress.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const body = await req.json()
  const { brand_id, clusters, replace = false } = body as {
    brand_id: string
    replace: boolean
    clusters: {
      sku: string
      images: { filename: string; base64: string; position: number }[]
      copy?: { title: string; description: string; bullets: string[] }
    }[]
  }

  if (!brand_id || !Array.isArray(clusters) || clusters.length === 0) {
    return NextResponse.json({ error: 'brand_id and clusters are required' }, { status: 400 })
  }

  // Fetch brand's Shopify credentials (server-side only — token never exposed to client)
  const { data: brand, error: brandErr } = await service
    .from('brands')
    .select('shopify_store_url, shopify_access_token')
    .eq('id', brand_id)
    .single()

  if (brandErr || !brand?.shopify_store_url || !brand?.shopify_access_token) {
    return NextResponse.json({ error: 'Brand has no Shopify credentials configured' }, { status: 400 })
  }

  const client = new ShopifyClient(brand.shopify_store_url, brand.shopify_access_token)

  const results: { sku: string; status: 'uploaded' | 'not_found' | 'error'; uploaded: number; message?: string }[] = []

  for (const cluster of clusters) {
    try {
      const productId = await client.findProductIdBySku(cluster.sku)

      if (!productId) {
        results.push({ sku: cluster.sku, status: 'not_found', uploaded: 0, message: `No Shopify product found with SKU "${cluster.sku}"` })
        continue
      }

      if (replace) {
        await client.clearProductImages(productId)
      }

      let uploaded = 0
      for (const img of cluster.images) {
        const ok = await client.uploadProductImage(productId, img.base64, img.filename, img.position)
        if (ok) uploaded++
      }

      // Update product copy (title + description) if provided
      if (cluster.copy?.title) {
        const bulletHtml = cluster.copy.bullets?.length
          ? `<ul>${cluster.copy.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`
          : ''
        const bodyHtml = `<p>${cluster.copy.description ?? ''}</p>${bulletHtml}`
        await client.updateProductCopy(productId, cluster.copy.title, bodyHtml)
      }

      results.push({ sku: cluster.sku, status: 'uploaded', uploaded })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      results.push({ sku: cluster.sku, status: 'error', uploaded: 0, message })
    }
  }

  const totalUploaded = results.reduce((s, r) => s + r.uploaded, 0)
  const failed = results.filter((r) => r.status !== 'uploaded').length

  return NextResponse.json({ data: { results, totalUploaded, failed } })
}
