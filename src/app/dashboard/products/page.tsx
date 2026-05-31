'use client'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'

const MOCK_PRODUCTS = [
  {
    id: '1',
    sku: 'PR05324-062',
    title: 'Relaxed Linen Blazer',
    colour: 'Natural',
    variants: 4,
    rpp: '$189',
    stock: 48,
    channels: { shopify: 'live', iconic: 'live', myer: 'draft', dj: null, joor: 'live' },
  },
  {
    id: '2',
    sku: 'PR05324-010',
    title: 'Relaxed Linen Blazer',
    colour: 'Black',
    variants: 4,
    rpp: '$189',
    stock: 32,
    channels: { shopify: 'live', iconic: 'live', myer: 'live', dj: 'live', joor: 'live' },
  },
  {
    id: '3',
    sku: 'PR06001-034',
    title: 'Wide Leg Trouser',
    colour: 'Navy',
    variants: 5,
    rpp: '$149',
    stock: 21,
    channels: { shopify: 'live', iconic: 'draft', myer: null, dj: null, joor: null },
  },
  {
    id: '4',
    sku: 'PR06001-001',
    title: 'Wide Leg Trouser',
    colour: 'White',
    variants: 5,
    rpp: '$149',
    stock: 0,
    channels: { shopify: 'draft', iconic: null, myer: null, dj: null, joor: null },
  },
  {
    id: '5',
    sku: 'PR07120-045',
    title: 'Silk Wrap Midi Dress',
    colour: 'Ivory',
    variants: 4,
    rpp: '$229',
    stock: 14,
    channels: { shopify: 'live', iconic: 'live', myer: 'live', dj: 'live', joor: 'draft' },
  },
  {
    id: '6',
    sku: 'PR07120-022',
    title: 'Silk Wrap Midi Dress',
    colour: 'Sage',
    variants: 4,
    rpp: '$229',
    stock: 9,
    channels: { shopify: 'live', iconic: null, myer: null, dj: null, joor: null },
  },
]

const CHANNELS = [
  { key: 'shopify', label: 'Shopify',     dot: '#30d158' },
  { key: 'iconic',  label: 'The Iconic',  dot: '#ff9f0a' },
  { key: 'myer',    label: 'Myer',        dot: '#ff3b30' },
  { key: 'dj',      label: 'David Jones', dot: '#0a84ff' },
  { key: 'joor',    label: 'JOOR',        dot: '#bf5af2' },
]

export default function ProductsPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar breadcrumbs={[{ label: 'Products' }]} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: 'var(--bg)' }}>

        {/* Header */}
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
            { label: 'Total products',  value: '6',  sub: '4 styles' },
            { label: 'Live on Shopify', value: '5',  sub: '1 draft' },
            { label: 'Live on Iconic',  value: '3',  sub: '1 pending' },
            { label: 'Unpublished',     value: '2',  sub: 'Ready to push' },
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
          {['All', 'Published', 'Draft', 'Delisted'].map((tab, i) => (
            <button
              key={tab}
              style={{
                padding: '5px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: i === 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: i === 0 ? 'var(--text)' : 'var(--text3)',
              }}
            >{tab}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              placeholder="Search by SKU or title…"
              style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: 'var(--text)', outline: 'none', width: '220px' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 120px 80px 80px 80px 200px 80px', gap: '0', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', alignItems: 'center' }}>
            <div />
            {['Product', 'SKU', 'Variants', 'RRP', 'Stock', 'Channels', ''].map((h) => (
              <div key={h} style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {MOCK_PRODUCTS.map((p, idx) => (
            <Link
              key={p.id}
              href={`/dashboard/products/${p.id}`}
              style={{ display: 'grid', gridTemplateColumns: '36px 1fr 120px 80px 80px 80px 200px 80px', gap: '0', padding: '12px 16px', alignItems: 'center', textDecoration: 'none', borderBottom: idx < MOCK_PRODUCTS.length - 1 ? '0.5px solid var(--border)' : 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
            >
              {/* Thumbnail */}
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" width="12" height="12" style={{ opacity: 0.3 }}>
                  <rect x="2" y="2" width="12" height="12" rx="1"/><circle cx="6" cy="6" r="1.5"/><path d="M2 10l3-3 3 3 2-2 4 4"/>
                </svg>
              </div>

              {/* Title + colour */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.1px' }}>{p.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{p.colour}</div>
              </div>

              {/* SKU */}
              <div style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'monospace' }}>{p.sku}</div>

              {/* Variants */}
              <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{p.variants} sizes</div>

              {/* RRP */}
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>{p.rpp}</div>

              {/* Stock */}
              <div style={{ fontSize: '13px', color: p.stock === 0 ? 'var(--accent3)' : 'var(--text2)' }}>
                {p.stock === 0 ? 'OOS' : p.stock}
              </div>

              {/* Channels */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {CHANNELS.map(({ key, label, dot }) => {
                  const status = p.channels[key as keyof typeof p.channels]
                  return (
                    <div
                      key={key}
                      title={`${label}: ${status ?? 'not listed'}`}
                      style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: status === 'live' ? dot : status === 'draft' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        border: status === 'draft' ? `1.5px solid ${dot}` : status === null ? '1.5px solid rgba(255,255,255,0.12)' : 'none',
                      }}
                    />
                  )
                })}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>Edit →</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Channel legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', padding: '0 4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Channels:</span>
          {CHANNELS.map(({ label, dot }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot }} />
              <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Draft</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.12)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Not listed</span>
          </div>
        </div>

      </div>
    </div>
  )
}
