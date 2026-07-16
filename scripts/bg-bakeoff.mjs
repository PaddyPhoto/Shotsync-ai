#!/usr/bin/env node
// ── Background-removal bake-off ──────────────────────────────────────────────
// Runs a folder of hard apparel images through each configured provider and
// builds an HTML report that lays the cutouts side-by-side over a switchable
// backdrop (checkerboard / white / black / magenta) so you can judge EDGE
// quality — the thing that decides this (hair, sheer fabric, GM necklines).
//
// Usage:
//   1) drop test images in  bg-bakeoff/input/   (jpg/png — pick your worst cases)
//   2) put keys in .env.local (any subset):
//        PHOTOROOM_API_KEY=…      REPLICATE_API_TOKEN=…   (Bria RMBG 2.0)
//        REMOVE_BG_API_KEY=…      (optional — costs ~$0.20/img)
//   3) node scripts/bg-bakeoff.mjs   [inputDir]
//   4) open bg-bakeoff/output/report.html
//
// Only providers whose key is present are run. Nothing is committed
// (bg-bakeoff/ is gitignored). This is a dev tool, not app runtime.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const IN = process.argv[2] || join(ROOT, 'bg-bakeoff', 'input')
const OUT = join(ROOT, 'bg-bakeoff', 'output')

// ── env (process.env first, then .env.local) ─────────────────────────────────
function loadEnv() {
  const env = { ...process.env }
  const f = join(ROOT, '.env.local')
  if (existsSync(f)) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
  return env
}
const env = loadEnv()

const mime = (ext) => (ext === '.png' ? 'image/png' : 'image/jpeg')

// ── providers (only those with a key run) ────────────────────────────────────
async function photoroom(buf, ext) {
  const fd = new FormData()
  fd.append('image_file', new Blob([buf], { type: mime(ext) }), 'in' + ext)
  const res = await fetch('https://sdk.photoroom.com/v1/segment', {
    method: 'POST',
    headers: { 'x-api-key': env.PHOTOROOM_API_KEY, Accept: 'image/png' },
    body: fd,
  })
  if (!res.ok) throw new Error(`PhotoRoom ${res.status}: ${(await res.text()).slice(0, 140)}`)
  return Buffer.from(await res.arrayBuffer())
}

async function bria(buf, ext) {
  const dataUri = `data:${mime(ext)};base64,${buf.toString('base64')}`
  const res = await fetch('https://api.replicate.com/v1/models/bria-ai/rmbg-2.0/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({ input: { image: dataUri } }),
  })
  let pred = await res.json()
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${JSON.stringify(pred).slice(0, 140)}`)
  // Poll if 'Prefer: wait' didn't return a terminal state.
  for (let i = 0; i < 60 && !['succeeded', 'failed', 'canceled'].includes(pred.status); i++) {
    await new Promise((r) => setTimeout(r, 1000))
    pred = await (await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${env.REPLICATE_API_TOKEN}` } })).json()
  }
  if (pred.status !== 'succeeded') throw new Error(`Bria ${pred.status}: ${pred.error ?? ''}`)
  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output
  return Buffer.from(await (await fetch(url)).arrayBuffer())
}

async function removebg(buf, ext) {
  const fd = new FormData()
  fd.append('image_file', new Blob([buf], { type: mime(ext) }), 'in' + ext)
  fd.append('size', 'auto')
  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': env.REMOVE_BG_API_KEY },
    body: fd,
  })
  if (!res.ok) throw new Error(`remove.bg ${res.status}: ${(await res.text()).slice(0, 140)}`)
  return Buffer.from(await res.arrayBuffer())
}

const PROVIDERS = [
  { id: 'bria', label: 'Bria RMBG 2.0', key: 'REPLICATE_API_TOKEN', run: bria },
  { id: 'photoroom', label: 'PhotoRoom', key: 'PHOTOROOM_API_KEY', run: photoroom },
  { id: 'removebg', label: 'remove.bg', key: 'REMOVE_BG_API_KEY', run: removebg },
].filter((p) => env[p.key])

// ── run ──────────────────────────────────────────────────────────────────────
if (!existsSync(IN)) { mkdirSync(IN, { recursive: true }); }
const images = readdirSync(IN).filter((f) => /\.(jpe?g|png)$/i.test(f))

if (PROVIDERS.length === 0) {
  console.error('No provider keys found. Set PHOTOROOM_API_KEY / REPLICATE_API_TOKEN / REMOVE_BG_API_KEY in .env.local.')
  process.exit(1)
}
if (images.length === 0) {
  console.error(`No images in ${IN}. Drop your hardest apparel shots there (flyaway hair, sheer/lace, GM necklines).`)
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })
console.log(`Providers: ${PROVIDERS.map((p) => p.label).join(', ')}\nImages: ${images.length}\n`)

