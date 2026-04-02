/**
 * Main pipeline orchestrator
 * Each step is independently replaceable.
 */
import type { MarketplaceName } from '@/types'
import { createServiceClient } from '@/lib/supabase/server'
import { generateEmbedding } from './step2-embeddings'
import { clusterEmbeddings } from './step3-clustering'
import { createClusterRecords } from './step4-clusters'
import { matchClustersToSKUs } from './step5-shopify-match'
import { labelClusterImages } from './step6-angle-detection'
import { validateJobShots } from './step7-missing-shots'
import { renameJobImages } from './step8-naming'
import { buildExportZip } from './step10-export'

async function updateJobStep(jobId: string, step: number, status: string) {
  const supabase = createServiceClient()
  await supabase
    .from('jobs')
    .update({ pipeline_step: step, status })
    .eq('id', jobId)
}

export async function runPipeline(
  jobId: string,
  userId: string,
  marketplaces: MarketplaceName[]
): Promise<void> {
  const supabase = createServiceClient()

  try {
    // Step 2: Generate embeddings for all images
    await updateJobStep(jobId, 2, 'processing')
    const { data: images } = await supabase
      .from('images')
      .select('id, storage_url')
      .eq('job_id', jobId)

    if (!images?.length) throw new Error('No images found for job')

    const embeddingResults: { id: string; vector: number[] }[] = []
    let processed = 0

    for (const img of images) {
      const vector = await generateEmbedding(img.storage_url)
      await supabase
        .from('images')
        .update({ embedding_vector: vector as unknown as string, status: 'processing' })
        .eq('id', img.id)
      embeddingResults.push({ id: img.id, vector })
      processed++
      await supabase.from('jobs').update({ processed_images: processed }).eq('id', jobId)
    }

    // Step 3: Cluster by similarity
    await updateJobStep(jobId, 3, 'grouping')
    const assignments = clusterEmbeddings(embeddingResults)

    // Step 4: Create cluster records
    await updateJobStep(jobId, 4, 'grouping')
    await createClusterRecords(jobId, assignments)

    // Step 5: Match to Shopify SKUs (optional — skipped gracefully if no SKUs cached)
    await updateJobStep(jobId, 5, 'matching')
    try {
      await matchClustersToSKUs(jobId, userId)
    } catch (err) {
      console.warn('Step 5 SKU matching skipped:', err)
    }

    // Step 6: Classify angles for each cluster
    await updateJobStep(jobId, 6, 'processing')
    const { data: clusters } = await supabase
      .from('clusters')
      .select('id')
      .eq('job_id', jobId)

    for (const cluster of clusters ?? []) {
      await labelClusterImages(cluster.id)
    }

    // Step 7: Check for missing shots
    await updateJobStep(jobId, 7, 'processing')
    await validateJobShots(jobId, marketplaces)

    // Step 8: Apply naming rules (only for confirmed clusters)
    // Naming happens after user confirms SKUs during review
    await updateJobStep(jobId, 8, 'review')

    // Pipeline pauses at step 8 for user review
    // Steps 9 & 10 run after user confirms and requests export
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown pipeline error'
    await supabase
      .from('jobs')
      .update({ status: 'error', error_message: message })
      .eq('id', jobId)
    throw err
  }
}

export async function runExport(
  jobId: string,
  marketplaces: MarketplaceName[]
): Promise<{ exportId: string; downloadUrl: string }> {
  const supabase = createServiceClient()
  await updateJobStep(jobId, 9, 'exporting')
  await renameJobImages(jobId)
  await updateJobStep(jobId, 10, 'exporting')
  const result = await buildExportZip(jobId, marketplaces)
  return result
}
