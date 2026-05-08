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
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // 20 AI copy requests per minute per IP
  if (!rateLimit(getClientIp(req), 20, 60_000)) return rateLimitResponse()

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

  const { sku, productName, color, brandName, angles, heroImage, composition, care, fit, length, rrp, season, occasion, gender, category, subCategory, origin, sizeRange } = await req.json()

  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const angleList = Array.isArray(angles) ? angles.join(', ') : 'front, back'
  const brand = brandName || ''

  const systemPrompt = `You are a fashion eCommerce copywriter for premium Australian fashion brands.
You write precise, editorial, confident product descriptions modelled on the style of top ANZ retailers.

DESCRIPTION STRUCTURE — follow this exactly, 4–5 sentences:
1. Opening sentence: Lead with the product name in a compelling, garment-specific hook tied to season, occasion, or wardrobe value. Examples of good openers: "Step into winter style with the [Name].", "Invest in classic cold-weather dressing with the [Name].", "Every wardrobe needs quality basics like the [Name],". NEVER start with "Elevate", "Upgrade your wardrobe", "Discover", "Step up your style", "Take your wardrobe to the next level", or any generic phrase.
2. Material sentence: Name the fabric composition accurately. Mention the specific weave, finish, or fabric quality if relevant.
3. Design sentence: Describe the silhouette, collar, closure, and key styling details visible or listed.
4. Feature sentence: Call out specific functional details — pocket types, lining, buttons, vents, etc.
5. Styling close: One specific, garment-appropriate styling suggestion. NOT a generic "from business to casual" or "day to night" line — make it concrete and relevant to this exact garment.

TONE: Confident, precise, editorial. No filler. No vague superlatives.
ACCURACY: Never invent details not provided or visible. State fabric composition verbatim when provided.`

  const specLines = [
    sku          && `- SKU: ${sku}`,
    productName  && `- Product name: ${productName}`,
    color        && `- Colour: ${color}`,
    brand        && `- Brand: ${brand}`,
    gender       && `- Gender: ${gender}`,
    category     && `- Garment type: ${category}`,
    subCategory  && `- Sub-category: ${subCategory}`,
    season       && `- Season/Collection: ${season}`,
    fit          && `- Fit: ${fit}`,
    length       && `- Length: ${length}`,
    sizeRange    && `- Size range: ${sizeRange}`,
    composition  && `- Fabric composition: ${composition}`,
    care         && `- Care instructions: ${care}`,
    origin       && `- Country of origin: ${origin}`,
    occasion     && `- Occasion: ${occasion}`,
    rrp          && `- RRP: $${rrp}`,
    `- Available shots: ${angleList}`,
  ].filter(Boolean).join('\n')

  const factualNote = [
    composition && `fabric composition ("${composition}")`,
    care        && `care instructions ("${care}")`,
    origin      && `country of origin ("${origin}")`,
    fit         && `fit type ("${fit}")`,
  ].filter(Boolean).join(', ')

  const userText = `Write product listing copy for this fashion item.

Known details:
${specLines}

${heroImage ? 'Use the image to identify the garment type and any visible style details (cut, silhouette, collar, pockets, buttons, hem, texture).' : 'Use the product details above to write the copy.'}
${factualNote ? `These are factual spec sheet values — use them verbatim, never rephrase: ${factualNote}.` : ''}

Write exactly 4–5 sentences following the structure in your instructions. Do not start the description with "Elevate", "Upgrade", "Discover", or any generic phrase — open with the product name in a specific, seasonal or occasion-driven sentence.

Return ONLY valid JSON:
{
  "title": "Concise product title max 80 chars — lead with garment type and key detail, no generic adjectives",
  "description": "4–5 sentences. Follow the structure: specific opener with product name → fabric/material → design features → functional details → concrete styling close. No generic filler. No 'business to casual' endings.",
  "bullets": [
    "Garment type, fit, and silhouette",
    "${fit ? `${fit} fit` : 'Fit'}${length ? ` — ${length}` : ''}",
    "${composition ? `${composition}` : 'Fabric composition'}",
    "Key design details (collar, closure, pockets, lining, etc.)",
    "${care ? `Care: ${care}` : 'Care or finishing detail'}"
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
      temperature: 0.65,
      max_tokens: 700,
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
