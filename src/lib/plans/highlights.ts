import { PLANS, type PlanId } from '@/lib/plans'

// Plan highlight strings in PLANS are AU-worded (ANZ marketplaces). For non-AU
// ('us' / rest-of-world) orgs, substitute or drop the AU-specific lines so the
// in-app upgrade modal and pricing match the platform-handoff story. null = omit.
const US_HIGHLIGHT_SUBS: Record<string, string | null> = {
  'ANZ marketplaces locked — Launch and above':      'US marketplaces locked — Launch and above',
  'Export to 2 ANZ marketplaces':                    '1 ERP integration',
  'Export to all ANZ marketplaces':                  'All ERP integrations',
  'Full ANZ marketplace exports':                    'All ERP integrations',
  'Product folder export (Shopify-ready structure)': 'Shopify-ready folder export',
  "AI copy trained on your brand's voice & tone":    'AI copy trained on brand voice',
  'Background removal add-on ($0.16/image)':         'Background removal add-on',
  'Priority processing workflow':                    'Priority processing',
  'Up to 5 Shopify store integrations':              'Up to 5 Shopify stores',
  'Shopify export (ZIP / folder only)':              'Shopify export (ZIP only)',
  '30-day free trial':                               null,
}

/** Region-appropriate plan highlights. AU gets the raw strings; everyone else
 *  gets the US substitutions (no ANZ marketplaces). */
export function planHighlights(planId: PlanId, region: 'au' | 'us'): string[] {
  const raw = PLANS[planId].highlights
  if (region === 'au') return raw
  return raw
    .map((h) => {
      const sub = US_HIGHLIGHT_SUBS[h]
      if (sub === null) return null
      return (sub ?? h).replace(' processed', '')
    })
    .filter((h): h is string => h !== null)
}
