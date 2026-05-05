import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const shop = searchParams.get('shop')?.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const brand_id = searchParams.get('brand_id')

  if (!shop || !brand_id) {
    return NextResponse.redirect(new URL('/dashboard/brands?shopify_error=missing_params', req.url))
  }

  const cleanShop = shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`
  const clientId = process.env.SHOPIFY_CLIENT_ID!
  const redirectUri = `https://www.shotsync.ai/api/shopify/callback`
  const scopes = 'write_products,read_products'

  // Encode brand_id + shop into the state param (signed) — avoids cookie SameSite issues
  const nonce = crypto.randomBytes(8).toString('hex')
  const payload = `${brand_id}|${cleanShop}|${nonce}`
  const sig = crypto.createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!).update(payload).digest('hex').slice(0, 16)
  const state = `${payload}|${sig}`

  const authUrl =
    `https://${cleanShop}/admin/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`

  return NextResponse.redirect(authUrl)
}
