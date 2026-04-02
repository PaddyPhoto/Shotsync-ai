/**
 * Step 7: Detect missing required shots per cluster based on marketplace rules
 */
import type { ViewLabel, MarketplaceName } from '@/types'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import { createServiceClient } from '@/lib/supabase/server'

export interface MissingViewWarning {
  clusterId: string
  marketplace: MarketplaceName
  missingViews: ViewLabel[]
}

export function findMissingViews(
  detectedViews: ViewLabel[],
  marketplaces: MarketplaceName[]
): ViewLabel[] {
  const allRequired = new Set<ViewLabel>()
  for (const m of marketplaces) {
    MARKETPLACE_RULES[m].required_views.forEach((v) => allRequired.add(v))
  }
  return [...allRequired].filter((v) => !detectedViews.includes(v))
}

export async function validateJobShots(
  jobId: string,
  marketplaces: MarketplaceName[]
): Promise<MissingViewWarning[]> {
  const supabase = createServiceClient()

  const { data: clusters, error } = await supabase
    .from('clusters')
    .select('id, detected_views')
    .eq('job_id', jobId)

  if (error || !clusters) throw new Error('Failed to fetch clusters')

  const warnings: MissingViewWarning[] = []

  for (const cluster of clusters) {
    const detected = (cluster.detected_views ?? []) as ViewLabel[]

    for (const marketplace of marketplaces) {
      const missing = MARKETPLACE_RULES[marketplace].required_views.filter(
        (v) => !detected.includes(v)
      )
      if (missing.length > 0) {
        warnings.push({ clusterId: cluster.id, marketplace, missingViews: missing })
      }
    }

    // Union of all missing views across selected marketplaces
    const allMissing = findMissingViews(detected, marketplaces)

    await supabase
      .from('clusters')
      .update({ missing_views: allMissing })
      .eq('id', cluster.id)
  }

  return warnings
}
