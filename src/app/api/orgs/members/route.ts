import { NextRequest, NextResponse } from 'next/server'

async function getServiceClientAndUser(request: NextRequest) {
  const { createServiceClient, getAuthUser } = await import('@/lib/supabase/server')
  const user = await getAuthUser(request)
  if (!user) return null
  const service = createServiceClient()
  return { service, user }
}

// GET /api/orgs/members — list members of the current user's org
export async function GET(request: NextRequest) {
  const auth = await getServiceClientAndUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { service, user } = auth

  const { data: membership } = await service
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) return NextResponse.json({ data: [] })

  const { data, error } = await service
    .from('org_members')
    .select('user_id, role, joined_at')
    .eq('org_id', membership.org_id)
    .order('joined_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

// DELETE /api/orgs/members — remove a member (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await getServiceClientAndUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { service, user } = auth

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  const { data: callerMembership } = await service
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single()

  if (!callerMembership) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data: target } = await service
    .from('org_members')
    .select('role')
    .eq('org_id', callerMembership.org_id)
    .eq('user_id', userId)
    .single()

  if (target?.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the org owner' }, { status: 403 })
  }

  const { error } = await service
    .from('org_members')
    .delete()
    .eq('org_id', callerMembership.org_id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { removed: true } })
}
