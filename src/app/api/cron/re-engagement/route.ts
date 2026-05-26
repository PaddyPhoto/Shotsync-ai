import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, reEngagementEmail } from '@/lib/email'

export const maxDuration = 60

const INACTIVE_DAYS = 14
const RESEND_DAYS = 30

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Find orgs inactive for INACTIVE_DAYS that haven't been emailed in RESEND_DAYS
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 86_400_000).toISOString()
  const resendCutoff = new Date(Date.now() - RESEND_DAYS * 86_400_000).toISOString()

  const { data: inactiveOrgs, error } = await service
    .from('orgs')
    .select('id, re_engagement_sent_at')
    .lt('last_active_at', cutoff)
    .or(`re_engagement_sent_at.is.null,re_engagement_sent_at.lt.${resendCutoff}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!inactiveOrgs?.length) return NextResponse.json({ sent: 0 })

  // Get unsubscribe list
  const { data: unsubData } = await service.from('email_unsubscribes').select('email')
  const unsubSet = new Set((unsubData ?? []).map((r: { email: string }) => r.email.toLowerCase()))

  // Get owner user_ids for each inactive org
  const orgIds = inactiveOrgs.map((o: { id: string }) => o.id)
  const { data: members } = await service
    .from('org_members')
    .select('org_id, user_id')
    .in('org_id', orgIds)
    .eq('role', 'owner')

  if (!members?.length) return NextResponse.json({ sent: 0 })

  // Resolve emails via auth admin
  const userIds = members.map((m: { user_id: string }) => m.user_id)
  const emailByUserId = new Map<string, string>()
  for (const uid of userIds) {
    const { data } = await service.auth.admin.getUserById(uid)
    if (data.user?.email) emailByUserId.set(uid, data.user.email)
  }

  let sent = 0
  const now = new Date().toISOString()

  for (const member of members as { org_id: string; user_id: string }[]) {
    const email = emailByUserId.get(member.user_id)
    if (!email || unsubSet.has(email.toLowerCase())) continue

    try {
      await sendEmail(reEngagementEmail(email))
      await service.from('orgs').update({ re_engagement_sent_at: now }).eq('id', member.org_id)
      sent++
    } catch {
      // log and continue — don't let one failure block the rest
    }
  }

  return NextResponse.json({ sent })
}
