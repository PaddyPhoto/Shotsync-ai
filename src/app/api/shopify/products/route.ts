import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ShopifyClient, MOCK_SKUS } from '@/lib/shopify/client'

// GET: Fetch SKUs (from cache or Shopify)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const forceSync = url.searchParams.get('sync') === 'true'

  if (!forceSync) {
    // Return cached SKUs
    const { data: cached } = await supabase
      .from('skus')
      .select('*')
      .eq('user_id', user.id)
      .order('product_name')

    if (cached?.length) {
      return NextResponse.json({ data: cached, source: 'cache' })
    }
  }

  // Prefer brand-specific credentials, fall back to env vars
  const brandId = url.searchParams.get('brand_id')
  let shopDomain = process.env.SHOPIFY_SHOP_DOMAIN
  let accessToken = process.env.SHOPIFY_ACCESS_TOKEN

  if (brandId) {
    const svcSupabase2 = createServiceClient()
    const { data: brand } = await svcSupabase2
      .from('brands')
      .select('shopify_store_url, shopify_access_token')
      .eq('id', brandId)
      .eq('org_id', user.id)
      .single()
    if (brand?.shopify_store_url) shopDomain = brand.shopify_store_url
    if (brand?.shopify_access_token) accessToken = brand.shopify_access_token
  }

  let skus = MOCK_SKUS

  if (shopDomain && accessToken) {
    try {
      const client = new ShopifyClient(shopDomain, accessToken)
      skus = await client.getProducts()
    } catch (err) {
      console.error('Shopify sync failed, using mock data:', err)
    }
  }

  const svcSupabase = createServiceClient()

  // Upsert SKUs into cache
  const toInsert = skus.map((sku) => ({
    user_id: user.id,
    sku: sku.sku,
    product_name: sku.product_name,
    colour: sku.colour,
    variants: sku.variants,
    shopify_product_id: sku.shopify_product_id,
    shopify_handle: sku.shopify_handle,
    image_url: sku.image_url,
  }))

  await svcSupabase
    .from('skus')
    .upsert(toInsert, { onConflict: 'user_id,sku', ignoreDuplicates: false })

  return NextResponse.json({ data: skus, source: 'shopify' })
}
