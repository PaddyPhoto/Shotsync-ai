/**
 * GET /api/integrations/dropbox/callback
 *
 * Dropbox OAuth callback. Exchanges the auth code for access + refresh tokens,
 * stores them in brands.cloud_connections, and redirects to settings.
 *
 * Required env:
 *   NEXT_PUBLIC_DROPBOX_APP_KEY
 *   DROPBOX_APP_SECRET
 *   NEXT_PUBLIC_APP_URL
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateRaw = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const settingsUrl = `${appUrl}/dashboard/settings?tab=integrations`

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

  const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY ?? ''
  const appSecret = process.env.DROPBOX_APP_SECRET ?? ''
  const redirectUri = `${appUrl}/api/integrations/dropbox/callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: appKey,
        client_secret: appSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`)
    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
      account_id?: string
    }

    // Fetch account info to get the email
    const accountRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: 'null',
    })
    const account = accountRes.ok ? await accountRes.json() : {}
    const email = account?.email ?? ''

    // Store in brands.cloud_connections JSONB
    const { createServiceClient, getAuthUser } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    // Get the current cloud_connections for the brand and merge
    const { data: brand } = await service.from('brands').select('cloud_connections').eq('id', brandId).single()
    const existing = (brand?.cloud_connections as Record<string, unknown>) ?? {}

    await service.from('brands').update({
      cloud_connections: {
        ...existing,
        dropbox: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          account_email: email,
          expires_at: Date.now() + (tokens.expires_in * 1000),
        },
      },
    }).eq('id', brandId)

    return NextResponse.redirect(`${settingsUrl}&cloud_connected=dropbox`)
  } catch (err) {
    console.error('Dropbox callback error:', err)
    return NextResponse.redirect(`${settingsUrl}&cloud_error=server_error`)
  }
}
