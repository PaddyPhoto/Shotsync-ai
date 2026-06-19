/**
 * GET /api/cron/cleanup-temp  (Vercel Cron — see vercel.json)
 *
 * Safety-net sweep of the `shopify-temp` storage bucket. Images are staged here
 * during Shopify/Cin7 pushes and removed per-cluster when a push finishes, but
 * an interrupted push (e.g. the tab closed mid-upload) can leave orphans. This
 * deletes anything older than 24h so temp storage never creeps.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'shopify-temp'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const cutoff = Date.now() - MAX_AGE_MS
  let removed = 0
  const errors: string[] = []

  // Recursively walk the bucket (depth-capped). Folders list with id === null.
  async function sweep(prefix: string, depth: number): Promise<void> {
    if (depth > 3) return
    const { data, error } = await service.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
    if (error) { errors.push(`list ${prefix || '/'}: ${error.message}`); return }
    if (!data) return

    const oldFiles: string[] = []
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null) {
        await sweep(path, depth + 1)
      } else {
        const created = entry.created_at ? new Date(entry.created_at).getTime() : 0
        if (created && created < cutoff) oldFiles.push(path)
      }
    }
    for (let i = 0; i < oldFiles.length; i += 100) {
      const batch = oldFiles.slice(i, i + 100)
      const { error: rmErr } = await service.storage.from(BUCKET).remove(batch)
      if (rmErr) errors.push(`remove: ${rmErr.message}`)
      else removed += batch.length
    }
  }

  try {
    await sweep('', 0)
    return NextResponse.json({ ok: true, bucket: BUCKET, removed, errors })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
