'use client'

import { useState, useRef, useEffect } from 'react'

interface HelpTooltipProps {
  content: React.ReactNode
  /** Preferred opening direction. Defaults to 'top'. */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Width of the tooltip panel in px. Defaults to 240. */
  width?: number
}

/**
 * Small ? icon that opens a contextual help popover on click.
 * Usage:
 *   <HelpTooltip content="The SKU is the product identifier that appears in filenames." />
 */
export function HelpTooltip({ content, position = 'top', width = 240 }: HelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const panelPos: Record<string, React.CSSProperties> = {
    top:    { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top:    'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    left:   { right:  'calc(100% + 6px)', top: '50%',  transform: 'translateY(-50%)' },
    right:  { left:   'calc(100% + 6px)', top: '50%',  transform: 'translateY(-50%)' },
  }

  return (
    <div ref={ref} className="relative inline-flex items-center" style={{ lineHeight: 1 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Help"
        className={`
          w-[15px] h-[15px] rounded-full flex items-center justify-center
          text-[9px] font-bold leading-none select-none transition-colors
          border border-[var(--line2)]
          ${open
            ? 'bg-[var(--accent)] border-[var(--accent)] text-black'
            : 'bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] hover:border-[var(--line)]'
          }
        `}
      >
        ?
      </button>

      {open && (
        <div
          className="absolute z-50 text-[0.75rem] text-[var(--text2)] bg-[var(--bg2)] border border-[var(--line)] rounded-[8px] shadow-lg p-3 leading-relaxed"
          style={{ ...panelPos[position], width }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
