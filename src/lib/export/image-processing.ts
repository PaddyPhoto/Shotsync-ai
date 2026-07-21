// Shared image processing for export — used by both the ExportPanel (review page)
// and the historical-job export page. Keep this file client-only (canvas APIs).
import { getPica } from '@/lib/image/pica'
import { renderAdjustmentsForExport, type ImageEdit } from '@/lib/image/adjustments'
import { buildColorPreservedCutout } from '@/lib/image/composite'

// Light unsharp mask applied once, at export, on the final-resolution image —
// emulates Photoshop's "Bicubic Sharper" crispness on top of the Lanczos3
// downscale. Tunable: raise unsharpAmount for more bite. Applied here only (the
// import master stays unsharpened) so images are never double-sharpened.
const EXPORT_UNSHARP_AMOUNT = 60     // pica: 0–500
const EXPORT_UNSHARP_RADIUS = 0.6    // pica: 0.5–2.0
const EXPORT_UNSHARP_THRESHOLD = 2   // pica: 0–255

export const PLAIN_BG_VIEWS = new Set<string>([
  'front', 'back', 'side', 'mood', 'mood-2', 'mood-3',
  'full-length', 'full-length-side', 'full-length-back',
  'ghost-mannequin', 'front-3/4', 'back-3/4',
])

