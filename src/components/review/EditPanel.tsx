'use client'

import type { ImageEdit } from '@/lib/image/adjustments'

type SliderKey = 'exposure' | 'contrast' | 'highlights' | 'shadows' | 'temperature' | 'tint' | 'saturation'

const SLIDERS: { key: SliderKey; label: string }[] = [
  { key: 'exposure', label: 'Exposure' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'highlights', label: 'Highlights' },
  { key: 'shadows', label: 'Shadows' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'tint', label: 'Tint' },
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
  bgLoading,
  bgError,
  onToggleBg,
  onRemoveBgAll,
}: {
  edit: ImageEdit
  onChange: (patch: Partial<ImageEdit>) => void
  onReset: () => void
  onApplyToAll: () => void
  isDefault: boolean
  bgLoading: boolean
  bgError: string | null
  onToggleBg: () => void
  onRemoveBgAll: () => void
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

      {/* ── Background removal ── */}
      <div className="mt-1 pt-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.12)' }}>
        <button
          onClick={onToggleBg}
          disabled={bgLoading}
          className="w-full py-2 rounded-[8px] text-[12px] font-medium transition-colors flex items-center justify-center gap-2"
          style={{
            background: edit.bgRemove ? '#30d158' : 'rgba(255,255,255,0.10)',
            color: '#fff',
            cursor: bgLoading ? 'wait' : 'pointer',
          }}
          title="Remove the background (Growth plan and above)"
        >
          {bgLoading ? (
            <><span className="inline-block w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Removing…</>
          ) : edit.bgRemove ? (
            <>✓ Background removed</>
          ) : (
            <>Remove background</>
          )}
        </button>
        {bgError && <p className="text-[#ff8f8f] text-[11px] mt-1.5 leading-snug">{bgError}</p>}
        {edit.bgRemove && (
          <button onClick={onRemoveBgAll} className="w-full mt-1.5 py-1.5 text-[11px] text-white/60 hover:text-white/90 transition-colors">
            Remove background on all images
          </button>
        )}
      </div>

      <button
        onClick={onApplyToAll}
        disabled={isDefault}
        className="py-2 rounded-[8px] text-[12px] font-medium transition-colors"
        style={{
          background: isDefault ? 'rgba(255,255,255,0.06)' : '#4a9eff',
          color: isDefault ? 'rgba(255,255,255,0.3)' : '#fff',
          cursor: isDefault ? 'default' : 'pointer',
        }}
        title="Copy these adjustment settings to every image in the session"
      >
        Apply settings to all
      </button>
      <p className="text-white/35 text-[11px] leading-snug">
        Edits are non-destructive — applied to your full-resolution image only at export.
      </p>
    </div>
  )
}
