'use client'

import type { ViewLabel } from '@/types'
import type { SessionCluster, SessionImage } from '@/store/session'

// ── Colour detection ──────────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    case b: h = ((r - g) / d + 4) / 6; break
  }
  return [h * 360, s, l]
}

function hslToColorName(h: number, s: number, l: number): string {
  if (l < 0.15) return 'BLACK'
  if (l > 0.88 && s < 0.15) return 'WHITE'
  if (s < 0.12) return l < 0.45 ? 'CHARCOAL' : 'GREY'
  if (l < 0.30 && h >= 200 && h < 270) return 'NAVY'
  if (l < 0.35 && s < 0.25) return 'BROWN'
  if (l > 0.75 && s < 0.30) return 'CREAM'
  if ((h >= 0 && h < 15) || h >= 345) return 'RED'
  if (h >= 15 && h < 42) return 'ORANGE'
  if (h >= 42 && h < 70) return 'YELLOW'
  if (h >= 70 && h < 160) return 'GREEN'
  if (h >= 160 && h < 200) return 'TEAL'
  if (h >= 200 && h < 255) return 'BLUE'
  if (h >= 255 && h < 300) return 'PURPLE'
  return 'PINK'
}

// Try to detect colour from filename tokens first (fast, no canvas needed)
const FILENAME_COLOUR_MAP: [string, string][] = [
  ['black', 'BLACK'], ['blk', 'BLACK'],
  ['white', 'WHITE'], ['wht', 'WHITE'],
  ['navy', 'NAVY'], ['nvy', 'NAVY'],
  ['blue', 'BLUE'], ['blu', 'BLUE'],
  ['red', 'RED'],
  ['green', 'GREEN'], ['grn', 'GREEN'],
  ['grey', 'GREY'], ['gray', 'GREY'], ['gry', 'GREY'],
  ['beige', 'BEIGE'], ['bei', 'BEIGE'],
  ['cream', 'CREAM'], ['crm', 'CREAM'], ['ivory', 'CREAM'],
  ['brown', 'BROWN'], ['brn', 'BROWN'],
  ['pink', 'PINK'], ['pnk', 'PINK'],
  ['purple', 'PURPLE'], ['purp', 'PURPLE'], ['plum', 'PURPLE'],
  ['orange', 'ORANGE'], ['org', 'ORANGE'],
  ['yellow', 'YELLOW'], ['ylw', 'YELLOW'],
  ['teal', 'TEAL'], ['khaki', 'GREEN'], ['olive', 'GREEN'],
  ['charcoal', 'CHARCOAL'], ['char', 'CHARCOAL'],
]

function detectColourFromFilename(filename: string): string | null {
  const tokens = new Set(filenameTokens(filename))
  for (const [kw, colour] of FILENAME_COLOUR_MAP) {
    if (tokens.has(kw)) return colour
  }
  return null
}

async function detectColourFromImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      try {
        const SIZE = 80
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, SIZE, SIZE)

        const data = ctx.getImageData(0, 0, SIZE, SIZE).data

        // Sample the center 60% of the image (avoid white background edges)
        const margin = Math.floor(SIZE * 0.2)
        const hueBuckets = new Array(36).fill(0)
        let sampled = 0

        for (let y = margin; y < SIZE - margin; y++) {
          for (let x = margin; x < SIZE - margin; x++) {
            const idx = (y * SIZE + x) * 4
            const r = data[idx], g = data[idx + 1], b = data[idx + 2]
            const [h, s, l] = rgbToHsl(r, g, b)
            // Skip near-white pixels (likely background) and very dark pixels
            if (l > 0.85 && s < 0.15) continue
            if (l < 0.08) continue
            // For clearly dark/neutral pixels, still count them
            if (s < 0.08) { hueBuckets[0] += 0.5; sampled += 0.5; continue }
            hueBuckets[Math.floor(h / 10)]++
            sampled++
          }
        }

        if (sampled < 10) { URL.revokeObjectURL(url); resolve(''); return }

        // Find most dominant hue bucket
        let maxBucket = 0, maxCount = 0
        for (let i = 0; i < hueBuckets.length; i++) {
          if (hueBuckets[i] > maxCount) { maxCount = hueBuckets[i]; maxBucket = i }
        }

        // Build dominant hue — average hue, s, l from that bucket's pixels
        let sumH = 0, sumS = 0, sumL = 0, count = 0
        for (let y = margin; y < SIZE - margin; y++) {
          for (let x = margin; x < SIZE - margin; x++) {
            const idx = (y * SIZE + x) * 4
            const [h, s, l] = rgbToHsl(data[idx], data[idx + 1], data[idx + 2])
            if (l > 0.85 && s < 0.15) continue
            if (l < 0.08) continue
            if (s < 0.08) continue
            if (Math.floor(h / 10) === maxBucket) { sumH += h; sumS += s; sumL += l; count++ }
          }
        }

        URL.revokeObjectURL(url)

        if (count === 0) { resolve(''); return }
        resolve(hslToColorName(sumH / count, sumS / count, sumL / count))
      } catch {
        URL.revokeObjectURL(url)
        resolve('')
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve('') }
    img.src = url
  })
}

