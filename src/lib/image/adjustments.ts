// ── Non-destructive image adjustments (2D canvas, per-pixel) ─────────────────
// Exposure, contrast, highlights, shadows, temperature, tint, saturation — all
// applied in a single per-pixel pass so it works in every browser (no WebGL, no
// SVG-filter quirks) and the math is exact. The SAME code renders the live
// lightbox preview and the full-res export pass, so what you see ships (WYSIWYG).
//
// Slider values are −100..100, 0 = no change. The recipe is stored per image on
// SessionImage.edit and only applied to pixels here — originals are never mutated.

export interface ImageEdit {
  exposure: number     // brightness (stops)
  contrast: number
  highlights: number   // − recover / + brighten the bright tones
  shadows: number      // + lift / − deepen the dark tones
  temperature: number  // white balance: − cooler/blue … + warmer/amber
  tint: number         // white balance: − green … + magenta
  saturation: number
  bgRemove: boolean    // one-click background removal (cutout cached separately)
}

export const DEFAULT_EDIT: ImageEdit = {
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 0,
  bgRemove: false,
}

// True when there are no *pixel* adjustments (bgRemove is handled separately, so
// it is intentionally not part of this check — used to skip the per-pixel pass).
export function isDefaultEdit(e?: ImageEdit | null): boolean {
  return !e || (
    e.exposure === 0 && e.contrast === 0 && e.highlights === 0 && e.shadows === 0 &&
    e.temperature === 0 && e.tint === 0 && e.saturation === 0
  )
}

export type AdjustmentSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap

// Draw `source` into a 2D context at w×h with the recipe applied.
function drawAdjusted(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  source: AdjustmentSource,
  edit: ImageEdit,
) {
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h)
  if (isDefaultEdit(edit)) return

  const image = ctx.getImageData(0, 0, w, h)
  const d = image.data

  // Precompute per-image coefficients.
  const expF = Math.pow(2, edit.exposure / 100)          // ±1 stop
  const t = edit.temperature / 100
  const ti = edit.tint / 100
  const rGain = 1 + t * 0.15                              // warm ⇒ +R −B
  const bGain = 1 - t * 0.15
  const gGain = 1 - ti * 0.12                             // magenta ⇒ −G, green ⇒ +G
  const contrastF = 1 + edit.contrast / 100
  const shA = (edit.shadows / 100) * 0.5                  // lift darks
  const hlA = (edit.highlights / 100) * 0.5              // adjust brights
  const satF = 1 + edit.saturation / 100
  const hasTone = shA !== 0 || hlA !== 0

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255

    r *= expF; g *= expF; b *= expF                        // exposure
    r *= rGain; g *= gGain; b *= bGain                     // white balance
    r = (r - 0.5) * contrastF + 0.5                        // contrast
    g = (g - 0.5) * contrastF + 0.5
    b = (b - 0.5) * contrastF + 0.5

    if (hasTone) {                                         // highlights / shadows
      r += shA * (1 - r) * (1 - r) + hlA * r * r
      g += shA * (1 - g) * (1 - g) + hlA * g * g
      b += shA * (1 - b) * (1 - b) + hlA * b * b
    }

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b      // saturation
    r = luma + (r - luma) * satF
    g = luma + (g - luma) * satF
    b = luma + (b - luma) * satF

    d[i]     = r < 0 ? 0 : r > 1 ? 255 : r * 255
    d[i + 1] = g < 0 ? 0 : g > 1 ? 255 : g * 255
    d[i + 2] = b < 0 ? 0 : b > 1 ? 255 : b * 255
  }
  ctx.putImageData(image, 0, 0)
}

export interface AdjustmentRenderer {
  /** Draw `source` into the renderer's canvas with `edit` applied. */
  render(source: AdjustmentSource, edit: ImageEdit): void
  destroy(): void
}

export function createAdjustmentRenderer(canvas: HTMLCanvasElement): AdjustmentRenderer {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D canvas context unavailable')
  return {
    render(source, edit) {
      drawAdjusted(ctx, canvas.width, canvas.height, source, edit)
    },
    destroy() {},
  }
}

// ── Export path ──────────────────────────────────────────────────────────────
// Applies a recipe to a full-res source and returns a canvas for the export
// pipeline to resize/crop. Returns null (no work) when the edit is a no-op.
let _offscreen: HTMLCanvasElement | null = null
let _offscreenCtx: CanvasRenderingContext2D | null = null

export function renderAdjustmentsForExport(
  source: HTMLImageElement | HTMLCanvasElement,
  edit?: ImageEdit | null,
): HTMLCanvasElement | null {
  if (isDefaultEdit(edit)) return null
  const w = (source as HTMLImageElement).naturalWidth || source.width
  const h = (source as HTMLImageElement).naturalHeight || source.height
  if (!w || !h) return null
  if (!_offscreen) {
    _offscreen = document.createElement('canvas')
    _offscreenCtx = _offscreen.getContext('2d', { willReadFrequently: true })
  }
  if (!_offscreenCtx) return null
  _offscreen.width = w
  _offscreen.height = h
  drawAdjusted(_offscreenCtx, w, h, source, edit as ImageEdit)
  // Copy to a fresh canvas so overlapping export calls (Promise.all) never share
  // the single offscreen buffer.
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d')!.drawImage(_offscreen, 0, 0)
  return out
}
