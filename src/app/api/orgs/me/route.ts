import { NextRequest, NextResponse } from 'next/server'

async function getUserAndOrg(req: NextRequest) {
  const { createServiceClient } = await import('@/lib/supabase/server')
  const service = createServiceClient()
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user } } = await service.auth.getUser(token)
  if (!user) return null

  const { data } = await service
    .from('org_members')
    .select('org_id, role, orgs(id, name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!data) return null
  return { service, orgId: data.org_id, role: data.role as string, org: data.orgs as { id: string; name: string } | null }
}

export async function GET(req: NextRequest) {
  try {
    const result = await getUserAndOrg(req)
    return NextResponse.json({ data: result?.org ?? null, role: result?.role ?? null })
  } catch {
    return NextResponse.json({ data: null, role: null })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const result = await getUserAndOrg(req)
    if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { service, orgId } = result
    const { data, error } = await service
      .from('orgs')
      .update({ name: name.trim() })
      .eq('id', orgId)
      .select('id, name')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
