import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

// Mandatory GDPR webhook: merchant uninstalled the app (fires 48 days after uninstall).
// Delete stored access token for this shop.
export async function POST(req: NextRequest) {
  const body = await req.text()
  if (!verifyShopifyWebhook(req, body)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { shop_domain } = JSON.parse(body)
  if (shop_domain) {
    const service = createServiceClient()
    await service.from('shopify_app_installs').delete().eq('shop', shop_domain).catch(() => {})
  }

  return new NextResponse('OK', { status: 200 })
}

function verifyShopifyWebhook(req: NextRequest, body: string): boolean {
  const hmac = req.headers.get('x-shopify-hmac-sha256')
  if (!hmac) return false
  const secret = process.env.SHOPIFY_CLIENT_SECRET!
  const digest = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac))
}
