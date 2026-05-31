'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'

const PRODUCT = {
  id: '1',
  sku: 'PR05324',
  title: 'Relaxed Linen Blazer',
  category: 'Jackets & Blazers',
  gender: 'Womens',
  season: 'SS25',
  status: 'active',
  attributes: {
    Composition: '100% Linen',
    Care: 'Hand wash cold, lay flat to dry',
    Fit: 'Relaxed',
    Origin: 'Italy',
    'Size range': 'XS – XL',
  },
  colourways: [
    {
      id: 'cw1',
      name: 'Natural',
      code: '062',
      hex: '#e8dcc8',
      rrp: 189,
      listingTitle: 'Relaxed Linen Blazer — Natural',
      listingDescription: 'Cut from pure Italian linen, this relaxed blazer moves effortlessly from desk to dinner. The unstructured silhouette drapes beautifully while the natural colourway pairs with everything in your wardrobe.',
      bullets: [
        '100% Italian linen for breathability and texture',
        'Relaxed, unstructured fit — no shoulder padding',
        'Single-button fastening with welt pockets',
        'Fully lined in lightweight cotton',
      ],
      images: [
        { angle: 'Front', filled: true },
        { angle: 'Back', filled: true },
        { angle: 'Side', filled: true },
        { angle: 'Detail', filled: true },
        { angle: 'Mood', filled: true },
        { angle: 'Full length', filled: false },
      ],
      variants: [
        { size: 'XS', stock: 8,  price: 189 },
        { size: 'S',  stock: 12, price: 189 },
        { size: 'M',  stock: 14, price: 189 },
        { size: 'L',  stock: 10, price: 189 },
        { size: 'XL', stock: 4,  price: 189 },
      ],
      channels: {
        shopify:  'live',
        iconic:   'live',
        myer:     'draft',
        dj:       null,
        joor:     'live',
      },
    },
    {
      id: 'cw2',
      name: 'Black',
      code: '010',
      hex: '#1a1a1a',
      rrp: 189,
      listingTitle: 'Relaxed Linen Blazer — Black',
      listingDescription: 'The same relaxed Italian linen cut, now in a versatile black that anchors any outfit. Lightweight enough for warmer months, structured enough for the office.',
      bullets: [
        '100% Italian linen — lightweight and breathable',
        'Relaxed fit with natural drape',
        'Single-button closure, welt side pockets',
        'Fully lined',
      ],
      images: [
        { angle: 'Front', filled: true },
        { angle: 'Back', filled: true },
        { angle: 'Side', filled: true },
        { angle: 'Detail', filled: false },
        { angle: 'Mood', filled: true },
        { angle: 'Full length', filled: false },
      ],
      variants: [
        { size: 'XS', stock: 6,  price: 189 },
        { size: 'S',  stock: 8,  price: 189 },
        { size: 'M',  stock: 10, price: 189 },
        { size: 'L',  stock: 6,  price: 189 },
        { size: 'XL', stock: 2,  price: 189 },
      ],
      channels: {
        shopify:  'live',
        iconic:   'live',
        myer:     'live',
        dj:       'live',
        joor:     'live',
      },
    },
  ],
}

const CHANNELS = [
  { key: 'shopify', label: 'Shopify',      dot: '#30d158' },
  { key: 'iconic',  label: 'The Iconic',   dot: '#ff9f0a' },
  { key: 'myer',    label: 'Myer',         dot: '#ff3b30' },
  { key: 'dj',      label: 'David Jones',  dot: '#0a84ff' },
  { key: 'joor',    label: 'JOOR',         dot: '#bf5af2' },
]

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  live:        { label: 'Live',        color: '#30d158', bg: 'rgba(48,209,88,0.1)' },
  draft:       { label: 'Draft',       color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)' },
  not_listed:  { label: 'Not listed',  color: 'var(--text3)', bg: 'rgba(255,255,255,0.06)' },
}

