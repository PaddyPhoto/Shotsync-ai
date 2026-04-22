/**
 * POST /api/ai/detect
 *
 * Sends all images in a cluster to GPT-4o in one call.
 * Returns per-image angle labels, a fashion colour name, and optionally
 * a product category (for still-life shoots).
 *
 * Only active when NEXT_PUBLIC_AI_DETECTION=true and OPENAI_API_KEY is set.
 *
 * Body: {
 *   images: [{ id, filename, base64 }],
 *   shootType?: 'on-model' | 'still-life',
 *   stillLifeCategory?: 'ghost-mannequin' | 'accessories' | 'jewellery' | string
 * }
 * Response: { result: { angles, colour, category? } }
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ViewLabel } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AI_ENABLED = process.env.NEXT_PUBLIC_AI_DETECTION === 'true'

// Per-category angle constraints — scopes the prompt to only valid angles for that type
const CATEGORY_ANGLE_OPTIONS: Record<string, { angles: string[]; descriptions: string }> = {
  'ghost-mannequin': {
    angles: ['front', 'back'],
    descriptions: '- front (front view of garment on ghost mannequin)\n- back (rear view of garment on ghost mannequin)',
  },
  'accessories': {
    angles: ['front', 'side', 'detail', 'back', 'inside'],
    descriptions: '- front\n- side (side profile)\n- detail (close-up of texture, hardware, stitching, clasp)\n- back\n- inside (interior lining or compartment)',
  },
  'jewellery': {
    angles: ['front', 'side', 'back'],
    descriptions: '- front (Angle 1 — primary view)\n- side (Angle 2 — secondary view)\n- back (Angle 3 — third view)',
  },
  'bags': {
    angles: ['front', 'side', 'detail', 'back', 'inside'],
    descriptions: '- front\n- side\n- detail (close-up of hardware, stitching, clasp)\n- back\n- inside (interior lining or compartment)',
  },
  'shoes': {
    angles: ['front', 'side', 'back', 'detail', 'top-down'],
    descriptions: '- front\n- side (lateral profile)\n- back (heel view)\n- detail (close-up of sole, texture, logo)\n- top-down (overhead view)',
  },
  'sunglasses': {
    angles: ['front', 'side', 'front-3/4', 'top-down', 'detail', 'back'],
    descriptions: '- front\n- side\n- front-3/4 (front three-quarter)\n- top-down (overhead)\n- detail (close-up of temple, lens)\n- back',
  },
}

const ON_MODEL_ANGLES = new Set<string>(['front', 'back', 'side', 'detail', 'mood', 'full-length', 'ghost-mannequin', 'flat-lay'])
const STILL_LIFE_ANGLES = new Set<string>(['front', 'back', 'side', 'detail', 'top-down', 'inside', 'front-3/4', 'back-3/4', 'flat-lay'])
const VALID_CATEGORIES = new Set(['ghost-mannequin', 'accessories', 'jewellery', 'bags', 'shoes', 'ties', 'caps', 'scarves', 'belts', 'socks', 'sunglasses'])

export async function POST(req: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json({ error: 'AI detection is not enabled' }, { status: 400 })
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
  }

  const { images, shootType, stillLifeCategory } = await req.json() as {
    images: { id: string; filename: string; base64: string }[]
    shootType?: 'on-model' | 'still-life'
    stillLifeCategory?: string
  }

  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'images array required' }, { status: 400 })
  }

  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const isStillLife = shootType === 'still-life'
  const categoryConfig = stillLifeCategory ? CATEGORY_ANGLE_OPTIONS[stillLifeCategory] : null

  // Determine valid angles and prompt text
  const validAngles = categoryConfig
    ? new Set(categoryConfig.angles)
    : isStillLife ? STILL_LIFE_ANGLES : ON_MODEL_ANGLES

  const angleOptions = categoryConfig
    ? categoryConfig.descriptions
    : isStillLife
    ? `- front\n- back\n- side\n- detail (close-up of texture, hardware, stitching, sole, clasp)\n- top-down (overhead/aerial view)\n- inside (interior lining, inside of bag)\n- front-3/4 (front three-quarter angle)\n- back-3/4 (back three-quarter angle)`
    : `- front (model facing camera)\n- back (rear view)\n- side (profile or three-quarter)\n- detail (close-up of fabric, texture, feature)\n- mood (lifestyle or editorial)\n- full-length (full body standing)\n- ghost-mannequin (garment on invisible mannequin)\n- flat-lay (product laid flat)`

  // Category detection task — only for still-life without a pre-set category
  const categoryTask = isStillLife && !stillLifeCategory
    ? `\n\nTask 3 — Product category: Identify the product category from ONE of:\nghost-mannequin, accessories, jewellery, bags, shoes, ties, caps, scarves, belts, socks, sunglasses\n\nIf none fit, respond with "unknown".`
    : ''

  const categoryJson = isStillLife && !stillLifeCategory ? `,\n  "category": "bags"` : ''

  const imageContent = images.map((img) => ({
    type: 'image_url' as const,
    image_url: { url: `data:image/jpeg;base64,${img.base64}`, detail: 'high' as const },
  }))

  const indexedFilenames = images.map((img, i) => `${i + 1}. ${img.filename}`).join('\n')

  const categoryHint = stillLifeCategory ? `\nProduct type: ${stillLifeCategory}.` : ''

  const prompt = `You are classifying fashion eCommerce product images for a post-production workflow.${categoryHint}

Images provided (in order):
${indexedFilenames}

Task 1 — Shot angle: For each image (1 to ${images.length}), classify as ONE of:
${angleOptions}

Task 2 — Colour: Identify the PRIMARY product colour using a precise fashion name (e.g. "dusty rose", "cobalt blue", "sage green", "ecru", "off-white"). 1-3 words maximum.${categoryTask}

Respond with ONLY valid JSON, no markdown:
{
  "angles": {"1": "front", "2": "back"},
  "colour": "dusty rose"${categoryJson}
}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: prompt }] }],
    max_tokens: 300,
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
    angles[img.id] = (validAngles.has(angle) ? angle : categoryConfig?.angles[0] ?? 'front') as ViewLabel
  }

  const colour = typeof parsed.colour === 'string' ? parsed.colour.trim() : ''

  const category = isStillLife
    ? (stillLifeCategory ?? (parsed.category && VALID_CATEGORIES.has(parsed.category) ? parsed.category : null))
    : null

  return NextResponse.json({ result: { angles, colour, category } })
}
