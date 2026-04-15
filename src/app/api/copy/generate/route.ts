/**
 * POST /api/copy/generate
 *
 * Generates AI product listing copy for a confirmed cluster.
 * Uses GPT-4o-mini for fast, cost-effective text generation.
 *
 * Body: { sku, productName, color, brandName, angles }
 * Response: { title, description, bullets }
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI copywriting not configured' }, { status: 503 })
  }

  const { sku, productName, color, brandName, angles } = await req.json()

  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const angleList = Array.isArray(angles) ? angles.join(', ') : 'front, back'
  const product = [productName, color].filter(Boolean).join(' in ') || 'fashion item'
  const brand = brandName || ''

  const prompt = `You are a fashion eCommerce copywriter for ANZ (Australian/New Zealand) brands.
Write compelling product listing copy for the following item.

Product details:
- SKU: ${sku || 'N/A'}
- Product: ${product}
${brand ? `- Brand: ${brand}` : ''}
- Available shots: ${angleList}

Return ONLY valid JSON in this exact format:
{
  "title": "Concise product title, max 80 characters, no brand name prefix",
  "description": "2-3 sentence product description. Highlight style, fit, fabric feel, and occasion. Avoid generic filler phrases.",
  "bullets": [
    "Key feature or detail",
    "Fit or silhouette note",
    "Fabric or material",
    "Styling suggestion",
    "Care or sizing note"
  ]
}

Tone: confident, editorial, direct. Written for a fashion-forward ANZ customer.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.75,
      max_tokens: 500,
    })

    const content = response.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(content)

    return NextResponse.json({
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 5) : [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Copy generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
