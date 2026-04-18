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

export function MarketplaceSelector({ selected, onChange }: MarketplaceSelectorProps) {
  const toggle = (id: MarketplaceName) => {
    if (selected.includes(id)) {
      onChange(selected.filter((m) => m !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
      {(Object.keys(MARKETPLACE_RULES) as MarketplaceName[]).map((id) => {
        const rule = MARKETPLACE_RULES[id]
        const isSelected = selected.includes(id)

        return (
          <button
            key={id}
            onClick={() => toggle(id)}
            style={{
              position: 'relative',
              background: isSelected ? '#1d1d1f' : 'rgba(0,0,0,0.02)',
              border: isSelected ? '1.5px solid #1d1d1f' : '1px solid rgba(0,0,0,0.08)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              overflow: 'hidden',
            }}
          >
            {isSelected && (
              <span style={{
                position: 'absolute', top: '10px', right: '12px',
                width: '18px', height: '18px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: '#f5f5f7', fontWeight: 700,
              }}>✓</span>
            )}

            <p style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-.2px', marginBottom: '3px', color: isSelected ? '#f5f5f7' : '#1d1d1f' }}>
              {rule.name}
            </p>
            <p style={{ fontSize: '12px', color: isSelected ? 'rgba(245,245,247,0.55)' : '#aeaeb2', marginBottom: '12px' }}>
              {MARKETPLACE_DESCRIPTIONS[id]}
            </p>
            <div style={{ fontSize: '11px', lineHeight: 1.8, color: isSelected ? 'rgba(245,245,247,0.5)' : '#aeaeb2', fontFamily: 'var(--font-dm-mono)' }}>
              <p>{rule.image_dimensions.width}×{rule.image_dimensions.height}px</p>
              <p style={{ color: isSelected ? 'rgba(245,245,247,0.7)' : '#6e6e73' }}>{rule.file_format.toUpperCase()} · Q{rule.quality}</p>
              <p>Req: <span style={{ color: isSelected ? 'rgba(245,245,247,0.7)' : '#6e6e73' }}>{rule.required_views.join(', ')}</span></p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
