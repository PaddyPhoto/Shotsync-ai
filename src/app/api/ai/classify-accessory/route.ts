/**
 * POST /api/ai/classify-accessory
 *
 * Sends up to 3 images from a cluster to GPT-4o vision and returns the
 * matching ACCESSORY_CATEGORIES id (e.g. 'shoes', 'bags', 'jewellery').
 *
 * Body: { images: [{ base64, filename }] }
 * Response: { categoryId: string }
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CATEGORY_OPTIONS = [
  { id: 'ghost-mannequin', hint: 'Clothing on an invisible ghost mannequin showing garment shape — no visible model' },
  { id: 'bags',            hint: 'Handbags, tote bags, backpacks, clutches, purses, wallets, pouches' },
  { id: 'shoes',           hint: 'Shoes, boots, sneakers, sandals, heels, loafers, any footwear' },
  { id: 'jewellery',       hint: 'Rings, necklaces, bracelets, earrings, pendants, fine jewellery' },
  { id: 'sunglasses',      hint: 'Sunglasses, prescription glasses, eyewear frames' },
  { id: 'scarves',         hint: 'Scarves, wraps, shawls — fabric accessories worn around neck or head' },
  { id: 'belts',           hint: 'Belts — worn around the waist, with visible buckle or hardware' },
  { id: 'caps',            hint: 'Caps, hats, beanies, headwear' },
  { id: 'ties',            hint: 'Ties, bow ties, neckties, pocket squares' },
  { id: 'socks',           hint: 'Socks, hosiery, stockings, tights' },
  { id: 'accessories',     hint: 'Other accessories not listed above' },
]

const PROMPT = `You are a fashion product classifier analysing still-life product photography.

Look at the image(s) provided and identify which single category best describes the product shown.

Categories:
${CATEGORY_OPTIONS.map((c) => `- ${c.id}: ${c.hint}`).join('\n')}

Reply with ONLY the category id (e.g. "shoes") — nothing else. No explanation, no punctuation.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
  }

  const body = await req.json()

  // Support both { images: [...] } and legacy { base64, filename }
  const images: { base64: string; filename: string }[] = body.images
    ?? (body.base64 ? [{ base64: body.base64, filename: body.filename ?? 'image.jpg' }] : [])

  if (!images.length) {
    return NextResponse.json({ error: 'images array is required' }, { status: 400 })
  }

  const toMime = (filename: string) =>
    filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

  const imageContent = images.flatMap((img) => [
    { type: 'image_url' as const, image_url: { url: `data:${toMime(img.filename)};base64,${img.base64}`, detail: 'low' as const } },
  ])

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
              ...imageContent,
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
