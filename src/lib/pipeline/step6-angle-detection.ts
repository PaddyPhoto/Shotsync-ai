/**
 * Step 6: Classify image angles (front/back/side/detail)
 * Uses OpenAI Vision for MVP; falls back to filename heuristics.
 */
import type { ViewLabel } from '@/types'
import { createServiceClient } from '@/lib/supabase/server'

const VIEW_KEYWORDS: Record<ViewLabel, string[]> = {
  front: ['front', 'f01', 'f1', '_f_', '-f-', 'main', 'hero', 'a01'],
  back: ['back', 'b01', 'b1', '_b_', '-b-', 'rear'],
  side: ['side', 's01', 's1', '_s_', '-s-', 'profile', 'alt'],
  detail: ['detail', 'd01', 'd1', '_d_', '-d-', 'close', 'zoom', 'flat'],
  mood: ['mood', 'm01', 'm1', '_m_', '-m-', 'lifestyle', 'editorial', 'styled'],
  'full-length': ['full', 'fl', 'fulllength', 'full-length', 'full_length', 'fl01', 'standing'],
  unknown: [],
}

export function detectViewFromFilename(filename: string): { label: ViewLabel; confidence: number } {
  const lower = filename.toLowerCase()
  for (const [view, keywords] of Object.entries(VIEW_KEYWORDS) as [ViewLabel, string[]][]) {
    if (view === 'unknown') continue
    if (keywords.some((kw) => lower.includes(kw))) {
      return { label: view, confidence: 0.75 }
    }
  }

  // Sequence-based heuristic: first image in group = front
  return { label: 'unknown', confidence: 0 }
}

export async function detectViewWithAI(imageUrl: string): Promise<{ label: ViewLabel; confidence: number }> {
  if (!process.env.OPENAI_API_KEY) {
    return { label: 'unknown', confidence: 0 }
  }

  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
          {
            type: 'text',
            text: 'This is a fashion product image. Classify the shot angle as ONE of: front, back, side, detail. Reply with ONLY the single word.',
          },
        ],
      },
    ],
    max_tokens: 10,
  })

  const raw = res.choices[0]?.message?.content?.trim().toLowerCase() ?? ''
  const label = (['front', 'back', 'side', 'detail'].includes(raw) ? raw : 'unknown') as ViewLabel
  return { label, confidence: label !== 'unknown' ? 0.85 : 0 }
}

/**
 * Assign sequence-based labels to images that couldn't be classified.
 * First image in cluster = front, second = back, third = side, rest = detail.
 */
export function assignSequenceLabels(
  images: { id: string; view_label: ViewLabel; original_filename: string }[]
): { id: string; view_label: ViewLabel; confidence: number }[] {
  const sequence: ViewLabel[] = ['front', 'back', 'side', 'detail', 'mood', 'full-length']
  let seqIdx = 0

  return images.map((img) => {
    // Try filename first
    const fromFilename = detectViewFromFilename(img.original_filename)
    if (fromFilename.label !== 'unknown') {
      return { id: img.id, view_label: fromFilename.label, confidence: fromFilename.confidence }
    }

    // Fall back to sequence
    const label = sequence[seqIdx % sequence.length]
    seqIdx++
    return { id: img.id, view_label: label, confidence: 0.5 }
  })
}

export async function labelClusterImages(clusterId: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: images, error } = await supabase
    .from('images')
    .select('id, original_filename, storage_url, view_label')
    .eq('cluster_id', clusterId)
    .order('original_filename')

  if (error || !images) throw new Error('Failed to fetch cluster images')

  const labeled = assignSequenceLabels(images)
  const detectedViews = [...new Set(labeled.map((l) => l.view_label))] as ViewLabel[]

  // Batch update images
  for (const item of labeled) {
    await supabase
      .from('images')
      .update({ view_label: item.view_label, view_confidence: item.confidence, status: 'labeled' })
      .eq('id', item.id)
  }

  // Update cluster detected_views
  await supabase
    .from('clusters')
    .update({ detected_views: detectedViews })
    .eq('id', clusterId)
}
