import { NextRequest, NextResponse } from 'next/server'
import { PLANS } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'
import { sendEmail, teamInviteEmail } from '@/lib/email'

async function getServiceClientAndUser(request: NextRequest) {
  const { createServiceClient, getAuthUser } = await import('@/lib/supabase/server')
  const user = await getAuthUser(request)
  if (!user) return null
  const service = createServiceClient()
  return { service, user }
}

// POST /api/orgs/invite — send a team invite
export async function POST(request: NextRequest) {
  const auth = await getServiceClientAndUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { service: supabase, user } = auth

  const { email, role = 'member' } = await request.json()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
  if (!['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'role must be admin or member' }, { status: 400 })
  }

  // Find the org where this user is an admin/owner
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'You do not have permission to invite members' }, { status: 403 })
  }

  // Check seat limit against current members + pending invites
  const { data: orgData } = await supabase
    .from('orgs')
    .select('plan')
    .eq('id', membership.org_id)
    .single()

  const planId = (orgData?.plan ?? 'free') as PlanId
  const seatLimit = PLANS[planId].limits.seats
  if (seatLimit !== -1) {
    const [{ count: memberCount }, { count: pendingCount }] = await Promise.all([
      supabase.from('org_members').select('*', { count: 'exact', head: true }).eq('org_id', membership.org_id),
      supabase.from('org_invites').select('*', { count: 'exact', head: true })
        .eq('org_id', membership.org_id).is('accepted_at', null).gt('expires_at', new Date().toISOString()),
    ])

    if ((memberCount ?? 0) + (pendingCount ?? 0) >= seatLimit) {
      return NextResponse.json({
        error: `Your ${PLANS[planId].name} plan includes ${seatLimit} seat${seatLimit !== 1 ? 's' : ''}. Upgrade to add more team members.`
      }, { status: 403 })
    }
  }

  // Check if user is already a member (look up by email via auth admin)
  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = (usersData?.users ?? []).find((u: { id: string; email?: string }) => u.email?.toLowerCase() === email.toLowerCase())
  if (existingUser) {
    const { data: existingMember } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', membership.org_id)
      .eq('user_id', existingUser.id)
      .maybeSingle()
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this org' }, { status: 409 })
    }
  }

  // Refresh existing pending invite or create a new one
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: existingInvite } = await supabase
    .from('org_invites')
    .select('id')
    .eq('org_id', membership.org_id)
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .maybeSingle()

  let invite: { id: string; token: string; expires_at: string } | null = null
  let error: { message: string } | null = null

  if (existingInvite) {
    const { data, error: e } = await supabase
      .from('org_invites')
      .update({ role, invited_by: user.id, expires_at: expiresAt })
      .eq('id', existingInvite.id)
      .select('id, token, expires_at')
      .single()
    invite = data; error = e
  } else {
    const { data, error: e } = await supabase
      .from('org_invites')
      .insert({ org_id: membership.org_id, email: email.toLowerCase(), role, invited_by: user.id, expires_at: expiresAt })
      .select('id, token, expires_at')
      .single()
    invite = data; error = e
  }

  if (error) {
    console.error('[POST /api/orgs/invite]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!invite) return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invite/${invite.token}`

  // Get org name for the invite email
  const { data: orgInfo } = await supabase.from('orgs').select('name').eq('id', membership.org_id).single()
  const orgName = orgInfo?.name ?? 'your team'

  // Send invite email — non-fatal if it fails
  sendEmail(teamInviteEmail(email, orgName, user.email!, inviteUrl)).catch(() => {})

  return NextResponse.json({ data: { inviteUrl, expiresAt: invite.expires_at } })
}

// DELETE /api/orgs/invite?id=<invite_id> — revoke a pending invite
export async function DELETE(request: NextRequest) {
  const auth = await getServiceClientAndUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { service: supabase, user } = auth

  const inviteId = request.nextUrl.searchParams.get('id')
  if (!inviteId) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single()

  if (!membership) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { error } = await supabase
    .from('org_invites')
    .delete()
    .eq('id', inviteId)
    .eq('org_id', membership.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// GET /api/orgs/invite — list pending invites for this org
export async function GET(request: NextRequest) {
  const auth = await getServiceClientAndUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { service: supabase, user } = auth

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single()

  if (!membership) return NextResponse.json({ data: [] })

  const { data, error } = await supabase
    .from('org_invites')
    .select('id, email, role, expires_at, accepted_at, created_at')
    .eq('org_id', membership.org_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
