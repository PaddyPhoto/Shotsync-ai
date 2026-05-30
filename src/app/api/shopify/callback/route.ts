import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrgForUser } from '@/lib/supabase/getOrgForUser'
import { PLANS } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'
import { getAuthUser } from '@/lib/supabase/server'
import crypto from 'crypto'

const FAIL = (req: NextRequest, msg: string) =>
  NextResponse.redirect(new URL(`/dashboard/brands?shopify_error=${msg}`, req.url))

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const shop = searchParams.get('shop')
  const hmac = searchParams.get('hmac')

  if (!code || !state || !shop || !hmac) return FAIL(req, 'missing_params')

  // Validate HMAC signature from Shopify
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!
  const params: Record<string, string> = {}
  searchParams.forEach((v, k) => { if (k !== 'hmac' && k !== 'signature') params[k] = v })
  const message = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&')
  const digest = crypto.createHmac('sha256', clientSecret).update(message).digest('hex')
  if (digest !== hmac) return FAIL(req, 'invalid_signature')

  // Decode brand_id + shop from signed state param
  const parts = state.split('|')
  if (parts.length !== 4) return FAIL(req, 'invalid_state')
  const [brand_id, savedShop, nonce, sig] = parts
  const payload = `${brand_id}|${savedShop}|${nonce}`
  const expectedSig = crypto.createHmac('sha256', clientSecret).update(payload).digest('hex').slice(0, 16)
  if (sig !== expectedSig) return FAIL(req, 'invalid_state')
  if (savedShop !== shop) return FAIL(req, 'state_mismatch')

  // Exchange code for access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: clientSecret, code }),
  })
  if (!tokenRes.ok) return FAIL(req, 'token_exchange_failed')
  const { access_token } = await tokenRes.json()

  // Check plan limits
  const user = await getAuthUser(req)
  const service = createServiceClient()

  if (user) {
    const { data: currentBrand } = await service
      .from('brands')
      .select('shopify_access_token')
      .eq('id', brand_id)
      .single()

    const isNewConnection = !currentBrand?.shopify_access_token
    if (isNewConnection) {
      const org = await getOrgForUser(service, user.id)
      const planId = ((org?.plan) ?? 'free') as PlanId
      const plan = PLANS[planId]
      const shopifyLimit = plan.limits.shopifyStores
      if (shopifyLimit === 0) return FAIL(req, 'plan_limit')
      if (shopifyLimit !== -1) {
        const { count } = await service
          .from('brands')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', user.id)
          .not('shopify_access_token', 'is', null)
          .neq('shopify_access_token', '')
        if ((count ?? 0) >= shopifyLimit) return FAIL(req, 'plan_limit')
      }
    }
  }

  const { error: updateErr } = await service
    .from('brands')
    .update({ shopify_store_url: shop, shopify_access_token: access_token })
    .eq('id', brand_id)

  if (updateErr) {
    console.error('[shopify-callback] update error:', updateErr)
    return FAIL(req, 'save_failed')
  }

  return NextResponse.redirect(new URL('/dashboard/brands?shopify_connected=1', req.url))
}
