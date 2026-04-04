/**
 * POST /api/ai/detect
 *
 * Sends all images in a cluster to GPT-4o-mini in one call.
 * Returns per-image angle labels and a fashion colour name for the cluster.
 *
 * Only active when NEXT_PUBLIC_AI_DETECTION=true and OPENAI_API_KEY is set.
 *
 * Body: { images: [{ id: string, filename: string, base64: string }] }
 * Response: { result: { angles: Record<string, string>, colour: string } }
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ViewLabel } from '@/types'

export const dynamic = 'force-dynamic'

const AI_ENABLED = process.env.NEXT_PUBLIC_AI_DETECTION === 'true'
const VALID_ANGLES = new Set(['front', 'back', 'side', 'detail', 'mood', 'full-length'])

export async function POST(req: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json({ error: 'AI detection is not enabled' }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
  }

  const { images } = await req.json() as {
    images: { id: string; filename: string; base64: string }[]
  }

  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'images array required' }, { status: 400 })
  }

  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Build the message content — all images + one instruction
  const imageContent = images.map((img, i) => ({
    type: 'image_url' as const,
    image_url: {
      url: `data:image/jpeg;base64,${img.base64}`,
      detail: 'low' as const,
    },
  }))

  const indexedFilenames = images.map((img, i) => `${i + 1}. ${img.filename}`).join('\n')

  const prompt = `You are classifying fashion eCommerce product images for a post-production workflow.

Images provided (in order):
${indexedFilenames}

Task 1 — Shot angle: For each image (1 to ${images.length}), classify the shot angle as ONE of:
- front (model facing camera, garment front visible)
- back (rear of garment visible)
- side (profile or three-quarter angle)
- detail (close-up of fabric, texture, or specific feature)
- mood (lifestyle or editorial shot, not a standard product angle)
- full-length (full body standing shot)

Task 2 — Garment colour: Identify the PRIMARY garment colour using a fashion-appropriate name (e.g. "dusty rose", "cobalt blue", "sage green", "ecru", "rust", "slate grey", "off-white", "blush", "forest green", "burnt orange"). Use 1-3 words maximum.

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "angles": {"1": "front", "2": "back", "3": "side"},
  "colour": "dusty rose"
}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          { type: 'text', text: prompt },
        ],
      },
    ],
    max_tokens: 200,
    temperature: 0,
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? ''

  let parsed: { angles: Record<string, string>; colour: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 })
  }

  // Map numeric indices back to image IDs, validate angle values
  const angles: Record<string, ViewLabel> = {}
  for (const [indexStr, angle] of Object.entries(parsed.angles ?? {})) {
    const idx = parseInt(indexStr, 10) - 1
    const img = images[idx]
    if (!img) continue
    const label = VALID_ANGLES.has(angle) ? angle as ViewLabel : 'front'
    angles[img.id] = label
  }

  const colour = typeof parsed.colour === 'string' ? parsed.colour.trim() : ''

  return NextResponse.json({ result: { angles, colour } })
}
