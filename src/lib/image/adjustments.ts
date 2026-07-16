// ── Non-destructive image adjustments (2D canvas) ────────────────────────────
// Exposure / contrast / temperature / saturation via the 2D canvas `filter`
// (brightness/contrast/saturate — GPU-accelerated and reliable across browsers)
// plus a soft-light overlay for temperature. The SAME code renders the live
// lightbox preview and the full-res export pass, so what you see ships (WYSIWYG).
//
// Slider values are −100..100, 0 = no change. The recipe is stored per image on
// SessionImage.edit and only applied to pixels here — originals are never mutated.

export interface ImageEdit {
  exposure: number     // −100..100
  contrast: number     // −100..100
  temperature: number  // −100..100  (− cooler/blue … + warmer/amber)
  saturation: number   // −100..100
}

export const DEFAULT_EDIT: ImageEdit = { exposure: 0, contrast: 0, temperature: 0, saturation: 0 }

export function isDefaultEdit(e?: ImageEdit | null): boolean {
  return !e || (e.exposure === 0 && e.contrast === 0 && e.temperature === 0 && e.saturation === 0)
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
  ctx.save()
  ctx.clearRect(0, 0, w, h)
  const brightness = (1 + edit.exposure / 100).toFixed(3)   // 0..2
  const contrast = (1 + edit.contrast / 100).toFixed(3)     // 0..2
  const saturate = (1 + edit.saturation / 100).toFixed(3)   // 0..2
  ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h)

  // Temperature: warm (amber) / cool (blue) soft-light wash over the whole frame.
  const t = edit.temperature / 100
  if (t !== 0) {
    ctx.filter = 'none'
    ctx.globalCompositeOperation = 'soft-light'
    ctx.globalAlpha = Math.min(0.6, Math.abs(t) * 0.6)
    ctx.fillStyle = t > 0 ? '#ff9028' : '#2890ff'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

export interface AdjustmentRenderer {
  /** Draw `source` into the renderer's canvas with `edit` applied. */
  render(source: AdjustmentSource, edit: ImageEdit): void
  destroy(): void
}

// Attach a renderer to a canvas (sized by the caller before rendering).
export function createAdjustmentRenderer(canvas: HTMLCanvasElement): AdjustmentRenderer {
  const ctx = canvas.getContext('2d')
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
    _offscreenCtx = _offscreen.getContext('2d')
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
