import { NextRequest, NextResponse } from 'next/server'
import type { MarketplaceName } from '@/types'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'

export const maxDuration = 300

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

/**
 * Build a demo ZIP with placeholder images for each marketplace folder.
 * Used when Supabase is not configured.
 */
async function buildDemoZip(
  marketplaces: MarketplaceName[],
  jobName: string
): Promise<Buffer> {
  const JSZip = (await import('jszip')).default
  const sharp = (await import('sharp')).default

  // Generate a small placeholder image (800×1000 grey JPEG)
  const placeholder = await sharp({
    create: { width: 800, height: 1000, channels: 3, background: { r: 220, g: 220, b: 220 } },
  })
    .jpeg({ quality: 60 })
    .toBuffer()

  const zip = new JSZip()

  const demoSkus = [
    { sku: 'TOP-BLK-001', color: 'BLACK', views: ['FRONT', 'BACK', 'SIDE'] },
    { sku: 'DRS-NVY-002', color: 'NAVY', views: ['FRONT', 'BACK', 'DETAIL'] },
    { sku: 'JKT-BGE-003', color: 'BEIGE', views: ['FRONT', 'SIDE', 'DETAIL'] },
  ]

  for (const marketplace of marketplaces) {
    const rule = MARKETPLACE_RULES[marketplace]
    const folder = zip.folder(rule.name.replace(/\s+/g, '_'))!

    for (const item of demoSkus) {
      for (const view of item.views) {
        const filename = `DEMO_${item.sku}_${item.color}_${view}.jpg`
        folder.file(filename, placeholder)
      }
    }
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { job_id, marketplaces, job_name } = body as {
    job_id: string
    marketplaces: MarketplaceName[]
    job_name?: string
  }

  if (!job_id || !marketplaces?.length) {
    return NextResponse.json({ error: 'job_id and marketplaces required' }, { status: 400 })
  }

  let zipBuffer: Buffer

  if (!SUPABASE_CONFIGURED) {
    zipBuffer = await buildDemoZip(marketplaces, job_name ?? 'Export')
  } else {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { buildZipBuffer } = await import('@/lib/pipeline/step10-export')
      const { renameJobImages } = await import('@/lib/pipeline/step8-naming')

      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      // Verify ownership
      const { data: job } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', job_id)
        .eq('user_id', user.id)
        .single()
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

      // Apply naming before zipping
      await renameJobImages(job_id)

      const { buffer } = await buildZipBuffer(job_id, marketplaces)
      zipBuffer = buffer
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  const safeName = (job_name ?? 'export').replace(/[^a-z0-9_-]/gi, '_').toLowerCase()

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}.zip"`,
      'Content-Length': String(zipBuffer.length),
    },
  })
}
