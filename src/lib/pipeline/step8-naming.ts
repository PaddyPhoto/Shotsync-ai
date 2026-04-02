/**
 * Step 8: Apply structured naming conventions to all images
 * Format: BRAND_SKU_COLOR_VIEW.jpg (configurable per marketplace)
 */
import { createServiceClient } from '@/lib/supabase/server'

export function buildFilename(params: {
  brand: string
  sku: string
  color: string
  view: string
  index?: number
  ext?: string
}): string {
  const { brand, sku, color, view, index, ext = 'jpg' } = params

  const sanitise = (s: string) =>
    s.toUpperCase().trim().replace(/[^A-Z0-9-]/g, '-').replace(/-+/g, '-')

  const parts = [sanitise(brand), sanitise(sku), sanitise(color), sanitise(view)]
  if (index !== undefined && index > 1) parts.push(String(index).padStart(2, '0'))

  return `${parts.join('_')}.${ext}`
}

export async function renameClusterImages(
  clusterId: string,
  brand: string,
  sku: string,
  color: string
): Promise<void> {
  const supabase = createServiceClient()

  const { data: images, error } = await supabase
    .from('images')
    .select('id, original_filename, view_label')
    .eq('cluster_id', clusterId)
    .order('view_label')

  if (error || !images) throw new Error('Failed to fetch images for renaming')

  const viewCounts: Record<string, number> = {}

  for (const img of images) {
    const view = img.view_label ?? 'unknown'
    viewCounts[view] = (viewCounts[view] ?? 0) + 1
    const index = viewCounts[view]

    const ext = img.original_filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    const renamed = buildFilename({ brand, sku, color, view, index: index > 1 ? index : undefined, ext })

    await supabase
      .from('images')
      .update({ renamed_filename: renamed, status: 'renamed' })
      .eq('id', img.id)
  }
}

export async function renameJobImages(jobId: string): Promise<void> {
  const supabase = createServiceClient()

  // Resolve brand_code from the job's linked brand record
  const { data: job } = await supabase
    .from('jobs')
    .select('brand_id, brand_name, brands(brand_code)')
    .eq('id', jobId)
    .single()

  const brandCode =
    (job?.brands as { brand_code?: string } | null)?.brand_code ??
    job?.brand_name ??
    'BRAND'

  const { data: clusters, error } = await supabase
    .from('clusters')
    .select('id, assigned_sku, assigned_product_name, brand, color')
    .eq('job_id', jobId)

  if (error || !clusters) throw new Error('Failed to fetch clusters')

  for (const cluster of clusters) {
    if (!cluster.assigned_sku) continue
    await renameClusterImages(
      cluster.id,
      cluster.brand ?? brandCode,
      cluster.assigned_sku,
      cluster.color ?? 'CLR'
    )
  }
}
