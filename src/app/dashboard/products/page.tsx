'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/context/BrandContext'
import type { ImportRow } from '@/lib/products/upsert'

const CHANNELS = [
  { key: 'shopify', label: 'Shopify',     dot: '#30d158' },
  { key: 'iconic',  label: 'The Iconic',  dot: '#ff9f0a' },
  { key: 'myer',    label: 'Myer',        dot: '#ff3b30' },
  { key: 'dj',      label: 'David Jones', dot: '#0a84ff' },
  { key: 'joor',    label: 'JOOR',        dot: '#bf5af2' },
]

type Colourway = {
  id: string
  colour_name: string
  colour_code: string | null
  product_variants: { stock: number }[]
  channel_listings: { channel: string; status: string }[]
}

type Product = {
  id: string
  sku: string
  title: string
  category: string | null
  gender: string | null
  status: string
  product_colourways: Colourway[]
}

type ImportResult = { created: number; updated: number; errors: string[]; total: number; fetched?: number }
type ImportSource = 'csv' | 'shopify' | 'cin7'

// ── CSV parser ────────────────────────────────────────────────────────────────
async function parseCsvToRows(file: File): Promise<ImportRow[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]

  let headerIdx = -1
  let skuCol = -1, titleCol = -1, categoryCol = -1, genderCol = -1, seasonCol = -1
  let colourwayCol = -1, hexCol = -1, rrpCol = -1, sizesCol = -1
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
      colourwayCol = row.findIndex((c) => c === 'COLOURWAY' || c === 'COLOUR' || c === 'COLOR' || (c.includes('COLOUR') && !c.includes('HEX') && !c.includes('CODE')))
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
    const colourway = colourwayCol >= 0 ? String(row[colourwayCol] ?? '').trim() : 'Default'
    out.push({
      sku,
      title,
      category:    categoryCol >= 0    ? String(row[categoryCol] ?? '').trim()    || undefined : undefined,
      gender:      genderCol >= 0      ? String(row[genderCol] ?? '').trim()      || undefined : undefined,
      season:      seasonCol >= 0      ? String(row[seasonCol] ?? '').trim()      || undefined : undefined,
      colourway:   colourway || 'Default',
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.3px' }}>Import products</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>Existing products are updated, new ones are created</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
          </button>
        </div>

        {/* Source tabs */}
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

        {/* Content */}
        <div style={{ padding: '20px' }}>

          {/* ── CSV ── */}
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

          {/* ── Shopify ── */}
          {source === 'shopify' && !result && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(48,209,88,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>Import from {activeBrand?.shopify_store_url}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '20px', lineHeight: 1.5 }}>
                Pulls all products from your Shopify store.<br/>SKUs, titles, colourways, sizes and RRP are mapped automatically.
              </div>
              <button
                onClick={() => runImport('/api/products/import/shopify')}
                disabled={importing}
                style={{ padding: '10px 28px', borderRadius: '9px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}
              >
                {importing ? 'Importing from Shopify…' : 'Import from Shopify'}
              </button>
            </div>
          )}

          {/* ── Cin7 ── */}
          {source === 'cin7' && !result && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(10,132,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4da3ff" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>Import from Cin7</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '20px', lineHeight: 1.5 }}>
                Pulls all products from your Cin7 Core account.<br/>SKU, title, category, colourway, RRP and attributes are mapped automatically.
              </div>
              <button
                onClick={() => runImport('/api/products/import/cin7')}
                disabled={importing}
                style={{ padding: '10px 28px', borderRadius: '9px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}
              >
                {importing ? 'Importing from Cin7…' : 'Import from Cin7'}
              </button>
            </div>
          )}

          {/* ── Result ── */}
          {result && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              {result.errors.length > 0 && result.created === 0 && result.updated === 0 ? (
                <>
                  <div style={{ fontSize: '13px', color: '#ff453a', marginBottom: '12px', fontWeight: 500 }}>Import failed</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', background: 'rgba(255,69,58,0.08)', borderRadius: '8px', padding: '10px 12px', textAlign: 'left' }}>
                    {result.errors[0]}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-1px', color: 'var(--text)', lineHeight: 1 }}>
                    {result.created + result.updated}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '4px' }}>
                    {result.created > 0 && <span style={{ color: '#30d158' }}>{result.created} created</span>}
                    {result.created > 0 && result.updated > 0 && <span style={{ color: 'var(--text3)' }}> · </span>}
                    {result.updated > 0 && <span style={{ color: 'var(--text2)' }}>{result.updated} updated</span>}
                  </div>
                  {result.fetched && (
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{result.fetched} products fetched from source</div>
                  )}
                  {result.errors.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#ff9f0a', marginTop: '8px' }}>{result.errors.length} rows had errors — check SKUs are valid</div>
                  )}
                </>
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  onClick={() => { setResult(null); setCsvRows(null); setCsvFilename('') }}
                  style={{ padding: '8px 18px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border)', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer' }}
                >
                  Import more
                </button>
                <button
                  onClick={() => { onDone(); onClose() }}
                  style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
    if (filter === 'Published') return p.product_colourways.some(cw => cw.channel_listings.some(cl => cl.status === 'live'))
    if (filter === 'Draft') return p.status === 'draft'
    return true
  })

  const totalLiveShopify = products.filter(p => p.product_colourways.some(cw => cw.channel_listings.some(cl => cl.channel === 'shopify' && cl.status === 'live'))).length
  const totalLiveIconic  = products.filter(p => p.product_colourways.some(cw => cw.channel_listings.some(cl => cl.channel === 'iconic'  && cl.status === 'live'))).length
  const totalUnpublished = products.filter(p => p.product_colourways.every(cw => cw.channel_listings.length === 0)).length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar breadcrumbs={[{ label: 'Products' }]} />

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { setLoading(true); loadProducts() }}
        />
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: 'var(--bg)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: '4px' }}>Products</h1>
            <p style={{ fontSize: '13px', color: 'var(--text3)' }}>Create listings once. Publish to every channel from here.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowImport(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border)', color: 'var(--text2)', padding: '9px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 500, letterSpacing: '-0.2px', cursor: 'pointer' }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M8 11V3M4 7l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 13h12" strokeLinecap="round"/></svg>
              Import
            </button>
            <Link
              href="/dashboard/products/new"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--accent)', color: '#fff', padding: '9px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 500, letterSpacing: '-0.2px', textDecoration: 'none' }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>
              New product
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total products',  value: String(products.length),   sub: `${new Set(products.map(p => p.sku.split('-')[0])).size} styles` },
            { label: 'Live on Shopify', value: String(totalLiveShopify),   sub: `${products.length - totalLiveShopify} not listed` },
            { label: 'Live on Iconic',  value: String(totalLiveIconic),    sub: `${products.length - totalLiveIconic} not listed` },
            { label: 'Unpublished',     value: String(totalUnpublished),   sub: 'No channel listings yet' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-1px', color: 'var(--text)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
          {['All', 'Published', 'Draft'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '5px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: filter === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: filter === tab ? 'var(--text)' : 'var(--text3)',
              }}
            >{tab}</button>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by SKU or title…"
              style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: 'var(--text)', outline: 'none', width: '220px' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 120px 80px 80px 80px 200px 80px', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', alignItems: 'center' }}>
            <div />
            {['Product', 'SKU', 'Colourways', 'Stock', 'Status', 'Channels', ''].map((h) => (
              <div key={h} style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text3)', fontSize: '14px', marginBottom: '12px' }}>
                {products.length === 0 ? 'No products yet.' : 'No products match your search.'}
              </p>
              {products.length === 0 && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={() => setShowImport(true)} style={{ fontSize: '13px', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Import products
                  </button>
                  <span style={{ color: 'var(--text3)', fontSize: '13px' }}>or</span>
                  <Link href="/dashboard/products/new" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}>
                    Add your first product →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            filtered.map((p, idx) => {
              const totalStock = p.product_colourways.reduce((sum, cw) => sum + cw.product_variants.reduce((s, v) => s + (v.stock ?? 0), 0), 0)
              const channelMap: Record<string, string> = {}
              p.product_colourways.forEach(cw => {
                cw.channel_listings.forEach(cl => {
                  if (!channelMap[cl.channel] || cl.status === 'live') channelMap[cl.channel] = cl.status
                })
              })

              return (
                <Link
                  key={p.id}
                  href={`/dashboard/products/${p.id}`}
                  style={{ display: 'grid', gridTemplateColumns: '36px 1fr 120px 80px 80px 80px 200px 80px', padding: '12px 16px', alignItems: 'center', textDecoration: 'none', borderBottom: idx < filtered.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" width="12" height="12" style={{ opacity: 0.3 }}>
                      <rect x="2" y="2" width="12" height="12" rx="1"/><circle cx="6" cy="6" r="1.5"/><path d="M2 10l3-3 3 3 2-2 4 4"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{p.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{p.category ?? ''}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'monospace' }}>{p.sku}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{p.product_colourways.length}</div>
                  <div style={{ fontSize: '13px', color: totalStock === 0 ? 'var(--accent3)' : 'var(--text2)' }}>{totalStock === 0 ? 'OOS' : totalStock}</div>
                  <div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: p.status === 'active' ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.06)', color: p.status === 'active' ? '#30d158' : 'var(--text3)' }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {CHANNELS.map(({ key, dot }) => {
                      const status = channelMap[key]
                      return (
                        <div key={key} style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: status === 'live' ? dot : 'transparent',
                          border: status === 'draft' ? `1.5px solid ${dot}` : status === 'live' ? 'none' : '1.5px solid rgba(255,255,255,0.12)',
                        }} />
                      )
                    })}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>Edit →</span>
                  </div>
                </Link>
              )
            })
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', padding: '0 4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Channels:</span>
          {CHANNELS.map(({ label, dot }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot }} />
              <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.12)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Not listed</span>
          </div>
        </div>

      </div>
    </div>
  )
}
