import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Mandatory GDPR webhook: customer requests erasure of their data.
// ShotSync only stores shop+access_token per install — no customer PII to erase.
export async function POST(req: NextRequest) {
  if (!verifyShopifyWebhook(req, await req.text())) {
    return new NextResponse('Unauthorized', { status: 401 })
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
