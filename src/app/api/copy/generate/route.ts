/**
 * POST /api/copy/generate
 *
 * Generates AI product listing copy for a confirmed cluster.
 * Sends the hero image to GPT-4o vision so it can identify the garment,
 * then writes title, description, and bullet points from what it sees.
 *
 * Body: { sku, productName, color, brandName, angles, heroImage?: string (base64 JPEG) }
 * Response: { title, description, bullets }
 */

import { NextRequest, NextResponse } from 'next/server'
import { PLANS } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI copywriting not configured' }, { status: 503 })
  }

  // Enforce aiCopy plan gate
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co') {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: orgData } = await supabase.from('orgs').select('plan').eq('id', user.id).single()
        const planId = (orgData?.plan ?? 'free') as PlanId
        if (!PLANS[planId].limits.aiCopy) {
          return NextResponse.json({
            error: `AI copywriting is available on the Brand plan and above. Upgrade to unlock this feature.`
          }, { status: 403 })
        }
      }
    } catch {}
  }

  const { sku, productName, color, brandName, angles, heroImage } = await req.json()

  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const angleList = Array.isArray(angles) ? angles.join(', ') : 'front, back'
  const brand = brandName || ''

  const systemPrompt = `You are a fashion eCommerce copywriter for ANZ (Australian/New Zealand) brands.
You write confident, editorial, direct copy for fashion-forward customers.
When given an image, identify the garment type, style, and any visible details (cut, length, details, texture).
Never invent details you cannot see. Keep copy grounded in what's actually visible.`

  const userText = `Write product listing copy for this fashion item.

Known details:
${sku ? `- SKU: ${sku}` : ''}
${productName ? `- Product name: ${productName}` : ''}
${color ? `- Colour: ${color}` : ''}
${brand ? `- Brand: ${brand}` : ''}
- Available shots: ${angleList}

${heroImage ? 'Use the image to identify the garment type and any visible style details.' : 'Use the product details above to write the copy.'}

Return ONLY valid JSON:
{
  "title": "Concise product title max 80 chars — lead with garment type and key detail",
  "description": "2-3 sentences. Describe what you see: garment type, silhouette, fabric feel, and occasion. No generic filler.",
  "bullets": [
    "Garment type and key style feature",
    "Fit or silhouette detail",
    "Fabric or material (if visible)",
    "Styling suggestion or occasion",
    "Care or sizing note"
  ]
}`

  try {
    const messages: Parameters<typeof openai.chat.completions.create>[0]['messages'] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: heroImage
          ? [
              {
                type: 'image_url' as const,
                image_url: { url: `data:image/jpeg;base64,${heroImage}`, detail: 'low' as const },
              },
              { type: 'text' as const, text: userText },
            ]
          : userText,
      },
    ]

    const response = await openai.chat.completions.create({
      model: heroImage ? 'gpt-4o' : 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
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
