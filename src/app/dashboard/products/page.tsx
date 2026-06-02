'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/context/BrandContext'
import type { ImportRow } from '@/lib/products/upsert'

const CHANNELS = [
  { key: 'shopify', label: 'Shopify',     dot: '#30d158' },
  { key: 'cin7',    label: 'Cin7',        dot: '#ff9f0a' },
  { key: 'iconic',  label: 'The Iconic',  dot: '#ff9f0a' },
  { key: 'myer',    label: 'Myer',        dot: '#ff3b30' },
  { key: 'dj',      label: 'David Jones', dot: '#0a84ff' },
  { key: 'joor',    label: 'JOOR',        dot: '#bf5af2' },
]

type ProductImage = { storage_url: string | null; angle: string; sort_order: number }

type Listing = {
  id: string
  colour_name: string
  colour_code: string | null
  product_variants: { stock: number }[]
  channel_listings: { channel: string; status: string }[]
  product_images: ProductImage[]
}

type Product = {
  id: string
  sku: string
  title: string
  category: string | null
  gender: string | null
  status: string
  product_listings: Listing[]
}

type ImportResult = { created: number; updated: number; errors: string[]; total: number; fetched?: number }
type ImportSource = 'csv' | 'shopify' | 'cin7'

function getHeroImage(product: Product): string | null {
  for (const cw of product.product_listings) {
    const imgs = [...(cw.product_images ?? [])].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
    const front = imgs.find(i => /front/i.test(i.angle ?? ''))
    const img = front ?? imgs[0]
    if (img?.storage_url) return img.storage_url
  }
  return null
}

// ── CSV parser ────────────────────────────────────────────────────────────────
async function parseCsvToRows(file: File): Promise<ImportRow[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]

  let headerIdx = -1
  let skuCol = -1, titleCol = -1, categoryCol = -1, genderCol = -1, seasonCol = -1
  let colourCol = -1, hexCol = -1, rrpCol = -1, sizesCol = -1
  let compositionCol = -1, careCol = -1, fitCol = -1, originCol = -1

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map((c) => String(c).toUpperCase().trim())
    const skuI = row.findIndex((c) => c === 'SKU' || c.includes('STYLE CODE') || c === 'STYLE')
    if (skuI !== -1) {
      headerIdx = i
      skuCol = skuI
      titleCol = row.findIndex((c) => c.includes('TITLE') || c.includes('PRODUCT NAME') || c.includes('STYLE NAME') || c.includes('NAME'))
      categoryCol = row.findIndex((c) => c === 'CATEGORY' || c.includes('PRODUCT TYPE'))
      genderCol = row.findIndex((c) => c === 'GENDER' || c.includes('DEPARTMENT'))
      seasonCol = row.findIndex((c) => c.includes('SEASON') || c.includes('COLLECTION'))
      colourCol = row.findIndex((c) => c === 'COLOURWAY' || c === 'COLOUR' || c === 'COLOR' || (c.includes('COLOUR') && !c.includes('HEX') && !c.includes('CODE')))
      hexCol = row.findIndex((c) => c.includes('HEX') || c.includes('COLOUR CODE') || c.includes('COLOR CODE'))
      rrpCol = row.findIndex((c) => c === 'RRP' || c === 'PRICE' || c.includes('RETAIL PRICE'))
      sizesCol = row.findIndex((c) => c === 'SIZES' || c.includes('SIZE RANGE') || c.includes('AVAILABLE SIZES'))
      compositionCol = row.findIndex((c) => c.includes('COMPOSITION') || c.includes('MATERIAL') || c.includes('FABRIC') || c.includes('CONTENT'))
      careCol = row.findIndex((c) => c.includes('CARE') || c.includes('WASH'))
      fitCol = row.findIndex((c) => c === 'FIT' || c.includes('FIT TYPE'))
      originCol = row.findIndex((c) => c.includes('ORIGIN') || c.includes('COUNTRY') || c.includes('MADE IN'))
      break
    }
  }

  if (headerIdx === -1 || skuCol === -1) throw new Error('Could not find SKU column. Check your file has a SKU or Style Code header.')

  const out: ImportRow[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const sku = String(row[skuCol] ?? '').trim().toUpperCase()
    if (!sku) continue
    const title = titleCol >= 0 ? String(row[titleCol] ?? '').trim() : sku
    if (!title) continue
    const colour = colourCol >= 0 ? String(row[colourCol] ?? '').trim() : 'Default'
    out.push({
      sku,
      title,
      category:    categoryCol >= 0    ? String(row[categoryCol] ?? '').trim()    || undefined : undefined,
      gender:      genderCol >= 0      ? String(row[genderCol] ?? '').trim()      || undefined : undefined,
      season:      seasonCol >= 0      ? String(row[seasonCol] ?? '').trim()      || undefined : undefined,
      colourway:   colour || 'Default',
      colour_hex:  hexCol >= 0         ? String(row[hexCol] ?? '').trim()         || undefined : undefined,
      rrp:         rrpCol >= 0         ? String(row[rrpCol] ?? '').trim()         || undefined : undefined,
      sizes:       sizesCol >= 0       ? String(row[sizesCol] ?? '').trim()       || undefined : undefined,
      composition: compositionCol >= 0 ? String(row[compositionCol] ?? '').trim() || undefined : undefined,
      care:        careCol >= 0        ? String(row[careCol] ?? '').trim()        || undefined : undefined,
      fit:         fitCol >= 0         ? String(row[fitCol] ?? '').trim()         || undefined : undefined,
      origin:      originCol >= 0      ? String(row[originCol] ?? '').trim()      || undefined : undefined,
    })
  }
  return out
}

