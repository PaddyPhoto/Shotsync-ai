import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/orgs/invite/accept — accept a team invite by token
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

  // Fetch the invite (no RLS restriction on select — token is the secret)
  const { data: invite, error: fetchErr } = await supabase
    .from('org_invites')
    .select('id, org_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (fetchErr || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 409 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
  }

  // Use service role to bypass RLS for insert + update
  const service = createServiceClient()

  // Add user as org member
  const { error: memberErr } = await service
    .from('org_members')
    .insert({
      org_id: invite.org_id,
      user_id: user.id,
      role: invite.role,
      invited_by: null,
    })
    .select()
    .single()

  if (memberErr && memberErr.code !== '23505') {
    // 23505 = unique violation (already a member) — treat as success
    console.error('[accept invite] insert member error:', memberErr)
    return NextResponse.json({ error: memberErr.message }, { status: 500 })
  }

  // Mark invite as accepted
  await service
    .from('org_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ data: { org_id: invite.org_id } })
}
