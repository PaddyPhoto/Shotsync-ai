'use client'

import { useEffect, useRef } from 'react'

// Lightweight, no-cost preview of how a shot will be framed in the export:
// the source (its existing review thumbnail) drawn fit-to-contain on the
// marketplace's target aspect ratio + background colour. It shows crop, framing
// and padding — the things a coordinator wants to eyeball before committing.
// It does NOT run background removal (that's a paid Replicate call); when removal
// is on, the caption notes the real cutout is applied at export.
export function ComposedPreview({
  src, width, height, bgColor,
}: {
  src: string
  width: number
  height: number
  bgColor: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !src) return
    const aspect = width / height
    const H = 360
    const W = Math.round(H * aspect)
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = bgColor || '#FFFFFF'
    ctx.fillRect(0, 0, W, H)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(W / img.width, H / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
    }
    img.src = src
  }, [src, width, height, bgColor])

  return (
    <canvas
      ref={ref}
      className="block max-h-full max-w-full w-auto mx-auto rounded-[3px] border border-[var(--line)]"
      style={{ aspectRatio: `${width} / ${height}` }}
    />
  )
}
