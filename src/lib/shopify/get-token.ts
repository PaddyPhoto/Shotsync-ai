import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns a valid Shopify access token for the brand, handling three cases:
 *
 * 1. Expiring token still valid → return as-is
 * 2. Expiring token expired → silently refresh using refresh_token
 * 3. Legacy non-expiring token → silently migrate via Shopify Token Exchange grant
 *    (one-time, no merchant re-auth required; old token is revoked by Shopify on success)
 *
 * Returns null only if credentials are missing or Shopify rejects the migration/refresh
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

  if (!brand?.shopify_access_token || !brand?.shopify_store_url) return null

  // Case 1 & 2: Expiring token
  if (brand.shopify_refresh_token && brand.shopify_token_expires_at) {
    const expiresAt = new Date(brand.shopify_token_expires_at as string)
    if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
      return brand.shopify_access_token
    }
    return refreshToken(brandId, brand.shopify_store_url as string, brand.shopify_refresh_token as string, service)
  }

  // Case 3: Legacy non-expiring token — migrate silently via Token Exchange
  return migrateToken(brandId, brand.shopify_store_url as string, brand.shopify_access_token as string, service)
}

async function refreshToken(
  brandId: string,
  shop: string,
  refreshToken: string,
  service: SupabaseClient,
): Promise<string | null> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    console.error('[shopify/get-token] refresh failed:', res.status, await res.text().catch(() => ''))
    return null
  }

  const { access_token, refresh_token: newRefreshToken, expires_in } = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const shopify_token_expires_at = new Date(Date.now() + expires_in * 1000).toISOString()

  await service.from('brands').update({
    shopify_access_token: access_token,
    shopify_refresh_token: newRefreshToken,
    shopify_token_expires_at,
  }).eq('id', brandId)

  return access_token
}

// Exchanges a legacy non-expiring token for an expiring one via the OAuth Token Exchange grant.
// This is irreversible — Shopify revokes the old token on success.
async function migrateToken(
  brandId: string,
  shop: string,
  existingToken: string,
  service: SupabaseClient,
): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    client_id: process.env.SHOPIFY_CLIENT_ID!,
    client_secret: process.env.SHOPIFY_CLIENT_SECRET!,
    subject_token: existingToken,
    subject_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
    requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
  })

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    console.error('[shopify/get-token] token migration failed:', res.status, await res.text().catch(() => ''))
    return null
  }

  const { access_token, refresh_token, expires_in } = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const shopify_token_expires_at = new Date(Date.now() + expires_in * 1000).toISOString()

  await service.from('brands').update({
    shopify_access_token: access_token,
    shopify_refresh_token: refresh_token,
    shopify_token_expires_at,
  }).eq('id', brandId)

  console.log('[shopify/get-token] migrated legacy token to expiring token for brand', brandId)
  return access_token
}