export default function ProductDetailPage() {
  const [activeColourway, setActiveColourway] = useState(PRODUCT.colourways[0].id)
  const [editingCopy, setEditingCopy] = useState(false)

  const cw = PRODUCT.colourways.find(c => c.id === activeColourway)!
  const totalStock = cw.variants.reduce((s, v) => s + v.stock, 0)
  const liveChannels = Object.values(cw.channels).filter(s => s === 'live').length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar
        breadcrumbs={[{ label: 'Products', href: '/dashboard/products' }, { label: PRODUCT.title }]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', background: 'rgba(48,209,88,0.1)', color: '#30d158', padding: '4px 10px', borderRadius: '20px', fontWeight: 500 }}>Active</span>
            <button style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--text2)', cursor: 'pointer' }}>Save draft</button>
            <button style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>Publish to all</button>
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '0', minHeight: '100%' }}>

          {/* ── Main content ── */}
          <div style={{ padding: '28px 32px', borderRight: '0.5px solid var(--border)' }}>

            {/* Product header */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)' }}>{PRODUCT.title}</h1>
                <span style={{ fontSize: '13px', color: 'var(--text3)', fontFamily: 'monospace' }}>{PRODUCT.sku}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[PRODUCT.category, PRODUCT.gender, PRODUCT.season].map(tag => (
                  <span key={tag} style={{ fontSize: '11px', color: 'var(--text3)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '5px' }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Colourway tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
              {PRODUCT.colourways.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveColourway(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 14px',
                    borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    border: activeColourway === c.id ? '1.5px solid var(--accent)' : '0.5px solid var(--border)',
                    background: activeColourway === c.id ? 'rgba(0,122,255,0.08)' : 'var(--surface)',
                    color: activeColourway === c.id ? 'var(--accent)' : 'var(--text2)',
                  }}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.hex, border: c.hex === '#1a1a1a' ? '1px solid rgba(255,255,255,0.15)' : 'none', flexShrink: 0 }} />
                  {c.name}
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text3)' }}>{c.code}</span>
                </button>
              ))}
              <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text3)', background: 'transparent', border: '0.5px dashed rgba(255,255,255,0.15)', cursor: 'pointer' }}>
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M6 2v8M2 6h8" strokeLinecap="round"/></svg>
                Add colourway
              </button>
            </div>

            {/* Images */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Images</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {cw.images.map((img, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{
                      aspectRatio: '3/4', borderRadius: '8px',
                      background: img.filled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                      border: img.filled ? '0.5px solid var(--border)' : '1.5px dashed rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                      {img.filled ? (
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" width="16" height="16" style={{ opacity: 0.2 }}>
                          <rect x="2" y="2" width="12" height="12" rx="1"/><circle cx="6" cy="6" r="1.5"/><path d="M2 10l3-3 3 3 2-2 4 4"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ opacity: 0.2 }}>
                          <path d="M6 2v8M2 6h8" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '10px', color: img.filled ? 'var(--text3)' : 'rgba(255,255,255,0.2)', textAlign: 'center' }}>{img.angle}</span>
                  </div>
                ))}
              </div>
              {!cw.images.every(i => i.filled) && (
                <button style={{ marginTop: '10px', fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  + Upload images
                </button>
              )}
            </div>

            {/* Listing copy */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Listing copy</div>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#bf5af2', background: 'rgba(191,90,242,0.08)', border: '0.5px solid rgba(191,90,242,0.2)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 1l1.4 3.2L11 5.2l-2.4 2.3.6 3.3L6 9.2l-3.2 1.6.6-3.3L1 5.2l3.6-.9L6 1z" fill="#bf5af2"/></svg>
                  Generate with AI
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Title</label>
                  <div style={{ padding: '8px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text)' }}>{cw.listingTitle}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Description</label>
                  <div style={{ padding: '8px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6 }}>{cw.listingDescription}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Bullet points</label>
                  <div style={{ padding: '8px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {cw.bullets.map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text2)' }}>
                        <span style={{ color: 'var(--text3)', flexShrink: 0 }}>·</span>{b}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Attributes */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Attributes</div>
              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                {Object.entries(PRODUCT.attributes).map(([key, val], i, arr) => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', padding: '10px 14px', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{key}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text)' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Variants */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Variants — {cw.name}</div>
              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 80px', padding: '8px 14px', borderBottom: '0.5px solid var(--border)' }}>
                  {['Size', 'Barcode', 'Stock', 'Price'].map(h => (
                    <span key={h} style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{h}</span>
                  ))}
                </div>
                {cw.variants.map((v, i) => (
                  <div key={v.size} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 80px', padding: '10px 14px', borderBottom: i < cw.variants.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{v.size}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'monospace' }}>—</span>
                    <span style={{ fontSize: '13px', color: v.stock === 0 ? '#ff3b30' : 'var(--text2)' }}>{v.stock}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text)' }}>${v.price}</span>
                  </div>
                ))}
                <div style={{ padding: '8px 14px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Total stock</span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text2)' }}>{totalStock} units</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── Sidebar ── */}
          <div style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Channel status */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Channels</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {CHANNELS.map(ch => {
                  const status = cw.channels[ch.key as keyof typeof cw.channels]
                  const s = STATUS_LABEL[status ?? 'not_listed']
                  return (
                    <div key={ch.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'live' ? ch.dot : status === 'draft' ? 'transparent' : 'transparent', border: status !== 'live' ? `1.5px solid ${status === 'draft' ? ch.dot : 'rgba(255,255,255,0.15)'}` : 'none', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: 'var(--text2)', flex: 1 }}>{ch.label}</span>
                      <span style={{ fontSize: '11px', color: s.color, background: s.bg, padding: '2px 7px', borderRadius: '20px', fontWeight: 500 }}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button style={{ width: '100%', padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  Publish to all channels
                </button>
                <button style={{ width: '100%', padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'transparent', color: 'var(--text3)', border: '0.5px solid var(--border)', cursor: 'pointer' }}>
                  Schedule publish
                </button>
              </div>
            </div>

            {/* Listing readiness */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Readiness</div>
              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                {[
                  { label: 'Images',     done: cw.images.filter(i => i.filled).length >= 4, detail: `${cw.images.filter(i => i.filled).length} of ${cw.images.length} angles` },
                  { label: 'Copy',       done: !!cw.listingTitle,  detail: 'Title + description' },
                  { label: 'Attributes', done: true,               detail: '5 fields' },
                  { label: 'Variants',   done: totalStock > 0,     detail: `${totalStock} units in stock` },
                  { label: 'Channels',   done: liveChannels > 0,   detail: `${liveChannels} live` },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: item.done ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${item.done ? '#30d158' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.done && <svg viewBox="0 0 8 8" fill="none" stroke="#30d158" strokeWidth="1.8" width="8" height="8"><path d="M1.5 4l2 2 3-3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: item.done ? 'var(--text)' : 'var(--text3)', fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Pricing</div>
              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                {[
                  { label: 'RRP',                value: `$${cw.rrp}` },
                  { label: 'Shopify price',      value: `$${cw.rrp}` },
                  { label: 'JOOR wholesale',     value: '$94.50' },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{row.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
