import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function GET(req: NextRequest) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: [] })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brand_id')

    let query = supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (brandId) query = query.eq('brand_id', brandId)

    const { data: jobs, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: jobs })
  } catch (err) {
    console.error('GET /api/jobs error:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, brand_name, selected_marketplaces, brand_id } = body

  // Demo mode: return a mock job when Supabase is not configured
  if (!SUPABASE_CONFIGURED) {
    const mockJob = {
      id: `demo-${Date.now()}`,
      user_id: 'demo-user',
      name: name ?? 'Untitled Shoot',
      brand_name: brand_name ?? null,
      brand_id: brand_id ?? null,
      selected_marketplaces: selected_marketplaces ?? [],
      status: 'uploading',
      created_at: new Date().toISOString(),
    }
    return NextResponse.json({ data: mockJob }, { status: 201 })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        name: name ?? 'Untitled Shoot',
        brand_name: brand_name ?? null,
        brand_id: brand_id ?? null,
        selected_marketplaces: selected_marketplaces ?? [],
        status: 'uploading',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: job }, { status: 201 })
  } catch (err) {
    console.error('POST /api/jobs error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
