import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

async function getUserFromRequest(req: NextRequest) {
  const { getAuthUser } = await import('@/lib/supabase/server')
  return getAuthUser(req)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  if (!SUPABASE_CONFIGURED) return NextResponse.json({ rules: null })

  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    const { data } = await service
      .from('marketplace_rules')
      .select('rules')
      .eq('brand_id', params.brandId)
      .eq('org_id', user.id)
      .single()

    return NextResponse.json({ rules: data?.rules ?? null })
  } catch (err) {
    console.error('GET marketplace-rules error:', err)
    return NextResponse.json({ rules: null })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  if (!SUPABASE_CONFIGURED) return NextResponse.json({ ok: true })

  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { rules } = await req.json()
    if (!rules) return NextResponse.json({ error: 'Missing rules' }, { status: 400 })

    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    const { error } = await service
      .from('marketplace_rules')
      .upsert(
        { brand_id: params.brandId, org_id: user.id, rules, updated_at: new Date().toISOString() },
        { onConflict: 'brand_id' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PUT marketplace-rules error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
