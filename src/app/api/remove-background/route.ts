/**
 * POST /api/remove-background
 *
 * Server-side background removal via Replicate BRIA RMBG 2.0.
 * Accepts a JPEG image as multipart form data, returns a transparent PNG.
 *
 * Falls back gracefully — callers should catch non-200 and use the
 * browser-based @imgly fallback instead.
 *
 * Env: REPLICATE_API_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const REPLICATE_MODEL = 'https://api.replicate.com/v1/models/bria-ai/rmbg-2.0/predictions'

export async function POST(req: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'Background removal not configured' }, { status: 503 })
  }

  try {
    const formData = await req.formData()
    const imageFile = formData.get('image') as File | null
    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const base64 = buffer.toString('base64')
    const dataUri = `data:image/jpeg;base64,${base64}`

    // Create prediction — Prefer: wait asks Replicate to respond synchronously
    // (up to 60 s). Falls back to polling if the header isn't honoured.
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

    // If not yet done (Prefer: wait not honoured), poll until finished
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
      console.error('[remove-bg] prediction did not succeed:', prediction.status, prediction.error)
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
  } catch (err) {
    console.error('[remove-bg] unexpected error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
