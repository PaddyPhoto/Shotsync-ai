import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns a valid Shopify access token for the brand.
 * - If the token is still valid, returns it as-is.
 * - If the token is expired, silently refreshes using the refresh_token.
 * - Returns null if credentials are missing, the token is a legacy non-expiring
 *   token (no refresh_token stored), or the refresh fails — caller should surface
 *   a "reconnect in Brand Settings" prompt.
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

  if (!brand?.shopify_access_token || !brand?.shopify_store_url) return null

  // Legacy non-expiring token — must reconnect to get an expiring one
  if (!brand.shopify_refresh_token || !brand.shopify_token_expires_at) return null

  // Still valid with a 5-minute buffer
  const expiresAt = new Date(brand.shopify_token_expires_at as string)
  if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return brand.shopify_access_token as string
  }

  // Expired — refresh; Shopify rotates both tokens on every refresh
  const res = await fetch(`https://${brand.shopify_store_url}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: brand.shopify_refresh_token as string,
    }).toString(),
  })

  if (!res.ok) {
    console.error('[shopify/get-token] refresh failed:', res.status, await res.text().catch(() => ''))
    return null
  }

  const { access_token, refresh_token, expires_in } = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  await service.from('brands').update({
    shopify_access_token: access_token,
    shopify_refresh_token: refresh_token,
    shopify_token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
  }).eq('id', brandId)

  return access_token
}
