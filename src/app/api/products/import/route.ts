import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'
import { upsertProducts } from '@/lib/products/upsert'
import type { ImportRow } from '@/lib/products/upsert'

export type { ImportRow }

async function getOrgAndBrand(userId: string) {
  const service = createServiceClient()
  const { data: member } = await service
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  if (!member) return null

  const { data: brand } = await service
    .from('brands')
    .select('id')
    .eq('org_id', member.org_id)
    .limit(1)
    .single()

  return brand ? { orgId: member.org_id, brandId: brand.id } : null
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getOrgAndBrand(user.id)
  if (!ctx) return NextResponse.json({ error: 'No org/brand found' }, { status: 400 })

  const rows: ImportRow[] = await req.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  const result = await upsertProducts(rows, ctx.orgId, ctx.brandId)
  return NextResponse.json(result)
}
