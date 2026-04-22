'use client'

import { useEffect, useState, useCallback } from 'react'

const TOUR_KEY = 'shotsync_cluster_tour_v1'

interface Step {
  selector: string
  title: string
  body: string
  position: 'top' | 'bottom' | 'left' | 'right'
  pad?: number
}

const STEPS: Step[] = [
  {
    selector: '[data-tour="cluster-card"]',
    title: 'Each card is one product',
    body: 'ShotSync has grouped your images by SKU. Check the images look right, assign a SKU, then confirm when done.',
    position: 'bottom',
    pad: 6,
  },
  {
    selector: '[data-tour="cluster-images"]',
    title: 'Drag to move images',
    body: 'Drag any image from one cluster and drop it onto another to move it. A dashed drop zone appears on the target cluster.',
    position: 'bottom',
    pad: 4,
  },
  {
    selector: '[data-tour="cluster-images"]',
    title: 'Click to select — then delete or split',
    body: 'Click thumbnails to select them. A toolbar appears with options to delete the images or split them into a new cluster.',
    position: 'bottom',
    pad: 4,
  },
  {
    selector: '[data-tour="cluster-images"]',
    title: 'Hover to duplicate',
    body: 'Hover an image to reveal the duplicate button (top-left corner). Duplicate it, then drag the copy to another cluster.',
    position: 'bottom',
    pad: 4,
  },
  {
    selector: '[data-tour="angle-pills"]',
    title: 'Shot angle tags',
    body: 'These show the detected shot angles for this cluster. Click a tag to disable an angle that\'s wrong or missing.',
    position: 'bottom',
    pad: 8,
  },
  {
    selector: '[data-tour="ai-copy"]',
    title: 'Generate AI product copy',
    body: 'Expand this section and click Generate. ShotSync uses the hero image to write a title, description, and bullet points automatically.',
    position: 'top',
    pad: 4,
  },
  {
    selector: '[data-tour="confirm-btn"]',
    title: 'Confirm when ready',
    body: 'Once the SKU and images look right, click Confirm. Only confirmed clusters are included in the export ZIP.',
    position: 'top',
    pad: 6,
  },
]

interface Rect { top: number; left: number; width: number; height: number }

export function ClusterTour({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [visible, setVisible] = useState(false)

  const measure = useCallback(() => {
    const el = document.querySelector(STEPS[step].selector) as HTMLElement | null
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    setTimeout(() => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      setVisible(true)
    }, 360)
  }, [step])

  useEffect(() => {
    setVisible(false)
    const t = setTimeout(measure, 80)
    return () => clearTimeout(t)
  }, [step, measure])

  useEffect(() => {
    const onResize = () => { setVisible(false); setTimeout(measure, 150) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure])

  function dismiss() {
    localStorage.setItem(TOUR_KEY, '1')
    onDismiss()
  }

  function advance() {
    if (step < STEPS.length - 1) {
      setVisible(false)
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  if (!rect) return null

  const PAD = STEPS[step].pad ?? 10
  const sTop  = rect.top    - PAD
  const sLeft = rect.left   - PAD
  const sW    = rect.width  + PAD * 2
  const sH    = rect.height + PAD * 2

  const TW  = 284
  const TTH = 220 // approximate tooltip height
  const pos = STEPS[step].position
  const vw  = window.innerWidth
  const vh  = window.innerHeight

  // Auto-flip: if preferred position would clip, use the opposite side
  const centreLeft = Math.max(12, Math.min(sLeft + sW / 2 - TW / 2, vw - TW - 12))
  const fitsBelow  = sTop + sH + 14 + TTH < vh - 12
  const fitsAbove  = sTop - TTH - 14 > 12

  let resolvedPos = pos
  if (pos === 'bottom' && !fitsBelow) resolvedPos = fitsAbove ? 'top' : 'bottom'
  if (pos === 'top'    && !fitsAbove) resolvedPos = fitsBelow ? 'bottom' : 'top'

  let tt: React.CSSProperties = {}
  if (resolvedPos === 'bottom') {
    // If still off-screen after flip attempt, clamp to viewport
    const rawTop = sTop + sH + 14
    tt = { top: Math.min(rawTop, vh - TTH - 12), left: centreLeft }
  } else if (resolvedPos === 'top') {
    const rawTop = sTop - TTH - 14
    tt = { top: Math.max(12, rawTop), left: centreLeft }
  } else if (resolvedPos === 'right') {
    tt = { top: Math.max(12, Math.min(sTop, vh - TTH - 12)), left: Math.min(sLeft + sW + 14, vw - TW - 12) }
  } else {
    tt = { top: Math.max(12, Math.min(sTop, vh - TTH - 12)), left: Math.max(12, sLeft - TW - 14) }
  }

  const spotTransition = 'top 0.28s cubic-bezier(0.4,0,0.2,1), left 0.28s cubic-bezier(0.4,0,0.2,1), width 0.28s cubic-bezier(0.4,0,0.2,1), height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease'

  return (
    <>
      {/* Backdrop — clicking dismisses tour */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9000, cursor: 'default' }}
        onClick={dismiss}
      />

      {/* Spotlight — box-shadow darkens everything outside the cutout */}
      <div
        style={{
          position: 'fixed',
          top: sTop, left: sLeft, width: sW, height: sH,
          borderRadius: 10,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.60)',
          zIndex: 9001,
          pointerEvents: 'none',
          transition: visible ? spotTransition : 'none',
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Tooltip card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          ...tt,
          width: TW,
          zIndex: 9002,
          background: '#fff',
          borderRadius: 14,
          padding: '16px 16px 14px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.18s ease',
          pointerEvents: visible ? 'all' : 'none',
          fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {/* Counter + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {step + 1} of {STEPS.length}
          </span>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c7c7cc', padding: 2, lineHeight: 1, display: 'flex', alignItems: 'center' }}
            title="Skip tour"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l8 8M10 2L2 10"/>
            </svg>
          </button>
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-.3px', color: '#1d1d1f', marginBottom: 5 }}>
          {STEPS[step].title}
        </div>
        <p style={{ fontSize: 12.5, color: '#6e6e73', lineHeight: 1.55, letterSpacing: '-.1px', margin: '0 0 12px' }}>
          {STEPS[step].body}
        </p>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 16 : 5, height: 5, borderRadius: 999, background: i === step ? '#1d1d1f' : 'rgba(0,0,0,0.12)', transition: 'all 0.2s ease' }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={dismiss}
            style={{ fontSize: 12, color: '#aeaeb2', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '-.1px' }}
          >
            Skip tour
          </button>
          <button
            onClick={advance}
            style={{ background: '#1d1d1f', color: '#f5f5f7', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', letterSpacing: '-.2px' }}
          >
            {step === STEPS.length - 1 ? 'Done ✓' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  )
}

export function useClusterTour() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setActive(true), 900)
      return () => clearTimeout(t)
    }
  }, [])

  return {
    active,
    startTour: () => setActive(true),
    stopTour:  () => setActive(false),
  }
}