// ── Import modal ──────────────────────────────────────────────────────────────
function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { activeBrand } = useBrand()
  const [source, setSource] = useState<ImportSource>('csv')
  const [csvRows, setCsvRows] = useState<ImportRow[] | null>(null)
  const [csvFilename, setCsvFilename] = useState('')
  const [csvError, setCsvError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasShopify = !!activeBrand?.shopify_store_url
  const hasCin7    = !!activeBrand?.cin7_account_id

  const runImport = useCallback(async (endpoint: string, body?: object) => {
    setImporting(true)
    setResult(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) throw new Error('Not signed in')
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body ?? {}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}`)
      setResult(json)
    } catch (e) {
      setResult({ created: 0, updated: 0, errors: [e instanceof Error ? e.message : String(e)], total: 0 })
    } finally {
      setImporting(false)
    }
  }, [])

  const handleFile = async (file: File) => {
    setCsvError('')
    setCsvRows(null)
    setCsvFilename(file.name)
    try {
      const rows = await parseCsvToRows(file)
      if (!rows.length) throw new Error('No valid rows found in the file.')
      setCsvRows(rows)
    } catch (e) {
      setCsvError(e instanceof Error ? e.message : 'Failed to parse file.')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const sources: { key: ImportSource; label: string; available: boolean; note?: string }[] = [
    { key: 'csv',     label: 'CSV / Excel', available: true },
    { key: 'shopify', label: 'Shopify',     available: hasShopify, note: hasShopify ? undefined : 'Not connected' },
    { key: 'cin7',    label: 'Cin7',        available: hasCin7,    note: hasCin7    ? undefined : 'Not connected' },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '16px', width: '500px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.3px' }}>Import products</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>Existing products are updated, new ones are created</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', padding: '14px 20px 0' }}>
          {sources.map(({ key, label, available, note }) => (
            <button
              key={key}
              onClick={() => { if (available) { setSource(key); setResult(null) } }}
              style={{
                padding: '6px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: available ? 'pointer' : 'default',
                background: source === key ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: source === key ? 'var(--text)' : available ? 'var(--text3)' : 'rgba(255,255,255,0.2)',
              }}
            >
              {label}
              {note && <span style={{ fontSize: '10px', marginLeft: '5px', opacity: 0.5 }}>{note}</span>}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px' }}>
          {source === 'csv' && !result && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `1.5px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer',
                  background: isDragging ? 'rgba(232,217,122,0.04)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                {csvRows ? (
                  <>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>{csvRows.length}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '4px' }}>rows parsed from <span style={{ color: 'var(--text2)' }}>{csvFilename}</span></div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>{new Set(csvRows.map(r => r.sku)).size} unique SKUs · click to change file</div>
                  </>
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: '10px' }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                    <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '4px' }}>Drop your CSV or Excel file here</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Needs a SKU column. Detects title, colourway, RRP, sizes, composition, care automatically.</div>
                  </>
                )}
              </div>
              {csvError && <p style={{ fontSize: '12px', color: '#ff453a', marginTop: '10px' }}>{csvError}</p>}
              {csvRows && (
                <button
                  onClick={() => runImport('/api/products/import', csvRows)}
                  disabled={importing}
                  style={{ width: '100%', marginTop: '14px', padding: '10px', borderRadius: '9px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}
                >
                  {importing ? 'Importing…' : `Import ${new Set(csvRows.map(r => r.sku)).size} products`}
                </button>
              )}
            </>
          )}

          {source === 'shopify' && !result && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(48,209,88,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>Import from {activeBrand?.shopify_store_url}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '20px', lineHeight: 1.5 }}>
                Pulls all products from your Shopify store.<br/>SKUs, titles, colourways, sizes and RRP are mapped automatically.
              </div>
              <button onClick={() => runImport('/api/products/import/shopify')} disabled={importing} style={{ padding: '10px 28px', borderRadius: '9px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}>
                {importing ? 'Importing from Shopify…' : 'Import from Shopify'}
              </button>
            </div>
          )}

          {source === 'cin7' && !result && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(10,132,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4da3ff" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>Import from Cin7</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '20px', lineHeight: 1.5 }}>
                Pulls all products from your Cin7 Core account.<br/>SKU, title, category, colourway, RRP and attributes are mapped automatically.
              </div>
              <button onClick={() => runImport('/api/products/import/cin7')} disabled={importing} style={{ padding: '10px 28px', borderRadius: '9px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}>
                {importing ? 'Importing from Cin7…' : 'Import from Cin7'}
              </button>
            </div>
          )}

          {result && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              {result.errors.length > 0 && result.created === 0 && result.updated === 0 ? (
                <>
                  <div style={{ fontSize: '13px', color: '#ff453a', marginBottom: '12px', fontWeight: 500 }}>Import failed</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', background: 'rgba(255,69,58,0.08)', borderRadius: '8px', padding: '10px 12px', textAlign: 'left' }}>{result.errors[0]}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-1px', color: 'var(--text)', lineHeight: 1 }}>{result.created + result.updated}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '4px' }}>
                    {result.created > 0 && <span style={{ color: '#30d158' }}>{result.created} created</span>}
                    {result.created > 0 && result.updated > 0 && <span style={{ color: 'var(--text3)' }}> · </span>}
                    {result.updated > 0 && <span style={{ color: 'var(--text2)' }}>{result.updated} updated</span>}
                  </div>
                  {result.fetched && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{result.fetched} fetched from source</div>}
                  {result.errors.length > 0 && <div style={{ fontSize: '11px', color: '#ff9f0a', marginTop: '8px' }}>{result.errors.length} rows had errors</div>}
                </>
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
                <button onClick={() => { setResult(null); setCsvRows(null); setCsvFilename('') }} style={{ padding: '8px 18px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border)', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer' }}>Import more</button>
                <button onClick={() => { onDone(); onClose() }} style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  const heroImage = getHeroImage(product)
  const totalStock = product.product_listings.reduce(
    (sum, cw) => sum + cw.product_variants.reduce((s, v) => s + (v.stock ?? 0), 0), 0
  )
  const channelMap: Record<string, string> = {}
  product.product_listings.forEach(cw => {
    cw.channel_listings.forEach(cl => {
      if (!channelMap[cl.channel] || cl.status === 'live') channelMap[cl.channel] = cl.status
    })
  })
  const liveChannels = CHANNELS.filter(ch => channelMap[ch.key] === 'live')

  return (
    <Link href={`/dashboard/products/${product.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
      >
        {/* Image */}
        <div style={{ aspectRatio: '3/4', background: 'rgba(255,255,255,0.03)', position: 'relative', overflow: 'hidden' }}>
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" width="32" height="32" style={{ opacity: 0.1 }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.1)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>No images</span>
            </div>
          )}

          {/* Live channel dots — top right overlay */}
          {liveChannels.length > 0 && (
            <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '3px', padding: '4px 6px', background: 'rgba(0,0,0,0.45)', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>
              {liveChannels.map(ch => (
                <div key={ch.key} style={{ width: '6px', height: '6px', borderRadius: '50%', background: ch.dot, flexShrink: 0 }} />
              ))}
            </div>
          )}

          {/* Out of stock badge */}
          {totalStock === 0 && product.product_listings.length > 0 && (
            <div style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#ff3b30', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px', backdropFilter: 'blur(4px)', letterSpacing: '0.04em' }}>
              OOS
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '11px 12px 13px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
            {product.title}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '9px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'monospace', letterSpacing: '0.02em' }}>{product.sku}</span>
            {product.product_listings.slice(0, 6).map(cw => (
              <div
                key={cw.id}
                title={cw.colour_name}
                style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: cw.colour_code?.startsWith('#') ? cw.colour_code : 'rgba(255,255,255,0.25)',
                  border: '0.5px solid rgba(255,255,255,0.15)',
                }}
              />
            ))}
            {product.product_listings.length > 6 && (
              <span style={{ fontSize: '10px', color: 'var(--text3)' }}>+{product.product_listings.length - 6}</span>
            )}
          </div>

          {/* Channel publish state */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {CHANNELS.map(ch => {
              const status = channelMap[ch.key]
              return (
                <div
                  key={ch.key}
                  title={`${ch.label}: ${status ?? 'not listed'}`}
                  style={{
                    width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                    background: status === 'live' ? ch.dot : 'transparent',
                    border: status === 'draft' ? `1.5px solid ${ch.dot}` : status === 'live' ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Products page ─────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [showImport, setShowImport] = useState(false)

  const loadProducts = useCallback(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch('/api/products', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  const filtered = products.filter(p => {
    const matchesSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'All') return true
    if (filter === 'Published') return p.product_listings.some(cw => cw.channel_listings.some(cl => cl.status === 'live'))
    if (filter === 'Draft') return p.status === 'draft' || p.product_listings.every(cw => cw.channel_listings.length === 0)
    return true
  })

  const publishedCount = products.filter(p => p.product_listings.some(cw => cw.channel_listings.some(cl => cl.status === 'live'))).length
  const draftCount = products.filter(p => p.status === 'draft' || p.product_listings.every(cw => cw.channel_listings.length === 0)).length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar
        breadcrumbs={[{ label: 'Products' }]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowImport(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border)', color: 'var(--text2)', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12"><path d="M8 11V3M4 7l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 13h12" strokeLinecap="round"/></svg>
              Import
            </button>
            <Link
              href="/dashboard/products/new"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', color: '#fff', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>
              New product
            </Link>
          </div>
        }
      />

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onDone={() => { setLoading(true); loadProducts() }} />
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: 'var(--bg)' }}>

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: '2px' }}>Products</h1>
          <p style={{ fontSize: '13px', color: 'var(--text3)' }}>Create once. Publish everywhere. Delist everywhere.</p>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
          {[
            { label: 'All', count: products.length },
            { label: 'Published', count: publishedCount },
            { label: 'Draft', count: draftCount },
          ].map(({ label, count }) => (
            <button
              key={label}
              onClick={() => setFilter(label)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '7px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: filter === label ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: filter === label ? 'var(--text)' : 'var(--text3)',
              }}
            >
              {label}
              <span style={{ fontSize: '11px', color: filter === label ? 'var(--text3)' : 'rgba(255,255,255,0.2)', fontVariantNumeric: 'tabular-nums' }}>
                {count}
              </span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none', opacity: 0.5 }}>
              <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search SKU or title…"
              style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '7px 12px 7px 30px', fontSize: '13px', color: 'var(--text)', outline: 'none', width: '200px' }}
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', opacity: 0.5 }}>
                <div style={{ aspectRatio: '3/4', background: 'rgba(255,255,255,0.03)' }} />
                <div style={{ padding: '11px 12px 13px' }}>
                  <div style={{ height: '13px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '8px', width: '70%' }} />
                  <div style={{ height: '11px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
            {products.length === 0 ? (
              <>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="28" height="28" style={{ opacity: 0.3 }}>
                    <rect x="2" y="3" width="8" height="11" rx="1.5"/><rect x="14" y="3" width="8" height="7" rx="1.5"/><rect x="2" y="17" width="8" height="4" rx="1.5"/><rect x="14" y="13" width="8" height="8" rx="1.5"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>No products yet</p>
                  <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '20px' }}>Import from Shopify, Cin7 or a CSV — or add manually.</p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button onClick={() => setShowImport(true)} style={{ padding: '8px 18px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border)', color: 'var(--text2)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                      Import products
                    </button>
                    <Link href="/dashboard/products/new" style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                      + New product
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text3)' }}>No products match your search.</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

      </div>
    </div>
  )
}
