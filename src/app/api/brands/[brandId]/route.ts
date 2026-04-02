import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

async function getUserFromRequest(req: NextRequest) {
  const { createServiceClient } = await import('@/lib/supabase/server')
  const service = createServiceClient()
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await service.auth.getUser(token)
  return user ?? null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  const body = await req.json()

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: { id: params.brandId, ...body } })
  }

  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    const allowed = ['name', 'brand_code', 'shopify_store_url', 'shopify_access_token', 'logo_color', 'images_per_look', 'naming_template']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    if (updates.brand_code) {
      updates.brand_code = (updates.brand_code as string).toUpperCase()
    }

    const { data, error } = await service
      .from('brands')
      .update(updates)
      .eq('id', params.brandId)
      .eq('org_id', user.id)
      .select('id, org_id, name, brand_code, shopify_store_url, logo_color, images_per_look, naming_template, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('PATCH /api/brands/[brandId] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: { deleted: true } })
  }

  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    const { error } = await service
      .from('brands')
      .delete()
      .eq('id', params.brandId)
      .eq('org_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('DELETE /api/brands/[brandId] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
