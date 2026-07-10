'use client'

import { useState } from 'react'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import type { MarketplaceName } from '@/types'
import type { DimensionOverride } from '@/store/session'
import { usePlan } from '@/context/PlanContext'

interface MarketplaceSelectorProps {
  selected: MarketplaceName[]
  onChange: (markets: MarketplaceName[]) => void
  lockedMarketplaces?: MarketplaceName[]
  onLockedClick?: () => void
  columns?: 2 | 3 | 4
  /** Per-job output-size overrides, keyed by marketplace id. */
  dimensionOverrides?: Record<string, DimensionOverride>
  /** When provided, the dimensions line becomes editable (pass null to reset to default). */
  onDimensionChange?: (id: MarketplaceName, dims: DimensionOverride | null) => void
}

const MARKETPLACE_DESCRIPTIONS: Record<MarketplaceName, string> = {
  'the-iconic': 'Australia & NZ fashion platform',
  myer: 'Premium department store',
  'david-jones': 'Luxury department store',
  shopify: 'Your own storefront',
  joor: 'Wholesale B2B platform',
  'erp-pim': 'Clean product record for any ERP or PIM',
}

const MARKETPLACE_PALETTE: Record<MarketplaceName, { bgRest: string; bgSelected: string; border: string; dot: string; nameColor: string }> = {
  'the-iconic': {
    bgRest:     'rgba(255,159,10,0.07)',
    bgSelected: 'rgba(255,159,10,0.16)',
    border:     '#ff9f0a',
    dot:        '#ff9f0a',
    nameColor:  '#ffb340',
  },
  myer: {
    bgRest:     'rgba(255,59,48,0.07)',
    bgSelected: 'rgba(255,59,48,0.15)',
    border:     '#ff3b30',
    dot:        '#ff3b30',
    nameColor:  '#ff453a',
  },
  'david-jones': {
    bgRest:     'rgba(0,122,255,0.07)',
    bgSelected: 'rgba(0,122,255,0.14)',
    border:     '#0071e3',
    dot:        '#0071e3',
    nameColor:  '#4da3ff',
  },
  shopify: {
    bgRest:     'rgba(48,209,88,0.08)',
    bgSelected: 'rgba(48,209,88,0.18)',
    border:     '#30d158',
    dot:        '#30d158',
    nameColor:  '#34c759',
  },
  joor: {
    bgRest:     'rgba(88,86,214,0.07)',
    bgSelected: 'rgba(88,86,214,0.16)',
    border:     '#5856d6',
    dot:        '#5856d6',
    nameColor:  '#7b79f7',
  },
  'erp-pim': {
    bgRest:     'rgba(48,176,199,0.07)',
    bgSelected: 'rgba(48,176,199,0.16)',
    border:     '#30b0c7',
    dot:        '#30b0c7',
    nameColor:  '#5ac8d8',
  },
}

// Common output ratios for the "just resize this job" use case. Images are fit-to-contain
// (scaled + padded) into the target — nothing is cropped.
const RATIO_PRESETS: { label: string; ratio: string; width: number; height: number }[] = [
  { label: 'Square',    ratio: '1:1', width: 2048, height: 2048 },
  { label: 'Portrait',  ratio: '4:5', width: 1600, height: 2000 },
  { label: 'Portrait',  ratio: '3:4', width: 1536, height: 2048 },
  { label: 'Portrait',  ratio: '2:3', width: 1600, height: 2400 },
  { label: 'Landscape', ratio: '3:2', width: 2400, height: 1600 },
]

