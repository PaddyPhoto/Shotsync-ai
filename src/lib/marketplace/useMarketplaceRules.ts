'use client'

import { useState, useEffect, useCallback } from 'react'
import { MARKETPLACE_RULES } from './rules'
import type { MarketplaceRule, MarketplaceName } from '@/types'

const STORAGE_KEY = 'shotsync:marketplace_rules'
const STORAGE_VERSION = 7 // bump this whenever defaults change to force a reset
const VERSION_KEY = 'shotsync:marketplace_rules_version'

export type EditableRules = Record<MarketplaceName, MarketplaceRule>

function loadRules(): EditableRules {
  if (typeof window === 'undefined') return { ...MARKETPLACE_RULES }
  try {
    const savedVersion = parseInt(localStorage.getItem(VERSION_KEY) ?? '0', 10)
    if (savedVersion < STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION))
      return { ...MARKETPLACE_RULES }
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...MARKETPLACE_RULES }
    const saved = JSON.parse(raw) as Partial<EditableRules>
    // Merge saved overrides on top of defaults so new fields are always present
    const merged: EditableRules = { ...MARKETPLACE_RULES }
    for (const id of Object.keys(MARKETPLACE_RULES) as MarketplaceName[]) {
      if (saved[id]) merged[id] = { ...MARKETPLACE_RULES[id], ...saved[id] }
    }
    return merged
  } catch {
    return { ...MARKETPLACE_RULES }
  }
}

export function useMarketplaceRules() {
  const [rules, setRules] = useState<EditableRules>(() => ({ ...MARKETPLACE_RULES }))
  const [saved, setSaved] = useState(false)

  // Hydrate from localStorage after mount
  useEffect(() => {
    setRules(loadRules())
  }, [])

  const updateRule = useCallback(
    (id: MarketplaceName, patch: Partial<MarketplaceRule>) => {
      setRules((prev) => {
        const next = { ...prev, [id]: { ...prev[id], ...patch } }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION))
        return next
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    []
  )

  const resetRule = useCallback((id: MarketplaceName) => {
    setRules((prev) => {
      const next = { ...prev, [id]: MARKETPLACE_RULES[id] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION))
      return next
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setRules({ ...MARKETPLACE_RULES })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  return { rules, updateRule, resetRule, resetAll, saved }
}
