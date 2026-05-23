import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Entry point for Shopify App Store installs.
// Shopify sends merchants here with ?shop=xxx.myshopify.com after they click Install.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const shop = searchParams.get('shop')?.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '')

  if (!shop) {
    return new NextResponse('Missing shop parameter', { status: 400 })
  }

  const cleanShop = shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`
  const clientId = process.env.SHOPIFY_CLIENT_ID!
  const redirectUri = `https://www.shotsync.ai/api/shopify/app-callback`
  const scopes = 'write_products,read_products'

  // Sign state with shop + nonce so we can verify it in the callback
  const nonce = crypto.randomBytes(16).toString('hex')
  const payload = `${cleanShop}|${nonce}`
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
