/**
 * POST /api/jobs/detect-angles
 *
 * Classifies each image in the batch by shot angle using GPT-4o-mini vision.
 * Uses detail:'low' (85 image tokens) making this ~$0.000046 per image.
 * Falls back gracefully — callers keep positional labels on failure.
 *
 * Body:  { images: { imageId: string; base64: string }[] }
 * Response: { results: { imageId: string; viewLabel: string; confidence: number }[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/server'

export const maxDuration = 60

const VALID_LABELS = new Set([
  'front', 'back', 'side', 'full-length', 'detail', 'mood',
  'flat-lay', 'top-down', 'inside', 'front-3/4', 'back-3/4', 'ghost-mannequin',
])

const CLASSIFICATION_PROMPT = `You are classifying a fashion product photograph by shot angle.
Choose exactly one label from this list:
front, back, side, full-length, detail, mood, flat-lay, top-down, inside, front-3/4, back-3/4, ghost-mannequin

Definitions:
- front: product/model facing camera directly
- back: viewed from behind
- side: viewed from the side (profile)
- full-length: full body head-to-toe shot
- detail: close-up of fabric, texture, or specific feature
- mood: lifestyle or editorial shot, not product-focused
- flat-lay: product laid flat on a surface
- top-down: overhead aerial view
- inside: interior view (bag lining, inner construction)
- front-3/4: diagonal front angle
- back-3/4: diagonal back angle
- ghost-mannequin: invisible mannequin / hollow body effect

Respond with only the label, nothing else.`

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Angle detection not configured' }, { status: 503 })
  }

  const { images } = await req.json() as { images: { imageId: string; base64: string }[] }
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const results: { imageId: string; viewLabel: string; confidence: number }[] = []
  const BATCH = 10

  for (let i = 0; i < images.length; i += BATCH) {
    const batch = images.slice(i, i + BATCH)
    const batchResults = await Promise.all(
      batch.map(async ({ imageId, base64 }) => {
        try {
          const res = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 10,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' },
                },
                { type: 'text', text: CLASSIFICATION_PROMPT },
              ],
            }],
          })
          const raw = res.choices[0]?.message?.content?.trim().toLowerCase() ?? ''
          const label = VALID_LABELS.has(raw) ? raw : 'front'
          return { imageId, viewLabel: label, confidence: VALID_LABELS.has(raw) ? 0.92 : 0.5 }
        } catch {
          return { imageId, viewLabel: 'front', confidence: 0 }
        }
      })
    )
    results.push(...batchResults)
  }

  return NextResponse.json({ results })
}
