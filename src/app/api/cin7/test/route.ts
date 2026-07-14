import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'
import { isMasked } from '@/lib/brands/secrets'

const CIN7_BASE = 'https://inventory.dearsystems.com/ExternalApi/v2'
const REQUIRED_ATTRIBUTE_SET = 'ShotSync Apparel'

/**
 * POST /api/cin7/test
 * Two-stage check:
 *   1. Credentials — GET /Product?Limit=1
 *   2. Attribute set — GET /AttributeSet, then /ref/AttributeSet as fallback
 *
 * Returns:
 *   { ok: true, attributeSet: 'found' | 'missing' | 'unknown' }
 *   { ok: false, error: string }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  let account_id: string = body.account_id
  let application_key: string = body.application_key
  const brand_id: string | undefined = body.brand_id

  // Already-connected brands render the key masked (the real one never reaches
  // the browser). When testing such a brand, resolve the stored credentials.
  if (brand_id && (isMasked(application_key) || !application_key)) {
    const service = createServiceClient()
    const { data: b } = await service
      .from('brands')
      .select('cin7_account_id, cin7_application_key')
      .eq('id', brand_id)
      .eq('org_id', user.id)
      .single()
    if (b?.cin7_application_key) {
      application_key = b.cin7_application_key
      if (!account_id || isMasked(account_id)) account_id = b.cin7_account_id
    }
  }

  if (!account_id || !application_key || isMasked(application_key)) {
    return NextResponse.json({ error: 'account_id and application_key are required' }, { status: 400 })
  }

  const headers = {
    'api-auth-accountid': account_id,
    'api-auth-applicationkey': application_key,
    'Content-Type': 'application/json',
  }

  // Stage 1 — verify credentials
  const credRes = await fetch(`${CIN7_BASE}/Product?Limit=1`, { method: 'GET', headers })
  if (!credRes.ok) {
    const text = await credRes.text().catch(() => '')
    return NextResponse.json(
      { ok: false, error: `Cin7 returned ${credRes.status}${text ? `: ${text.slice(0, 120)}` : ''}` },
      { status: 200 },
    )
  }

  // Stage 2 — check attribute set exists
  // Try primary endpoint, then fallback
  const attributeSet = await checkAttributeSet(headers)

  return NextResponse.json({ ok: true, attributeSet })
}

async function checkAttributeSet(
  headers: Record<string, string>,
): Promise<'found' | 'missing' | 'unknown'> {
  for (const path of ['/AttributeSet', '/ref/AttributeSet']) {
    try {
      const res = await fetch(`${CIN7_BASE}${path}`, { method: 'GET', headers })
      if (!res.ok) continue
      const json = await res.json().catch(() => null)
      if (!json) continue

      // Response may be an array or { AttributeSetList: [...] } or similar
      const list: { Name?: string; name?: string }[] = Array.isArray(json)
        ? json
        : (json.AttributeSetList ?? json.Data ?? json.data ?? [])

      if (!Array.isArray(list)) continue

      const found = list.some(
        (s) => (s.Name ?? s.name ?? '').toLowerCase() === REQUIRED_ATTRIBUTE_SET.toLowerCase(),
      )
      return found ? 'found' : 'missing'
    } catch {
      continue
    }
  }
  return 'unknown'
}
