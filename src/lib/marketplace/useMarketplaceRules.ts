'use client'

import { useState, useEffect, useCallback } from 'react'
import { MARKETPLACE_RULES } from './rules'
import type { MarketplaceRule, MarketplaceName } from '@/types'

const STORAGE_VERSION = 8
const VERSION_KEY = 'shotsync:marketplace_rules_version'

function storageKey(brandId?: string) {
  return brandId ? `shotsync:marketplace_rules:${brandId}` : 'shotsync:marketplace_rules'
}

function loadRules(brandId?: string): Record<MarketplaceName, MarketplaceRule> {
  if (typeof window === 'undefined') return { ...MARKETPLACE_RULES }
  try {
    const savedVersion = parseInt(localStorage.getItem(VERSION_KEY) ?? '0', 10)
    // Legacy global key migration: if version is stale, clear and reset
    if (savedVersion < STORAGE_VERSION) {
      localStorage.removeItem('shotsync:marketplace_rules')
      localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION))
    }
    const raw = localStorage.getItem(storageKey(brandId))
    if (!raw) return { ...MARKETPLACE_RULES }
    const saved = JSON.parse(raw) as Partial<Record<MarketplaceName, MarketplaceRule>>
    const merged = { ...MARKETPLACE_RULES }
    for (const id of Object.keys(MARKETPLACE_RULES) as MarketplaceName[]) {
      if (saved[id]) merged[id] = { ...MARKETPLACE_RULES[id], ...saved[id] }
    }
    return merged
  } catch {
    return { ...MARKETPLACE_RULES }
  }
}

export type EditableRules = Record<MarketplaceName, MarketplaceRule>

export function useMarketplaceRules(brandId?: string) {
  const [rules, setRules] = useState<EditableRules>(() => ({ ...MARKETPLACE_RULES }))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setRules(loadRules(brandId))
  }, [brandId])

  const updateRule = useCallback(
    (id: MarketplaceName, patch: Partial<MarketplaceRule>) => {
      setRules((prev) => {
        const next = { ...prev, [id]: { ...prev[id], ...patch } }
        localStorage.setItem(storageKey(brandId), JSON.stringify(next))
        localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION))
        return next
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    [brandId]
  )

  const resetRule = useCallback((id: MarketplaceName) => {
    setRules((prev) => {
      const next = { ...prev, [id]: MARKETPLACE_RULES[id] }
      localStorage.setItem(storageKey(brandId), JSON.stringify(next))
      localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION))
      return next
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [brandId])

  const resetAll = useCallback(() => {
    localStorage.removeItem(storageKey(brandId))
    setRules({ ...MARKETPLACE_RULES })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [brandId])

  return { rules, updateRule, resetRule, resetAll, saved }
}
