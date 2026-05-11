import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'photoworkssydney@gmail.com'
const VALID_PLANS = ['free', 'launch', 'growth', 'scale', 'enterprise']

export async function POST(req: NextRequest) {
  try {
    const service = createServiceClient()

    // Verify admin
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user } } = await service.auth.getUser(token)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { email, plan } = await req.json() as { email?: string; plan?: string }

    if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    if (!plan || !VALID_PLANS.includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    // Look up user by email
    const { data: { users }, error: listErr } = await service.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })

    const target = users.find((u: { email?: string }) => u.email?.toLowerCase() === email.trim().toLowerCase())
    if (!target) return NextResponse.json({ error: `No account found for ${email}` }, { status: 404 })

    // Find their org via org_members
    const { data: membership, error: memberErr } = await service
      .from('org_members')
      .select('org_id')
      .eq('user_id', target.id)
      .single()

    if (memberErr || !membership) {
      return NextResponse.json({ error: 'User has no organisation yet' }, { status: 404 })
    }

    // Fetch current plan for the response
    const { data: org } = await service
      .from('orgs')
      .select('name, plan')
      .eq('id', membership.org_id)
      .single()

    // Update the plan
    const { error: updateErr } = await service
      .from('orgs')
      .update({ plan })
      .eq('id', membership.org_id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      email: target.email,
      orgName: org?.name ?? membership.org_id,
      previousPlan: org?.plan ?? 'unknown',
      newPlan: plan,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
