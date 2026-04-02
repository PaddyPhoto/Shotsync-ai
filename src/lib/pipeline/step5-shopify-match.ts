/**
 * Step 5: Match clusters to Shopify products using name + colour similarity
 */
import type { SKU, SKUSuggestion } from '@/types'
import { createServiceClient } from '@/lib/supabase/server'

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

function wordOverlap(a: string, b: string): number {
  const setA = new Set(normalise(a).split(/\s+/).filter(Boolean))
  const setB = new Set(normalise(b).split(/\s+/).filter(Boolean))
  const intersection = [...setA].filter((w) => setB.has(w)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

export function rankSKUSuggestions(
  clusterLabel: string,
  clusterColour: string | null,
  skus: SKU[],
  topN = 3
): SKUSuggestion[] {
  const scored = skus.map((sku) => {
    let score = wordOverlap(clusterLabel, sku.product_name)

    // Boost if colour matches
    if (clusterColour && sku.colour) {
      const colourMatch = normalise(sku.colour).includes(normalise(clusterColour)) ||
        normalise(clusterColour).includes(normalise(sku.colour))
      if (colourMatch) score += 0.4
    }

    // Slight boost if SKU code hints at category
    const skuCode = sku.sku.toLowerCase()
    if (skuCode.includes('top') && clusterLabel.toLowerCase().includes('top')) score += 0.1
    if (skuCode.includes('drs') && clusterLabel.toLowerCase().includes('dress')) score += 0.1

    return { sku, confidence: Math.min(score, 1) }
  })

  return scored
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN)
    .map(({ sku, confidence }) => ({
      sku: sku.sku,
      product_name: sku.product_name,
      colour: sku.colour,
      confidence,
      shopify_product_id: sku.shopify_product_id,
    }))
}

export async function matchClustersToSKUs(jobId: string, userId: string): Promise<void> {
  const supabase = createServiceClient()

  // Get clusters for this job
  const { data: clusters, error: cErr } = await supabase
    .from('clusters')
    .select('id')
    .eq('job_id', jobId)

  if (cErr || !clusters) throw new Error('Failed to fetch clusters')

  // Get cached SKUs for this user
  const { data: skus } = await supabase
    .from('skus')
    .select('*')
    .eq('user_id', userId)

  const skuList: SKU[] = skus ?? []

  // For each cluster, generate suggestions based on a generic label
  // (In production: use visual description from step 2)
  const garmentTypes = ['T-shirt', 'Dress', 'Blazer', 'Trousers', 'Skirt', 'Jacket', 'Blouse']
  const colours = ['Black', 'White', 'Navy', 'Beige', 'Red', 'Blue']

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]
    // Use index-based mock label for demo; in production use image description
    const label = garmentTypes[i % garmentTypes.length]
    const colour = colours[i % colours.length]

    const suggestions = rankSKUSuggestions(label, colour, skuList)

    await supabase
      .from('clusters')
      .update({
        suggested_skus: suggestions,
        color: colour.toLowerCase(),
      })
      .eq('id', cluster.id)
  }
}
