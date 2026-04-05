/**
 * POST /api/ai/detect
 *
 * Sends all images in a cluster to GPT-4o-mini in one call.
 * Returns per-image angle labels, a fashion colour name, and optionally
 * a product category (for still-life shoots).
 *
 * Only active when NEXT_PUBLIC_AI_DETECTION=true and OPENAI_API_KEY is set.
 *
 * Body: { images: [{ id, filename, base64 }], shootType?: 'on-model' | 'still-life' }
 * Response: { result: { angles, colour, category? } }
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ViewLabel } from '@/types'

export const dynamic = 'force-dynamic'

const AI_ENABLED = process.env.NEXT_PUBLIC_AI_DETECTION === 'true'

const ON_MODEL_ANGLES = new Set(['front', 'back', 'side', 'detail', 'mood', 'full-length', 'ghost-mannequin', 'flat-lay'])
const STILL_LIFE_ANGLES = new Set(['front', 'back', 'side', 'detail', 'top-down', 'inside', 'front-3/4', 'back-3/4', 'flat-lay'])

const VALID_CATEGORIES = new Set(['bags', 'shoes', 'ties', 'caps', 'jewellery', 'scarves', 'belts', 'socks', 'sunglasses'])

export async function POST(req: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json({ error: 'AI detection is not enabled' }, { status: 400 })
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
  }

  const { images, shootType } = await req.json() as {
    images: { id: string; filename: string; base64: string }[]
    shootType?: 'on-model' | 'still-life'
  }

  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'images array required' }, { status: 400 })
  }

  const isStillLife = shootType === 'still-life'
  const validAngles = isStillLife ? STILL_LIFE_ANGLES : ON_MODEL_ANGLES

  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const imageContent = images.map((img) => ({
    type: 'image_url' as const,
    image_url: { url: `data:image/jpeg;base64,${img.base64}`, detail: 'low' as const },
  }))

  const indexedFilenames = images.map((img, i) => `${i + 1}. ${img.filename}`).join('\n')

  const angleOptions = isStillLife
    ? `- front\n- back\n- side\n- detail (close-up of texture, hardware, stitching, sole, clasp)\n- top-down (overhead/aerial view)\n- inside (interior lining, inside of bag)\n- front-3/4 (front three-quarter angle)\n- back-3/4 (back three-quarter angle)`
    : `- front (model facing camera)\n- back (rear view)\n- side (profile or three-quarter)\n- detail (close-up of fabric, texture, feature)\n- mood (lifestyle or editorial)\n- full-length (full body standing)\n- ghost-mannequin (garment on invisible mannequin)\n- flat-lay (product laid flat)`

  const categoryTask = isStillLife ? `

Task 3 — Product category: Identify the product category from ONE of:
bags, shoes, ties, caps, jewellery, scarves, belts, socks, sunglasses

If none fit, respond with "unknown".` : ''

  const categoryJson = isStillLife ? `,\n  "category": "shoes"` : ''

  const prompt = `You are classifying fashion eCommerce product images for a post-production workflow.

Images provided (in order):
${indexedFilenames}

Task 1 — Shot angle: For each image (1 to ${images.length}), classify as ONE of:
${angleOptions}

Task 2 — Colour: Identify the PRIMARY product colour using a fashion-appropriate name (e.g. "dusty rose", "cobalt blue", "sage green", "ecru"). 1-3 words maximum.${categoryTask}

Respond with ONLY valid JSON, no markdown:
{
  "angles": {"1": "front", "2": "back"},
  "colour": "dusty rose"${categoryJson}
}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: prompt }] }],
    max_tokens: 250,
    temperature: 0,
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? ''

  let parsed: { angles: Record<string, string>; colour: string; category?: string }
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
    angles[img.id] = (validAngles.has(angle) ? angle : 'front') as ViewLabel
  }

  const colour = typeof parsed.colour === 'string' ? parsed.colour.trim() : ''
  const category = isStillLife && parsed.category && VALID_CATEGORIES.has(parsed.category)
    ? parsed.category
    : null

  return NextResponse.json({ result: { angles, colour, category } })
}
