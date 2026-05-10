import { NextRequest, NextResponse } from 'next/server'
import type { MarketplaceName } from '@/types'
import { PLANS } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'
import { getOrgForUser } from '@/lib/supabase/getOrgForUser'

export const maxDuration = 300

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function POST(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // Demo mode: acknowledge without running pipeline
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: { started: true, jobId: params.jobId } })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const { runPipeline } = await import('@/lib/pipeline')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: job } = await supabase
      .from('jobs')
      .select('id, selected_marketplaces')
      .eq('id', params.jobId)
      .eq('user_id', user.id)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Enforce monthly SKU limit
    const org = await getOrgForUser(supabase, user.id)
    const planId = ((org?.plan) ?? 'free') as PlanId
    const plan = PLANS[planId]
    const skuLimit = plan.limits.skusPerMonth
    if (skuLimit !== -1 && org) {
      const { createServiceClient } = await import('@/lib/supabase/server')
      const service = createServiceClient()

      // Reset counter if calendar month has rolled over
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      let usedThisMonth = org.images_this_month ?? 0

      if ((org.images_month_year ?? 0) !== currentYear || (org.images_month_month ?? 0) !== currentMonth) {
        await service.from('orgs').update({
          images_this_month: 0,
          images_month_year: currentYear,
          images_month_month: currentMonth,
        }).eq('id', org.id)
        usedThisMonth = 0
      }

      if (usedThisMonth >= skuLimit) {
        return NextResponse.json({
          error: `You've used all ${skuLimit.toLocaleString()} SKUs for this month on your ${plan.name} plan. Upgrade to process more.`
        }, { status: 403 })
      }
      // SKU count for this job is unknown pre-processing; counter is incremented
      // client-side via /api/billing/usage once the job completes.
    }

    runPipeline(
      params.jobId,
      user.id,
      (job.selected_marketplaces ?? []) as MarketplaceName[]
    ).catch(console.error)

    return NextResponse.json({ data: { started: true, jobId: params.jobId } })
  } catch (err) {
    console.error('POST /api/jobs/[jobId]/process error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
