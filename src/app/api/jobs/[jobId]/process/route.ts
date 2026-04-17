import { NextRequest, NextResponse } from 'next/server'
import type { MarketplaceName } from '@/types'
import { PLANS } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'

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

    // Enforce images-per-job limit
    const { data: orgData } = await supabase.from('orgs').select('plan').eq('id', user.id).single()
    const planId = (orgData?.plan ?? 'free') as PlanId
    const plan = PLANS[planId]
    const imageLimit = plan.limits.imagesPerJob
    if (imageLimit !== -1) {
      const { count: imageCount } = await supabase
        .from('images')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', params.jobId)
      if ((imageCount ?? 0) > imageLimit) {
        return NextResponse.json({
          error: `Your ${plan.name} plan supports up to ${imageLimit.toLocaleString()} images per job. This job has ${(imageCount ?? 0).toLocaleString()} images. Upgrade or reduce the number of images.`
        }, { status: 403 })
      }
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
