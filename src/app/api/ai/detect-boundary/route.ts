/**
 * POST /api/ai/detect-boundary
 *
 * Compares two consecutive product images and determines whether they show
 * the same product (same item, different angle) or a different product.
 *
 * Used for variable-size clustering in mixed still-life batches.
 *
 * Body: { imageA: { base64, filename }, imageB: { base64, filename } }
 * Response: { isBoundary: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PROMPT = `You are analysing consecutive images from a fashion product photoshoot.

Look at Image A and Image B carefully.

Are they showing the SAME product (the same item photographed from different angles), or are they DIFFERENT products (two distinct items)?

Consider: colour, shape, texture, material, size, style details.

Reply with ONLY one word: "same" or "different"`

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })
  }

  const { imageA, imageB } = await req.json() as {
    imageA: { base64: string; filename: string }
    imageB: { base64: string; filename: string }
  }
  if (!imageA?.base64 || !imageB?.base64) {
    return NextResponse.json({ error: 'imageA and imageB required' }, { status: 400 })
  }

  const toMime = (filename: string) =>
    filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 5,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'text', text: 'Image A:' },
              { type: 'image_url', image_url: { url: `data:${toMime(imageA.filename)};base64,${imageA.base64}`, detail: 'low' } },
              { type: 'text', text: 'Image B:' },
              { type: 'image_url', image_url: { url: `data:${toMime(imageB.filename)};base64,${imageB.base64}`, detail: 'low' } },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      console.error('[detect-boundary] OpenAI error:', await res.text())
      return NextResponse.json({ isBoundary: false })
    }

    const json = await res.json()
    const answer = (json.choices?.[0]?.message?.content ?? '').trim().toLowerCase()
    const isBoundary = answer.startsWith('diff')

    return NextResponse.json({ isBoundary })
  } catch (err) {
    console.error('[detect-boundary]', err)
    return NextResponse.json({ isBoundary: false })
  }
}
