'use client'

import type { ViewLabel } from '@/types'
import type { SessionCluster, SessionImage } from '@/store/session'
import { getCategoryById } from '@/lib/accessories/categories'

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
  // Blacks
  ['black', 'BLACK'], ['blk', 'BLACK'], ['onyx', 'BLACK'], ['jet', 'BLACK'],
  // Whites & off-whites
  ['white', 'WHITE'], ['wht', 'WHITE'], ['optic', 'WHITE'],
  ['ivory', 'IVORY'], ['cream', 'CREAM'], ['crm', 'CREAM'], ['ecru', 'ECRU'],
  ['off-white', 'OFF-WHITE'], ['offwhite', 'OFF-WHITE'],
  // Greys
  ['grey', 'GREY'], ['gray', 'GREY'], ['gry', 'GREY'],
  ['charcoal', 'CHARCOAL'], ['char', 'CHARCOAL'], ['slate', 'SLATE'],
  ['silver', 'SILVER'], ['ash', 'ASH'], ['smoke', 'SMOKE'],
  // Blues
  ['navy', 'NAVY'], ['nvy', 'NAVY'], ['indigo', 'INDIGO'],
  ['blue', 'BLUE'], ['blu', 'BLUE'], ['cobalt', 'COBALT'],
  ['denim', 'DENIM'], ['sky', 'SKY'], ['powder', 'POWDER'],
  ['petrol', 'PETROL'], ['midnight', 'MIDNIGHT'],
  // Greens
  ['green', 'GREEN'], ['grn', 'GREEN'],
  ['sage', 'SAGE'], ['olive', 'OLIVE'], ['khaki', 'KHAKI'],
  ['forest', 'FOREST'], ['moss', 'MOSS'], ['mint', 'MINT'],
  ['hunter', 'HUNTER'], ['emerald', 'EMERALD'], ['basil', 'BASIL'],
  ['teal', 'TEAL'], ['jade', 'JADE'], ['eucalyptus', 'EUCALYPTUS'],
  // Reds & pinks
  ['red', 'RED'], ['cherry', 'CHERRY'], ['scarlet', 'SCARLET'],
  ['burgundy', 'BURGUNDY'], ['burg', 'BURGUNDY'], ['wine', 'WINE'],
  ['merlot', 'MERLOT'], ['maroon', 'MAROON'], ['claret', 'CLARET'],
  ['rust', 'RUST'], ['terracotta', 'TERRACOTTA'], ['terra', 'TERRACOTTA'],
  ['brick', 'BRICK'], ['tomato', 'TOMATO'],
  ['pink', 'PINK'], ['pnk', 'PINK'], ['blush', 'BLUSH'],
  ['rose', 'ROSE'], ['dusty-pink', 'DUSTY PINK'], ['dustypink', 'DUSTY PINK'],
  ['hot-pink', 'HOT PINK'], ['hotpink', 'HOT PINK'], ['fuchsia', 'FUCHSIA'],
  ['magenta', 'MAGENTA'], ['mauve', 'MAUVE'], ['petal', 'PETAL'],
  // Purples
  ['purple', 'PURPLE'], ['purp', 'PURPLE'], ['plum', 'PLUM'],
  ['lavender', 'LAVENDER'], ['lilac', 'LILAC'], ['violet', 'VIOLET'],
  ['grape', 'GRAPE'], ['aubergine', 'AUBERGINE'],
  // Yellows & oranges
  ['yellow', 'YELLOW'], ['ylw', 'YELLOW'], ['lemon', 'LEMON'],
  ['mustard', 'MUSTARD'], ['butter', 'BUTTER'], ['gold', 'GOLD'],
  ['orange', 'ORANGE'], ['org', 'ORANGE'], ['amber', 'AMBER'],
  ['apricot', 'APRICOT'], ['peach', 'PEACH'], ['coral', 'CORAL'],
  ['tangerine', 'TANGERINE'],
  // Neutrals & earth tones
  ['beige', 'BEIGE'], ['bei', 'BEIGE'], ['sand', 'SAND'],
  ['stone', 'STONE'], ['pebble', 'PEBBLE'], ['taupe', 'TAUPE'],
  ['camel', 'CAMEL'], ['tan', 'TAN'], ['nude', 'NUDE'],
  ['latte', 'LATTE'], ['mocha', 'MOCHA'], ['coffee', 'COFFEE'],
  ['brown', 'BROWN'], ['brn', 'BROWN'], ['chocolate', 'CHOCOLATE'],
  ['choc', 'CHOCOLATE'], ['toffee', 'TOFFEE'], ['walnut', 'WALNUT'],
  // Multi / prints
  ['multi', 'MULTI'], ['print', 'PRINT'], ['stripe', 'STRIPE'],
  ['check', 'CHECK'], ['floral', 'FLORAL'], ['leopard', 'LEOPARD'],
  ['animal', 'ANIMAL'], ['camo', 'CAMO'],
  // Nature-inspired fashion colours
  ['cactus', 'CACTUS'], ['salt', 'SALT'], ['snow', 'SNOW'], ['cloud', 'CLOUD'],
  ['dune', 'DUNE'], ['desert', 'DESERT'],
  ['clay', 'CLAY'], ['earth', 'EARTH'], ['bark', 'BARK'],
  ['mist', 'MIST'], ['fog', 'FOG'], ['storm', 'STORM'],
  ['ocean', 'OCEAN'], ['sea', 'SEA'], ['lagoon', 'LAGOON'],
  ['pine', 'PINE'], ['fern', 'FERN'],
  ['berry', 'BERRY'], ['fig', 'FIG'],
  ['honey', 'HONEY'], ['ginger', 'GINGER'], ['spice', 'SPICE'],
  ['shell', 'SHELL'], ['pearl', 'PEARL'], ['bone', 'BONE'],
  ['chalk', 'CHALK'], ['milk', 'MILK'], ['linen', 'LINEN'],
  ['dusk', 'DUSK'], ['dawn', 'DAWN'],
  ['ink', 'INK'], ['coal', 'COAL'], ['graphite', 'GRAPHITE'],
]

