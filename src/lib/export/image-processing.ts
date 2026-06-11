// Shared image processing for export — used by both the ExportPanel (review page)
// and the historical-job export page. Keep this file client-only (canvas APIs).

export const PLAIN_BG_VIEWS = new Set<string>([
  'front', 'back', 'side', 'mood', 'mood-2', 'mood-3',
  'full-length', 'full-length-side', 'full-length-back',
  'ghost-mannequin', 'front-3/4', 'back-3/4',
])

// Resize a File to max 1500 px JPEG — keeps Replicate payloads small
export async function preCompressImage(file: File): Promise<Blob> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('load failed')) }
    img.onload = () => {
      const MAX = 1500
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob((b) => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', 0.88)
    }
    img.src = url
  })
}

export async function processImageOnCanvas(
  file: File, width: number, height: number, bgColor: string,
  quality = 1.0, maxFileSizeKb = 0, removeBg = false,
  preRemovedBgBlob?: Blob,
): Promise<ArrayBuffer> {
  let sourceBlob: Blob = file
  if (preRemovedBgBlob) {
    sourceBlob = preRemovedBgBlob
  } else if (removeBg) {
    try {
      const compressed = await preCompressImage(file)
      const fd = new FormData()
      fd.append('image', compressed, 'image.jpg')
      const apiRes = await fetch('/api/remove-background', { method: 'POST', body: fd })
      if (apiRes.ok) {
        sourceBlob = await apiRes.blob()
      } else if (apiRes.status === 403) {
        throw new Error('plan_upgrade_required')
      } else if (apiRes.status === 503) {
        throw new Error('not configured')
      } else {
        throw new Error(`API ${apiRes.status}`)
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'plan_upgrade_required') throw err
      console.warn('[remove-bg] server API failed, falling back to @imgly:', err)
      const { removeBackground } = await import('@imgly/background-removal')
      sourceBlob = await removeBackground(file, { output: { format: 'image/png', quality: 1 } })
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(sourceBlob)
    const img = new window.Image()
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image failed to load')) }
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      ctx.fillStyle = bgColor || '#ffffff'
      ctx.fillRect(0, 0, width, height)

      // Fit-to-contain: scale the entire source to fit within the target canvas,
      // centred, with bgColor filling any remaining space on the edges.
      // This preserves full-length models — no head or foot clipping.
      const scale = Math.min(width / img.width, height / img.height)
      const drawW = Math.round(img.width * scale)
      const drawH = Math.round(img.height * scale)
      const drawX = Math.round((width - drawW) / 2)
      const drawY = Math.round((height - drawH) / 2)

      // Multi-step downscaling for sharper results when reducing by more than 50%
      let currentCanvas = document.createElement('canvas')
      let currentCtx = currentCanvas.getContext('2d')!
      currentCtx.imageSmoothingEnabled = true
      currentCtx.imageSmoothingQuality = 'high'
      currentCanvas.width = img.width
      currentCanvas.height = img.height
      currentCtx.drawImage(img, 0, 0)

      let stepW = img.width
      let stepH = img.height
      while (stepW > drawW * 2 || stepH > drawH * 2) {
        stepW = Math.max(Math.round(stepW / 2), drawW)
        stepH = Math.max(Math.round(stepH / 2), drawH)
        const stepCanvas = document.createElement('canvas')
        stepCanvas.width = stepW
        stepCanvas.height = stepH
        const stepCtx = stepCanvas.getContext('2d')!
        stepCtx.imageSmoothingEnabled = true
        stepCtx.imageSmoothingQuality = 'high'
        stepCtx.drawImage(currentCanvas, 0, 0, stepW, stepH)
        currentCanvas = stepCanvas
        currentCtx = stepCtx
      }

      ctx.drawImage(currentCanvas, drawX, drawY, drawW, drawH)
      URL.revokeObjectURL(url)

      const maxBytes = maxFileSizeKb > 0 ? maxFileSizeKb * 1024 : 0
      const encodeAt = (q: number) => new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => b ? res(b) : rej(new Error('canvas.toBlob failed')), 'image/jpeg', q)
      )

      const tryEncode = async () => {
        let blob = await encodeAt(quality)
        if (maxBytes > 0 && blob.size > maxBytes) {
          let lo = 0.5, hi = quality
          for (let i = 0; i < 6; i++) {
            const mid = (lo + hi) / 2
            const attempt = await encodeAt(mid)
            if (attempt.size <= maxBytes) { blob = attempt; lo = mid }
            else hi = mid
          }
          if (blob.size > maxBytes) blob = await encodeAt(lo)
        }
        canvas.width = 0
        canvas.height = 0
        return blob.arrayBuffer()
      }

      tryEncode().then(resolve).catch(reject)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}
