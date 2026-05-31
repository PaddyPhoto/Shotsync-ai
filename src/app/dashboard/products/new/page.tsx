'use client'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'

const SIZES = ['XS', 'S', 'M', 'L', 'XL']
const COLOURS = [
  { label: 'Natural', hex: '#e8dcc8' },
  { label: 'Black',   hex: '#1a1a1a' },
]

const CHANNELS = [
  { key: 'shopify', label: 'Shopify',      dot: '#30d158', connected: true,  status: 'ready' },
  { key: 'iconic',  label: 'The Iconic',   dot: '#ff9f0a', connected: true,  status: 'ready' },
  { key: 'myer',    label: 'Myer',         dot: '#ff3b30', connected: true,  status: 'ready' },
  { key: 'dj',      label: 'David Jones',  dot: '#0a84ff', connected: false, status: 'connect' },
  { key: 'joor',    label: 'JOOR',         dot: '#bf5af2', connected: true,  status: 'ready' },
]

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text3)', marginBottom: '7px', letterSpacing: '0.03em' }}>{children}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '22px', marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '18px', letterSpacing: '-0.2px' }}>{title}</div>
      {children}
    </div>
  )
}

function Input({ placeholder, value, mono }: { placeholder: string; value?: string; mono?: boolean }) {
  return (
    <input
      defaultValue={value}
      placeholder={placeholder}
      style={{
        width: '100%', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px',
        padding: '9px 12px', fontSize: mono ? '12px' : '13px', color: 'var(--text)', outline: 'none',
        fontFamily: mono ? 'monospace' : 'inherit', boxSizing: 'border-box',
      }}
    />
  )
}

function Textarea({ placeholder, rows = 4 }: { placeholder: string; rows?: number }) {
  return (
    <textarea
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px',
        padding: '9px 12px', fontSize: '13px', color: 'var(--text)', outline: 'none', resize: 'vertical',
        fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
      }}
    />
  )
}

