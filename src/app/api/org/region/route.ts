import { NextRequest, NextResponse } from 'next/server'

// POST /api/org/region  { region: 'au' | 'us' }
// Manual override for the org's region (owner/admin). Timezone inference sets it
// at signup; this lets the org correct a misdetection from Settings.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { region?: string }
    const region = body.region === 'au' ? 'au' : body.region === 'us' ? 'us' : null
    if (!region) return NextResponse.json({ error: 'Invalid region' }, { status: 400 })

    const { createServiceClient, getAuthUser } = await import('@/lib/supabase/server')
    const supabase = createServiceClient()
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership?.org_id) return NextResponse.json({ error: 'No org found' }, { status: 404 })
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only an owner or admin can change region' }, { status: 403 })
    }

    const { error } = await supabase.from('orgs').update({ region }).eq('id', membership.org_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, region })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
