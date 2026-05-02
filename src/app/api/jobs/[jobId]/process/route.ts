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

    // Enforce monthly image limit
    const org = await getOrgForUser(supabase, user.id)
    const planId = ((org?.plan) ?? 'free') as PlanId
    const plan = PLANS[planId]
    const imageLimit = plan.limits.imagesPerMonth
    if (imageLimit !== -1 && org) {
      const { count: imageCount } = await supabase
        .from('images')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', params.jobId)
      const count = imageCount ?? 0

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

      if (usedThisMonth + count > imageLimit) {
        const remaining = Math.max(0, imageLimit - usedThisMonth)
        return NextResponse.json({
          error: `Your ${plan.name} plan allows ${imageLimit.toLocaleString()} images per month. You've used ${usedThisMonth.toLocaleString()} and have ${remaining.toLocaleString()} remaining. This job has ${count.toLocaleString()} images.`
        }, { status: 403 })
      }

      // Count images against monthly quota at processing time
      await service.rpc('increment_org_images', { p_org_id: org.id, p_count: count })
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