function DimensionControl({
  id, defaultDims, override, accent, onChange,
}: {
  id: MarketplaceName
  defaultDims: DimensionOverride
  override?: DimensionOverride
  accent: string
  onChange: (id: MarketplaceName, dims: DimensionOverride | null) => void
}) {
  const [open, setOpen] = useState(false)
  const effective = override ?? defaultDims
  const [w, setW] = useState(String(effective.width))
  const [h, setH] = useState(String(effective.height))

  const openEditor = (e: React.MouseEvent) => {
    e.stopPropagation()
    setW(String(effective.width)); setH(String(effective.height))
    setOpen((v) => !v)
  }
  const apply = (dims: DimensionOverride | null) => { onChange(id, dims); setOpen(false) }
  const applyCustom = () => {
    const nw = Math.round(Number(w)), nh = Math.round(Number(h))
    if (!nw || !nh || nw < 1 || nh < 1) return
    // reset to default if it matches, otherwise store the override
    if (nw === defaultDims.width && nh === defaultDims.height) apply(null)
    else apply({ width: nw, height: nh })
  }
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={openEditor}
        title="Change output size for this job"
        style={{
          cursor: 'pointer', font: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '3px 8px', borderRadius: '7px',
          background: override ? `${accent}1f` : 'rgba(255,255,255,0.05)',
          border: `1px solid ${override ? accent : 'var(--line2)'}`,
          color: override ? accent : '#dcdce0',
        }}
      >
        <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{effective.width}×{effective.height}px</span>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.95 }}>
          <path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9z" />
          <path d="M8.5 3.5l2 2" />
        </svg>
        {override && <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '0.85em', opacity: 0.85 }}>· custom</span>}
      </button>

      {open && (
        <>
          {/* outside-click backdrop */}
          <div onClick={(e) => { stop(e); setOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
          <div
            onClick={stop}
            style={{
              position: 'absolute', bottom: '100%', left: 0, marginBottom: '10px', zIndex: 101,
              width: '272px', background: 'var(--bg2)', border: '1px solid var(--line)',
              borderRadius: '12px', boxShadow: '0 18px 50px rgba(0,0,0,0.5)', padding: '12px',
              cursor: 'default', textAlign: 'left',
            }}
          >
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '8px' }}>
              Output size · this job
            </p>

            {/* default / reset */}
            <button
              type="button"
              onClick={() => apply(null)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 9px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px',
                background: override ? 'var(--bg3)' : 'var(--accent-glow)',
                border: `1px solid ${override ? 'var(--line)' : 'var(--accent)'}`,
                color: 'var(--text)', fontSize: 'var(--font-sm)', textAlign: 'left',
              }}
            >
              <span>Marketplace default</span>
              <span style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text3)' }}>{defaultDims.width}×{defaultDims.height}</span>
            </button>

            {/* presets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '10px' }}>
              {RATIO_PRESETS.map((p) => {
                const active = override?.width === p.width && override?.height === p.height
                return (
                  <button
                    key={p.ratio}
                    type="button"
                    onClick={() => apply({ width: p.width, height: p.height })}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
                      background: active ? 'var(--accent-glow)' : 'var(--bg3)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                      color: 'var(--text)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>{p.ratio}</span>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text3)', fontFamily: 'var(--font-dm-mono)' }}>{p.width}×{p.height}</span>
                  </button>
                )
              })}
            </div>

            {/* custom */}
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text3)', marginBottom: '5px' }}>Custom (px)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number" inputMode="numeric" value={w} onChange={(e) => setW(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyCustom() }}
                style={{ width: '78px', padding: '6px 8px', borderRadius: '7px', background: 'var(--bg3)', border: '1px solid var(--line2)', color: 'var(--text)', fontSize: 'var(--font-sm)', fontFamily: 'var(--font-dm-mono)' }}
              />
              <span style={{ color: 'var(--text3)' }}>×</span>
              <input
                type="number" inputMode="numeric" value={h} onChange={(e) => setH(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyCustom() }}
                style={{ width: '78px', padding: '6px 8px', borderRadius: '7px', background: 'var(--bg3)', border: '1px solid var(--line2)', color: 'var(--text)', fontSize: 'var(--font-sm)', fontFamily: 'var(--font-dm-mono)' }}
              />
              <button
                type="button" onClick={applyCustom}
                style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: '7px', background: 'var(--accent)', border: 'none', color: '#000', fontSize: 'var(--font-sm)', fontWeight: 600, cursor: 'pointer' }}
              >
                Set
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function MarketplaceSelector({
  selected, onChange, lockedMarketplaces = [], onLockedClick, columns = 4,
  dimensionOverrides, onDimensionChange,
}: MarketplaceSelectorProps) {
  const { region } = usePlan()
  const toggle = (id: MarketplaceName) => {
    if (selected.includes(id)) {
      onChange(selected.filter((m) => m !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
      {(Object.keys(MARKETPLACE_RULES) as MarketplaceName[])
        .filter((id) => MARKETPLACE_RULES[id].regions.includes(region))
        .map((id) => {
        const rule = MARKETPLACE_RULES[id]
        const isSelected = selected.includes(id)
        const isLocked = lockedMarketplaces.includes(id)
        const palette = MARKETPLACE_PALETTE[id]
        const override = dimensionOverrides?.[id]

        if (isLocked) {
          return (
            <button
              key={id}
              onClick={onLockedClick}
              style={{
                position: 'relative',
                background: 'var(--bg3)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                opacity: 0.5,
                overflow: 'hidden',
              }}
            >
              {/* Lock icon */}
              <span style={{
                position: 'absolute', top: '12px', right: '12px',
                width: '18px', height: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text3)" strokeWidth="1.5">
                  <rect x="1.5" y="5" width="9" height="6.5" rx="1.5"/>
                  <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" strokeLinecap="round"/>
                </svg>
              </span>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette.dot, marginBottom: '10px', opacity: 0.3 }} />
              <p style={{ fontSize: 'var(--font-lg)', fontWeight: 600, letterSpacing: '-.2px', marginBottom: '3px', color: 'var(--text2)' }}>
                {rule.name}
              </p>
              <p style={{ fontSize: 'var(--font-base)', color: '#ff4040', marginBottom: '4px' }}>
                {MARKETPLACE_DESCRIPTIONS[id]}
              </p>
              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--accent)', fontWeight: 600 }}>Launch plan required ↑</p>
            </button>
          )
        }

        const dims = override ?? rule.image_dimensions

        return (
          // Rendered as a div (not button) so the editable dimension popover — which
          // contains its own buttons — is valid markup nested inside it.
          <div
            key={id}
            role="button"
            tabIndex={0}
            onClick={() => toggle(id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(id) } }}
            style={{
              position: 'relative',
              background: isSelected ? palette.bgSelected : palette.bgRest,
              border: isSelected ? `1.5px solid ${palette.border}` : `1px solid ${palette.border}30`,
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette.dot, marginBottom: '10px', opacity: isSelected ? 1 : 0.5 }} />

            {isSelected && (
              <span style={{
                position: 'absolute', top: '12px', right: '12px',
                width: '18px', height: '18px', borderRadius: '50%',
                background: palette.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: '#fff', fontWeight: 700,
              }}>✓</span>
            )}

            <p style={{ fontSize: 'var(--font-lg)', fontWeight: 600, letterSpacing: '-.2px', marginBottom: '3px', color: isSelected ? palette.nameColor : 'var(--text)' }}>
              {rule.name}
            </p>
            <p style={{ fontSize: 'var(--font-base)', color: '#c8c8c8', marginBottom: '12px' }}>
              {MARKETPLACE_DESCRIPTIONS[id]}
            </p>
            <div style={{ fontSize: 'var(--font-sm)', lineHeight: 1.8, fontFamily: 'var(--font-dm-mono)', color: '#c8c8c8' }}>
              {onDimensionChange ? (
                <DimensionControl id={id} defaultDims={rule.image_dimensions} override={override} accent={palette.nameColor} onChange={onDimensionChange} />
              ) : (
                <p style={{ color: override ? palette.nameColor : '#c8c8c8' }}>{dims.width}×{dims.height}px{override ? ' · custom' : ''}</p>
              )}
              <p>{rule.file_format.toUpperCase()} · Q{rule.quality}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
