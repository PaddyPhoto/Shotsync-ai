import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'photoworkssydney@gmail.com'

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const service = createServiceClient()
    const { data: { user } } = await service.auth.getUser(token)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all auth users
    const { data: { users }, error } = await service.auth.admin.listUsers({ perPage: 1000 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fetch all orgs with plan
    const { data: orgs } = await service
      .from('orgs')
      .select('id, name, plan')

    // Fetch org memberships
    const { data: members } = await service
      .from('org_members')
      .select('user_id, org_id, role')

    // Fetch job counts per org
    const { data: jobs } = await service
      .from('job_history')
      .select('org_id')

    const orgMap = Object.fromEntries((orgs ?? []).map((o: { id: string; name: string; plan: string }) => [o.id, o]))
    const memberMap: Record<string, { org_id: string; role: string }> = {}
    for (const m of members ?? []) {
      if (!memberMap[m.user_id] || m.role === 'owner') memberMap[m.user_id] = m
    }
    const jobCounts: Record<string, number> = {}
    for (const j of jobs ?? []) {
      jobCounts[j.org_id] = (jobCounts[j.org_id] ?? 0) + 1
    }

    type AuthUser = { id: string; email?: string; created_at: string; last_sign_in_at?: string }
    const enriched = users.map((u: AuthUser) => {
      const membership = memberMap[u.id]
      const org = membership ? orgMap[membership.org_id] : null
      return {
        id: u.id,
        email: u.email ?? '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        org_name: org?.name ?? null,
        org_id: membership?.org_id ?? null,
        plan: org?.plan ?? 'free',
        role: membership?.role ?? null,
        job_count: membership ? (jobCounts[membership.org_id] ?? 0) : 0,
      }
    })

    // Sort by last_sign_in_at desc, nulls last
    type EnrichedUser = { last_sign_in_at: string | null; [key: string]: unknown }
    enriched.sort((a: EnrichedUser, b: EnrichedUser) => {
      if (!a.last_sign_in_at && !b.last_sign_in_at) return 0
      if (!a.last_sign_in_at) return 1
      if (!b.last_sign_in_at) return -1
      return new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime()
    })

    return NextResponse.json({ data: enriched })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
