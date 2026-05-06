'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { PLANS, type PlanId, type Plan, type PlanUsage } from '@/lib/plans'

const STORAGE_KEY = 'shotsync:plan'
const USAGE_KEY = 'shotsync:usage'

// Only enforce usage limits when Supabase is connected (real billing mode)
const SUPABASE_CONFIGURED =
  typeof window !== 'undefined'
    ? !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'
    : false

interface PlanContextValue {
  plan: Plan
  planId: PlanId
  usage: PlanUsage
  isLoading: boolean
  // Increment usage counters (local mode)
  recordExport: () => void
  // Check limits before acting
  canProcessImages: (count: number) => boolean
  canAddBrand: (currentCount: number) => boolean
  canSelectMarketplace: (currentCount: number) => boolean
  canExportThisMonth: () => boolean
  hasShopify: () => boolean
  // Upgrade
  openUpgrade: (reason?: string) => void
  upgradeReason: string | null
  closeUpgrade: () => void
  // Refresh from server (when Supabase is connected)
  refreshPlan: () => Promise<void>
}

const defaultUsage: PlanUsage = { exportsThisMonth: 0, imagesThisMonth: 0, totalBrandsCreated: 0 }

const PlanContext = createContext<PlanContextValue>({
  plan: PLANS.free,
  planId: 'free',
  usage: defaultUsage,
  isLoading: true,
  recordExport: () => {},
  canProcessImages: () => true,
  canAddBrand: () => true,
  canSelectMarketplace: () => true,
  canExportThisMonth: () => true,
  hasShopify: () => false,
  openUpgrade: () => {},
  upgradeReason: null,
  closeUpgrade: () => {},
  refreshPlan: async () => {},
})

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [planId, setPlanId] = useState<PlanId>(() => {
    if (typeof window === 'undefined') return 'free'
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored && (['free', 'starter', 'brand', 'scale', 'enterprise'] as string[]).includes(stored))
      ? (stored as PlanId) : 'free'
  })
  const [usage, setUsage] = useState<PlanUsage>(() => {
    if (typeof window === 'undefined') return defaultUsage
    try {
      const raw = localStorage.getItem(USAGE_KEY)
      return raw ? (JSON.parse(raw) as PlanUsage) : defaultUsage
    } catch { return defaultUsage }
  })
  const [isLoading, setIsLoading] = useState(() =>
    typeof window === 'undefined' || !localStorage.getItem(STORAGE_KEY)
  )
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null)

  const plan = PLANS[planId]

  // Load plan from local storage (demo) or API (Supabase)
  const refreshPlan = useCallback(async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      let accessToken = session?.access_token
      if (!accessToken) {
        try {
          const raw = decodeURIComponent(
            document.cookie.split(';')
              .find(c => c.trim().startsWith('sb-') && c.includes('auth-token') && !c.includes('code-verifier'))
              ?.split('=').slice(1).join('=') ?? '{}'
          )
          accessToken = JSON.parse(raw)?.access_token
        } catch {}
      }
      const res = await fetch('/api/billing/plan', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (res.ok) {
        const { data } = await res.json()
        if (data?.plan) {
          setPlanId(data.plan as PlanId)
          setUsage(data.usage ?? defaultUsage)
          setIsLoading(false)
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, data.plan)
            if (data.usage) localStorage.setItem(USAGE_KEY, JSON.stringify(data.usage))
          }
          return
        }
      }
    } catch { /* fall through to local storage */ }

    // Local/demo mode
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (stored && (['free', 'starter', 'brand', 'scale', 'enterprise'] as string[]).includes(stored)) {
      setPlanId(stored as PlanId)
    }
    const storedUsage = typeof window !== 'undefined' ? localStorage.getItem(USAGE_KEY) : null
    if (storedUsage) {
      try { setUsage(JSON.parse(storedUsage)) } catch { /* ignore */ }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => { refreshPlan() }, [refreshPlan])

  const recordExport = useCallback(() => {
    setUsage((prev) => {
      const next = { ...prev, exportsThisMonth: prev.exportsThisMonth + 1 }
      if (typeof window !== 'undefined') localStorage.setItem(USAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const canProcessImages = useCallback((count: number) => {
    const limit = plan.limits.imagesPerMonth
    return limit === -1 || (usage.imagesThisMonth + count) <= limit
  }, [plan, usage])

  const canAddBrand = useCallback((currentCount: number) => {
    const limit = plan.limits.brands
    return limit === -1 || currentCount < limit
  }, [plan])

  const canSelectMarketplace = useCallback((currentCount: number) => {
    const limit = plan.limits.marketplaces
    return limit === -1 || currentCount < limit
  }, [plan])

  const canExportThisMonth = useCallback(() => {
    const limit = plan.limits.exportsPerMonth
    return limit === -1 || usage.exportsThisMonth < limit
  }, [plan, usage])

  const hasShopify = useCallback(() => !SUPABASE_CONFIGURED || PLANS[planId].limits.shopify, [planId])

  const openUpgrade = useCallback((reason?: string) => {
    setUpgradeReason(reason ?? null)
  }, [])

  const closeUpgrade = useCallback(() => setUpgradeReason(null), [])

  return (
    <PlanContext.Provider value={{
      plan, planId, usage, isLoading,
      recordExport,
      canProcessImages, canAddBrand, canSelectMarketplace, canExportThisMonth, hasShopify,
      openUpgrade, upgradeReason, closeUpgrade,
      refreshPlan,
    }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  return useContext(PlanContext)
}
