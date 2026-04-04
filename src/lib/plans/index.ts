// ── Plan definitions ──────────────────────────────────────────────────────────

export type PlanId = 'free' | 'pro' | 'business'

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
  price: number              // USD/month
  description: string
  stripePriceId: string | null
  limits: PlanLimits
  highlights: string[]
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Try ShotSync with small batches',
    stripePriceId: null,
    limits: {
      imagesPerJob: 50,
      marketplaces: 1,
      exportsPerMonth: 3,
      brands: 1,
      seats: 2,
      shopify: false,
    },
    highlights: [
      'Up to 50 images per job',
      '1 marketplace per export',
      '3 exports per month',
      '1 brand',
      '2 seats',
      'ZIP download',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    description: 'For growing eCommerce teams',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? null,
    limits: {
      imagesPerJob: 500,
      marketplaces: 4,
      exportsPerMonth: -1,
      brands: 5,
      seats: 5,
      shopify: true,
    },
    highlights: [
      'Up to 500 images per job',
      'All 4 marketplaces',
      'Unlimited exports',
      '5 brands',
      '5 seats',
      'Shopify integration',
      'Save to folder',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 99,
    description: 'For studios and large catalogues',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID ?? null,
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
      'All 4 marketplaces',
      'Unlimited exports',
      'Unlimited brands',
      'Unlimited seats',
      'Shopify integration',
      'Priority processing',
      'Custom naming presets',
    ],
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
