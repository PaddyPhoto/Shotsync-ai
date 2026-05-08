import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

type ClusterPayload = {
  cluster_id: string
  cluster_order: number
  sku: string
  product_name: string
  color: string
  colour_code: string
  style_number: string
  label: string
  category: string | null
  is_bottomwear: boolean
  images: Array<{
    image_id: string
    image_order: number
    filename: string
    seq_index: number
    view_label: string
    view_confidence: number
  }>
}

// POST /api/jobs/[jobId]/session — save cluster metadata after export
export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  if (!SUPABASE_CONFIGURED) return NextResponse.json({ ok: true })

  try {
    const { getAuthUser, createServiceClient } = await import('@/lib/supabase/server')
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const service = createServiceClient()
    const historyId = params.jobId

    const { data: membership } = await service
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .order('role', { ascending: false })
      .limit(1)
      .single()

    if (!membership) return NextResponse.json({ error: 'No org found' }, { status: 404 })
    const orgId = membership.org_id

    // Verify the job_history record belongs to this org
    const { data: hist } = await service
      .from('job_history')
      .select('id')
      .eq('id', historyId)
      .eq('org_id', orgId)
      .single()

    if (!hist) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const { clusters } = await req.json() as { clusters: ClusterPayload[] }

    // Remove any existing cluster data (re-export overwrites)
    await service.from('job_clusters').delete().eq('job_history_id', historyId)

    for (const c of clusters) {
      const { data: row, error: ce } = await service
        .from('job_clusters')
        .insert({
          job_history_id: historyId,
          org_id: orgId,
          cluster_id: c.cluster_id,
          cluster_order: c.cluster_order,
          sku: c.sku,
          product_name: c.product_name,
          color: c.color,
          colour_code: c.colour_code,
          style_number: c.style_number,
          label: c.label,
          category: c.category,
          is_bottomwear: c.is_bottomwear,
        })
        .select('id')
        .single()

      if (ce || !row) continue

      const imageRows = c.images.map((img) => ({
        job_cluster_id: row.id,
        image_id: img.image_id,
        image_order: img.image_order,
        filename: img.filename,
        seq_index: img.seq_index,
        view_label: img.view_label,
        view_confidence: img.view_confidence,
        storage_path: img.filename,
      }))

      if (imageRows.length > 0) {
        await service.from('job_cluster_images').insert(imageRows)
      }
    }

    return NextResponse.json({ ok: true, org_id: orgId })
  } catch (err) {
    console.error('POST /api/jobs/[jobId]/session error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET /api/jobs/[jobId]/session — load cluster metadata for cross-device reopen
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  if (!SUPABASE_CONFIGURED) return NextResponse.json({ clusters: [] })

  try {
    const { getAuthUser, createServiceClient } = await import('@/lib/supabase/server')
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const service = createServiceClient()
    const historyId = params.jobId

    const { data: membership } = await service
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .order('role', { ascending: false })
      .limit(1)
      .single()

    if (!membership) return NextResponse.json({ error: 'No org found' }, { status: 404 })

    const { data: clusters, error } = await service
      .from('job_clusters')
      .select(`
        id, cluster_id, cluster_order,
        sku, product_name, color, colour_code, style_number,
        label, category, is_bottomwear, confirmed, exported,
        job_cluster_images (
          image_id, image_order, filename,
          seq_index, view_label, view_confidence, storage_path
        )
      `)
      .eq('job_history_id', historyId)
      .eq('org_id', membership.org_id)
      .order('cluster_order')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!clusters || clusters.length === 0) return NextResponse.json({ clusters: [] })

    const { data: hist } = await service
      .from('job_history')
      .select('job_name, marketplaces')
      .eq('id', historyId)
      .single()

    return NextResponse.json({
      clusters,
      jobName: hist?.job_name ?? '',
      marketplaces: hist?.marketplaces ?? [],
      org_id: membership.org_id,
    })
  } catch (err) {
    console.error('GET /api/jobs/[jobId]/session error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
