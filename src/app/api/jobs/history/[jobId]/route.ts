import { NextRequest, NextResponse } from 'next/server'

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
      .limit(1)
      .single()
    const orgId = membership?.org_id ?? null
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await service
      .from('job_history')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.jobId)
      .eq('org_id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
