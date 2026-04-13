'use client'

import type { ViewLabel } from '@/types'
import type { SessionCluster, SessionImage } from '@/store/session'
import { getCategoryById } from '@/lib/accessories/categories'

// ── Colour keyword map (used by review page style list auto-match) ────────────
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

// ── AI boundary detection for variable-size still-life clusters ───────────────

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

/**
 * Detects product boundaries in a sorted list of files by comparing consecutive
 * image pairs via GPT-4o. Returns an array of cluster sizes, e.g. [5, 5, 2, 2, 2].
 * Falls back to null if the API is unavailable or all calls fail.
 */
export async function detectBoundaries(
  files: File[],
  onProgress: (p: ProcessProgress) => void
): Promise<number[] | null> {
  if (files.length < 2) return null

  onProgress({ phase: 'Detecting product boundaries…', done: 0, total: files.length - 1 })

  const CONCURRENCY = 6
  const boundaries: boolean[] = new Array(files.length - 1).fill(false)
  let done = 0
  let anySuccess = false

  // Process all consecutive pairs in parallel batches
  for (let i = 0; i < files.length - 1; i += CONCURRENCY) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, files.length - 1 - i) }, (_, k) => i + k)
    await Promise.all(batch.map(async (idx) => {
      try {
        const [b64A, b64B] = await Promise.all([
          fileToBase64(files[idx]),
          fileToBase64(files[idx + 1]),
        ])
        const res = await fetch('/api/ai/detect-boundary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageA: { base64: b64A, filename: files[idx].name },
            imageB: { base64: b64B, filename: files[idx + 1].name },
          }),
        })
        if (res.ok) {
          const { isBoundary } = await res.json()
          boundaries[idx] = isBoundary
          anySuccess = true
        }
      } catch { /* skip — boundary stays false */ }
      done++
      onProgress({ phase: 'Detecting product boundaries…', done, total: files.length - 1 })
    }))
  }

  if (!anySuccess) return null

  // Convert boundary flags into cluster sizes
  const sizes: number[] = []
  let current = 1
  for (let i = 0; i < boundaries.length; i++) {
    if (boundaries[i]) {
      sizes.push(current)
      current = 1
    } else {
      current++
    }
  }
  sizes.push(current)
  return sizes
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
  angleSequence?: string[],
  clusterSizes?: number[]   // AI-detected variable sizes; falls back to fixed imagesPerLook
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

  // Step 3: Group images into looks by sequential chunking.
  // Photographers shoot all angles of one product, then move to the next —
  // so splitting the sorted file list into consecutive groups of imagesPerLook
  // is deterministic and matches camera roll order exactly.
  onProgress({ phase: 'Grouping into looks…', done: 0, total: 1 })
  await new Promise((r) => setTimeout(r, 0))

  const sortedGroups: [number, SessionImage[]][] = []
  if (clusterSizes?.length) {
    // Variable-size clustering from AI boundary detection
    let offset = 0
    for (const size of clusterSizes) {
      if (offset >= images.length) break
      sortedGroups.push([sortedGroups.length, images.slice(offset, offset + size)])
      offset += size
    }
    // Append any remaining images as a final cluster
    if (offset < images.length) {
      sortedGroups.push([sortedGroups.length, images.slice(offset)])
    }
  } else {
    // Fixed-size chunking (default)
    for (let i = 0; i < images.length; i += imagesPerLook) {
      sortedGroups.push([sortedGroups.length, images.slice(i, i + imagesPerLook)])
    }
  }

  const clusters: SessionCluster[] = []
  for (const [, groupImages] of sortedGroups) {
    const lookNumber = clusters.length + 1

    // Assign positional angles based on the configured shoot sequence.
    // Priority: still-life category angles > brand angleSequence > shoot-type defaults.
    const categoryAngles = stillLifeCategory ? getCategoryById(stillLifeCategory)?.angles : undefined
    const positionalOrder: string[] =
      (angleSequence?.length ? angleSequence : null)   // brand custom sequence always wins
      ?? categoryAngles                                  // category default
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

  // Colour is left blank — populated from style list import on the review page.
  onProgress({ phase: 'Done', done: total, total })
  return clusters
}