export function detectColourFromFilename(filename: string): string | null {
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

// ── Resize image to base64 JPEG for AI API calls ─────────────────────────────
// Resizes to maxSize on the longest edge before encoding — keeps payloads small
// while retaining enough detail for GPT-4o-mini to describe the product.
async function imageToBase64(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width || maxSize, img.height || maxSize))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75).split(',')[1])
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve('') }
    img.src = url
  })
}

// ── Shot angle labels in display order ───────────────────────────────────────
// Separate orders per shoot type so positional fallback never assigns
// still-life-only angles (ghost-mannequin, flat-lay, etc.) to on-model images.
const VIEW_ORDER_ON_MODEL: ViewLabel[]  = ['full-length', 'front', 'side', 'mood', 'detail', 'back', 'front-3/4', 'back-3/4']
const VIEW_ORDER_STILL_LIFE: ViewLabel[] = ['front', 'detail', 'flat-lay', 'top-down', 'side', 'inside', 'back', 'ghost-mannequin']
// Full list used only for within-cluster sort ordering
const VIEW_ORDER_ALL: ViewLabel[] = ['full-length', 'front', 'side', 'mood', 'detail', 'back', 'ghost-mannequin', 'flat-lay', 'top-down', 'inside', 'front-3/4', 'back-3/4']

// ── Angle detection from filename ─────────────────────────────────────────────
// Keywords aligned with step6-angle-detection.ts VIEW_KEYWORDS.
// step6 cannot be imported here directly because it transitively imports
// next/headers (via @/lib/supabase/server), which is server-only.
const VIEW_KEYWORDS: [ViewLabel, string[]][] = [
  ['full-length',     ['full', 'fl', 'fl01', 'fl02', 'fullbody', 'fulllength', 'full-length', 'full_length', 'standing']],
  ['front',           ['front', 'f', 'f01', 'f02', 'f1', 'f2', 'main', 'hero', 'a01']],
  ['side',            ['side', 's', 's01', 's02', 's1', 's2', 'profile', 'alt']],
  ['mood',            ['mood', 'lifestyle', 'editorial', 'styled', 'ambient', 'm01', 'm1']],
  ['detail',          ['detail', 'd', 'd01', 'd02', 'd1', 'd2', 'close', 'zoom']],
  ['back',            ['back', 'b', 'b01', 'b02', 'b1', 'b2', 'rear']],
  ['ghost-mannequin', ['ghost', 'gm', 'gm01', 'gm1', 'mannequin', 'ghostmannequin', 'ghost-mannequin', 'ghost_mannequin']],
  ['flat-lay',        ['flatlay', 'flat-lay', 'flat_lay', 'lay']],
  ['top-down',        ['topdown', 'top-down', 'top_down', 'overhead', 'aerial', 'topa']],
  ['inside',          ['inside', 'interior', 'inner', 'lining', 'open']],
  ['front-3/4',       ['front34', 'front3q', 'f34', 'threequarter', '3q', 'frontquarter']],
  ['back-3/4',        ['back34', 'back3q', 'b34', 'backquarter', 'rearquarter']],
]

function filenameTokens(filename: string): string[] {
  return filename
    .toLowerCase()
    .replace(/\.[^.]+$/, '')   // strip extension
    .split(/[-_.\s]+/)         // split on separators
    .filter(Boolean)
}

