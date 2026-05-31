'use client'

import { useState, useEffect, use } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

const CHANNELS = [
  { key: 'shopify', label: 'Shopify',     dot: '#30d158' },
  { key: 'iconic',  label: 'The Iconic',  dot: '#ff9f0a' },
  { key: 'myer',    label: 'Myer',        dot: '#ff3b30' },
  { key: 'dj',      label: 'David Jones', dot: '#0a84ff' },
  { key: 'joor',    label: 'JOOR',        dot: '#bf5af2' },
]

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  live:       { label: 'Live',       color: '#30d158',        bg: 'rgba(48,209,88,0.1)' },
  draft:      { label: 'Draft',      color: '#ff9f0a',        bg: 'rgba(255,159,10,0.1)' },
  not_listed: { label: 'Not listed', color: 'var(--text3)',   bg: 'rgba(255,255,255,0.06)' },
}

type Variant    = { id: string; size: string; barcode: string | null; stock: number; price: number }
type Image      = { id: string; storage_url: string | null; angle: string; sort_order: number; original_filename: string | null }
type Listing    = { channel: string; status: string; last_synced_at: string | null }
type Colourway  = { id: string; colour_name: string; colour_code: string | null; rrp: number | null; listing_title: string | null; listing_description: string | null; listing_bullets: string[]; product_images: Image[]; product_variants: Variant[]; channel_listings: Listing[] }
type Attribute  = { key: string; value: string }
type Product    = { id: string; sku: string; title: string; category: string | null; gender: string | null; season: string | null; status: string; product_attributes: Attribute[]; product_colourways: Colourway[] }

const ANGLE_SLOTS = ['Front', 'Back', 'Side', 'Detail', 'Mood', 'Full length']

