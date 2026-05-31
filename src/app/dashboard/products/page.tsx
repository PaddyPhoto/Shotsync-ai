'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch('/api/products', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [])

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
  const totalLiveIconic  = products.filter(p => p.product_colourways.some(cw => cw.channel_listings.some(cl => cl.channel === 'iconic' && cl.status === 'live'))).length
  const totalUnpublished = products.filter(p => p.product_colourways.every(cw => cw.channel_listings.length === 0)).length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar breadcrumbs={[{ label: 'Products' }]} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: 'var(--bg)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: '4px' }}>Products</h1>
            <p style={{ fontSize: '13px', color: 'var(--text3)' }}>Create listings once. Publish to every channel from here.</p>
          </div>
          <Link
            href="/dashboard/products/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--accent)', color: '#fff', padding: '9px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 500, letterSpacing: '-0.2px', textDecoration: 'none' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>
            New product
          </Link>
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
                <Link href="/dashboard/products/new" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}>
                  Add your first product →
                </Link>
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
