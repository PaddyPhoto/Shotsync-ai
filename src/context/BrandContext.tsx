'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Brand } from '@/lib/brands'
import { DEMO_BRANDS } from '@/lib/brands'

const STORAGE_KEY = 'shotsync:active_brand_id'
const BRANDS_KEY = 'shotsync:brands'

function saveBrandsLocally(brands: Brand[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(BRANDS_KEY, JSON.stringify(brands))
  }
}

function loadBrandsLocally(): Brand[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(BRANDS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}

interface BrandContextValue {
  brands: Brand[]
  activeBrand: Brand | null
  activeBrandId: string | null
  setActiveBrand: (id: string) => void
  setBrands: (brands: Brand[]) => void
  refreshBrands: () => Promise<void>
  isLoading: boolean
}

const BrandContext = createContext<BrandContextValue>({
  brands: [],
  activeBrand: null,
  activeBrandId: null,
  setActiveBrand: () => {},
  setBrands: () => {},
  refreshBrands: async () => {},
  isLoading: true,
})

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrandsState] = useState<Brand[]>([])
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const setBrands = useCallback((next: Brand[]) => {
    setBrandsState(next)
    saveBrandsLocally(next)
    // If active brand no longer exists, fall back to first
    setActiveBrandId((prev) => {
      if (prev && next.find((b) => b.id === prev)) return prev
      const persisted = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      const found = persisted && next.find((b) => b.id === persisted)
      const fallback = found ? persisted : (next[0]?.id ?? null)
      if (fallback && typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, fallback)
      return fallback
    })
  }, [])

  const setActiveBrand = useCallback((id: string) => {
    setActiveBrandId(id)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const refreshBrands = useCallback(async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const headers: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}
      const res = await fetch('/api/brands', { headers })
      const { data } = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setBrands(data)
        setIsLoading(false)
        return
      }
    } catch { /* fall through */ }

    // Demo mode (no Supabase): use locally persisted brands, or seed with DEMO_BRANDS
    // Clear any stale demo brands if Supabase is now configured
    const supabaseConfigured =
      typeof window !== 'undefined' &&
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

    if (supabaseConfigured) {
      // Supabase is configured but returned no brands — user just hasn't added any yet
      setBrands([])
    } else {
      const local = loadBrandsLocally()
      if (local) {
        setBrands(local)
      } else {
        setBrands(DEMO_BRANDS)
      }
    }
    setIsLoading(false)
  }, [setBrands])

  // Load on mount
  useEffect(() => {
    // Restore persisted brand id
    const persisted = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (persisted) setActiveBrandId(persisted)
    refreshBrands()
  }, [refreshBrands])

  const activeBrand = brands.find((b) => b.id === activeBrandId) ?? brands[0] ?? null

  return (
    <BrandContext.Provider value={{ brands, activeBrand, activeBrandId, setActiveBrand, setBrands, refreshBrands, isLoading }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  return useContext(BrandContext)
}
