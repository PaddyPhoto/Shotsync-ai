'use client'

import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import type { MarketplaceName } from '@/types'

interface MarketplaceSelectorProps {
  selected: MarketplaceName[]
  onChange: (markets: MarketplaceName[]) => void
}

const MARKETPLACE_DESCRIPTIONS: Record<MarketplaceName, string> = {
  'the-iconic': 'Australia & NZ fashion platform',
  myer: 'Premium department store',
  'david-jones': 'Luxury department store',
  shopify: 'Your own storefront',
}

const MARKETPLACE_PALETTE: Record<MarketplaceName, { bgRest: string; bgSelected: string; border: string; dot: string; nameColor: string }> = {
  'the-iconic': {
    bgRest:     'rgba(255,159,10,0.07)',
    bgSelected: 'rgba(255,159,10,0.16)',
    border:     '#ff9f0a',
    dot:        '#ff9f0a',
    nameColor:  '#7a4a00',
  },
  myer: {
    bgRest:     'rgba(255,59,48,0.07)',
    bgSelected: 'rgba(255,59,48,0.15)',
    border:     '#ff3b30',
    dot:        '#ff3b30',
    nameColor:  '#8a1a14',
  },
  'david-jones': {
    bgRest:     'rgba(0,122,255,0.07)',
    bgSelected: 'rgba(0,122,255,0.14)',
    border:     '#0071e3',
    dot:        '#0071e3',
    nameColor:  '#003d80',
  },
  shopify: {
    bgRest:     'rgba(48,209,88,0.08)',
    bgSelected: 'rgba(48,209,88,0.18)',
    border:     '#30d158',
    dot:        '#1a8a35',
    nameColor:  '#1a5c2a',
  },
}

export function MarketplaceSelector({ selected, onChange }: MarketplaceSelectorProps) {
  const toggle = (id: MarketplaceName) => {
    if (selected.includes(id)) {
      onChange(selected.filter((m) => m !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {(Object.keys(MARKETPLACE_RULES) as MarketplaceName[]).map((id) => {
        const rule = MARKETPLACE_RULES[id]
        const isSelected = selected.includes(id)
        const palette = MARKETPLACE_PALETTE[id]

        return (
          <button
            key={id}
            onClick={() => toggle(id)}
            style={{
              position: 'relative',
              background: isSelected ? palette.bgSelected : palette.bgRest,
              border: isSelected ? `1.5px solid ${palette.border}` : `1px solid ${palette.border}30`,
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              overflow: 'hidden',
            }}
          >
            {/* Colored dot indicator */}
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

            <p style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-.2px', marginBottom: '3px', color: isSelected ? palette.nameColor : '#1d1d1f' }}>
              {rule.name}
            </p>
            <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '12px' }}>
              {MARKETPLACE_DESCRIPTIONS[id]}
            </p>
            <div style={{ fontSize: '11px', lineHeight: 1.8, fontFamily: 'var(--font-dm-mono)', color: '#aeaeb2' }}>
              <p>{rule.image_dimensions.width}×{rule.image_dimensions.height}px</p>
              <p style={{ color: '#6e6e73' }}>{rule.file_format.toUpperCase()} · Q{rule.quality}</p>
              <p>Req: <span style={{ color: '#6e6e73' }}>{rule.required_views.join(', ')}</span></p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
