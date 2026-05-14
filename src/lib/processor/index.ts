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

// ── SKU-based cluster boundary detection ─────────────────────────────────────
// Extracts the "group key" from a filename by stripping trailing index numbers
// and view keywords. Files sharing the same key belong to the same SKU cluster.
//   "BRAND_SKU001_NAVY_01.jpg"  →  "brand_sku001_navy"
//   "ABC123_FRONT.jpg"          →  "abc123"
//   "IMG_0042.jpg"              →  null (too generic)

const GROUP_KEY_VIEW_TOKENS = new Set([
  'front','back','side','detail','mood','full','fl','gm','ghost','flatlay','flat',
  'topdown','top','inside','f','b','s','d','m',
  'f01','f02','f1','f2','b01','b02','b1','b2','s01','s02','d01','d02','m01','m1',
  'fl01','fl02','gm01','gm1','a01','a02','hero','main',
])

function extractGroupKey(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, '').toLowerCase()
  const parts = base.split(/[-_.\s]+/).filter(Boolean)
  if (parts.length <= 1) return null

  // Walk from the end, trimming trailing index numbers (≤4 digits) and view tokens
  let end = parts.length
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d{1,4}$/.test(parts[i]) || GROUP_KEY_VIEW_TOKENS.has(parts[i])) {
      end = i
    } else {
      break
    }
  }

  const key = parts.slice(0, end).join('_')
  return key.length >= 3 ? key : null
}

// Groups images by filename key, falling back to fixed-size chunking when
// filenames don't carry a reliable SKU signal (e.g. generic camera roll names).
function groupImagesByFilename(images: SessionImage[], imagesPerLook: number): SessionImage[][] {
  const keys = images.map((img) => extractGroupKey(img.filename))
  const meaningful = keys.filter((k): k is string => k !== null)
  const uniqueKeys = new Set(meaningful)
  const expectedGroups = Math.ceil(images.length / imagesPerLook)

  // Only use key-based grouping when the filename keys are varied and meaningful.
  // Too few unique keys = generic names like "IMG_XXXX". Too many = all unique (no structure).
  const keysAreUseful =
    meaningful.length >= images.length * 0.8 &&
    uniqueKeys.size >= Math.max(2, expectedGroups * 0.4) &&
    uniqueKeys.size <= expectedGroups * 4

  if (!keysAreUseful) {
    // Fixed-size chunking fallback — preserves existing behaviour
    const groups: SessionImage[][] = []
    for (let i = 0; i < images.length; i += imagesPerLook) {
      groups.push(images.slice(i, i + imagesPerLook))
    }
    return groups
  }

  // Key-changed boundary detection: start a new cluster whenever the group key changes
  const groups: SessionImage[][] = []
  let current: SessionImage[] = []
  let currentKey: string | null = null

  for (let i = 0; i < images.length; i++) {
    const key = keys[i]
    if (current.length > 0 && key !== null && key !== currentKey) {
      groups.push(current)
      current = []
    }
    current.push(images[i])
    if (current.length === 1) currentKey = key
  }
  if (current.length > 0) groups.push(current)
  return groups
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

// ── Thumbnail generator ───────────────────────────────────────────────────────
// Creates a compressed JPEG thumbnail (max 420px on longest edge) from a File.
// Used for previews so the browser never decodes full-res images into GPU memory.
// The original File is preserved on SessionImage for full-quality export.
async function createThumbnail(file: File, maxPx = 420): Promise<string> {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file)
    const img = new window.Image()
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('load')) }
    img.onload = () => {
      URL.revokeObjectURL(src)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('toBlob')),
        'image/jpeg', 0.72
      )
    }
    img.src = src
  })
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

  // Step 2: Create session images. previewUrl starts empty — thumbnails generated next.
  const images: SessionImage[] = sorted.map((file, i) => {
    const detected = detectAngleFromFilename(file.name)
    return {
      id: `img-${i}-${file.name}`,
      file,
      previewUrl: '',
      filename: file.name,
      seqIndex: i,
      viewLabel: detected ?? 'unknown',
      viewConfidence: detected ? 0.9 : 0.6,
    }
  })

  // Step 2b: Generate compressed thumbnails in small batches.
  // Each thumbnail is ~30-60KB vs 10-25MB for the source file, preventing the
  // browser from decoding hundreds of full-res images into GPU memory at once.
  // Concurrency is capped low for large files — a 15MB JPEG decompresses to
  // ~150-200MB in RAM, so 8 concurrent would spike to 1.5GB+ and freeze the tab.
  const avgSizeBytes = files.reduce((s, f) => s + f.size, 0) / (files.length || 1)
  const THUMB_CONCURRENCY = avgSizeBytes > 8 * 1024 * 1024 ? 2 : avgSizeBytes > 4 * 1024 * 1024 ? 4 : 8
  let thumbDone = 0
  onProgress({ phase: 'Generating previews…', done: 0, total })
  for (let i = 0; i < images.length; i += THUMB_CONCURRENCY) {
    await Promise.all(
      images.slice(i, i + THUMB_CONCURRENCY).map(async (img) => {
        try {
          img.previewUrl = await createThumbnail(img.file)
        } catch {
          img.previewUrl = URL.createObjectURL(img.file) // full-res fallback
        }
        thumbDone++
        onProgress({ phase: 'Generating previews…', done: thumbDone, total })
      })
    )
    await new Promise((r) => setTimeout(r, 0)) // yield to keep UI responsive
  }

  // Step 3: Group images into looks.
  // Primary strategy: detect SKU boundaries from filename prefixes (e.g. "BRAND_SKU001_NAVY_01.jpg").
  // When filenames carry a consistent SKU key, a cluster ends wherever the key changes —
  // this correctly handles looks with fewer shots than imagesPerLook without cascading errors.
  // Fallback: fixed-size chunking (original behaviour) when filenames give no structural signal.
  onProgress({ phase: 'Grouping into looks…', done: 0, total: 1 })
  await new Promise((r) => setTimeout(r, 0))

  const sortedGroups: [number, SessionImage[]][] = []
  for (const group of groupImagesByFilename(images, imagesPerLook)) {
    sortedGroups.push([sortedGroups.length, group])
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
      garmentCategory: null,
      isBottomwear: false,
      confirmed: false,
      exported: false,
    })
  }

  // Colour is left blank — populated from style list import on the review page.
  onProgress({ phase: 'Done', done: total, total })
  return clusters
}