function detectAngleFromFilename(filename: string): ViewLabel | null {
  const lower = filename.toLowerCase().replace(/\.[^.]+$/, '')
  const tokens = new Set(filenameTokens(filename))
  for (const [view, kws] of VIEW_KEYWORDS) {
    if (kws.some((kw) => tokens.has(kw) || lower.includes(kw))) return view
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
  shootType: 'on-model' | 'still-life' = 'on-model',
  stillLifeCategory?: string,
  angleSequence?: string[]
): Promise<SessionCluster[]> {
  const total = files.length

  onProgress({ phase: 'Loading files…', done: 0, total })

  // Step 1: Sort files by filename in natural/numeric order — preserves camera roll sequence
  const sorted = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  )

  // Step 2: Create session images with preview URLs and angle labels.
  // Angle detection priority:
  //   1. Filename keyword match (confidence 0.9)
  //   2. Positional assignment (confidence 0.6) — resolved after clustering
  const images: SessionImage[] = sorted.map((file, i) => {
    const detected = detectAngleFromFilename(file.name)
    return {
      id: `img-${i}-${file.name}`,
      file,
      previewUrl: URL.createObjectURL(file),
      filename: file.name,
      seqIndex: i,
      viewLabel: detected ?? 'unknown',
      viewConfidence: detected ? 0.9 : 0.6,
    }
  })

  onProgress({ phase: 'Loading files…', done: total, total })
  await new Promise((r) => setTimeout(r, 0))

  const aiEnabled = process.env.NEXT_PUBLIC_AI_DETECTION === 'true'

  // Step 3: Group images into looks by sequential chunking.
  // Photographers shoot all angles of one product, then move to the next —
  // so splitting the sorted file list into consecutive groups of imagesPerLook
  // is deterministic and matches camera roll order exactly.
  onProgress({ phase: 'Grouping into looks…', done: 0, total: 1 })
  await new Promise((r) => setTimeout(r, 0))

  const sortedGroups: [number, SessionImage[]][] = []
  for (let i = 0; i < images.length; i += imagesPerLook) {
    sortedGroups.push([sortedGroups.length, images.slice(i, i + imagesPerLook)])
  }

  const clusters: SessionCluster[] = []
  for (const [, groupImages] of sortedGroups) {
    const lookNumber = clusters.length + 1

    // Assign positional angles based on the configured shoot sequence.
    // Priority: still-life category angles > brand angleSequence > shoot-type defaults.
    const categoryAngles = stillLifeCategory ? getCategoryById(stillLifeCategory)?.angles : undefined
    const positionalOrder: string[] = categoryAngles
      ?? (shootType === 'on-model' && angleSequence?.length ? angleSequence : null)
      ?? (shootType === 'still-life' ? VIEW_ORDER_STILL_LIFE : VIEW_ORDER_ON_MODEL)

    // Assign positional angles to ALL images in sequence order (ignore filename detection
    // for angle — sequential position is more reliable than keyword guessing)
    groupImages.forEach((img, idx) => {
      img.viewLabel = (positionalOrder[idx % positionalOrder.length] ?? 'front') as ViewLabel
    })

    // Sort within the look by the full VIEW_ORDER_ALL for consistent display
    const orderedChunk = [...groupImages].sort((a, b) => {
      const ai = VIEW_ORDER_ALL.indexOf(a.viewLabel as ViewLabel)
      const bi = VIEW_ORDER_ALL.indexOf(b.viewLabel as ViewLabel)
      const aIdx = ai === -1 ? VIEW_ORDER_ALL.length : ai
      const bIdx = bi === -1 ? VIEW_ORDER_ALL.length : bi
      if (aIdx !== bIdx) return aIdx - bIdx
      return a.seqIndex - b.seqIndex
    })

    clusters.push({
      id: `cluster-${lookNumber}`,
      images: orderedChunk,
      sku: '',
      productName: '',
      color: '',
      colourCode: '',
      styleNumber: '',
      label: shootType === 'still-life' ? `Product ${lookNumber}` : `Look ${lookNumber}`,
      category: stillLifeCategory ?? null,
      confirmed: false,
    })
  }

  // Step 4: Angle correction and colour detection per cluster.
  //
  // AI path (always used when NEXT_PUBLIC_AI_DETECTION=true):
  //   - AI (NEXT_PUBLIC_AI_DETECTION=true): sends front image to GPT-4o for colour name
  //   - Fallback: pixel colour sampling from the front/detail image
  onProgress({ phase: 'Detecting colours…', done: 0, total: clusters.length })

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]

    // AI colour detection — GPT-4o gives precise fashion colour names
    if (aiEnabled) {
      try {
        const frontImg = cluster.images.find((img) => img.viewLabel === 'front') ?? cluster.images[0]
        const base64 = await imageToBase64(frontImg.file)

        const res = await fetch('/api/ai/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: [{ id: frontImg.id, filename: frontImg.filename, base64 }],
            shootType,
            stillLifeCategory: stillLifeCategory ?? undefined,
          }),
        })

        if (res.ok) {
          const { result } = await res.json()
          if (result?.colour) cluster.color = result.colour.toUpperCase()
        }
      } catch { /* fall through */ }
    }

    // Pixel colour fallback if AI didn't set colour
    if (!cluster.color) {
      const preferOrder: ViewLabel[] = ['front', 'detail', 'full-length']
      const bestImg =
        preferOrder.reduce<SessionImage | null>((found, label) =>
          found ?? cluster.images.find((img) => img.viewLabel === label) ?? null
        , null) ?? cluster.images[0]

      const fromFilename = detectColourFromFilename(bestImg.filename)
      cluster.color = fromFilename ?? await detectColourFromImage(bestImg.file)
    }

    onProgress({ phase: 'Detecting colours…', done: i + 1, total: clusters.length })
    await new Promise((r) => setTimeout(r, 0))
  }

  onProgress({ phase: 'Done', done: total, total })
  return clusters
}