export default function NewProductPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar breadcrumbs={[{ label: 'Products', href: '/dashboard/products' }, { label: 'New product' }]} />

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        {/* Breadcrumb */}
        <div style={{ padding: '16px 32px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/dashboard/products" style={{ fontSize: '13px', color: 'var(--text3)', textDecoration: 'none' }}>Products</Link>
          <span style={{ color: 'var(--text3)', fontSize: '13px' }}>/</span>
          <span style={{ fontSize: '13px', color: 'var(--text)' }}>New product</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', padding: '20px 32px 40px', alignItems: 'start' }}>

          {/* ── LEFT COLUMN ── */}
          <div>

            {/* Images */}
            <Section title="Images">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                {/* Cover image slot */}
                <div style={{ gridColumn: 'span 2', gridRow: 'span 2', aspectRatio: '3/4', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', position: 'relative' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28" style={{ opacity: 0.25 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                  <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Cover image</span>
                  <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'var(--accent)', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px' }}>FRONT</div>
                </div>
                {/* Angle slots */}
                {[{ label: 'BACK' }, { label: 'SIDE' }, { label: 'DETAIL' }, { label: '+ Add' }].map(({ label }) => (
                  <div key={label} style={{ aspectRatio: '3/4', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', position: 'relative' }}>
                    {label === '+ Add' ? (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" style={{ opacity: 0.2 }}>
                        <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18" style={{ opacity: 0.18 }}>
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                        </svg>
                        <div style={{ position: 'absolute', top: '5px', left: '5px', background: 'rgba(255,255,255,0.08)', color: 'var(--text3)', fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px' }}>{label}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '12px' }}>Drag to reorder. ShotSync detects angles automatically when you upload from a shoot job.</p>
            </Section>

            {/* Product info */}
            <Section title="Product info">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <Label>Title</Label>
                  <Input placeholder="e.g. Relaxed Linen Blazer" value="Relaxed Linen Blazer" />
                </div>
                <div>
                  <Label>Brand</Label>
                  <Input placeholder="Your brand name" value="Studio Label" />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <Label>Description</Label>
                <Textarea placeholder="Describe this product…" rows={4} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <Label>Category</Label>
                  <Input placeholder="e.g. Blazers" value="Blazers" />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Input placeholder="e.g. Women" value="Women" />
                </div>
                <div>
                  <Label>Season</Label>
                  <Input placeholder="e.g. SS25" value="SS25" />
                </div>
              </div>
            </Section>

            {/* Variants */}
            <Section title="Variants">
              <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' }}>Each row is a unique combination of colour × size with its own SKU, barcode, stock and price.</p>

              {/* Table */}
              <div style={{ border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 60px 140px 130px 80px 80px 44px', padding: '8px 12px', borderBottom: '0.5px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                  {['Colour', 'Size', 'SKU', 'Barcode', 'Stock', 'Price', ''].map((h) => (
                    <div key={h} style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</div>
                  ))}
                </div>
                {COLOURS.flatMap((colour) =>
                  SIZES.map((size, si) => (
                    <div key={`${colour.label}-${size}`} style={{ display: 'grid', gridTemplateColumns: '100px 60px 140px 130px 80px 80px 44px', padding: '7px 12px', borderBottom: '0.5px solid var(--border)', alignItems: 'center', gap: '0' }}>
                      {/* Colour — only show on first size */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        {si === 0 ? (
                          <>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: colour.hex, border: '0.5px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{colour.label}</span>
                          </>
                        ) : null}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{size}</div>
                      <input defaultValue={`PR05324-062-${size}`} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', color: 'var(--text3)', fontFamily: 'monospace', width: '100%' }} />
                      <input placeholder="—" style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', color: 'var(--text3)', fontFamily: 'monospace', width: '100%' }} />
                      <input defaultValue={si < 3 ? String((si + 1) * 8) : '0'} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text2)', width: '60px' }} />
                      <input defaultValue="$189.00" style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text2)', width: '70px' }} />
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', opacity: 0.4, padding: '2px' }}>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><path d="M3 8h10" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button style={{ marginTop: '10px', background: 'none', border: '0.5px dashed rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: 'var(--text3)', cursor: 'pointer', width: '100%' }}>
                + Add colour
              </button>
            </Section>

            {/* Attributes */}
            <Section title="Attributes">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <Label>Composition</Label>
                  <Input placeholder="e.g. 100% Linen" value="100% Linen" />
                </div>
                <div>
                  <Label>Care instructions</Label>
                  <Input placeholder="e.g. Dry clean only" value="Dry clean only" />
                </div>
                <div>
                  <Label>Fit</Label>
                  <Input placeholder="e.g. Relaxed" value="Relaxed" />
                </div>
                <div>
                  <Label>Country of origin</Label>
                  <Input placeholder="e.g. China" value="China" />
                </div>
              </div>
            </Section>

          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Publish */}
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>Publish to</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                {CHANNELS.map(({ key, label, dot, connected }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" defaultChecked={connected} disabled={!connected} style={{ accentColor: dot, cursor: connected ? 'pointer' : 'not-allowed', width: '14px', height: '14px', flexShrink: 0 }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: connected ? 'var(--text)' : 'var(--text3)', flex: 1 }}>{label}</span>
                    {!connected && (
                      <Link href="/dashboard/connections" style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none' }}>Connect</Link>
                    )}
                  </div>
                ))}
              </div>
              <button style={{ width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.2px' }}>
                Publish listing
              </button>
              <button style={{ width: '100%', background: 'rgba(255,255,255,0.06)', color: 'var(--text2)', border: 'none', borderRadius: '9px', padding: '9px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', marginTop: '8px' }}>
                Save as draft
              </button>
            </div>

            {/* Pricing */}
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '14px' }}>Pricing</div>
              <div style={{ marginBottom: '12px' }}>
                <Label>RRP</Label>
                <Input placeholder="$0.00" value="$189.00" />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Label>Sale price</Label>
                <Input placeholder="Optional" />
              </div>
              <div style={{ height: '0.5px', background: 'var(--border)', margin: '14px 0' }} />
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px' }}>Per-channel pricing override</div>
              {CHANNELS.filter(c => c.connected).map(({ label, dot }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--text3)', flex: 1 }}>{label}</span>
                  <input placeholder="Default" style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: 'var(--text)', outline: 'none', width: '72px', textAlign: 'right' }} />
                </div>
              ))}
            </div>

            {/* Status */}
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '14px' }}>Status</div>
              {[
                { label: 'Images',     ok: true },
                { label: 'Title',      ok: true },
                { label: 'Variants',   ok: true },
                { label: 'Attributes', ok: false },
                { label: 'Copy',       ok: false },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: ok ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {ok ? (
                      <svg viewBox="0 0 12 12" fill="none" stroke="#30d158" strokeWidth="2" width="8" height="8"><polyline points="10 3 5 8.5 2 5.5"/></svg>
                    ) : (
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                    )}
                  </div>
                  <span style={{ fontSize: '13px', color: ok ? 'var(--text)' : 'var(--text3)' }}>{label}</span>
                  {!ok && <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text3)' }}>Required</span>}
                </div>
              ))}
              <button style={{ width: '100%', background: 'rgba(94,50,245,0.15)', color: '#bf5af2', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><circle cx="8" cy="8" r="6"/><path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Generate copy with AI
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
