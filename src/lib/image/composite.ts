// ── Colour-preserving cutout ─────────────────────────────────────────────────
// Background removers return their own RGB, which can shift colour. To guarantee
// the subject's colours stay exactly as shot, we take only the remover's ALPHA
// (the mask) and apply it to the ORIGINAL pixels. Result: same colours, full
// resolution, background gone. Used for both the lightbox preview and export.

export function loadImageEl(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const isBlob = typeof src !== 'string'
    const url = isBlob ? URL.createObjectURL(src) : src
    img.onload = () => { if (isBlob) URL.revokeObjectURL(url); resolve(img) }
    img.onerror = (e) => { if (isBlob) URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}

// original RGB × cutout alpha → transparent cutout with the original's colours.
export async function buildColorPreservedCutout(original: Blob, cutout: Blob): Promise<Blob> {
  const [orig, cut] = await Promise.all([loadImageEl(original), loadImageEl(cutout)])
  const w = orig.naturalWidth
  const h = orig.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(orig, 0, 0, w, h)
  // 'destination-in' keeps the destination (original) only where the source
  // (cutout) is opaque — i.e. it masks the original by the cutout's alpha.
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(cut, 0, 0, w, h)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  )
}
