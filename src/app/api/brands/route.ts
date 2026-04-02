import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function GET(req: NextRequest) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: [] })
  }

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ data: [] })

    const { data: { user } } = await service.auth.getUser(token)
    if (!user) return NextResponse.json({ data: [] })

    const { data, error } = await service
      .from('brands')
      .select('id, org_id, name, brand_code, shopify_store_url, logo_color, images_per_look, naming_template, created_at')
      .eq('org_id', user.id)
      .order('created_at')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /api/brands error:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, brand_code, shopify_store_url, shopify_access_token, logo_color, images_per_look, naming_template } = body

  if (!name || !brand_code) {
    return NextResponse.json({ error: 'name and brand_code are required' }, { status: 400 })
  }
  if (brand_code.length > 6) {
    return NextResponse.json({ error: 'brand_code must be 6 characters or fewer' }, { status: 400 })
  }

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({
      data: {
        id: `demo-brand-${Date.now()}`,
        org_id: 'demo-user',
        name,
        brand_code: brand_code.toUpperCase(),
        shopify_store_url: shopify_store_url ?? null,
        shopify_access_token: shopify_access_token ?? null,
        logo_color: logo_color ?? '#e8d97a',
        images_per_look: images_per_look ?? 4,
        naming_template: naming_template ?? '{BRAND}_{SEQ}_{VIEW}',
        created_at: new Date().toISOString(),
      },
    }, { status: 201 })
  }

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    // Verify the user via the Authorization header (bearer token from browser client)
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: userError } = await service.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await service
      .from('brands')
      .insert({
        org_id: user.id,
        name,
        brand_code: brand_code.toUpperCase(),
        shopify_store_url: shopify_store_url ?? null,
        shopify_access_token: shopify_access_token ?? null,
        logo_color: logo_color ?? '#e8d97a',
        images_per_look: images_per_look ?? 4,
        naming_template: naming_template ?? '{BRAND}_{SEQ}_{VIEW}',
      })
      .select('id, org_id, name, brand_code, shopify_store_url, logo_color, images_per_look, naming_template, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/brands error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
