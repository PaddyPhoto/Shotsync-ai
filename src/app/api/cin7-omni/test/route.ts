import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'
import { isMasked } from '@/lib/brands/secrets'
import { Cin7OmniClient } from '@/lib/cin7/omni-client'

export const maxDuration = 30

/**
 * POST /api/cin7-omni/test
 *
 * Validates a Cin7 OMNI API connection (username + key) with one cheap authed GET.
 * Accepts credentials directly in the body so it works before the brand-storage
 * wiring (migration + settings UI + secrets masking) lands. If a brand_id is given
 * and the key is masked/absent, resolves the stored credentials — mirrors
 * /api/cin7/test. NOTE: brand columns (cin7_omni_username / cin7_omni_api_key) do
 * not exist yet; the masked-resolve branch is inert until that migration is added.
 *
 * Returns: { ok: true } | { ok: false, error: string }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  let username: string = body.username
  let apiKey: string = body.api_key
  const brand_id: string | undefined = body.brand_id

  // Already-connected brands render the key masked; resolve the stored value.
  // Guarded by a column check so this no-ops until the Omni columns exist.
  if (brand_id && (isMasked(apiKey) || !apiKey)) {
    const service = createServiceClient()
    const { data: b } = await service
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .eq('org_id', user.id)
      .single()
    const stored = b as Record<string, unknown> | null
    if (stored?.cin7_omni_api_key) {
      apiKey = stored.cin7_omni_api_key as string
      if (!username || isMasked(username)) username = (stored.cin7_omni_username as string) ?? username
    }
  }

  if (!username || !apiKey || isMasked(apiKey)) {
    return NextResponse.json({ error: 'username and api_key are required' }, { status: 400 })
  }

  const result = await new Cin7OmniClient(username, apiKey).testConnection()
  return NextResponse.json(result, { status: 200 })
}