export default function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeColourwayId, setActiveColourwayId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch(`/api/products/${productId}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => { if (r.status === 404) { setNotFound(true); setLoading(false); return null } return r.json() })
        .then(json => {
          if (!json) return
          setProduct(json.data)
          setActiveColourwayId(json.data.product_colourways[0]?.id ?? null)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    })
  }, [productId])

  if (loading) return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar breadcrumbs={[{ label: 'Products', href: '/dashboard/products' }, { label: '…' }]} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px' }}>Loading…</div>
    </div>
  )

  if (notFound || !product) return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar breadcrumbs={[{ label: 'Products', href: '/dashboard/products' }, { label: 'Not found' }]} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px' }}>Product not found.</div>
    </div>
  )

  const cw = product.product_colourways.find(c => c.id === activeColourwayId) ?? product.product_colourways[0]
  const totalStock = cw?.product_variants.reduce((s, v) => s + v.stock, 0) ?? 0
  const liveChannels = cw?.channel_listings.filter(l => l.status === 'live').length ?? 0

  const imagesByAngle: Record<string, Image | null> = {}
  ANGLE_SLOTS.forEach(angle => {
    imagesByAngle[angle] = cw?.product_images.find(img => img.angle.toLowerCase() === angle.toLowerCase()) ?? null
  })

  const channelMap: Record<string, string> = {}
  cw?.channel_listings.forEach(l => { channelMap[l.channel] = l.status })

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar
        breadcrumbs={[{ label: 'Products', href: '/dashboard/products' }, { label: product.title }]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', background: product.status === 'active' ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.06)', color: product.status === 'active' ? '#30d158' : 'var(--text3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 500, textTransform: 'capitalize' }}>{product.status}</span>
            <button style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>Publish to all</button>
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: '100%' }}>

          {/* ── Main ── */}
          <div style={{ padding: '28px 32px', borderRight: '0.5px solid var(--border)' }}>

            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)' }}>{product.title}</h1>
                <span style={{ fontSize: '13px', color: 'var(--text3)', fontFamily: 'monospace' }}>{product.sku}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[product.category, product.gender, product.season].filter(Boolean).map(tag => (
                  <span key={tag} style={{ fontSize: '11px', color: 'var(--text3)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '5px' }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Colourway tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
              {product.product_colourways.map(c => (
                <button key={c.id} onClick={() => setActiveColourwayId(c.id)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: activeColourwayId === c.id ? '1.5px solid var(--accent)' : '0.5px solid var(--border)', background: activeColourwayId === c.id ? 'rgba(0,122,255,0.08)' : 'var(--surface)', color: activeColourwayId === c.id ? 'var(--accent)' : 'var(--text2)' }}>
                  {c.colour_code && <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.colour_code.startsWith('#') ? c.colour_code : '#888', border: '0.5px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />}
                  {c.colour_name}
                  {c.colour_code && <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text3)' }}>{c.colour_code}</span>}
                </button>
              ))}
              {product.product_colourways.length === 0 && (
                <span style={{ fontSize: '13px', color: 'var(--text3)' }}>No colourways added yet</span>
              )}
            </div>

            {cw && (
              <>
                {/* Images */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Images</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                    {ANGLE_SLOTS.map(angle => {
                      const img = imagesByAngle[angle]
                      return (
                        <div key={angle} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div style={{ aspectRatio: '3/4', borderRadius: '8px', background: img ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', border: img ? '0.5px solid var(--border)' : '1.5px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                            {img?.storage_url ? (
                              <img src={img.storage_url} alt={angle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ opacity: 0.2 }}>
                                {img ? <><rect x="1" y="1" width="10" height="10" rx="1"/><circle cx="4" cy="4" r="1"/><path d="M1 7.5l2.5-2.5 2.5 2.5 1.5-1.5 3 3"/></> : <path d="M6 2v8M2 6h8" strokeLinecap="round"/>}
                              </svg>
                            )}
                          </div>
                          <span style={{ fontSize: '10px', color: img ? 'var(--text3)' : 'rgba(255,255,255,0.2)', textAlign: 'center' }}>{angle}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Listing copy */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Listing copy</div>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#bf5af2', background: 'rgba(191,90,242,0.08)', border: '0.5px solid rgba(191,90,242,0.2)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                      <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 1l1.4 3.2L11 5.2l-2.4 2.3.6 3.3L6 9.2l-3.2 1.6.6-3.3L1 5.2l3.6-.9L6 1z" fill="#bf5af2"/></svg>
                      Generate with AI
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Title</label>
                      <div style={{ padding: '8px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: cw.listing_title ? 'var(--text)' : 'var(--text3)' }}>
                        {cw.listing_title ?? 'No title yet — generate with AI or type above'}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Description</label>
                      <div style={{ padding: '8px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: cw.listing_description ? 'var(--text2)' : 'var(--text3)', lineHeight: 1.6, minHeight: '60px' }}>
                        {cw.listing_description ?? 'No description yet'}
                      </div>
                    </div>
                    {Array.isArray(cw.listing_bullets) && cw.listing_bullets.length > 0 && (
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Bullet points</label>
                        <div style={{ padding: '8px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {cw.listing_bullets.map((b, i) => (
                            <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text2)' }}>
                              <span style={{ color: 'var(--text3)' }}>·</span>{b}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attributes */}
                {product.product_attributes.length > 0 && (
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Attributes</div>
                    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                      {product.product_attributes.map((attr, i) => (
                        <div key={attr.key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', padding: '10px 14px', borderBottom: i < product.product_attributes.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'capitalize' }}>{attr.key}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text)' }}>{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variants */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Variants — {cw.colour_name}</div>
                  {cw.product_variants.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text3)' }}>No variants yet.</p>
                  ) : (
                    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 80px', padding: '8px 14px', borderBottom: '0.5px solid var(--border)' }}>
                        {['Size', 'Barcode', 'Stock', 'Price'].map(h => (
                          <span key={h} style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{h}</span>
                        ))}
                      </div>
                      {cw.product_variants.map((v, i) => (
                        <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 80px', padding: '10px 14px', borderBottom: i < cw.product_variants.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{v.size}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'monospace' }}>{v.barcode ?? '—'}</span>
                          <span style={{ fontSize: '13px', color: v.stock === 0 ? '#ff3b30' : 'var(--text2)' }}>{v.stock}</span>
                          <span style={{ fontSize: '13px', color: 'var(--text)' }}>{v.price != null ? `$${v.price}` : '—'}</span>
                        </div>
                      ))}
                      <div style={{ padding: '8px 14px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Total stock</span>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text2)' }}>{totalStock} units</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Channels */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Channels</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {CHANNELS.map(ch => {
                  const status = channelMap[ch.key] ?? 'not_listed'
                  const s = STATUS_LABEL[status] ?? STATUS_LABEL.not_listed
                  return (
                    <div key={ch.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'live' ? ch.dot : 'transparent', border: status !== 'live' ? `1.5px solid ${status === 'draft' ? ch.dot : 'rgba(255,255,255,0.15)'}` : 'none', flexShrink: 0 }} />
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
              </div>
            </div>

            {/* Readiness */}
            {cw && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Readiness</div>
                <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  {[
                    { label: 'Images',     done: cw.product_images.length >= 2,     detail: `${cw.product_images.length} uploaded` },
                    { label: 'Copy',       done: !!cw.listing_title,                detail: cw.listing_title ? 'Title + description' : 'Missing' },
                    { label: 'Attributes', done: product.product_attributes.length > 0, detail: `${product.product_attributes.length} fields` },
                    { label: 'Variants',   done: totalStock > 0,                    detail: `${totalStock} units in stock` },
                    { label: 'Channels',   done: liveChannels > 0,                  detail: liveChannels > 0 ? `${liveChannels} live` : 'Not published' },
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
            )}

            {/* Pricing */}
            {cw?.rrp && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Pricing</div>
                <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  {[
                    { label: 'RRP',           value: `$${cw.rrp}` },
                    { label: 'Shopify price', value: `$${cw.rrp}` },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{row.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
