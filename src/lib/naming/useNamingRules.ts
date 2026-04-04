'use client'

import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

export interface NamingPreset {
  id: string
  name: string
  template: string
  builtIn?: boolean
}

export interface NamingState {
  activePresetId: string
  customTemplate: string          // used when no preset is active
  presets: NamingPreset[]
}

export const BUILT_IN_PRESETS: NamingPreset[] = [
  { id: 'standard',   name: 'Standard',    template: '{BRAND}_{SKU}_{COLOR}_{VIEW}',         builtIn: true },
  { id: 'minimal',    name: 'Minimal',     template: '{SKU}_{VIEW}',                          builtIn: true },
  { id: 'with-index', name: 'With Index',  template: '{SKU}_{COLOR}_{VIEW}_{INDEX}',          builtIn: true },
  { id: 'no-colour',  name: 'No Colour',   template: '{BRAND}_{SKU}_{VIEW}',                  builtIn: true },
  { id: 'full',       name: 'Full Detail', template: '{BRAND}_{SKU}_{COLOR}_{VIEW}_{INDEX}',  builtIn: true },
]

const STORAGE_KEY = 'shotsync:naming_rules'

const DEFAULT_STATE: NamingState = {
  activePresetId: 'standard',
  customTemplate: '{BRAND}_{SKU}_{COLOR}_{VIEW}',
  presets: [],
}

function load(): NamingState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE
  } catch {
    return DEFAULT_STATE
  }
}

function save(state: NamingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function previewTemplate(template: string, ext = 'jpg'): string {
  return (
    template
      .replace('{BRAND}', 'BRAND')
      .replace('{SKU}', 'TOP-BLK-001')
      .replace('{COLOR}', 'BLACK')
      .replace('{VIEW}', 'FRONT')
      .replace('{INDEX}', '01')
      .toUpperCase() + '.' + ext
  )
}

export function getActiveTemplate(state: NamingState): string {
  if (state.activePresetId === 'custom') return state.customTemplate
  const builtin = BUILT_IN_PRESETS.find((p) => p.id === state.activePresetId)
  if (builtin) return builtin.template
  const custom = state.presets.find((p) => p.id === state.activePresetId)
  return custom?.template ?? DEFAULT_STATE.customTemplate
}

export function useNamingRules() {
  const [state, setState] = useState<NamingState>(DEFAULT_STATE)
  const [savedIndicator, setSavedIndicator] = useState(false)

  useEffect(() => {
    setState(load())
  }, [])

  const flash = () => {
    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 2000)
  }

  const setActivePreset = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, activePresetId: id }
      save(next)
      return next
    })
    flash()
  }, [])

  const setCustomTemplate = useCallback((template: string) => {
    setState((prev) => {
      const next = { ...prev, customTemplate: template, activePresetId: 'custom' }
      save(next)
      return next
    })
    flash()
  }, [])

  const addPreset = useCallback((name: string, template: string) => {
    const id = uuidv4()
    setState((prev) => {
      const next = {
        ...prev,
        presets: [...prev.presets, { id, name, template }],
        activePresetId: id,
      }
      save(next)
      return next
    })
    flash()
    return id
  }, [])

  const updatePreset = useCallback((id: string, patch: Partial<Pick<NamingPreset, 'name' | 'template'>>) => {
    setState((prev) => {
      const next = {
        ...prev,
        presets: prev.presets.map((p) => p.id === id ? { ...p, ...patch } : p),
      }
      save(next)
      return next
    })
    flash()
  }, [])

  const deletePreset = useCallback((id: string) => {
    setState((prev) => {
      const next = {
        ...prev,
        presets: prev.presets.filter((p) => p.id !== id),
        activePresetId: prev.activePresetId === id ? 'standard' : prev.activePresetId,
      }
      save(next)
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(DEFAULT_STATE)
    flash()
  }, [])

  const allPresets: NamingPreset[] = [...BUILT_IN_PRESETS, ...state.presets]
  const activeTemplate = getActiveTemplate(state)

  return {
    state,
    allPresets,
    activeTemplate,
    activePresetId: state.activePresetId,
    customTemplate: state.customTemplate,
    savedIndicator,
    setActivePreset,
    setCustomTemplate,
    addPreset,
    updatePreset,
    deletePreset,
    resetAll,
  }
}
