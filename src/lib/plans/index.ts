// ── Plan definitions ──────────────────────────────────────────────────────────

export type PlanId = 'free' | 'starter' | 'brand' | 'scale' | 'enterprise'

export interface PlanLimits {
  imagesPerJob: number       // -1 = unlimited
  marketplaces: number       // max selectable per export
  exportsPerMonth: number    // -1 = unlimited
  brands: number             // -1 = unlimited
  seats: number              // -1 = unlimited
  shopify: boolean
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
      imagesPerJob: 50,
      marketplaces: 1,
      exportsPerMonth: 3,
      brands: 1,
      seats: 1,
      shopify: false,
    },
    highlights: [
      'Up to 3 exports/month',
      'Up to 50 images per export',
      '1 marketplace export folder',
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
      shopify: true,
    },
    highlights: [
      'Up to 500 images/month',
      '1 brand',
      'Export folders for 2 ANZ marketplaces',
      '2 seats',
      '1 Shopify store connection',
      'Email support',
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
      imagesPerJob: 2000,
      marketplaces: 4,
      exportsPerMonth: -1,
      brands: 3,
      seats: 5,
      shopify: true,
    },
    highlights: [
      'Up to 2,000 images/month',
      '3 brands',
      'All 4 ANZ marketplaces',
      '5 seats',
      '3 Shopify store connections',
      'Custom naming convention',
      'Priority processing',
      'Onboarding call included',
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
      imagesPerJob: 10000,
      marketplaces: 4,
      exportsPerMonth: -1,
      brands: -1,
      seats: -1,
      shopify: true,
    },
    highlights: [
      'Up to 10,000 images/month',
      'Unlimited brands',
      'All 4 ANZ marketplaces',
      'Unlimited seats',
      'Unlimited Shopify stores',
      'Custom naming convention',
      'API access',
      'Dedicated support channel',
      'Monthly review call',
      'White-label exports',
    ],
    forNote: 'Growing brands doing 300–500 SKUs/month',
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
      shopify: true,
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
