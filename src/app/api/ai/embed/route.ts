/**
 * POST /api/ai/embed
 *
 * Generates semantic embeddings for a batch of product images.
 * Used by the client-side processor to replace pixel-histogram K-means
 * with semantically meaningful clustering.
 *
 * Strategy:
 *   1. Send batches of 8 images to GPT-4o-mini (detail:low) and ask for a
 *      10-word fashion description of each one.
 *   2. Batch-embed all descriptions with text-embedding-3-small in one call.
 *   3. Return { id, vector } pairs — client feeds these into clusterEmbeddings.
 *
 * Body:    { images: [{ id, filename, base64 }] }
 * Response: { embeddings: [{ id, vector }] }
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BATCH_SIZE = 8  // images per GPT vision call

export async function POST(req: NextRequest) {
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

  // Step 1: describe each image in batches
  const descriptions: { id: string; text: string }[] = []

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE)

    const imageContent = batch.map((img) => ({
      type: 'image_url' as const,
      image_url: { url: `data:image/jpeg;base64,${img.base64}`, detail: 'low' as const },
    }))

    const prompt = `You are labelling fashion product images for visual clustering.
For each image (1 to ${batch.length}), write a 10-word description focusing on:
product type, primary colour, style, and one key visual feature.

Reply as valid JSON only, no markdown:
{"1": "ivory linen blazer relaxed fit notch lapel", "2": "..."}`

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: prompt }] }],
        max_tokens: 400,
        temperature: 0,
      })

      const raw = res.choices[0]?.message?.content?.trim() ?? '{}'
      const parsed = JSON.parse(raw) as Record<string, string>

      for (let j = 0; j < batch.length; j++) {
        descriptions.push({
          id: batch[j].id,
          text: parsed[String(j + 1)] ?? batch[j].filename,
        })
      }
    } catch {
      // Fall back to filename as description for this batch
      for (const img of batch) {
        descriptions.push({ id: img.id, text: img.filename })
      }
    }
  }

  // Step 2: batch-embed all descriptions in one call
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: descriptions.map((d) => d.text),
  })

  const embeddings = descriptions.map((d, i) => ({
    id: d.id,
    vector: embeddingRes.data[i].embedding,
  }))

  return NextResponse.json({ embeddings })
}
