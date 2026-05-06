import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function POST(req: NextRequest) {
  if (!SUPABASE_CONFIGURED) return NextResponse.json({ ok: true })

  try {
    const { images } = await req.json() as { images?: number }
    if (!images || images < 1) return NextResponse.json({ ok: true })

    const { createServiceClient } = await import('@/lib/supabase/server')
    const { getAuthUser } = await import('@/lib/supabase/server')
    const service = createServiceClient()
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { getOrgForUser } = await import('@/lib/supabase/getOrgForUser')
    const org = await getOrgForUser(service, user.id)
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

    await service.rpc('increment_org_images', { p_org_id: org.id, p_count: images })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/billing/usage error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
