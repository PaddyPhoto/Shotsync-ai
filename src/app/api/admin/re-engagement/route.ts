import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runReEngagement } from '@/lib/re-engagement'

const ADMIN_EMAIL = 'photoworkssydney@gmail.com'

async function verifyAdmin(req: NextRequest) {
  const service = createServiceClient()
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await service.auth.getUser(token)
  if (!user || user.email !== ADMIN_EMAIL) return null
  return service
}

export async function GET(req: NextRequest) {
  const service = await verifyAdmin(req)
  if (!service) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows } = await service
    .from('admin_settings')
    .select('key, value')
    .in('key', ['re_engagement_enabled', 're_engagement_last_run_at', 're_engagement_last_run_result'])

  const get = (key: string) => (rows ?? []).find((r: { key: string; value: string }) => r.key === key)?.value ?? null

  let lastRunResult: Record<string, number> | null = null
  try { lastRunResult = JSON.parse(get('re_engagement_last_run_result') ?? '{}') } catch { /* ok */ }

  return NextResponse.json({
    enabled: get('re_engagement_enabled') !== 'false',
    lastRunAt: get('re_engagement_last_run_at') || null,
    lastRunResult,
  })
}

export async function POST(req: NextRequest) {
  const service = await verifyAdmin(req)
  if (!service) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()

  if (action === 'toggle') {
    const { data: current } = await service
      .from('admin_settings')
      .select('value')
      .eq('key', 're_engagement_enabled')
      .single()
    const newValue = current?.value === 'false' ? 'true' : 'false'
    await service.from('admin_settings').upsert({
      key: 're_engagement_enabled',
      value: newValue,
      updated_at: new Date().toISOString(),
    })
    return NextResponse.json({ enabled: newValue === 'true' })
  }

  if (action === 'trigger') {
    try {
      const result = await runReEngagement(service)
      return NextResponse.json(result)
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
