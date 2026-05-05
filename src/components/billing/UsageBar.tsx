'use client'

import { usagePct, limitLabel, isUnlimited } from '@/lib/plans'

interface UsageBarProps {
  label: string
  value: number
  limit: number
  unit?: string
  compact?: boolean
}

export function UsageBar({ label, value, limit, unit = '', compact = false }: UsageBarProps) {
  const pct = usagePct(value, limit)
  const unlimited = isUnlimited(limit)
  const isWarning = !unlimited && pct >= 80
  const isAtLimit = !unlimited && pct >= 100

  const barColor = isAtLimit
    ? 'bg-[var(--accent3)]'
    : isWarning
    ? 'bg-[var(--accent)]'
    : 'bg-[var(--accent2)]'

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[0.79rem] text-[var(--text3)] w-[100px] truncate">{label}</span>
        <div className="flex-1 h-[3px] bg-[var(--bg4)] rounded-full overflow-hidden">
          {!unlimited && (
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          )}
        </div>
        <span className="text-[0.77rem] w-[56px] text-right" style={{ fontFamily: 'var(--font-dm-mono)', color: isAtLimit ? 'var(--accent3)' : 'var(--text3)' }}>
          {unlimited ? '∞' : `${value} / ${limitLabel(limit)}`}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center justify-between text-[0.85rem]">
        <span className="text-[var(--text2)]">{label}</span>
        <span style={{ fontFamily: 'var(--font-dm-mono)', color: isAtLimit ? 'var(--accent3)' : 'var(--text3)' }}>
          {unlimited ? (
            <span className="text-[var(--accent2)]">Unlimited</span>
          ) : (
            <>{value}{unit && ` ${unit}`} <span className="text-[var(--text3)]">/ {limitLabel(limit)}{unit && ` ${unit}`}</span></>
          )}
        </span>
      </div>
      {!unlimited && (
        <div className="h-[5px] bg-[var(--bg3)] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
