import { NextRequest, NextResponse } from 'next/server'
import { PLANS, type PlanId } from '@/lib/plans'
import { logActivity } from '@/lib/activity'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

// Plan depth limits: how many past jobs each tier can view
const HISTORY_DEPTH: Record<PlanId, number> = {
  free: 5,
  launch: 50,
  growth: 200,
  scale: -1,
  enterprise: -1,
}

async function getUserFromRequest(req: NextRequest) {
  const { getAuthUser } = await import('@/lib/supabase/server')
  return getAuthUser(req)
}

// GET /api/jobs/history — list job history for the user's org
export async function GET(req: NextRequest) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: [] })
  }

  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    // Get user's org + plan — order by role desc so 'owner' rows come first
    const { data: membership } = await service
      .from('org_members')
      .select('org_id, orgs(plan)')
      .eq('user_id', user.id)
      .order('role', { ascending: false })
      .limit(1)
      .single()

    if (!membership) return NextResponse.json({ data: [] })

    const orgId = membership.org_id
    const planId = ((membership.orgs as { plan: string } | null)?.plan ?? 'free') as PlanId
    const depth = HISTORY_DEPTH[planId]

    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brand_id')

    // Lifetime stats — all records including soft-deleted, no depth/brand filter
    const { data: allJobs } = await service
      .from('job_history')
      .select('image_count, cluster_count, status, created_at')
      .eq('org_id', orgId)

    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const monthStartIso = monthStart.toISOString()

    const completed = allJobs?.filter((j: { status?: string }) => j.status === 'completed') ?? []
    const completedThisMonth = completed.filter((j: { created_at?: string }) => (j.created_at ?? '') >= monthStartIso)

    const stats = {
      total_jobs: allJobs?.length ?? 0,
      total_images: allJobs?.reduce((s: number, j: { image_count?: number }) => s + (j.image_count ?? 0), 0) ?? 0,
      total_clusters: allJobs?.reduce((s: number, j: { cluster_count?: number }) => s + (j.cluster_count ?? 0), 0) ?? 0,
      total_exports: completed.length,
      skus_this_month: completedThisMonth.reduce((s: number, j: { cluster_count?: number }) => s + (j.cluster_count ?? 0), 0),
      exports_this_month: completedThisMonth.length,
    }

    let query = service
      .from('job_history')
      .select('id, job_name, image_count, cluster_count, marketplaces, status, created_at, brand_id')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (brandId) query = query.eq('brand_id', brandId)
    if (depth > 0) query = query.limit(depth)

    const { data, error } = await query
    if (error) {
      console.error('GET /api/jobs/history query error:', error.message, { orgId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], stats, planId, historyDepth: depth })
  } catch (err) {
    console.error('GET /api/jobs/history error:', err)
    return NextResponse.json({ data: [] })
  }
}

// POST /api/jobs/history — save a completed job to history
export async function POST(req: NextRequest) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: null })
  }

  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    const { data: membership } = await service
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .order('role', { ascending: false })
      .limit(1)
      .single()

    if (!membership) return NextResponse.json({ error: 'No org found' }, { status: 404 })

    const body = await req.json()
    const { job_name, image_count, cluster_count, marketplaces, brand_id } = body

    const { data, error } = await service
      .from('job_history')
      .insert({
        org_id: membership.org_id,
        created_by: user.id,
        job_name: job_name ?? 'Untitled Shoot',
        image_count: image_count ?? 0,
        cluster_count: cluster_count ?? 0,
        marketplaces: marketplaces ?? [],
        brand_id: brand_id ?? null,
        status: 'completed',
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/jobs/history insert error:', error.message, { org_id: membership.org_id, brand_id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    logActivity(membership.org_id, user.id, 'job.completed', {
      job_name: job_name ?? 'Untitled Shoot',
      image_count: image_count ?? 0,
      cluster_count: cluster_count ?? 0,
      marketplaces: marketplaces ?? [],
    })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/jobs/history error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
