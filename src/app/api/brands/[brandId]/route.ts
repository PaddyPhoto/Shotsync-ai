import { NextRequest, NextResponse } from 'next/server'
import { PLANS } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'
import { getOrgForUser } from '@/lib/supabase/getOrgForUser'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

async function getUserFromRequest(req: NextRequest) {
  const { getAuthUser } = await import('@/lib/supabase/server')
  return getAuthUser(req)
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

    const allowed = ['name', 'brand_code', 'shopify_store_url', 'shopify_access_token', 'logo_color', 'images_per_look', 'naming_template', 'cloud_connections']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    if (updates.brand_code) {
      updates.brand_code = (updates.brand_code as string).toUpperCase()
    }

    // Enforce Shopify store limit when adding a new connection to an existing brand
    if (updates.shopify_access_token && updates.shopify_store_url) {
      const { data: currentBrand } = await service
        .from('brands')
        .select('shopify_access_token')
        .eq('id', params.brandId)
        .eq('org_id', user.id)
        .single()

      const isNewConnection = !currentBrand?.shopify_access_token
      if (isNewConnection) {
        const org = await getOrgForUser(service, user.id)
        const planId = ((org?.plan) ?? 'free') as PlanId
        const plan = PLANS[planId]
        const shopifyLimit = plan.limits.shopifyStores
        if (shopifyLimit === 0) {
          return NextResponse.json({
            error: `Your ${plan.name} plan does not include Shopify integration. Upgrade to connect a store.`
          }, { status: 403 })
        }
        if (shopifyLimit !== -1) {
          const { count: shopifyCount } = await service
            .from('brands')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', user.id)
            .not('shopify_access_token', 'is', null)
          if ((shopifyCount ?? 0) >= shopifyLimit) {
            return NextResponse.json({
              error: `Your ${plan.name} plan supports up to ${shopifyLimit} Shopify store connection${shopifyLimit !== 1 ? 's' : ''}. Upgrade to add more.`
            }, { status: 403 })
          }
        }
      }
    }

    const { data, error } = await service
      .from('brands')
      .update(updates)
      .eq('id', params.brandId)
      .eq('org_id', user.id)
      .select('id, org_id, name, brand_code, shopify_store_url, logo_color, images_per_look, naming_template, cloud_connections, created_at')
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
