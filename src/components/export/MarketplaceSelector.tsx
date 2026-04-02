'use client'

import { cn } from '@/lib/utils'
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
            className={cn(
              'relative bg-[var(--bg2)] border-2 rounded-md p-[18px] cursor-pointer transition-all duration-150 text-center overflow-hidden',
              isSelected
                ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.04)]'
                : 'border-[var(--line)] hover:border-[var(--line2)]'
            )}
          >
            {isSelected && (
              <span className="absolute top-[10px] right-3 w-[18px] h-[18px] bg-[var(--accent)] text-black rounded-full flex items-center justify-center text-[0.7rem] font-bold">
                ✓
              </span>
            )}

            <p
              className="text-[1.1rem] font-[800] mb-[6px] tracking-[-0.5px] text-[var(--text)]"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {rule.name}
            </p>
            <p className="text-[0.72rem] text-[var(--text3)] mb-3">
              {MARKETPLACE_DESCRIPTIONS[id]}
            </p>
            <div
              className="text-[0.72rem] text-[var(--text3)] leading-[1.7]"
              style={{ fontFamily: 'var(--font-dm-mono)' }}
            >
              <p>{rule.image_dimensions.width}×{rule.image_dimensions.height}px</p>
              <p><span className="text-[var(--text2)]">{rule.file_format.toUpperCase()}</span> · Q{rule.quality}</p>
              <p>Req: <span className="text-[var(--text2)]">{rule.required_views.join(', ')}</span></p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
