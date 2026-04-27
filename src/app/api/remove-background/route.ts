/**
 * POST /api/remove-background
 *
 * Server-side background removal. Uses PhotoRoom Segment API when
 * PHOTOROOM_API_KEY is set (preferred — better quality for on-model fashion).
 * Falls back to Replicate BRIA RMBG 2.0 when REPLICATE_API_TOKEN is set.
 *
 * Accepts a JPEG image as multipart form data, returns a transparent PNG.
 * Callers should catch non-200 and use the browser-based @imgly fallback.
 *
 * Env: PHOTOROOM_API_KEY (preferred), REPLICATE_API_TOKEN (fallback)
 */

import { NextRequest, NextResponse } from 'next/server'
import { PLANS } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'

export const maxDuration = 60

const PHOTOROOM_URL = 'https://sdk.photoroom.com/v1/segment'
const REPLICATE_MODEL = 'https://api.replicate.com/v1/models/bria-ai/rmbg-2.0/predictions'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function POST(req: NextRequest) {
  const hasPhotoRoom = !!process.env.PHOTOROOM_API_KEY
  const hasReplicate = !!process.env.REPLICATE_API_TOKEN

  if (!hasPhotoRoom && !hasReplicate) {
    return NextResponse.json({ error: 'Background removal not configured' }, { status: 503 })
  }

  // Plan gate — background removal requires Brand plan or above
  if (SUPABASE_CONFIGURED) {
    try {
      const token = req.headers.get('authorization')?.replace('Bearer ', '')
      if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const { createServiceClient } = await import('@/lib/supabase/server')
      const { getOrgForUser } = await import('@/lib/supabase/getOrgForUser')
      const service = createServiceClient()

      const { data: { user } } = await service.auth.getUser(token)
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const org = await getOrgForUser(service, user.id)
      const plan = PLANS[((org?.plan ?? 'free') as PlanId)]
      if (!plan.limits.bgRemoval) {
        return NextResponse.json(
          { error: 'Background removal requires Brand plan or above.' },
          { status: 403 }
        )
      }
    } catch (err) {
      console.error('[remove-bg] plan check error:', err)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const formData = await req.formData()
    const imageFile = formData.get('image') as File | null
    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (hasPhotoRoom) {
      return await removeWithPhotoRoom(imageFile)
    }
    return await removeWithReplicate(imageFile)
  } catch (err) {
    console.error('[remove-bg] unexpected error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

async function removeWithPhotoRoom(imageFile: File): Promise<NextResponse> {
  const body = new FormData()
  body.append('image_file', imageFile, 'image.jpg')

  const res = await fetch(PHOTOROOM_URL, {
    method: 'POST',
    headers: { 'x-api-key': process.env.PHOTOROOM_API_KEY! },
    body,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    console.error('[remove-bg] PhotoRoom error:', res.status, errText)
    return NextResponse.json({ error: `PhotoRoom: ${res.status}` }, { status: 502 })
  }

  const outputBuffer = await res.arrayBuffer()
  return new NextResponse(outputBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  })
}

async function removeWithReplicate(imageFile: File): Promise<NextResponse> {
  const buffer = Buffer.from(await imageFile.arrayBuffer())
  const base64 = buffer.toString('base64')
  const dataUri = `data:image/jpeg;base64,${base64}`

  const createRes = await fetch(REPLICATE_MODEL, {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=55',
    },
    body: JSON.stringify({ input: { image: dataUri } }),
  })

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => createRes.statusText)
    console.error('[remove-bg] Replicate error:', createRes.status, errText)
    return NextResponse.json({ error: `Replicate: ${createRes.status}` }, { status: 502 })
  }

  let prediction = await createRes.json()

  if (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`
    const deadline = Date.now() + 50_000
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500))
      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
        cache: 'no-store',
      })
      prediction = await pollRes.json()
      if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') break
    }
  }

  if (prediction.status !== 'succeeded' || !prediction.output) {
    console.error('[remove-bg] Replicate prediction did not succeed:', prediction.status, prediction.error)
    return NextResponse.json({ error: 'Background removal failed' }, { status: 500 })
  }

  const outputUrl: string = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
  const outputRes = await fetch(outputUrl)
  if (!outputRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch result image' }, { status: 502 })
  }

  const outputBuffer = await outputRes.arrayBuffer()
  return new NextResponse(outputBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  })
}