// ── Shot angle labels in display order ───────────────────────────────────────
// This is the canonical order images are shot within a look for on-model shoots.
// When filename detection fails to identify an angle, images are assigned angles
// positionally — i.e. the 1st image in a chunk → full-length, 2nd → front, etc.
// Within each cluster, images are also sorted into this display order.
const VIEW_ORDER: ViewLabel[] = ['full-length', 'front', 'side', 'mood', 'detail', 'back']

// ── Angle detection from filename (used to override positional assignment) ───
// Keywords are matched as EXACT tokens (split on [-_. ]) — no substring false-positives.
const VIEW_KEYWORDS: [ViewLabel, string[]][] = [
  ['full-length', ['full', 'fl', 'fl01', 'fl02', 'fullbody', 'fulllength', 'standing']],
  ['front',       ['front', 'f', 'f01', 'f02', 'f1', 'f2', 'main', 'hero']],
  ['side',        ['side', 's', 's01', 's02', 's1', 's2', 'profile']],
  ['mood',        ['mood', 'lifestyle', 'editorial', 'styled', 'ambient']],
  ['detail',      ['detail', 'd', 'd01', 'd02', 'd1', 'd2', 'close', 'flatlay', 'flat', 'zoom']],
  ['back',        ['back', 'b', 'b01', 'b02', 'b1', 'b2', 'rear']],
]

function filenameTokens(filename: string): string[] {
  return filename
    .toLowerCase()
    .replace(/\.[^.]+$/, '')   // strip extension
    .split(/[-_.\s]+/)         // split on separators
    .filter(Boolean)
}

function detectAngleFromFilename(filename: string): ViewLabel | null {
  const tokens = new Set(filenameTokens(filename))
  for (const [view, kws] of VIEW_KEYWORDS) {
    if (kws.some((kw) => tokens.has(kw))) return view
  }
  return null
}

// ── Main entry point ──────────────────────────────────────────────────────────

export interface ProcessProgress {
  phase: string
  done: number
  total: number
}

