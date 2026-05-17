/**
 * POST /api/jobs/detect-angles
 *
 * Classifies each image by shot angle using Claude Haiku 4.5 vision.
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

const CLASSIFICATION_PROMPT = `You are classifying a fashion product photograph. Respond with JSON only, no markdown.

1. angle — choose exactly one: front, back, side, full-length, detail, mood, flat-lay, top-down, inside, front-3/4, back-3/4, ghost-mannequin
   - front: model/product facing camera
   - back: viewed from behind
   - side: side profile
   - full-length: head-to-toe shot
   - detail: close-up of fabric, texture, or feature
   - mood: lifestyle/editorial, not product-focused
   - flat-lay: product laid flat
   - top-down: overhead view
   - inside: interior (bag lining etc.)
   - front-3/4: diagonal front angle
   - back-3/4: diagonal back angle
   - ghost-mannequin: invisible mannequin effect

2. color — ONE word: primary color of the main garment (e.g. "navy", "beige", "black", "olive", "cream", "white")

{"angle":"front","color":"navy"}`

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Angle detection not configured' }, { status: 503 })
  }

  const { images } = await req.json() as { images: { imageId: string; base64: string }[] }
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const results: { imageId: string; viewLabel: string; confidence: number; garmentKey: string }[] = []
  const BATCH = 10

  for (let i = 0; i < images.length; i += BATCH) {
    const batch = images.slice(i, i + BATCH)
    const batchResults = await Promise.all(
      batch.map(async ({ imageId, base64 }) => {
        try {
          const res = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 30,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
                },
                { type: 'text', text: CLASSIFICATION_PROMPT },
              ],
            }],
          })
          const raw = res.content[0]?.type === 'text' ? res.content[0].text.trim() : ''
          let angle = 'front'
          let garmentKey = ''
          try {
            const parsed = JSON.parse(raw)
            const a = typeof parsed.angle === 'string' ? parsed.angle.trim().toLowerCase() : ''
            angle = VALID_LABELS.has(a) ? a : 'front'
            garmentKey = typeof parsed.color === 'string' ? parsed.color.trim().toLowerCase().split(/\s+/)[0] : ''
          } catch {
            const plain = raw.toLowerCase()
            angle = VALID_LABELS.has(plain) ? plain : 'front'
          }
          return { imageId, viewLabel: angle, confidence: garmentKey ? 0.92 : 0.5, garmentKey }
        } catch {
          return { imageId, viewLabel: 'front', confidence: 0, garmentKey: '' }
        }
      })
    )
    results.push(...batchResults)
  }

  return NextResponse.json({ results })
}
