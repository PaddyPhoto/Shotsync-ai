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
    description: 'Let them feel it, not live on it',
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
      '1 job only',
      'Up to 50 images',
      '1 marketplace',
      'Watermarked exports',
      '1 seat',
    ],
    forNote: 'Try the workflow before you commit',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceAud: 99,
    priceAudAnnual: 79,
    description: 'For small brands testing the water',
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
      'Up to 500 images per upload',
      '1 brand',
      '2 ANZ marketplaces',
      '2 seats',
      '1 Shopify store',
      'ZIP download',
      'Email support',
    ],
    forNote: 'Small brands, single labels, testing the water',
  },
  brand: {
    id: 'brand',
    name: 'Brand',
    priceAud: 249,
    priceAudAnnual: 199,
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
      'Up to 2,000 images per upload',
      '3 brands',
      'All ANZ marketplaces',
      '5 seats',
      '3 Shopify stores',
      'Custom naming presets',
      'Priority processing',
      'Onboarding call',
    ],
    forNote: 'Mid-tier high street brands doing 100–200 SKUs/month',
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    priceAud: 499,
    priceAudAnnual: 399,
    description: 'For fast-growing brands ramping up volume',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID ?? null,
    limits: {
      imagesPerJob: 5000,
      marketplaces: 4,
      exportsPerMonth: -1,
      brands: 10,
      seats: 10,
      shopify: true,
    },
    highlights: [
      'Up to 5,000 images per upload',
      '10 brands',
      'All ANZ marketplaces',
      '10 seats',
      'Unlimited Shopify stores',
      'Custom naming presets',
      'Priority processing',
      'Dedicated support',
    ],
    forNote: 'Growing brands doing 300–500 SKUs/month',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceAud: 999,
    priceAudAnnual: 790,
    description: 'For high-volume fashion brands at scale',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? null,
    limits: {
      imagesPerJob: -1,
      marketplaces: 4,
      exportsPerMonth: -1,
      brands: -1,
      seats: -1,
      shopify: true,
    },
    highlights: [
      'Unlimited images',
      'Unlimited brands',
      'All marketplaces + custom rules',
      'Unlimited seats',
      'Unlimited Shopify stores',
      'API access',
      'White-label exports',
      'Dedicated support + SLA',
    ],
    forNote: 'ShowPo, Meshki, high-volume labels with large in-house teams',
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
