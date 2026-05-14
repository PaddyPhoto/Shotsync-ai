import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/server'

const CIN7_BASE = 'https://inventory.dearsystems.com/ExternalApi/v2'

/**
 * POST /api/cin7/test
 * Verifies Cin7 credentials by making a lightweight read request.
 * Body: { account_id: string; application_key: string }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { account_id, application_key } = await req.json()
  if (!account_id || !application_key) {
    return NextResponse.json({ error: 'account_id and application_key are required' }, { status: 400 })
  }

  const res = await fetch(`${CIN7_BASE}/Product?Limit=1`, {
    method: 'GET',
    headers: {
      'api-auth-accountid': account_id,
      'api-auth-applicationkey': application_key,
    },
  })

  if (res.ok) {
    return NextResponse.json({ ok: true })
  }

  const text = await res.text().catch(() => '')
  return NextResponse.json(
    { ok: false, error: `Cin7 returned ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}` },
    { status: 200 },
  )
}
