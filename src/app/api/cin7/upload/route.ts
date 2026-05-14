import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getAuthUser } from '@/lib/supabase/server'
import { Cin7Client } from '@/lib/cin7/client'

export const maxDuration = 60

/**
 * POST /api/cin7/upload
 *
 * Creates products in Cin7 Core from confirmed clusters.
 * Images are passed as public Supabase Storage URLs — Cin7 fetches them directly.
 * Temp storage files are deleted after each successful product creation.
 *
 * Body:
 * {
 *   brand_id: string
 *   clusters: [{
 *     sku: string
 *     productName: string
 *     color: string
 *     colourCode: string
 *     styleNumber: string
 *     garmentCategory: string | null
 *     images: [{ src: string; filename: string }]
 *     copy?: { title: string; description: string; bullets: string[] }
 *     styleEntry?: {
 *       composition?: string; care?: string; fit?: string; length?: string
 *       rrp?: string; season?: string; occasion?: string; gender?: string
 *       subCategory?: string; origin?: string; sizeRange?: string
 *     }
 *   }]
 *   tempPaths: string[]
 * }
 */

type StyleEntry = {
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

type ClusterPayload = {
  sku: string
  productName: string
  color: string
  colourCode: string
  styleNumber: string
  garmentCategory: string | null
  images: { src: string; filename: string }[]
  copy?: { title: string; description: string; bullets: string[] }
  styleEntry?: StyleEntry
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const body = await req.json()
  const { brand_id, clusters, tempPaths = [] } = body as {
    brand_id: string
    clusters: ClusterPayload[]
    tempPaths?: string[]
  }

  if (!brand_id || !Array.isArray(clusters) || clusters.length === 0) {
    return NextResponse.json({ error: 'brand_id and clusters are required' }, { status: 400 })
  }

  const { data: brand, error: brandErr } = await service
    .from('brands')
    .select('cin7_account_id, cin7_application_key, name')
    .eq('id', brand_id)
    .single()

  if (brandErr || !brand?.cin7_account_id || !brand?.cin7_application_key) {
    return NextResponse.json({ error: 'Brand has no Cin7 credentials configured' }, { status: 400 })
  }

  const client = new Cin7Client(brand.cin7_account_id, brand.cin7_application_key)

  const results: {
    sku: string
    status: 'created' | 'skipped' | 'error'
    message?: string
  }[] = []

  for (const cluster of clusters) {
    try {
      const existing = await client.findProductBySku(cluster.sku)
      if (existing) {
        results.push({ sku: cluster.sku, status: 'skipped', message: 'Already exists in Cin7' })
        continue
      }

      const se = cluster.styleEntry ?? {}

      // Build attributes from all available metadata
      const attributes: Record<string, string> = {}
      if (cluster.color)         attributes['Colour'] = cluster.color
      if (cluster.colourCode)    attributes['ColourCode'] = cluster.colourCode
      if (cluster.styleNumber)   attributes['StyleNumber'] = cluster.styleNumber
      if (se.composition)        attributes['Composition'] = se.composition
      if (se.care)               attributes['Care'] = se.care
      if (se.fit)                attributes['Fit'] = se.fit
      if (se.length)             attributes['Length'] = se.length
      if (se.season)             attributes['Season'] = se.season
      if (se.gender)             attributes['Gender'] = se.gender
      if (se.occasion)           attributes['Occasion'] = se.occasion
      if (se.subCategory)        attributes['SubCategory'] = se.subCategory
      if (se.origin)             attributes['Origin'] = se.origin
      if (se.sizeRange)          attributes['SizeRange'] = se.sizeRange

      // Build description HTML from AI copy
      let description = ''
      if (cluster.copy?.description) {
        const bulletHtml = cluster.copy.bullets?.length
          ? `<ul>${cluster.copy.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`
          : ''
        description = `<p>${cluster.copy.description}</p>${bulletHtml}`
      }

      const price = se.rrp ? parseFloat(se.rrp.replace(/[^0-9.]/g, '')) || 0 : 0

      await client.createProduct({
        sku: cluster.sku,
        name: cluster.copy?.title || cluster.productName || cluster.sku,
        description,
        brand: brand.name ?? '',
        category: cluster.garmentCategory ?? '',
        price,
        attributes,
        images: cluster.images.map((img, i) => ({
          ImageUrl: img.src,
          Filename: img.filename,
          MimeType: 'image/jpeg',
          IsDefault: i === 0,
        })),
      })

      results.push({ sku: cluster.sku, status: 'created' })
    } catch (err) {
      results.push({ sku: cluster.sku, status: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  // Clean up temp Supabase Storage files regardless of Cin7 outcome
  if (tempPaths.length > 0) {
    await service.storage.from('shopify-temp').remove(tempPaths).catch(() => {})
  }

  const created = results.filter((r) => r.status === 'created').length
  const failed = results.filter((r) => r.status === 'error').length

  return NextResponse.json({ data: { results, created, failed } })
}
