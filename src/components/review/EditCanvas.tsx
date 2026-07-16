'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createAdjustmentRenderer, type AdjustmentRenderer, type ImageEdit } from '@/lib/image/adjustments'

// Live, non-destructive preview: draws `src` through the adjustment shader and
// re-renders instantly as `edit` changes. Falls back to a plain <img> if WebGL
// is unavailable (the recipe still applies at export).
export function EditCanvas({
  src,
  edit,
  className,
  style,
}: {
  src: string
  edit: ImageEdit
  className?: string
  style?: CSSProperties
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<AdjustmentRenderer | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [failed, setFailed] = useState(false)

  // Load the image and (re)create the renderer when the source changes.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      // Cap the on-screen preview so the per-pixel adjustment pass stays smooth
      // while dragging sliders. It's displayed even smaller; export uses full res.
      const MAX_PREVIEW = 1400
      const scale = Math.min(1, MAX_PREVIEW / Math.max(img.naturalWidth, img.naturalHeight))
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      try {
        rendererRef.current?.destroy()
        rendererRef.current = createAdjustmentRenderer(canvas)
        imgRef.current = img
        rendererRef.current.render(img, edit)
        setFailed(false)
      } catch {
        setFailed(true)
      }
    }
    img.onerror = () => { if (!cancelled) setFailed(true) }
    img.src = src
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // Re-render when the recipe changes (cheap: same texture, new uniforms).
  useEffect(() => {
    if (rendererRef.current && imgRef.current) rendererRef.current.render(imgRef.current, edit)
  }, [edit])

  // Release the GL context on unmount.
  useEffect(() => () => { rendererRef.current?.destroy(); rendererRef.current = null }, [])

  if (failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={className} style={style} />
  }
  return <canvas ref={canvasRef} className={className} style={style} />
}
