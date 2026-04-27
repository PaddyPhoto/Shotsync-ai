// ── Plan definitions ──────────────────────────────────────────────────────────

export type PlanId = 'free' | 'starter' | 'brand' | 'scale' | 'enterprise'

export interface PlanLimits {
  imagesPerJob: number       // -1 = unlimited
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
      imagesPerJob: 25,
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
      'Up to 3 exports/month',
      'Up to 25 images per export',
      'Shopify export (ZIP / folder only)',
      'ANZ marketplaces locked — Starter and above',
      '1 brand, 1 seat',
    ],
    forNote: 'Try the workflow before you commit',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceAud: 79,
    priceAudAnnual: 63,
    description: 'For small brands getting started',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? null,
    limits: {
      imagesPerJob: 500,
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
      'Up to 500 images/month',
      '1 brand',
      'Export folders for 2 ANZ marketplaces',
      '2 seats',
      '1 Shopify store connection',
      'Email support',
      '30-day free trial',
    ],
    forNote: 'Small brands, single labels',
  },
  brand: {
    id: 'brand',
    name: 'Brand',
    priceAud: 199,
    priceAudAnnual: 143,
    description: 'For mid-tier brands doing 100–200 SKUs/month',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BRAND_PRICE_ID ?? null,
    limits: {
      imagesPerJob: 1500,
      marketplaces: 4,
      exportsPerMonth: -1,
      brands: 2,
      seats: 5,
      shopifyStores: 2,
      shopify: true,
      aiCopy: true,
      bgRemoval: true,
    },
    highlights: [
      'Up to 1,500 images/month',
      '2 brands',
      'All 4 ANZ marketplaces',
      '5 seats',
      '2 Shopify store connections',
      'AI product listing copywriting',
      'Custom naming convention',
      'Priority processing',
      'Background removal (+$0.16/image)',
      '30-day free trial',
    ],
    forNote: 'Mid-tier brands doing 100–200 SKUs/month',
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    priceAud: 399,
    priceAudAnnual: 359,
    description: 'For fast-growing brands ramping up volume',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID ?? null,
    limits: {
      imagesPerJob: 5000,
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
      'Up to 5,000 images/month',
      '5 brands',
      'All 4 ANZ marketplaces',
      'Up to 10 seats',
      'Up to 5 Shopify store connections',
      'AI product listing copywriting',
      'Custom naming convention',
      'Background removal (+$0.16/image)',
      '30-day free trial',
    ],
    forNote: 'Growing brands doing 300–800 SKUs/month',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceAud: 0,
    priceAudAnnual: 0,
    description: 'Unlimited everything, custom contracts',
    stripePriceId: null,
    limits: {
      imagesPerJob: -1,
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
