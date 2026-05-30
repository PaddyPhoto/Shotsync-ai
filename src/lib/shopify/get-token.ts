import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns a valid Shopify access token for the brand, refreshing it if expired.
 * Returns null if the brand has no Shopify credentials or the refresh fails
 * (caller should surface a reconnect prompt in that case).
 */
export async function getShopifyToken(
  brandId: string,
  service: SupabaseClient,
): Promise<string | null> {
  const { data: brand } = await service
    .from('brands')
    .select('shopify_store_url, shopify_access_token, shopify_refresh_token, shopify_token_expires_at')
    .eq('id', brandId)
    .single()

  if (!brand?.shopify_access_token) return null

  // Legacy non-expiring token or no expiry data — return as-is
  if (!brand.shopify_token_expires_at || !brand.shopify_refresh_token) {
    return brand.shopify_access_token
  }

  // Still valid with a 5-minute buffer
  const expiresAt = new Date(brand.shopify_token_expires_at as string)
  if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return brand.shopify_access_token
  }

  // Expired — exchange refresh token
  const tokenRes = await fetch(`https://${brand.shopify_store_url}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: brand.shopify_refresh_token,
    }),
  })

  if (!tokenRes.ok) {
    console.error('[shopify/get-token] refresh failed:', await tokenRes.text().catch(() => ''))
    return null
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

  await service
    .from('brands')
    .update({
      shopify_access_token: access_token,
      shopify_refresh_token: refresh_token,
      shopify_token_expires_at: newExpiresAt,
    })
    .eq('id', brandId)

  return access_token
}