export async function processFiles(
  files: File[],
  imagesPerLook: number,
  onProgress: (p: ProcessProgress) => void,
  shootType: 'on-model' | 'still-life' = 'on-model'
): Promise<SessionCluster[]> {
  const total = files.length

  onProgress({ phase: 'Loading files…', done: 0, total })

  // Step 1: Sort files by filename in natural/numeric order — preserves camera roll sequence
  const sorted = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  )

  // Step 2: Create session images with preview URLs and assign angle labels.
  // Angle detection priority:
  //   1. Filename keyword match (confidence 0.9) — e.g. "hero_front.jpg" → 'front'
  //   2. Positional assignment (confidence 0.6) — based on the image's index within
  //      its chunk (e.g. 2nd image in a 4-shot look → VIEW_ORDER[1] = 'front')
  // Object URLs are created here and must be revoked when the session is reset.
  const images: SessionImage[] = sorted.map((file, i) => {
    const detected = detectAngleFromFilename(file.name)
    // Positional angle = VIEW_ORDER[position within look]
    const positionInLook = i % imagesPerLook
    const positionalAngle: ViewLabel = VIEW_ORDER[positionInLook] ?? 'unknown'
    // Prefer filename-detected angle, fall back to positional
    const viewLabel = detected ?? positionalAngle
    return {
      id: `img-${i}-${file.name}`,
      file,
      previewUrl: URL.createObjectURL(file),
      filename: file.name,
      seqIndex: i,
      viewLabel,
      viewConfidence: detected ? 0.9 : 0.6,
    }
  })

  onProgress({ phase: 'Loading files…', done: total, total })
  await new Promise((r) => setTimeout(r, 0))

  // Step 3: Chunk into looks by fixed count
  onProgress({ phase: 'Grouping into looks…', done: 0, total: 1 })
  await new Promise((r) => setTimeout(r, 0))

  const clusters: SessionCluster[] = []
  for (let i = 0; i < images.length; i += imagesPerLook) {
    const chunk = images.slice(i, i + imagesPerLook)
    const lookNumber = clusters.length + 1

    // Sort within the look by the VIEW_ORDER — so display order is always
    // Full Length → Front → Side → Mood → Detail → Back regardless of how files were named
    const orderedChunk = [...chunk].sort((a, b) => {
      const ai = VIEW_ORDER.indexOf(a.viewLabel as ViewLabel)
      const bi = VIEW_ORDER.indexOf(b.viewLabel as ViewLabel)
      const aIdx = ai === -1 ? VIEW_ORDER.length : ai
      const bIdx = bi === -1 ? VIEW_ORDER.length : bi
      if (aIdx !== bIdx) return aIdx - bIdx
      return a.seqIndex - b.seqIndex
    })

    clusters.push({
      id: `cluster-${lookNumber}`,
      images: orderedChunk,
      sku: '',
      productName: '',
      color: '',
      label: shootType === 'still-life' ? `Product ${lookNumber}` : `Look ${lookNumber}`,
      category: null,
      confirmed: false,
    })
  }

  // Step 4: Colour detection (and AI angle correction if enabled).
  //
  // AI path (NEXT_PUBLIC_AI_DETECTION=true + OPENAI_API_KEY set):
  //   - Only called when at least one image in the cluster has an 'unknown' angle.
  //     If filename detection already resolved all angles, we skip the API call.
  //   - Sends all images in the cluster to GPT-4o-mini in one batch request.
  //   - Returns per-image angles, a colour name, and category (still-life only).
  //
  // Non-AI fallback (always runs if AI is disabled or the API call fails):
  //   1. Check filename tokens for colour keywords (fast, no image loading)
  //   2. Canvas pixel sampling on the best representative image (center 60%)
  const aiEnabled = process.env.NEXT_PUBLIC_AI_DETECTION === 'true'
  onProgress({ phase: 'Detecting colours…', done: 0, total: clusters.length })

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]

    // AI is only called when filename detection left some angles as 'unknown'.
    // This avoids unnecessary API calls when the shoot was well-named.
    const hasUnknownAngles = cluster.images.some((img) => img.viewLabel === 'unknown')

    if (aiEnabled && hasUnknownAngles) {
      // AI path: convert images to base64 and send the whole cluster in one call
      try {
        const base64Images = await Promise.all(
          cluster.images.map(async (img) => {
            const buf = await img.file.arrayBuffer()
            const bytes = new Uint8Array(buf)
            let binary = ''
            for (let j = 0; j < bytes.byteLength; j++) binary += String.fromCharCode(bytes[j])
            return {
              id: img.id,
              filename: img.filename,
              base64: btoa(binary),
            }
          })
        )

        const res = await fetch('/api/ai/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: base64Images, shootType }),
        })

        if (res.ok) {
          const { result } = await res.json()
          if (result) {
            // Apply AI angle labels
            for (const img of cluster.images) {
              if (result.angles[img.id]) {
                img.viewLabel = result.angles[img.id]
                img.viewConfidence = 0.9
              }
            }
            // Apply AI category (still-life only)
            if (result.category) {
              cluster.category = result.category
            }
            // Apply AI colour
            if (result.colour) {
              cluster.color = result.colour
              onProgress({ phase: 'Detecting colours…', done: i + 1, total: clusters.length })
              await new Promise((r) => setTimeout(r, 0))
              continue
            }
          }
        }
      } catch { /* fall through to canvas detection */ }
    }

    // Non-AI path: filename tokens first, then canvas pixel sampling
    const preferOrder: ViewLabel[] = ['front', 'detail', 'full-length']
    const bestImg =
      preferOrder.reduce<SessionImage | null>((found, label) =>
        found ?? cluster.images.find((img) => img.viewLabel === label) ?? null
      , null) ?? cluster.images[0]

    const fromFilename = detectColourFromFilename(bestImg.filename)
    if (fromFilename) {
      cluster.color = fromFilename
    } else {
      cluster.color = await detectColourFromImage(bestImg.file)
    }

    onProgress({ phase: 'Detecting colours…', done: i + 1, total: clusters.length })
    await new Promise((r) => setTimeout(r, 0))
  }

  onProgress({ phase: 'Done', done: total, total })
  return clusters
}
