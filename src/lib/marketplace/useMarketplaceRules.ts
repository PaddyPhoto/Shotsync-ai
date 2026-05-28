'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MARKETPLACE_RULES } from './rules'
import type { MarketplaceRule, MarketplaceName } from '@/types'

const STORAGE_VERSION = 8
const VERSION_KEY = 'shotsync:marketplace_rules_version'

function storageKey(brandId?: string) {
  return brandId ? `shotsync:marketplace_rules:${brandId}` : 'shotsync:marketplace_rules'
}

function loadFromStorage(brandId?: string): Record<MarketplaceName, MarketplaceRule> | null {
  if (typeof window === 'undefined') return null
  try {
    const savedVersion = parseInt(localStorage.getItem(VERSION_KEY) ?? '0', 10)
    if (savedVersion < STORAGE_VERSION) {
      localStorage.removeItem('shotsync:marketplace_rules')
      localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION))
      return null
    }
    const raw = localStorage.getItem(storageKey(brandId))
    if (!raw) return null
    const saved = JSON.parse(raw) as Partial<Record<MarketplaceName, MarketplaceRule>>
    const merged = { ...MARKETPLACE_RULES }
    for (const id of Object.keys(MARKETPLACE_RULES) as MarketplaceName[]) {
      if (saved[id]) merged[id] = { ...MARKETPLACE_RULES[id], ...saved[id] }
    }
    return merged
  } catch {
    return null
  }
}

function saveToStorage(rules: Record<MarketplaceName, MarketplaceRule>, brandId?: string) {
  try {
    localStorage.setItem(storageKey(brandId), JSON.stringify(rules))
    localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION))
  } catch { /* ignore */ }
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { data: { session } } = await createClient().auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

export type EditableRules = Record<MarketplaceName, MarketplaceRule>

export function useMarketplaceRules(brandId?: string) {
  const [rules, setRules] = useState<EditableRules>(() => ({ ...MARKETPLACE_RULES }))
  const [saved, setSaved] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Seed immediately from localStorage cache for instant paint
    const cached = loadFromStorage(brandId)
    if (cached) setRules(cached)

    if (!brandId) return

    // Then fetch authoritative version from API
    getAuthToken().then((token) => {
      if (!token) return null
      return fetch(`/api/brands/${brandId}/marketplace-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    }).then((res) => {
      if (!res?.ok) return null
      return res.json()
    }).then((data: { rules: Partial<Record<MarketplaceName, MarketplaceRule>> } | null) => {
      if (!data) return

      if (data.rules) {
        // Server has rules — merge over defaults and update state + cache
        const merged = { ...MARKETPLACE_RULES }
        for (const id of Object.keys(MARKETPLACE_RULES) as MarketplaceName[]) {
          if (data.rules[id]) merged[id] = { ...MARKETPLACE_RULES[id], ...data.rules[id] }
        }
        setRules(merged)
        saveToStorage(merged, brandId)
      } else if (cached) {
        // Server has no record yet but localStorage does — migrate it now
        getAuthToken().then((token) => {
          if (!token) return
          fetch(`/api/brands/${brandId}/marketplace-rules`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ rules: cached }),
          }).catch(() => { /* non-critical */ })
        })
      }
    }).catch(() => { /* non-critical — localStorage version stays active */ })
  }, [brandId]) // eslint-disable-line react-hooks/exhaustive-deps

  const persistToApi = useCallback((nextRules: EditableRules, bId?: string) => {
    if (!bId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      getAuthToken().then((token) => {
        if (!token) return
        return fetch(`/api/brands/${bId}/marketplace-rules`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ rules: nextRules }),
        })
      }).catch(() => { /* non-critical */ })
    }, 600)
  }, [])

  const updateRule = useCallback(
    (id: MarketplaceName, patch: Partial<MarketplaceRule>) => {
      setRules((prev) => {
        const next = { ...prev, [id]: { ...prev[id], ...patch } }
        saveToStorage(next, brandId)
        persistToApi(next, brandId)
        return next
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    [brandId, persistToApi]
  )

  const resetRule = useCallback((id: MarketplaceName) => {
    setRules((prev) => {
      const next = { ...prev, [id]: MARKETPLACE_RULES[id] }
      saveToStorage(next, brandId)
      persistToApi(next, brandId)
      return next
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [brandId, persistToApi])

  const resetAll = useCallback(() => {
    const next = { ...MARKETPLACE_RULES }
    setRules(next)
    saveToStorage(next, brandId)
    persistToApi(next, brandId)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [brandId, persistToApi])

  return { rules, updateRule, resetRule, resetAll, saved }
}
