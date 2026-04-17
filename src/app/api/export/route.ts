import { NextRequest, NextResponse } from 'next/server'
import type { MarketplaceName } from '@/types'
import { PLANS } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'
import { getOrgForUser } from '@/lib/supabase/getOrgForUser'

export const maxDuration = 300

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { job_id, marketplaces } = body as { job_id: string; marketplaces: MarketplaceName[] }

  if (!job_id || !marketplaces?.length) {
    return NextResponse.json({ error: 'job_id and marketplaces required' }, { status: 400 })
  }

  // Demo mode: return a mock export result
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({
      data: {
        exportId: `demo-export-${Date.now()}`,
        downloadUrl: '#',
      },
    })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const { runExport } = await import('@/lib/pipeline')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: job } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Enforce exports-per-month limit
    const org = await getOrgForUser(supabase, user.id)
    const planId = ((org?.plan) ?? 'free') as PlanId
    const plan = PLANS[planId]
    const exportLimit = plan.limits.exportsPerMonth
    if (exportLimit !== -1) {
      const used = org?.exports_this_month ?? 0
      if (used >= exportLimit) {
        return NextResponse.json({
          error: `Your ${plan.name} plan allows ${exportLimit} export${exportLimit !== 1 ? 's' : ''} per month and you've used all ${exportLimit}. Upgrade or wait until next month.`
        }, { status: 403 })
      }
    }

    const result = await runExport(job_id, marketplaces)

    // Increment monthly export counter
    if (org?.id) {
      try { await supabase.rpc('increment_org_exports', { p_org_id: org.id }) } catch {}
    }

    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: [] })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('job_id')
    if (!jobId) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

    const { data: exports, error } = await supabase
      .from('exports')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: exports })
  } catch (err) {
    console.error('GET /api/export error:', err)
    return NextResponse.json({ data: [] })
  }
}
