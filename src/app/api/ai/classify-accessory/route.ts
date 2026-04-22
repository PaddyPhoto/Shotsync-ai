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
export const maxDuration = 60

const CATEGORY_OPTIONS = [
  { id: 'ghost-mannequin', label: 'Ghost Mannequin',      hint: 'Clothing on an invisible ghost mannequin' },
  { id: 'bags',            label: 'Bags & Handbags',       hint: 'Handbags, totes, backpacks, clutches, wallets' },
  { id: 'shoes',           label: 'Shoes & Footwear',      hint: 'Shoes, boots, sneakers, sandals, heels' },
  { id: 'jewellery',       label: 'Jewellery',             hint: 'Rings, necklaces, bracelets, earrings' },
  { id: 'sunglasses',      label: 'Sunglasses & Eyewear',  hint: 'Sunglasses, glasses, eyewear frames' },
  { id: 'scarves',         label: 'Scarves',               hint: 'Scarves, wraps, shawls — flat fabric laid out or folded' },
  { id: 'belts',           label: 'Belts',                 hint: 'Belts with buckle hardware' },
  { id: 'caps',            label: 'Caps & Hats',           hint: 'Caps, hats, beanies, headwear' },
  { id: 'ties',            label: 'Ties & Neckwear',       hint: 'Neckties, bow ties' },
  { id: 'socks',           label: 'Socks & Hosiery',       hint: 'Socks, stockings, tights' },
  { id: 'accessories',     label: 'Other Accessories',     hint: 'Anything not covered above' },
]

// Fuzzy aliases for common GPT-4o responses that don't exactly match an id
const ALIASES: Record<string, string> = {
  shoe: 'shoes', boot: 'shoes', sneaker: 'shoes', footwear: 'shoes', sandal: 'shoes', heel: 'shoes',
  bag: 'bags', handbag: 'bags', purse: 'bags', tote: 'bags', backpack: 'bags', clutch: 'bags', wallet: 'bags',
  scarf: 'scarves', wrap: 'scarves', shawl: 'scarves',
  belt: 'belts',
  hat: 'caps', cap: 'caps', beanie: 'caps', headwear: 'caps',
  tie: 'ties', necktie: 'ties', bowtie: 'ties',
  sock: 'socks', hosiery: 'socks', stocking: 'socks',
  ring: 'jewellery', necklace: 'jewellery', bracelet: 'jewellery', earring: 'jewellery', jewelry: 'jewellery',
  sunglass: 'sunglasses', eyewear: 'sunglasses', glasses: 'sunglasses',
  ghost: 'ghost-mannequin', mannequin: 'ghost-mannequin',
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
  }

  const body = await req.json()
  const images: { base64: string; filename: string }[] = body.images
    ?? (body.base64 ? [{ base64: body.base64, filename: body.filename ?? 'image.jpg' }] : [])

  if (!images.length) {
    return NextResponse.json({ error: 'images array is required' }, { status: 400 })
  }

  const toMime = (filename: string) =>
    filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

  // Numbered prompt — much more reliable than exact string matching
  const numberedList = CATEGORY_OPTIONS
    .map((c, i) => `${i + 1}. ${c.label} — ${c.hint}`)
    .join('\n')

  const prompt = `You are a fashion product classifier. Look at the product image(s) and identify the category.

${numberedList}

Reply with ONLY the number (1-${CATEGORY_OPTIONS.length}). Nothing else.`

  const imageContent = images.map((img) => ({
    type: 'image_url' as const,
    image_url: {
      url: `data:${toMime(img.filename)};base64,${img.base64}`,
      detail: 'low' as const,
    },
  }))

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
              { type: 'text', text: prompt },
              ...imageContent,
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      console.error('[classify-accessory] OpenAI error:', res.status, await res.text())
      return NextResponse.json({ categoryId: 'accessories' })
    }

    const json = await res.json()
    const raw = (json.choices?.[0]?.message?.content ?? '').trim()

    // Try numbered response first (e.g. "3" → shoes)
    const num = parseInt(raw, 10)
    if (!isNaN(num) && num >= 1 && num <= CATEGORY_OPTIONS.length) {
      return NextResponse.json({ categoryId: CATEGORY_OPTIONS[num - 1].id })
    }

    // Fallback: try exact id match, then alias match
    const lower = raw.toLowerCase().replace(/[^a-z-]/g, '')
    const exact = CATEGORY_OPTIONS.find((c) => c.id === lower)
    if (exact) return NextResponse.json({ categoryId: exact.id })

    const alias = ALIASES[lower]
    if (alias) return NextResponse.json({ categoryId: alias })

    console.warn('[classify-accessory] unrecognised response:', raw)
    return NextResponse.json({ categoryId: 'accessories' })
  } catch (err) {
    console.error('[classify-accessory]', err)
    return NextResponse.json({ categoryId: 'accessories' })
  }
}