const rows = []
for (const file of images) {
  const ext = extname(file).toLowerCase()
  const name = basename(file, ext)
  const buf = readFileSync(join(IN, file))
  const cells = []
  for (const p of PROVIDERS) {
    process.stdout.write(`  ${file} → ${p.label} … `)
    const t0 = Date.now()
    try {
      const out = await p.run(buf, ext)
      const outName = `${name}__${p.id}.png`
      writeFileSync(join(OUT, outName), out)
      const ms = Date.now() - t0
      console.log(`ok (${ms} ms, ${(out.length / 1024).toFixed(0)} KB)`)
      cells.push({ label: p.label, src: outName, meta: `${ms} ms · ${(out.length / 1024).toFixed(0)} KB` })
    } catch (e) {
      console.log(`FAIL — ${e.message}`)
      cells.push({ label: p.label, error: e.message })
    }
  }
  rows.push({ name, file, cells })
}

// ── report ────────────────────────────────────────────────────────────────────
const cellHtml = (c) =>
  c.error
    ? `<div class="cell err"><div class="lbl">${c.label}</div><div class="e">${c.error}</div></div>`
    : `<div class="cell"><div class="lbl">${c.label} <span class="meta">${c.meta}</span></div><div class="img"><img src="${c.src}"></div></div>`

const html = `<!doctype html><meta charset="utf8"><title>BG bake-off</title>
<style>
  :root{--sq:18px}
  body{margin:0;background:#111;color:#eee;font:14px -apple-system,sans-serif}
  header{position:sticky;top:0;background:#1a1a1a;padding:12px 20px;display:flex;gap:16px;align-items:center;border-bottom:1px solid #333;z-index:2}
  header b{font-size:16px}
  .bg-btn{background:#2a2a2a;border:1px solid #444;color:#ccc;padding:6px 12px;border-radius:8px;cursor:pointer}
  .bg-btn.on{background:#0a84ff;border-color:#0a84ff;color:#fff}
  .row{padding:16px 20px;border-bottom:1px solid #222}
  .row h3{margin:0 0 10px;font-size:13px;color:#aaa;font-weight:600}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
  .cell{background:#181818;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden}
  .lbl{padding:8px 10px;font-weight:600;font-size:12px;border-bottom:1px solid #2a2a2a;display:flex;justify-content:space-between}
  .meta{color:#777;font-weight:400}
  .img{display:flex;align-items:center;justify-content:center;min-height:300px}
  .img img{max-width:100%;max-height:60vh;display:block}
  .cell.err .e{padding:16px;color:#ff6b6b;font-size:12px}
  .orig .img{background:#000}
  /* backdrop applied to cutouts so edges are visible */
  .stage[data-bg="checker"] .cut .img{background:conic-gradient(#bbb 90deg,#fff 0 180deg,#bbb 0 270deg,#fff 0) 0 0/var(--sq) var(--sq)}
  .stage[data-bg="white"] .cut .img{background:#fff}
  .stage[data-bg="black"] .cut .img{background:#000}
  .stage[data-bg="magenta"] .cut .img{background:#ff00ff}
</style>
<header>
  <b>Background-removal bake-off</b>
  <span style="color:#888">Backdrop:</span>
  ${['checker', 'white', 'black', 'magenta'].map((b, i) => `<button class="bg-btn${i === 0 ? ' on' : ''}" data-bg="${b}">${b}</button>`).join('')}
  <span style="color:#666;margin-left:auto">Judge hair, sheer fabric, GM necklines, straps. magenta backdrop exposes edge halos.</span>
</header>
<div class="stage" data-bg="checker">
${rows.map((r) => `  <div class="row">
    <h3>${r.file}</h3>
    <div class="grid">
      <div class="cell orig"><div class="lbl">original</div><div class="img"><img src="../input/${r.file}"></div></div>
      ${r.cells.map((c) => `<div class="cut">${cellHtml(c)}</div>`).join('\n      ')}
    </div>
  </div>`).join('\n')}
</div>
<script>
  const stage=document.querySelector('.stage')
  for(const b of document.querySelectorAll('.bg-btn')) b.onclick=()=>{
    document.querySelector('.bg-btn.on').classList.remove('on'); b.classList.add('on')
    stage.dataset.bg=b.dataset.bg
  }
</script>`

writeFileSync(join(OUT, 'report.html'), html)
console.log(`\n✓ Report: ${join(OUT, 'report.html')}\n  Open it and use the backdrop switcher (magenta exposes edge halos).`)
