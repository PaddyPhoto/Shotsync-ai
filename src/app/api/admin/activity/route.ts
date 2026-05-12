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

    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org_id')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500)

    let query = service
      .from('activity_log')
      .select(`
        id, event, metadata, created_at,
        org_id,
        orgs ( name ),
        user_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (orgId) query = query.eq('org_id', orgId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with user emails
    const userIds = [...new Set((data ?? []).map((r: { user_id: string | null }) => r.user_id).filter(Boolean))] as string[]
    const emailMap: Record<string, string> = {}
    if (userIds.length) {
      const { data: { users } } = await service.auth.admin.listUsers({ perPage: 1000 })
      users.forEach((u: { id: string; email?: string }) => { if (u.email) emailMap[u.id] = u.email })
    }

    const enriched = (data ?? []).map((r: {
      id: string; event: string; metadata: Record<string, unknown>; created_at: string
      org_id: string; orgs: { name: string } | null; user_id: string | null
    }) => ({
      ...r,
      org_name: r.orgs?.name ?? r.org_id,
      user_email: r.user_id ? (emailMap[r.user_id] ?? r.user_id) : null,
    }))

    return NextResponse.json({ data: enriched })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
