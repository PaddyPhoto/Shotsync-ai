'use client'

import type { ImageEdit } from '@/lib/image/adjustments'

const SLIDERS: { key: keyof ImageEdit; label: string }[] = [
  { key: 'exposure', label: 'Exposure' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'saturation', label: 'Saturation' },
]

// The right-hand edit panel in the lightbox. Sliders are −100..100; double-click
// a slider to reset that one. All edits are non-destructive (stored as a recipe).
export function EditPanel({
  edit,
  onChange,
  onReset,
  onApplyToAll,
  isDefault,
}: {
  edit: ImageEdit
  onChange: (patch: Partial<ImageEdit>) => void
  onReset: () => void
  onApplyToAll: () => void
  isDefault: boolean
}) {
  return (
    <div
      className="flex flex-col gap-4 rounded-[10px] p-4 w-[248px] flex-shrink-0"
      style={{ background: 'rgba(24,24,27,0.92)', border: '0.5px solid rgba(255,255,255,0.12)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="text-white/90 text-[13px] font-semibold uppercase tracking-wide">Adjust</span>
        <button
          onClick={onReset}
          disabled={isDefault}
          className="text-[12px] transition-colors"
          style={{ color: isDefault ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)', cursor: isDefault ? 'default' : 'pointer' }}
        >
          Reset
        </button>
      </div>

      {SLIDERS.map(({ key, label }) => {
        const v = edit[key]
        return (
          <label key={key} className="flex flex-col gap-1.5 cursor-pointer">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-white/70">{label}</span>
              <span className="text-white/90 font-mono tabular-nums" style={{ minWidth: 34, textAlign: 'right' }}>
                {v > 0 ? `+${v}` : v}
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={v}
              onChange={(e) => onChange({ [key]: Number(e.target.value) } as Partial<ImageEdit>)}
              onDoubleClick={() => onChange({ [key]: 0 } as Partial<ImageEdit>)}
              className="w-full h-[3px] cursor-pointer"
              style={{ accentColor: '#4a9eff' }}
            />
          </label>
        )
      })}

      <button
        onClick={onApplyToAll}
        disabled={isDefault}
        className="mt-1 py-2 rounded-[8px] text-[12px] font-medium transition-colors"
        style={{
          background: isDefault ? 'rgba(255,255,255,0.06)' : '#4a9eff',
          color: isDefault ? 'rgba(255,255,255,0.3)' : '#fff',
          cursor: isDefault ? 'default' : 'pointer',
        }}
        title="Copy these settings to every image in the session"
      >
        Apply to all images
      </button>
      <p className="text-white/35 text-[11px] leading-snug">
        Edits are non-destructive — applied to your full-resolution image only at export.
      </p>
    </div>
  )
}
