/**
 * Server-side export orchestrator.
 *
 * The legacy upload→cluster pipeline (runPipeline + embedding/k-means steps) was
 * removed — clustering now runs client-side in `@/lib/processor`. What remains is
 * the saved-job export path: `runExport`, used by `/api/export` (the download
 * page), which renames images and builds the ZIP.
 */
import type { MarketplaceName } from '@/types'
import { createServiceClient } from '@/lib/supabase/server'
import { renameJobImages } from './step8-naming'
import { buildExportZip } from './step10-export'

async function updateJobStep(jobId: string, step: number, status: string) {
  const supabase = createServiceClient()
  await supabase
    .from('jobs')
    .update({ pipeline_step: step, status })
    .eq('id', jobId)
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
