/**
 * Step 6: Classify image angles (front/back/side/detail) and detect garment colour.
 *
 * Strategy (in order):
 *   1. Filename keyword matching — instant, free, works for studios with consistent naming
 *   2. AI batch detection via GPT-4o-mini — only when NEXT_PUBLIC_AI_DETECTION=true
 *      and filename detection returns 'unknown' for any image in the cluster.
 *      Sends all cluster images in ONE API call for context-aware classification.
 *   3. Sequence fallback — positional assignment (first=front, second=back, etc.)
 */

import type { ViewLabel } from '@/types'

export const AI_DETECTION_ENABLED =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_AI_DETECTION === 'true'
    : false

// ── Filename keyword detection ────────────────────────────────────────────────

const VIEW_KEYWORDS: Record<ViewLabel, string[]> = {
  front:             ['front', 'f01', 'f1', 'f02', 'f2', '_f_', '-f-', 'main', 'hero', 'a01'],
  back:              ['back', 'b01', 'b1', 'b02', 'b2', '_b_', '-b-', 'rear'],
  side:              ['side', 's01', 's1', 's02', 's2', '_s_', '-s-', 'profile', 'alt'],
  detail:            ['detail', 'd01', 'd1', 'd02', 'd2', '_d_', '-d-', 'close', 'zoom'],
  mood:              ['mood', 'm01', 'm1', '_m_', '-m-', 'lifestyle', 'editorial', 'styled'],
  'full-length':     ['full', 'fl', 'fl01', 'fl02', 'fulllength', 'full-length', 'full_length', 'standing'],
  'ghost-mannequin': ['ghost', 'gm', 'gm01', 'gm1', 'mannequin', 'ghostmannequin', 'ghost-mannequin', 'ghost_mannequin'],
  'flat-lay':        ['flat', 'flatlay', 'flat-lay', 'flat_lay', 'overhead', 'lay'],
  unknown:           [],
}

export function detectViewFromFilename(filename: string): ViewLabel {
  const lower = filename.toLowerCase().replace(/\.[^.]+$/, '')
  const tokens = new Set(lower.split(/[-_.\s]+/).filter(Boolean))
  for (const [view, keywords] of Object.entries(VIEW_KEYWORDS) as [ViewLabel, string[]][]) {
    if (view === 'unknown') continue
    if (keywords.some((kw) => tokens.has(kw) || lower.includes(kw))) {
      return view
    }
  }
  return 'unknown'
}

// ── Sequence fallback ─────────────────────────────────────────────────────────

const SEQUENCE_ORDER: ViewLabel[] = ['front', 'back', 'side', 'detail', 'mood', 'full-length', 'ghost-mannequin', 'flat-lay']

export function assignSequenceLabels(
  images: { id: string; view_label: ViewLabel; original_filename: string }[]
): { id: string; view_label: ViewLabel; confidence: number }[] {
  let seqIdx = 0
  return images.map((img) => {
    const fromFilename = detectViewFromFilename(img.original_filename)
    if (fromFilename !== 'unknown') {
      return { id: img.id, view_label: fromFilename, confidence: 0.85 }
    }
    const label = SEQUENCE_ORDER[seqIdx % SEQUENCE_ORDER.length]
    seqIdx++
    return { id: img.id, view_label: label, confidence: 0.5 }
  })
}

// ── AI batch detection ────────────────────────────────────────────────────────

export interface AIDetectionResult {
  angles: Record<string, ViewLabel>  // imageId → ViewLabel
  colour: string                      // fashion colour name for the cluster
}

/**
 * Send all images in a cluster to GPT-4o-mini in one call.
 * Returns angle label per image + a fashion colour name for the cluster.
 * Only called when AI_DETECTION_ENABLED=true and filename detection couldn't
 * classify at least one image.
 */
export async function detectClusterWithAI(
  images: { id: string; filename: string; base64: string }[]
): Promise<AIDetectionResult | null> {
  try {
    const res = await fetch('/api/ai/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.result ?? null
  } catch {
    return null
  }
}

// ── Server-side: label cluster images in Supabase ─────────────────────────────

import { createServiceClient } from '@/lib/supabase/server'

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

  for (const item of labeled) {
    await supabase
      .from('images')
      .update({ view_label: item.view_label, view_confidence: item.confidence, status: 'labeled' })
      .eq('id', item.id)
  }

  await supabase
    .from('clusters')
    .update({ detected_views: detectedViews })
    .eq('id', clusterId)
}
