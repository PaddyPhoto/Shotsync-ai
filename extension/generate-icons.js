// Generates PNG icons for the ShotSync Chrome extension
// Run: node generate-icons.js
// No dependencies — uses Node.js built-in zlib only

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZES = [16, 48, 128]

// Brand colours
const BG   = [10, 10, 10]       // #0a0a0a
const BLUE = [0, 122, 255]      // #007aff
const WHITE = [245, 245, 247]   // #f5f5f7

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4)

  const cx = size / 2
  const cy = size / 2

  // Dot radius scales with icon size
  const dotR     = size * 0.22
  const outerR   = size * 0.38
  const cornerR  = size * 0.18   // rounded corner radius for bg rect (visual only — PNG is square)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Outer glow ring (subtle)
      const inGlow = dist <= outerR && dist > dotR
      // Inner blue dot
      const inDot = dist <= dotR

      if (inDot) {
        pixels[idx]     = BLUE[0]
        pixels[idx + 1] = BLUE[1]
        pixels[idx + 2] = BLUE[2]
        pixels[idx + 3] = 255
      } else if (inGlow) {
        // Glow fades from dot edge outward
        const t = 1 - (dist - dotR) / (outerR - dotR)
        pixels[idx]     = Math.round(BG[0] + (BLUE[0] - BG[0]) * t * 0.25)
        pixels[idx + 1] = Math.round(BG[1] + (BLUE[1] - BG[1]) * t * 0.25)
        pixels[idx + 2] = Math.round(BG[2] + (BLUE[2] - BG[2]) * t * 0.25)
        pixels[idx + 3] = 255
      } else {
        pixels[idx]     = BG[0]
        pixels[idx + 1] = BG[1]
        pixels[idx + 2] = BG[2]
        pixels[idx + 3] = 255
      }
    }
  }

  return encodePNG(pixels, size, size)
}

// ── Minimal PNG encoder (no dependencies) ─────────────────────────────────────

function encodePNG(pixels, width, height) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // colour type: RGB
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  // Raw image data — prepend filter byte (0 = None) to each row, RGB only
  const raw = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0 // filter byte
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = y * (1 + width * 3) + 1 + x * 3
      raw[dst]     = pixels[src]
      raw[dst + 1] = pixels[src + 1]
      raw[dst + 2] = pixels[src + 2]
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 })

  const chunks = [
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]

  return Buffer.concat([PNG_SIG, ...chunks])
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBytes = Buffer.from(type, 'ascii')
  const crcInput  = Buffer.concat([typeBytes, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([len, typeBytes, data, crc])
}

function crc32(buf) {
  const table = makeCrcTable()
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function makeCrcTable() {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    }
    t[n] = c
  }
  return t
}

// ── Generate ──────────────────────────────────────────────────────────────────

const iconsDir = path.join(__dirname, 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir)

SIZES.forEach(size => {
  const png = generateIcon(size)
  const out = path.join(iconsDir, `icon-${size}.png`)
  fs.writeFileSync(out, png)
  console.log(`✓ icons/icon-${size}.png  (${png.length} bytes)`)
})

console.log('\nDone. Icons saved to extension/icons/')