// Views where edge-extension (cloning an 8% edge strip to fill the crop's
// aspect-ratio gap) is SAFE: studio packshots / full-length where the subject
// sits inside a plain backdrop margin, so the stretched strip is pure backdrop.
// Deliberately EXCLUDES mood (lifestyle/editorial — model often bleeds to the
// frame edge) and detail (macro crops — fabric fills the frame), where cloning
// the edge smears the subject. Narrower than PLAIN_BG_VIEWS on purpose (that set
// governs bg-removal eligibility, a different question). Unknown/missing view →
// not in the set → we fall back to a clean bgColor bar (never smears).
export const EDGE_EXTEND_VIEWS = new Set<string>([
  'front', 'back', 'side',
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

// The /api/remove-background route returns EITHER a JSON `{ url }` (Replicate —
// the browser fetches the PNG directly from replicate.delivery, CORS-open) OR a
// raw image body (PhotoRoom). Normalise both to a Blob of the cutout PNG.
export async function readCutoutBlob(res: Response): Promise<Blob> {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const { url } = await res.json()
    const imgRes = await fetch(url)
    if (!imgRes.ok) throw new Error(`Fetch cutout ${imgRes.status}`)
    return imgRes.blob()
  }
  return res.blob()
}

export async function processImageOnCanvas(
  file: File, width: number, height: number, bgColor: string,
  quality = 1.0, maxFileSizeKb = 0, removeBg = false,
  preRemovedBgBlob?: Blob, edit?: ImageEdit, viewLabel?: string,
): Promise<ArrayBuffer> {
  let sourceBlob: Blob = file
  const wantRemove = removeBg
  if (preRemovedBgBlob) {
    // A colour-preserved cutout from the editor — use it directly.
    sourceBlob = preRemovedBgBlob
  } else if (wantRemove) {
    // No cached cutout — remove now via the server (851-labs), then apply the mask
    // to the ORIGINAL pixels to preserve colour. No @imgly fallback: fail loudly
    // so a mis-configured Replicate token is obvious, not silently degraded.
    const compressed = await preCompressImage(file)
    const fd = new FormData()
    fd.append('image', compressed, 'image.jpg')
    const apiRes = await fetch('/api/remove-background', { method: 'POST', body: fd })
    if (!apiRes.ok) {
      if (apiRes.status === 403) throw new Error('plan_upgrade_required')
      // Surface the server's actual reason (Replicate status, prediction error,
      // output-fetch failure, …) instead of guessing — makes the real cause visible.
      const detail = await apiRes.json().then((d) => d?.error).catch(() => '')
      throw new Error(`Background removal failed (${apiRes.status})${detail ? ` — ${detail}` : ''}`)
    }
    const rawCutout = await readCutoutBlob(apiRes)
    sourceBlob = await buildColorPreservedCutout(file, rawCutout)
  }
  // True once the source is a transparent cutout (bg removed). Used below to skip
  // edge-extension padding — the clean bgColor fill is the correct backdrop, and
  // stretching the subject's edge row would smear streaks into the padding.
  const bgRemoved = wantRemove || !!preRemovedBgBlob

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(sourceBlob)
    const img = new window.Image()
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image failed to load')) }
    img.onload = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Fill the marketplace background first. For opaque images this is hidden;
      // for a transparent cutout (bg removed) it becomes the clean backdrop —
      // otherwise JPEG renders the transparent areas as black.
      ctx.fillStyle = bgColor || '#FFFFFF'
      ctx.fillRect(0, 0, width, height)

      // Fit-to-contain: scale the entire source to fit within the target canvas,
      // centred, with background filling any remaining space on the edges.
      // This preserves full-length models — no head or foot clipping.
      const scale = Math.min(width / img.width, height / img.height)
      const drawW = Math.round(img.width * scale)
      const drawH = Math.round(img.height * scale)
      const drawX = Math.round((width - drawW) / 2)
      const drawY = Math.round((height - drawH) / 2)

      // Apply the non-destructive adjustment recipe to the full-res source first
      // (same shader as the lightbox preview → WYSIWYG). No-op edits return null.
      const adjusted = renderAdjustmentsForExport(img, edit)
      const resizeSource = adjusted ?? img

      // Single high-quality Lanczos3 downscale (pica) straight from the source, plus
      // a light unsharp mask — replaces the old canvas multi-step halving. One clean
      // resample at the exact draw size; no extra compression generation.
      const currentCanvas = document.createElement('canvas')
      currentCanvas.width = drawW
      currentCanvas.height = drawH
      try {
        const pica = await getPica()
        await pica.resize(resizeSource, currentCanvas, {
          filter: 'lanczos3',
          unsharpAmount: EXPORT_UNSHARP_AMOUNT,
          unsharpRadius: EXPORT_UNSHARP_RADIUS,
          unsharpThreshold: EXPORT_UNSHARP_THRESHOLD,
        })
      } catch (err) { URL.revokeObjectURL(url); reject(err); return }

      // fit-to-contain guarantees exactly one dimension fills the canvas —
      // only the other axis needs padding, never both.
      // Edge-extension padding is ONLY for opaque plain-backdrop shots (it stretches
      // the studio backdrop to fill the gap seamlessly). Skip it when:
      //  - the background was removed — the bgColor fill is already the correct clean
      //    padding, and stretching the subject's edge row (hair, boot) would streak; or
      //  - the view isn't edge-extend-eligible (mood/detail/unknown) — the subject
      //    bleeds to the frame edge, so cloning the strip clones the model/fabric.
      // In those cases the plain bgColor bar is used instead (never smears).
      const canEdgeExtend = !bgRemoved && EDGE_EXTEND_VIEWS.has(viewLabel ?? '')
      const edgeFrac = 0.08
      const cw = currentCanvas.width
      const ch = currentCanvas.height
      if (canEdgeExtend && drawX > 0) {
        // Image is narrower than target → pad left and right only.
        // Stretch an 8% strip from each vertical edge to fill the gap.
        const srcW = Math.max(1, Math.round(cw * edgeFrac))
        ctx.drawImage(currentCanvas, 0, 0, srcW, ch, 0, 0, drawX, height)
        ctx.drawImage(currentCanvas, cw - srcW, 0, srcW, ch, drawX + drawW, 0, drawX, height)
      } else if (canEdgeExtend && drawY > 0) {
        // Image is shorter than target → pad top and bottom only.
        // Stretch an 8% strip from each horizontal edge to fill the gap.
        const srcH = Math.max(1, Math.round(ch * edgeFrac))
        ctx.drawImage(currentCanvas, 0, 0, cw, srcH, 0, 0, width, drawY)
        ctx.drawImage(currentCanvas, 0, ch - srcH, cw, srcH, 0, drawY + drawH, width, drawY)
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
