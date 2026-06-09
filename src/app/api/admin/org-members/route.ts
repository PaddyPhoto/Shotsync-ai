import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, teamInviteEmail } from '@/lib/email'

const ADMIN_EMAIL = 'photoworkssydney@gmail.com'

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const service = createServiceClient()
  const { data: { user } } = await service.auth.getUser(token)
  if (!user || user.email !== ADMIN_EMAIL) return null
  return { service, adminId: user.id }
}

// GET /api/admin/org-members?org_id=xxx — list all members of an org
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { service } = auth

  const orgId = req.nextUrl.searchParams.get('org_id')
  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  const { data: members, error } = await service
    .from('org_members')
    .select('user_id, role, joined_at')
    .eq('org_id', orgId)
    .order('joined_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { users } } = await service.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries(
    (users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email ?? ''])
  )

  const enriched = (members ?? []).map((m: { user_id: string; role: string; joined_at: string }) => ({
    ...m,
    email: emailMap[m.user_id] ?? '',
  }))

  return NextResponse.json({ data: enriched })
}

// DELETE /api/admin/org-members — remove any member from an org (admin override, no owner restriction)
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { service } = auth

  const { org_id, user_id } = await req.json()
  if (!org_id || !user_id) return NextResponse.json({ error: 'org_id and user_id required' }, { status: 400 })

  const { error } = await service
    .from('org_members')
    .delete()
    .eq('org_id', org_id)
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// POST /api/admin/org-members — create an invite for any org
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { service, adminId } = auth

  const { org_id, email, role = 'member' } = await req.json()
  if (!org_id || !email) return NextResponse.json({ error: 'org_id and email required' }, { status: 400 })

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: existing } = await service
    .from('org_invites')
    .select('id')
    .eq('org_id', org_id)
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .maybeSingle()

  let invite: { id: string; token: string } | null = null

  if (existing) {
    const { data } = await service
      .from('org_invites')
      .update({ role, expires_at: expiresAt })
      .eq('id', existing.id)
      .select('id, token')
      .single()
    invite = data
  } else {
    const { data } = await service
      .from('org_invites')
      .insert({ org_id, email: email.toLowerCase(), role, expires_at: expiresAt, invited_by: adminId })
      .select('id, token')
      .single()
    invite = data
  }

  if (!invite) return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invite/${invite.token}`

  // Fetch org name for the email
  const { data: orgInfo } = await service.from('orgs').select('name').eq('id', org_id).single()
  const orgName = orgInfo?.name ?? 'your team'

  // Send invite email — non-fatal if it fails
  sendEmail(teamInviteEmail(email, orgName, ADMIN_EMAIL, inviteUrl)).catch(() => {})

  return NextResponse.json({ data: { inviteUrl, expiresAt } })
}
