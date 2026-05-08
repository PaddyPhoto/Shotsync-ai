import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { createServiceClient, getAuthUser } = await import('@/lib/supabase/server')
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const service = createServiceClient()
    const { data: membership } = await service
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .order('role', { ascending: false })
      .limit(1)
      .single()
    const orgId = membership?.org_id ?? null
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await service
      .from('job_history')
      .select('id, job_name, image_count, cluster_count, marketplaces, status, created_at, brands(name, brand_code)')
      .eq('id', params.jobId)
      .eq('org_id', orgId)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Normalise to the shape the job detail page expects
    return NextResponse.json({
      data: {
        id: data.id,
        name: data.job_name,
        status: 'complete',
        total_images: data.image_count ?? 0,
        cluster_count: data.cluster_count ?? 0,
        marketplaces: data.marketplaces ?? [],
        created_at: data.created_at,
        _source: 'history',
      }
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { createServiceClient, getAuthUser } = await import('@/lib/supabase/server')
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const service = createServiceClient()
    const { data: membership } = await service
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .order('role', { ascending: false })
      .limit(1)
      .single()
    const orgId = membership?.org_id ?? null
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await service
      .from('job_history')
      .delete()
      .eq('id', params.jobId)
      .eq('org_id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
