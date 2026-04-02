import { NextRequest, NextResponse } from 'next/server'

async function getUserOrgId(req: NextRequest): Promise<string | null> {
  const { createServiceClient } = await import('@/lib/supabase/server')
  const service = createServiceClient()
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await service.auth.getUser(token)
  if (!user) return null
  const { data } = await service
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  return data?.org_id ?? null
}

export async function DELETE(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const orgId = await getUserOrgId(req)
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

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
