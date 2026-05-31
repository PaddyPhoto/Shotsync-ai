'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL']

type Variant = { size: string; barcode: string; stock: string; price: string }
type Colourway = { id: string; name: string; hex: string; rrp: string; variants: Variant[] }

function newColourway(name = '', hex = '#000000'): Colourway {
  return {
    id: crypto.randomUUID(),
    name,
    hex,
    rrp: '',
    variants: DEFAULT_SIZES.map(size => ({ size, barcode: '', stock: '', price: '' })),
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '0.5px solid var(--border)',
  borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: 'var(--text)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const monoInputStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none',
  fontSize: '11px', color: 'var(--text2)', fontFamily: 'monospace', width: '100%',
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text3)', marginBottom: '7px' }}>{children}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '22px', marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '18px', letterSpacing: '-0.2px' }}>{title}</div>
      {children}
    </div>
  )
}

export default function NewProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Product fields
  const [title, setTitle]       = useState('')
  const [sku, setSku]           = useState('')
  const [category, setCategory] = useState('')
  const [gender, setGender]     = useState('')
  const [season, setSeason]     = useState('')

  // Attributes
  const [composition, setComposition] = useState('')
  const [care, setCare]               = useState('')
  const [fit, setFit]                 = useState('')
  const [origin, setOrigin]           = useState('')

  // Colourways
  const [colourways, setColourways] = useState<Colourway[]>([newColourway()])
  const [activeIdx, setActiveIdx]   = useState(0)

  function updateColourway(id: string, patch: Partial<Colourway>) {
    setColourways(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function updateVariant(cwId: string, size: string, patch: Partial<Variant>) {
    setColourways(prev => prev.map(c => c.id === cwId
      ? { ...c, variants: c.variants.map(v => v.size === size ? { ...v, ...patch } : v) }
      : c
    ))
  }

  function addColourway() {
    const cw = newColourway()
    setColourways(prev => [...prev, cw])
    setActiveIdx(colourways.length)
  }

  function removeColourway(id: string) {
    if (colourways.length === 1) return
    const newList = colourways.filter(c => c.id !== id)
    setColourways(newList)
    setActiveIdx(Math.min(activeIdx, newList.length - 1))
  }

  async function save(publish: boolean) {
    if (!title.trim() || !sku.trim()) { setError('Title and SKU are required.'); return }
    if (colourways.some(c => !c.name.trim())) { setError('All colourways need a name.'); return }

    setError(null)
    setSaving(true)

    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) { setError('Not signed in.'); return }

      const attributes: Record<string, string> = {}
      if (composition) attributes['composition'] = composition
      if (care)        attributes['care'] = care
      if (fit)         attributes['fit'] = fit
      if (origin)      attributes['origin'] = origin

      const payload = {
        title: title.trim(),
        sku: sku.trim(),
        category: category.trim() || null,
        gender: gender.trim() || null,
        season: season.trim() || null,
        attributes,
        colourways: colourways.map(c => ({
          name: c.name.trim(),
          code: c.hex,
          rrp: c.rrp ? parseFloat(c.rrp) : null,
          variants: c.variants
            .filter(v => v.size)
            .map(v => ({
              size: v.size,
              barcode: v.barcode || null,
              stock: parseInt(v.stock) || 0,
              price: v.price ? parseFloat(v.price) : (c.rrp ? parseFloat(c.rrp) : null),
            })),
        })),
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to save product.'); return }

      router.push(`/dashboard/products/${json.data.id}`)
    } finally {
      setSaving(false)
    }
  }

  const cw = colourways[activeIdx] ?? colourways[0]

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar breadcrumbs={[{ label: 'Products', href: '/dashboard/products' }, { label: 'New product' }]} />

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', padding: '24px 32px 40px', alignItems: 'start' }}>

          {/* ── LEFT ── */}
          <div>

            {/* Product info */}
            <Section title="Product info">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <Label>Title *</Label>
                  <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Relaxed Linen Blazer" />
                </div>
                <div>
                  <Label>Master SKU *</Label>
                  <input style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }} value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. PR05324" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <Label>Category</Label>
                  <input style={inputStyle} value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Blazers" />
                </div>
                <div>
                  <Label>Gender</Label>
                  <input style={inputStyle} value={gender} onChange={e => setGender(e.target.value)} placeholder="e.g. Women" />
                </div>
                <div>
                  <Label>Season</Label>
                  <input style={inputStyle} value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. SS25" />
                </div>
              </div>
            </Section>

            {/* Colourways */}
            <Section title="Colourways & Variants">
              <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' }}>Each colourway has its own stock, pricing, and listing data.</p>

              {/* Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {colourways.map((c, i) => (
                  <button key={c.id} onClick={() => setActiveIdx(i)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: activeIdx === i ? '1.5px solid var(--accent)' : '0.5px solid var(--border)', background: activeIdx === i ? 'rgba(0,122,255,0.08)' : 'transparent', color: activeIdx === i ? 'var(--accent)' : 'var(--text2)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.hex, border: '0.5px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    {c.name || `Colour ${i + 1}`}
                  </button>
                ))}
                <button onClick={addColourway} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text3)', background: 'transparent', border: '0.5px dashed rgba(255,255,255,0.15)', cursor: 'pointer' }}>
                  + Add colour
                </button>
              </div>

              {/* Colourway editor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', marginBottom: '20px', alignItems: 'end' }}>
                <div>
                  <Label>Colour name</Label>
                  <input style={inputStyle} value={cw.name} onChange={e => updateColourway(cw.id, { name: e.target.value })} placeholder="e.g. Natural" />
                </div>
                <div>
                  <Label>Hex code</Label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="color" value={cw.hex} onChange={e => updateColourway(cw.id, { hex: e.target.value })} style={{ width: '36px', height: '36px', borderRadius: '6px', border: '0.5px solid var(--border)', background: 'none', cursor: 'pointer', padding: '2px' }} />
                    <input style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }} value={cw.hex} onChange={e => updateColourway(cw.id, { hex: e.target.value })} placeholder="#000000" />
                  </div>
                </div>
                <div>
                  <Label>RRP ($)</Label>
                  <input style={inputStyle} value={cw.rrp} onChange={e => updateColourway(cw.id, { rrp: e.target.value })} placeholder="189.00" type="number" min="0" step="0.01" />
                </div>
                {colourways.length > 1 && (
                  <button onClick={() => removeColourway(cw.id)} style={{ padding: '9px 12px', borderRadius: '8px', fontSize: '12px', color: '#ff3b30', background: 'rgba(255,59,48,0.08)', border: '0.5px solid rgba(255,59,48,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Remove
                  </button>
                )}
              </div>

              {/* Variants table */}
              <div style={{ border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 150px 120px 80px 80px', padding: '8px 12px', borderBottom: '0.5px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                  {['Size', 'Barcode / EAN', 'SKU', 'Stock', 'Price'].map(h => (
                    <div key={h} style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</div>
                  ))}
                </div>
                {cw.variants.map((v, i) => (
                  <div key={v.size} style={{ display: 'grid', gridTemplateColumns: '60px 150px 120px 80px 80px', padding: '8px 12px', borderBottom: i < cw.variants.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{v.size}</span>
                    <input value={v.barcode} onChange={e => updateVariant(cw.id, v.size, { barcode: e.target.value })} placeholder="—" style={monoInputStyle} />
                    <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'monospace' }}>{sku ? `${sku}-${v.size}` : '—'}</span>
                    <input value={v.stock} onChange={e => updateVariant(cw.id, v.size, { stock: e.target.value })} placeholder="0" type="number" min="0" style={{ ...monoInputStyle, width: '60px' }} />
                    <input value={v.price} onChange={e => updateVariant(cw.id, v.size, { price: e.target.value })} placeholder={cw.rrp || '—'} type="number" min="0" step="0.01" style={{ ...monoInputStyle, width: '70px' }} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Attributes */}
            <Section title="Attributes">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <Label>Composition</Label>
                  <input style={inputStyle} value={composition} onChange={e => setComposition(e.target.value)} placeholder="e.g. 100% Linen" />
                </div>
                <div>
                  <Label>Care instructions</Label>
                  <input style={inputStyle} value={care} onChange={e => setCare(e.target.value)} placeholder="e.g. Hand wash cold" />
                </div>
                <div>
                  <Label>Fit</Label>
                  <input style={inputStyle} value={fit} onChange={e => setFit(e.target.value)} placeholder="e.g. Relaxed" />
                </div>
                <div>
                  <Label>Country of origin</Label>
                  <input style={inputStyle} value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Italy" />
                </div>
              </div>
            </Section>

          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Save actions */}
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>Save product</div>

              {error && (
                <div style={{ padding: '10px 12px', background: 'rgba(255,59,48,0.08)', border: '0.5px solid rgba(255,59,48,0.2)', borderRadius: '8px', fontSize: '12px', color: '#ff3b30', marginBottom: '12px' }}>
                  {error}
                </div>
              )}

              <button
                onClick={() => save(false)}
                disabled={saving}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', color: 'var(--text2)', border: '0.5px solid var(--border)', borderRadius: '9px', padding: '10px', fontSize: '13px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', marginBottom: '8px' }}
              >
                {saving ? 'Saving…' : 'Save as draft'}
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving}
                style={{ width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '-0.2px' }}
              >
                {saving ? 'Saving…' : 'Save & view product'}
              </button>
            </div>

            {/* Readiness */}
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '14px' }}>Checklist</div>
              {[
                { label: 'Title',      ok: !!title.trim() },
                { label: 'SKU',        ok: !!sku.trim() },
                { label: 'Colourway',  ok: colourways.some(c => c.name.trim()) },
                { label: 'Variants',   ok: colourways.some(c => c.variants.some(v => parseInt(v.stock) > 0)) },
                { label: 'Attributes', ok: !!(composition || care || fit || origin) },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: ok ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {ok
                      ? <svg viewBox="0 0 12 12" fill="none" stroke="#30d158" strokeWidth="2" width="8" height="8"><polyline points="10 3 5 8.5 2 5.5"/></svg>
                      : <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                    }
                  </div>
                  <span style={{ fontSize: '13px', color: ok ? 'var(--text)' : 'var(--text3)' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Pricing summary */}
            {colourways.some(c => c.rrp) && (
              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Pricing</div>
                {colourways.filter(c => c.rrp).map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{c.name || 'Colour'} RRP</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>${c.rrp}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
