import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renameClusterImages } from '@/lib/pipeline/step8-naming'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { clusterId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { assigned_sku, assigned_product_name, brand, color, status } = body

  // Verify ownership via job
  const { data: cluster } = await supabase
    .from('clusters')
    .select('id, job_id')
    .eq('id', params.clusterId)
    .single()

  if (!cluster) return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })

  const { data: job } = await supabase
    .from('jobs')
    .select('id, user_id, brand_name')
    .eq('id', cluster.job_id)
    .eq('user_id', user.id)
    .single()

  if (!job) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (assigned_sku !== undefined) updates.assigned_sku = assigned_sku
  if (assigned_product_name !== undefined) updates.assigned_product_name = assigned_product_name
  if (brand !== undefined) updates.brand = brand
  if (color !== undefined) updates.color = color
  if (status !== undefined) updates.status = status

  const { data: updated, error } = await supabase
    .from('clusters')
    .update(updates)
    .eq('id', params.clusterId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If SKU was confirmed, trigger rename
  if (assigned_sku && status === 'confirmed') {
    await renameClusterImages(
      params.clusterId,
      brand ?? job.brand_name ?? 'BRAND',
      assigned_sku,
      color ?? 'CLR'
    )
  }

  return NextResponse.json({ data: updated })
}

// Update individual image view label
export async function PUT(
  req: NextRequest,
  { params }: { params: { clusterId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { image_id, view_label } = body

  if (!image_id || !view_label) {
    return NextResponse.json({ error: 'image_id and view_label required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('images')
    .update({ view_label, view_confidence: 1.0 })
    .eq('id', image_id)
    .eq('cluster_id', params.clusterId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { updated: true } })
}
