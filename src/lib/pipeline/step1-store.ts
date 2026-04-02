/**
 * Step 1: Store uploaded images to Supabase Storage
 */
import { createServiceClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export interface StoredImage {
  id: string
  original_filename: string
  storage_path: string
  storage_url: string
  file_size: number
}

export async function storeImage(
  file: File | Buffer,
  filename: string,
  jobId: string,
  fileSize: number
): Promise<StoredImage> {
  const supabase = createServiceClient()
  const id = uuidv4()
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  const storagePath = `${jobId}/${id}.${ext}`

  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file

  const { error } = await supabase.storage
    .from('shoots')
    .upload(storagePath, buffer, {
      contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage.from('shoots').getPublicUrl(storagePath)

  return {
    id,
    original_filename: filename,
    storage_path: storagePath,
    storage_url: urlData.publicUrl,
    file_size: fileSize,
  }
}

export async function deleteJobImages(jobId: string): Promise<void> {
  const supabase = createServiceClient()
  const { data: files } = await supabase.storage.from('shoots').list(jobId)
  if (files?.length) {
    const paths = files.map((f: { name: string }) => `${jobId}/${f.name}`)
    await supabase.storage.from('shoots').remove(paths)
  }
}
