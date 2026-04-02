import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

// Demo job returned when polling in demo mode
function makeDemoJob(jobId: string) {
  return {
    id: jobId,
    user_id: 'demo-user',
    name: 'Demo Shoot',
    brand_name: null,
    brand_id: null,
    selected_marketplaces: ['the-iconic'],
    status: 'review',
    total_images: 6,
    created_at: new Date().toISOString(),
    clusters: [],
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: makeDemoJob(params.jobId) })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', params.jobId)
      .eq('user_id', user.id)
      .single()

    if (error) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const { data: clusters } = await supabase
      .from('clusters')
      .select(`
        *,
        images (
          id, original_filename, storage_url, view_label,
          view_confidence, renamed_filename, file_size, status
        )
      `)
      .eq('job_id', params.jobId)
      .order('created_at')

    return NextResponse.json({ data: { ...job, clusters: clusters ?? [] } })
  } catch (err) {
    console.error('GET /api/jobs/[jobId] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: makeDemoJob(params.jobId) })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const allowed = ['name', 'status', 'selected_marketplaces', 'brand_name', 'shopify_connected']
    const updates = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k))
    )

    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', params.jobId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('PATCH /api/jobs/[jobId] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: { deleted: true } })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', params.jobId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('DELETE /api/jobs/[jobId] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
