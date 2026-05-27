/**
 * POST /api/classify-garment
 *
 * Classifies a garment image into one of the known GARMENT_CATEGORIES labels.
 * Used during upload to auto-set garmentCategory and apply per-category angle sequences.
 *
 * Body: { image: string (base64 JPEG/PNG), categories: string[] }
 * Response: { category: string | null }
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 60, 60_000)) return rateLimitResponse()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ category: null })
  }

  const { image, categories } = await req.json()

  if (!image || !Array.isArray(categories) || categories.length === 0) {
    return NextResponse.json({ category: null })
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const categoryList = categories.join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: `You are classifying a fashion garment image for a product photography studio.

Identify the garment in the image and pick the single best matching category from this list:
${categoryList}

Rules:
- Respond with ONLY the exact category label from the list above, nothing else.
- If the garment does not match any category (e.g. it's a bag, shoes, or accessory), respond with: null
- Do not add any explanation, punctuation, or extra text.`,
            },
          ],
        },
      ],
    })

    const raw = (response.content[0] as { type: string; text?: string })?.text?.trim() ?? ''
    const matched = categories.find((c) => c.toLowerCase() === raw.toLowerCase())

    return NextResponse.json({ category: matched ?? null })
  } catch (err) {
    console.error('POST /api/classify-garment error:', err)
    return NextResponse.json({ category: null })
  }
}
