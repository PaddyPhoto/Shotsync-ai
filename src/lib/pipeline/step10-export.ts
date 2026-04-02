/**
 * Step 10: Build ZIP archives per marketplace and store them
 */
import JSZip from 'jszip'
import type { MarketplaceName } from '@/types'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import { createServiceClient } from '@/lib/supabase/server'
import { formatImageForMarketplace } from './step9-marketplace-format'
import { v4 as uuidv4 } from 'uuid'

/**
 * Build the ZIP buffer without uploading anywhere.
 * Useful for streaming directly to the client.
 */
export async function buildZipBuffer(
  jobId: string,
  marketplaces: MarketplaceName[]
): Promise<{ buffer: Buffer; imageCount: number }> {
  const supabase = createServiceClient()

  const { data: images, error: imgErr } = await supabase
    .from('images')
    .select('id, storage_url, storage_path, renamed_filename, original_filename, cluster_id')
    .eq('job_id', jobId)
    .not('cluster_id', 'is', null)

  if (imgErr || !images) throw new Error('Failed to fetch images for export')

  const zip = new JSZip()

  for (const marketplace of marketplaces) {
    const rule = MARKETPLACE_RULES[marketplace]
    const folderName = rule.name.replace(/\s+/g, '_')
    const folder = zip.folder(folderName)!

    for (const img of images) {
      try {
        const { data: fileData, error: dlErr } = await supabase.storage
          .from('shoots')
          .download(img.storage_path)

        if (dlErr || !fileData) continue

        const buffer = Buffer.from(await fileData.arrayBuffer())
        const formatted = await formatImageForMarketplace(
          buffer,
          img.original_filename,
          marketplace,
          img.renamed_filename ?? undefined
        )
        folder.file(formatted.filename, formatted.buffer)
      } catch {
        // skip problematic images
      }
    }
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return { buffer, imageCount: images.length }
}

export async function buildExportZip(
  jobId: string,
  marketplaces: MarketplaceName[]
): Promise<{ exportId: string; downloadUrl: string }> {
  const supabase = createServiceClient()

  // Fetch all renamed images for this job
  const { data: images, error: imgErr } = await supabase
    .from('images')
    .select('id, storage_url, storage_path, renamed_filename, original_filename, cluster_id')
    .eq('job_id', jobId)
    .not('cluster_id', 'is', null)

  if (imgErr || !images) throw new Error('Failed to fetch images for export')

  const zip = new JSZip()

  for (const marketplace of marketplaces) {
    const rule = MARKETPLACE_RULES[marketplace]
    const folder = zip.folder(rule.name.replace(/\s+/g, '_'))!

    for (const img of images) {
      try {
        // Download image from storage
        const { data: fileData, error: dlErr } = await supabase.storage
          .from('shoots')
          .download(img.storage_path)

        if (dlErr || !fileData) continue

        const buffer = Buffer.from(await fileData.arrayBuffer())

        // Format for marketplace
        const formatted = await formatImageForMarketplace(
          buffer,
          img.original_filename,
          marketplace,
          img.renamed_filename ?? undefined
        )

        folder.file(formatted.filename, formatted.buffer)
      } catch {
        // Skip problematic images, continue with rest
      }
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  // Upload ZIP to storage
  const exportId = uuidv4()
  const zipPath = `exports/${jobId}/${exportId}.zip`

  const { error: uploadErr } = await supabase.storage
    .from('exports')
    .upload(zipPath, zipBuffer, { contentType: 'application/zip', upsert: true })

  if (uploadErr) throw new Error(`Failed to upload export ZIP: ${uploadErr.message}`)

  // Generate signed URL valid for 7 days
  const { data: signedData, error: signErr } = await supabase.storage
    .from('exports')
    .createSignedUrl(zipPath, 60 * 60 * 24 * 7)

  if (signErr || !signedData) throw new Error('Failed to create download URL')

  // Record export in database
  await supabase.from('exports').insert({
    id: exportId,
    job_id: jobId,
    marketplace: marketplaces.join(','),
    output_files: [],
    download_url: signedData.signedUrl,
    file_size_bytes: zipBuffer.length,
    image_count: images.length,
    status: 'ready',
  })

  // Mark job as complete
  await supabase
    .from('jobs')
    .update({ status: 'complete', pipeline_step: 10 })
    .eq('id', jobId)

  return { exportId, downloadUrl: signedData.signedUrl }
}
