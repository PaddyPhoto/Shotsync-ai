// ── Plan definitions ──────────────────────────────────────────────────────────

export type PlanId = 'free' | 'launch' | 'growth' | 'scale' | 'enterprise'

export interface PlanLimits {
  skusPerMonth: number       // -1 = unlimited; cumulative SKUs processed across all jobs in the calendar month
  marketplaces: number       // max selectable per export
  exportsPerMonth: number    // -1 = unlimited
  brands: number             // -1 = unlimited
  seats: number              // -1 = unlimited
  shopifyStores: number      // -1 = unlimited, 0 = not included
  shopify: boolean
  aiCopy: boolean
  bgRemoval: boolean         // background removal add-on (billed at $0.16 AUD/image)
}

export interface Plan {
  id: PlanId
  name: string
  priceAud: number           // AUD/month (monthly billing)
  priceAudAnnual: number     // AUD/month (annual billing)
  description: string
  stripePriceId: string | null
  limits: PlanLimits
  highlights: string[]
  forNote: string            // "For: ..." line
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceAud: 0,
    priceAudAnnual: 0,
    description: 'Try the full workflow before you commit',
    stripePriceId: null,
    limits: {
      skusPerMonth: 10,
      marketplaces: 1,
      exportsPerMonth: 3,
      brands: 1,
      seats: 1,
      shopifyStores: 0,
      shopify: true,
      aiCopy: false,
      bgRemoval: false,
    },
    highlights: [
      'Up to 10 SKUs processed / month',
      'Up to 3 exports',
      'Shopify export (ZIP / folder only)',
      'ANZ marketplaces locked — Launch and above',
      '1 brand, 1 seat',
    ],
    forNote: 'Try the workflow before you commit',
  },
  launch: {
    id: 'launch',
    name: 'Launch',
    priceAud: 79,
    priceAudAnnual: 63,
    description: 'For emerging fashion brands starting to structure their eCommerce workflow',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? null,
    limits: {
      skusPerMonth: 200,
      marketplaces: 2,
      exportsPerMonth: -1,
      brands: 1,
      seats: 2,
      shopifyStores: 1,
      shopify: true,
      aiCopy: false,
      bgRemoval: false,
    },
    highlights: [
      'Up to 200 SKUs processed / month',
      '1 brand',
      '1 Shopify store connection',
      'Product folder export (Shopify-ready structure)',
      'Export to 2 ANZ marketplaces',
      '2 team seats',
      '30-day free trial',
    ],
    forNote: 'Small DTC brands, early-stage Shopify stores, new collections',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceAud: 199,
    priceAudAnnual: 143,
    description: 'For growing fashion brands scaling regular drops and online sales',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BRAND_PRICE_ID ?? null,
    limits: {
      skusPerMonth: 1000,
      marketplaces: 4,
      exportsPerMonth: -1,
      brands: 2,
      seats: 5,
      shopifyStores: 1,
      shopify: true,
      aiCopy: true,
      bgRemoval: true,
    },
    highlights: [
      'Up to 1,000 SKUs processed / month',
      '2 brands',
      '1 Shopify store integration',
      'Export to all ANZ marketplaces',
      'AI product listing copy generation',
      '5 team seats',
      'Background removal add-on ($0.16/image)',
      '30-day free trial',
    ],
    forNote: 'Active DTC brands, marketing + eCommerce teams, seasonal collections',
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    priceAud: 399,
    priceAudAnnual: 359,
    description: 'For high-volume or multi-brand fashion businesses operating at scale',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID ?? null,
    limits: {
      skusPerMonth: 2500,
      marketplaces: 4,
      exportsPerMonth: -1,
      brands: 5,
      seats: 10,
      shopifyStores: 5,
      shopify: true,
      aiCopy: true,
      bgRemoval: true,
    },
    highlights: [
      'Up to 2,500 SKUs processed / month',
      '5 brands',
      'Up to 5 Shopify store integrations',
      'Full ANZ marketplace exports',
      'AI product listing copy generation',
      'Background removal add-on ($0.16/image)',
      'Priority processing workflow',
      '10 team seats',
      '30-day free trial',
    ],
    forNote: 'Enterprise DTC groups, multi-label brands, high SKU throughput teams',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceAud: 0,
    priceAudAnnual: 0,
    description: 'Unlimited everything, custom contracts',
    stripePriceId: null,
    limits: {
      skusPerMonth: -1,
      marketplaces: 4,
      exportsPerMonth: -1,
      brands: -1,
      seats: -1,
      shopifyStores: -1,
      shopify: true,
      aiCopy: true,
      bgRemoval: true,
    },
    highlights: [
      'Unlimited everything',
      'Custom marketplace rules',
      'SSO + role-based permissions',
      'SLA guarantee',
      'Invoiced billing',
      'Dedicated CSM',
    ],
    forNote: 'High-volume fashion brands at scale',
  },
}

// ── Usage types ───────────────────────────────────────────────────────────────

export interface PlanUsage {
  exportsThisMonth: number
  skusThisMonth: number
  totalBrandsCreated: number
}

// ── Limit helpers ─────────────────────────────────────────────────────────────

export function isUnlimited(limit: number): boolean {
  return limit === -1
}

export function withinLimit(value: number, limit: number): boolean {
  return limit === -1 || value < limit
}

export function usagePct(value: number, limit: number): number {
  if (limit === -1) return 0
  return Math.min(100, Math.round((value / limit) * 100))
}

export function limitLabel(limit: number): string {
  return limit === -1 ? 'Unlimited' : String(limit)
}
