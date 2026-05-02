/**
 * GET /api/integrations/google/callback
 *
 * Google OAuth callback. Exchanges the auth code for access + refresh tokens,
 * stores them in brands.cloud_connections, and redirects to settings.
 *
 * Required env:
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateRaw = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const settingsUrl = `${appUrl}/dashboard/integrations`

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(`${settingsUrl}&cloud_error=${encodeURIComponent(error ?? 'cancelled')}`)
  }

  let brandId: string
  try {
    const state = JSON.parse(atob(stateRaw))
    brandId = state.brandId
    if (!brandId) throw new Error('missing brandId')
  } catch {
    return NextResponse.redirect(`${settingsUrl}&cloud_error=invalid_state`)
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
  const redirectUri = `${appUrl}/api/integrations/google/callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`)
    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
      id_token?: string
    }

    // Get user email from userinfo endpoint
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = userRes.ok ? await userRes.json() : {}
    const email = userInfo?.email ?? ''

    // Store in brands.cloud_connections JSONB
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    const { data: brand } = await service.from('brands').select('cloud_connections').eq('id', brandId).single()
    const existing = (brand?.cloud_connections as Record<string, unknown>) ?? {}

    await service.from('brands').update({
      cloud_connections: {
        ...existing,
        google_drive: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? existing?.google_drive,
          email,
          expires_at: Date.now() + (tokens.expires_in * 1000),
        },
      },
    }).eq('id', brandId)

    return NextResponse.redirect(`${settingsUrl}&cloud_connected=google_drive`)
  } catch (err) {
    console.error('Google callback error:', err)
    return NextResponse.redirect(`${settingsUrl}&cloud_error=server_error`)
  }
}
