import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const FAIL_URL = 'https://www.shotsync.ai/?shopify_error='

// OAuth callback for App Store installs (separate from /api/shopify/callback
// which handles brand-level connections from inside ShotSync settings).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const shop = searchParams.get('shop')
  const hmac = searchParams.get('hmac')
  const host = searchParams.get('host') // base64-encoded host, passed through to embedded app

  if (!code || !state || !shop || !hmac) {
    return NextResponse.redirect(`${FAIL_URL}missing_params`)
  }

  // Validate Shopify HMAC signature
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!
  const params: Record<string, string> = {}
  searchParams.forEach((v, k) => { if (k !== 'hmac' && k !== 'signature') params[k] = v })
  const message = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&')
  const digest = crypto.createHmac('sha256', clientSecret).update(message).digest('hex')
  if (digest !== hmac) return NextResponse.redirect(`${FAIL_URL}invalid_signature`)

  // Validate signed state
  const parts = state.split('|')
  if (parts.length !== 3) return NextResponse.redirect(`${FAIL_URL}invalid_state`)
  const [savedShop, nonce, sig] = parts
  const payload = `${savedShop}|${nonce}`
  const expectedSig = crypto.createHmac('sha256', clientSecret).update(payload).digest('hex').slice(0, 16)
  if (sig !== expectedSig || savedShop !== shop) return NextResponse.redirect(`${FAIL_URL}state_mismatch`)

  // Exchange code for access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: clientSecret, code }),
  })
  if (!tokenRes.ok) return NextResponse.redirect(`${FAIL_URL}token_exchange_failed`)
  const { access_token } = await tokenRes.json()

  // Persist the install so we can auto-connect when the merchant signs up
  const service = createServiceClient()
  await service
    .from('shopify_app_installs')
    .upsert({ shop, access_token, installed_at: new Date().toISOString() }, { onConflict: 'shop' })
    .catch(() => {})

  // Redirect to embedded app shell inside Shopify admin
  const dest = new URL('https://www.shotsync.ai/shopify')
  dest.searchParams.set('shop', shop)
  if (host) dest.searchParams.set('host', host)

  return NextResponse.redirect(dest.toString())
}
