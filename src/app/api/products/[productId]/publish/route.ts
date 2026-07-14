import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'
import { ShopifyClient } from '@/lib/shopify/client'
import { getShopifyToken } from '@/lib/shopify/get-token'
import { Cin7Client, type Cin7Image } from '@/lib/cin7/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export const maxDuration = 60

type ChannelResult = {
  channel: string
  status: 'live' | 'draft' | 'error'
  externalId?: string
  error?: string
}

type ProductRow = { id: string; sku: string; title: string; category: string | null; product_attributes: { key: string; value: string }[] }
type ListingRow = { id: string; colour_name: string; rrp: number | null; listing_title: string | null; listing_description: string | null; product_images: { id: string; storage_url: string | null; angle: string; sort_order: number }[] }
type BrandRow = { id: string; shopify_store_url: string | null; cin7_account_id: string | null; cin7_application_key: string | null; iconic_user_id: string | null; iconic_api_key: string | null }
type ExistingListing = { status: string; external_id: string | null } | null

async function publishToShopify(
  product: ProductRow,
  colourway: ListingRow,
  images: ListingRow['product_images'],
  brand: BrandRow | null,
  existing: ExistingListing,
  service: SupabaseClient,
): Promise<ChannelResult> {
  if (!brand?.shopify_store_url) return { channel: 'shopify', status: 'error', error: 'Shopify not connected' }

  const token = await getShopifyToken(brand.id, service)
  if (!token) return { channel: 'shopify', status: 'error', error: 'Shopify token unavailable — reconnect in Brand Settings' }

  const client = new ShopifyClient(brand.shopify_store_url, token)
  const shopifyImages = images
    .filter(img => img.storage_url)
    .map(img => ({ src: img.storage_url!, filename: `${product.sku}-${colourway.colour_name}-${img.angle}.jpg` }))

  const attrs = Object.fromEntries((product.product_attributes ?? []).map(a => [a.key, a.value]))
  const metafields = Object.entries(attrs)
    .filter(([, v]) => v)
    .map(([k, v]) => ({ namespace: 'shotsync', key: k, value: String(v), type: 'single_line_text_field' as const }))

  try {
    if (existing?.external_id) {
      await client.patchProduct(existing.external_id, {
        title: colourway.listing_title || product.title,
        bodyHtml: colourway.listing_description ?? undefined,
      })
      if (shopifyImages.length > 0) {
        await client.appendImages(existing.external_id, shopifyImages)
      }
      return { channel: 'shopify', status: 'live', externalId: existing.external_id }
    }

    const result = await client.createProduct({
      title: colourway.listing_title || product.title,
      sku: product.sku,
      color: colourway.colour_name,
      bodyHtml: colourway.listing_description ?? undefined,
      price: colourway.rrp ? parseFloat(String(colourway.rrp)) : undefined,
      productType: product.category ?? undefined,
      images: shopifyImages,
      metafields,
    })
    return { channel: 'shopify', status: 'live', externalId: result?.id }
  } catch (e) {
    return { channel: 'shopify', status: 'error', error: (e as Error).message.slice(0, 300) }
  }
}

async function publishToCin7(
  product: ProductRow,
  colourway: ListingRow,
  images: ListingRow['product_images'],
  brand: BrandRow | null,
  existing: ExistingListing,
): Promise<ChannelResult> {
  if (!brand?.cin7_account_id || !brand?.cin7_application_key) {
    return { channel: 'cin7', status: 'error', error: 'Cin7 not connected' }
  }

  const client = new Cin7Client(brand.cin7_account_id, brand.cin7_application_key)

  try {
    if (existing?.external_id) {
      return { channel: 'cin7', status: 'live', externalId: existing.external_id }
    }

    const found = await client.findProductBySku(product.sku)
    if (found) {
      return { channel: 'cin7', status: 'live', externalId: found.id }
    }

    const cin7Images: Cin7Image[] = images
      .filter(img => img.storage_url)
      .map((img, i) => ({
        ImageUrl: img.storage_url!,
        Filename: `${product.sku}-${colourway.colour_name}-${img.angle}.jpg`,
        MimeType: 'image/jpeg',
        IsDefault: i === 0,
      }))

    const attrs = Object.fromEntries((product.product_attributes ?? []).map(a => [a.key, a.value]))
    const result = await client.createProduct({
      sku: product.sku,
      name: colourway.listing_title || product.title,
      category: product.category ?? undefined,
      price: colourway.rrp ? parseFloat(String(colourway.rrp)) : undefined,
      attributes: attrs,
      images: cin7Images,
    })
    return { channel: 'cin7', status: 'live', externalId: result.id }
  } catch (e) {
    return { channel: 'cin7', status: 'error', error: (e as Error).message.slice(0, 300) }
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await params
  const body = await req.json()
  const { listingId, channels } = body as { listingId: string; channels: string[] }

  if (!listingId || !Array.isArray(channels) || channels.length === 0) {
    return NextResponse.json({ error: 'listingId and channels are required' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: member } = await service.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (!member) return NextResponse.json({ error: 'No org' }, { status: 400 })

  // Scope to the caller's org — the service client bypasses RLS, so this is the
  // only tenant guard. The listing must belong to the org-verified product.
  const { data: product } = await service
    .from('products')
    .select('id, sku, title, category, product_attributes(key, value)')
    .eq('id', productId)
    .eq('org_id', member.org_id)
    .single() as { data: ProductRow | null }
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const { data: colourway } = await service
    .from('product_listings')
    .select('id, colour_name, rrp, listing_title, listing_description, product_images(id, storage_url, angle, sort_order)')
    .eq('id', listingId)
    .eq('product_id', productId)
    .single() as { data: ListingRow | null }
  if (!colourway) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const { data: brand } = await service
    .from('brands')
    .select('id, shopify_store_url, cin7_account_id, cin7_application_key, iconic_user_id, iconic_api_key')
    .eq('org_id', member.org_id)
    .limit(1)
    .single() as { data: BrandRow | null }

  const { data: existingListings } = await service
    .from('channel_listings')
    .select('channel, status, external_id')
    .eq('listing_id', listingId)

  const listingMap: Record<string, ExistingListing> = {}
  for (const l of (existingListings ?? [])) {
    listingMap[l.channel] = { status: l.status, external_id: l.external_id ?? null }
  }

  const images = [...(colourway.product_images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const results: ChannelResult[] = []

  for (const channel of channels) {
    let result: ChannelResult

    if (channel === 'shopify') {
      result = await publishToShopify(product, colourway, images, brand, listingMap[channel] ?? null, service)
    } else if (channel === 'cin7') {
      result = await publishToCin7(product, colourway, images, brand, listingMap[channel] ?? null)
    } else if (channel === 'iconic' && brand?.iconic_user_id && brand?.iconic_api_key) {
      result = { channel, status: 'draft', error: 'SellerCenter API — coming soon' }
    } else {
      // Myer, David Jones, JOOR — mark as draft (manual submission)
      result = { channel, status: 'draft' }
    }

    results.push(result)

    await service.from('channel_listings').upsert(
      {
        product_id: productId,
        listing_id: listingId,
        channel,
        status: result.status,
        external_id: result.externalId ?? listingMap[channel]?.external_id ?? null,
        last_published_at: result.status !== 'error' ? new Date().toISOString() : undefined,
        error: result.error ?? null,
      },
      { onConflict: 'listing_id,channel' },
    )
  }

  return NextResponse.json({ results })
}
