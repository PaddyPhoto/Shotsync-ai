/**
 * POST /api/ai/classify-accessory
 *
 * Sends the first image of a cluster to GPT-4o vision and returns the
 * matching ACCESSORY_CATEGORIES id (e.g. 'shoes', 'bags', 'jewellery').
 *
 * Body: { base64: string, filename: string }
 * Response: { categoryId: string }
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CATEGORY_OPTIONS = [
  { id: 'ghost-mannequin', label: 'Ghost Mannequin', hint: 'A clothing item photographed on an invisible/ghost mannequin showing the garment shape' },
  { id: 'accessories',     label: 'Accessories',     hint: 'General accessories — scarves, belts, hats, caps, socks, ties, sunglasses, eyewear' },
  { id: 'bags',            label: 'Bags & Handbags', hint: 'Handbags, tote bags, backpacks, clutches, purses, wallets' },
  { id: 'shoes',           label: 'Shoes & Footwear',hint: 'Shoes, boots, sneakers, sandals, heels, any footwear' },
  { id: 'jewellery',       label: 'Jewellery',       hint: 'Rings, necklaces, bracelets, earrings, fine jewellery' },
]

const PROMPT = `You are a fashion product classifier. Look at this product image and identify which category it belongs to.

Categories:
${CATEGORY_OPTIONS.map((c) => `- ${c.id}: ${c.hint}`).join('\n')}

Reply with ONLY the category id (e.g. "shoes") — nothing else. No explanation, no punctuation.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
  }

  const { base64, filename } = await req.json()
  if (!base64) return NextResponse.json({ error: 'base64 is required' }, { status: 400 })

  const ext = (filename ?? '').split('.').pop()?.toLowerCase() ?? 'jpg'
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 20,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'low' } },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[classify-accessory] OpenAI error:', err)
      return NextResponse.json({ error: 'OpenAI request failed' }, { status: 502 })
    }

    const json = await res.json()
    const raw = (json.choices?.[0]?.message?.content ?? '').trim().toLowerCase().replace(/[^a-z-]/g, '')
    const match = CATEGORY_OPTIONS.find((c) => c.id === raw)

    return NextResponse.json({ categoryId: match?.id ?? 'accessories' })
  } catch (err) {
    console.error('[classify-accessory]', err)
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 })
  }
}
