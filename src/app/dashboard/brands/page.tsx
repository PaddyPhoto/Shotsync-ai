'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'
import { usePlan } from '@/context/PlanContext'
import type { Brand } from '@/lib/brands'
import { ACCESSORY_CATEGORIES } from '@/lib/accessories/categories'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

function toggleToken(template: string, token: string): string {
  const parts = template.split('_').filter(Boolean)
  if (parts.includes(token)) {
    return parts.filter((p) => p !== token).join('_')
  }
  return parts.length ? `${template}_${token}` : token
}

const NAMING_TOKENS = [
  { token: '{BRAND}',        color: 'var(--accent3)', desc: 'Brand code e.g. FBC' },
  { token: '{SEQ}',          color: 'var(--accent)',  desc: 'Look # e.g. 001' },
  { token: '{SKU}',          color: 'var(--accent)',  desc: 'SKU e.g. SS25-0042' },
  { token: '{STYLE_NUMBER}', color: 'var(--accent)',  desc: 'Style number e.g. 05324' },
  { token: '{COLOR}',        color: 'var(--accent2)', desc: 'Colour name e.g. BURGUNDY' },
  { token: '{COLOUR_CODE}',  color: 'var(--accent2)', desc: 'Colour code e.g. 062' },
  { token: '{VIEW}',         color: 'var(--accent4)', desc: 'Angle e.g. FRONT' },
  { token: '{INDEX}',        color: 'var(--accent4)', desc: 'Image # e.g. 01' },
  { token: '{CUSTOM_TEXT}',  color: 'var(--text3)',   desc: 'Fixed text string' },
]

export default function BrandsPage() {
  const { brands, setBrands, refreshBrands } = useBrand()
  const { plan, canAddBrand, openUpgrade } = usePlan()

  const [brandModal, setBrandModal] = useState<'add' | 'edit' | null>(null)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [brandForm, setBrandForm] = useState({
    name: '',
    brand_code: '',
    shopify_store_url: '',
    shopify_access_token: '',
    logo_color: '#e8d97a',
    images_per_look: 4,
    on_model_angle_sequence: ['full-length', 'front', 'side', 'mood', 'detail', 'back'],
    still_life_angle_sequences: {} as Record<string, string[]>,
    naming_template: '{BRAND}_{SEQ}_{VIEW}',
    gm_position: 'last' as 'first' | 'last',
  })
  const [expandedStillLifeCategory, setExpandedStillLifeCategory] = useState<string | null>(null)
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandError, setBrandError] = useState('')
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null)

  const openAddBrand = () => {
    setBrandForm({ name: '', brand_code: '', shopify_store_url: '', shopify_access_token: '', logo_color: '#e8d97a', images_per_look: 4, on_model_angle_sequence: ['full-length', 'front', 'side', 'mood', 'detail', 'back'], still_life_angle_sequences: {}, naming_template: '{BRAND}_{SEQ}_{VIEW}', gm_position: 'last' })
    setBrandError('')
    setEditingBrand(null)
    setBrandModal('add')
  }

  const openEditBrand = (b: Brand) => {
    setBrandForm({
      name: b.name,
      brand_code: b.brand_code,
      shopify_store_url: b.shopify_store_url ?? '',
      shopify_access_token: b.shopify_access_token ?? '',
      logo_color: b.logo_color,
      images_per_look: b.images_per_look ?? 4,
      on_model_angle_sequence: b.on_model_angle_sequence?.length ? b.on_model_angle_sequence : ['full-length', 'front', 'side', 'mood', 'detail', 'back'],
      still_life_angle_sequences: b.still_life_angle_sequences ?? {},
      naming_template: b.naming_template ?? '{BRAND}_{SEQ}_{VIEW}',
      gm_position: (b.gm_position ?? 'last') as 'first' | 'last',
    })
    setBrandError('')
    setEditingBrand(b)
    setBrandModal('edit')
  }

  const closeBrandModal = () => { setBrandModal(null); setEditingBrand(null) }

  const saveBrand = async () => {
    if (!brandForm.name.trim() || !brandForm.brand_code.trim()) {
      setBrandError('Name and brand code are required.')
      return
    }
    if (brandForm.brand_code.length > 6) {
      setBrandError('Brand code must be 6 characters or fewer.')
      return
    }
    setBrandSaving(true)
    setBrandError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      }
      if (brandModal === 'add') {
        const res = await fetch('/api/brands', { method: 'POST', headers: authHeaders, body: JSON.stringify(brandForm) })
        const d = await res.json()
        if (!res.ok) { setBrandError(d.error ?? 'Failed to create brand'); return }
        if (d.data) setBrands([...brands, d.data])
        else await refreshBrands()
      } else if (brandModal === 'edit' && editingBrand) {
        const res = await fetch(`/api/brands/${editingBrand.id}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify(brandForm) })
        const d = await res.json()
        if (!res.ok) { setBrandError(d.error ?? 'Failed to update brand'); return }
        const updated = d.data ?? { ...editingBrand, ...brandForm }
        setBrands(brands.map((b) => (b.id === editingBrand.id ? updated : b)))
      }
      closeBrandModal()
    } finally {
      setBrandSaving(false)
    }
  }

  const deleteBrand = async (id: string) => {
    setDeletingBrandId(id)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`/api/brands/${id}`, {
        method: 'DELETE',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (res.ok) setBrands(brands.filter((b) => b.id !== id))
      else await refreshBrands()
    } finally {
      setDeletingBrandId(null)
    }
  }

  return (
    <div>
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Brands' },
        ]}
      />

      <div className="p-7">
        <div className="mb-7">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
            Brands
          </h1>
          <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">
            Manage your brand identities, naming templates, and angle sequences.
          </p>
        </div>

        <div className="flex flex-col gap-4 max-w-[760px]">
          <div className="flex items-center justify-between">
            <p className="text-[0.78rem] text-[var(--text3)]">
              {brands.length} brand{brands.length !== 1 ? 's' : ''} configured
            </p>
            <button
              onClick={() => canAddBrand(brands.length) ? openAddBrand() : openUpgrade(`Your plan supports up to ${plan.limits.brands} brand${plan.limits.brands === 1 ? '' : 's'}. Upgrade to add more.`)}
              className="btn btn-primary btn-sm"
            >
              {!canAddBrand(brands.length) && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor" opacity=".8">
                  <rect x="2" y="5" width="7" height="5" rx="1"/>
                  <path d="M3.5 5V3.5a2 2 0 0 1 4 0V5" fill="none" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
              )}
              {canAddBrand(brands.length) && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 1v10M1 6h10" strokeLinecap="round"/>
                </svg>
              )}
              Add Brand
            </button>
          </div>

          {brands.length === 0 ? (
            <div className="card">
              <div className="card-body py-10 text-center">
                <p className="text-[0.88rem] text-[var(--text3)]">No brands yet.</p>
                <p className="text-[0.78rem] text-[var(--text3)] mt-1">Add a brand to start organising your jobs.</p>
                <button
                  onClick={() => canAddBrand(0) ? openAddBrand() : openUpgrade('Upgrade to add brands.')}
                  className="btn btn-primary btn-sm mt-4 mx-auto"
                >
                  Add your first brand
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body flex flex-col gap-0 p-0">
                {brands.map((b, i) => (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between px-[18px] py-[14px] ${i < brands.length - 1 ? 'border-b border-[var(--line)]' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-[34px] h-[34px] rounded-[5px] flex items-center justify-center text-[0.83rem] font-bold text-black flex-shrink-0"
                        style={{ background: b.logo_color, fontFamily: 'var(--font-dm-mono)' }}
                      >
                        {b.brand_code}
                      </div>
                      <div>
                        <p className="text-[1rem] font-medium text-[var(--text)]">{b.name}</p>
                        <div className="flex items-center gap-2 mt-[2px]">
                          <span className="text-[0.78rem] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                            {b.brand_code}
                          </span>
                          {b.shopify_store_url && (
                            <>
                              <span className="text-[var(--line2)]">·</span>
                              <span className="text-[0.78rem] text-[var(--accent2)] flex items-center gap-1">
                                <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="6" r="5"/></svg>
                                Shopify connected
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditBrand(b)}
                        className="p-[6px] rounded-sm text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg4)] transition-colors"
                        title="Edit brand"
                      >
                        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteBrand(b.id)}
                        disabled={deletingBrandId === b.id}
                        className="p-[6px] rounded-sm text-[var(--text3)] hover:text-[var(--accent3)] hover:bg-[rgba(232,122,122,0.08)] transition-colors disabled:opacity-40"
                        title="Delete brand"
                      >
                        {deletingBrandId === b.id ? (
                          <svg width="13" height="13" viewBox="0 0 12 12" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="6" cy="6" r="4" strokeDasharray="16 8"/>
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 3h8M4 3V2h4v1M5 5.5v3M7 5.5v3M3 3l.5 7h5l.5-7" strokeLinecap="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Brand Modal */}
      {brandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-[var(--bg)] border border-[var(--line2)] rounded-md w-[440px] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
              <h2 className="text-[0.95rem] font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
                {brandModal === 'add' ? 'Add Brand' : 'Edit Brand'}
              </h2>
              <button onClick={closeBrandModal} className="text-[var(--text3)] hover:text-[var(--text2)] transition-colors p-1">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">

              {/* Preview avatar */}
              <div className="flex items-center gap-3 px-3 py-3 rounded-sm bg-[var(--bg3)] border border-[var(--line)]">
                <div
                  className="w-[40px] h-[40px] rounded-[6px] flex items-center justify-center text-[0.86rem] font-bold text-black flex-shrink-0 transition-all"
                  style={{ background: brandForm.logo_color, fontFamily: 'var(--font-dm-mono)' }}
                >
                  {brandForm.brand_code.toUpperCase().slice(0, 6) || '??'}
                </div>
                <div>
                  <p className="text-[1rem] font-medium text-[var(--text)]">{brandForm.name || 'Brand Name'}</p>
                  <p className="text-[0.78rem] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                    {brandForm.brand_code.toUpperCase() || 'CODE'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[0.8rem] text-[var(--text2)] mb-[5px] block">Brand Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Studio Label"
                    value={brandForm.name}
                    onChange={(e) => setBrandForm((f) => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[0.8rem] text-[var(--text2)] mb-[5px] block">Brand Code * <span className="text-[var(--text3)]">(max 6)</span></label>
                  <input
                    className="input"
                    style={{ fontFamily: 'var(--font-dm-mono)' }}
                    placeholder="SL"
                    maxLength={6}
                    value={brandForm.brand_code}
                    onChange={(e) => setBrandForm((f) => ({ ...f, brand_code: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <label className="text-[0.8rem] text-[var(--text2)] mb-[5px] block">Accent Colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandForm.logo_color}
                      onChange={(e) => setBrandForm((f) => ({ ...f, logo_color: e.target.value }))}
                      className="w-[35px] h-[35px] rounded-sm border border-[var(--line2)] bg-transparent cursor-pointer flex-shrink-0"
                    />
                    <input
                      className="input flex-1"
                      style={{ fontFamily: 'var(--font-dm-mono)' }}
                      value={brandForm.logo_color}
                      onChange={(e) => setBrandForm((f) => ({ ...f, logo_color: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--line)] pt-3">
                <label className="text-[0.8rem] font-medium text-[var(--text2)] mb-2 block">Images per Look — On-Model</label>
                <p className="text-[0.78rem] text-[var(--text3)] mb-3">How many images are shot per product look for on-model shoots.</p>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBrandForm((f) => {
                        const seq = [...f.on_model_angle_sequence]
                        const ALL_ON_MODEL = ['full-length', 'front', 'side', 'mood', 'detail', 'back', 'front-3/4', 'back-3/4']
                        while (seq.length < n) seq.push(ALL_ON_MODEL[seq.length] ?? 'front')
                        return { ...f, images_per_look: n, on_model_angle_sequence: seq.slice(0, n) }
                      })}
                      className={`w-[38px] h-[38px] rounded-sm border text-[0.8rem] font-medium transition-all ${
                        brandForm.images_per_look === n
                          ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.1)] text-[var(--accent)]'
                          : 'border-[var(--line2)] text-[var(--text2)] hover:border-[var(--line)] hover:text-[var(--text)]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-3 space-y-1">
                  {brandForm.on_model_angle_sequence.slice(0, brandForm.images_per_look).map((angle, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-[0.86rem] text-[var(--text3)] text-right shrink-0">{idx + 1}</span>
                      <select
                        value={angle}
                        onChange={(e) => setBrandForm((f) => {
                          const seq = [...f.on_model_angle_sequence]
                          seq[idx] = e.target.value
                          return { ...f, on_model_angle_sequence: seq }
                        })}
                        className="flex-1 bg-[var(--bg3)] border border-[var(--line2)] rounded-sm px-2 py-[4px] text-[0.78rem] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                      >
                        {['full-length', 'front', 'back', 'side', 'detail', 'mood', 'front-3/4', 'back-3/4', 'flat-lay'].map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                      <div className="flex flex-col gap-[2px]">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => setBrandForm((f) => {
                            const seq = [...f.on_model_angle_sequence]
                            ;[seq[idx - 1], seq[idx]] = [seq[idx], seq[idx - 1]]
                            return { ...f, on_model_angle_sequence: seq }
                          })}
                          className="w-5 h-4 flex items-center justify-center text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20"
                        >▲</button>
                        <button
                          type="button"
                          disabled={idx >= brandForm.images_per_look - 1}
                          onClick={() => setBrandForm((f) => {
                            const seq = [...f.on_model_angle_sequence]
                            ;[seq[idx], seq[idx + 1]] = [seq[idx + 1], seq[idx]]
                            return { ...f, on_model_angle_sequence: seq }
                          })}
                          className="w-5 h-4 flex items-center justify-center text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20"
                        >▼</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Still life angle sequences */}
              <div className="border-t border-[var(--line)] pt-3">
                <p className="text-[0.8rem] font-medium text-[var(--text2)] mb-1">Still Life Angle Sequences</p>
                <p className="text-[0.86rem] text-[var(--text3)] mb-3">Override the default angle order per accessory category. Leave blank to use category defaults.</p>
                <div className="flex flex-col gap-2">
                  {ACCESSORY_CATEGORIES.filter((cat) => cat.id !== 'ghost-mannequin').map((cat) => {
                    const customSeq = brandForm.still_life_angle_sequences[cat.id]
                    const isExpanded = expandedStillLifeCategory === cat.id
                    const hasCustom = customSeq && customSeq.length > 0
                    return (
                      <div key={cat.id} className="border border-[var(--line2)] rounded-sm overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedStillLifeCategory(isExpanded ? null : cat.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--bg3)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[0.78rem] text-[var(--text)]">{cat.label}</span>
                            {hasCustom
                              ? <span className="text-[0.83rem] text-[var(--accent)] bg-[rgba(74,158,255,0.1)] px-[6px] py-[1px] rounded-full">custom</span>
                              : <span className="text-[0.83rem] text-[var(--text3)]">{cat.angles.join(' · ')}</span>
                            }
                          </div>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-[var(--text3)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <path d="M2 3.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 bg-[var(--bg3)] border-t border-[var(--line)]">
                            <div className="flex flex-col gap-[5px] mb-2">
                              {(customSeq?.length ? customSeq : cat.angles).map((angle, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="w-5 text-[0.86rem] text-[var(--text3)] text-right shrink-0">{idx + 1}</span>
                                  <select
                                    value={angle}
                                    onChange={(e) => {
                                      const seq = [...(customSeq?.length ? customSeq : cat.angles)]
                                      seq[idx] = e.target.value
                                      setBrandForm((f) => ({ ...f, still_life_angle_sequences: { ...f.still_life_angle_sequences, [cat.id]: seq } }))
                                    }}
                                    className="flex-1 bg-[var(--bg)] border border-[var(--line2)] rounded-sm px-2 py-[4px] text-[0.8rem] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                                  >
                                    {['front', 'back', 'side', 'detail', 'inside', 'flat-lay', 'top-down', 'front-3/4', 'back-3/4'].map((a) => (
                                      <option key={a} value={a}>{a}</option>
                                    ))}
                                  </select>
                                  <div className="flex flex-col gap-[2px]">
                                    <button type="button" disabled={idx === 0} onClick={() => {
                                      const seq = [...(customSeq?.length ? customSeq : cat.angles)]
                                      ;[seq[idx - 1], seq[idx]] = [seq[idx], seq[idx - 1]]
                                      setBrandForm((f) => ({ ...f, still_life_angle_sequences: { ...f.still_life_angle_sequences, [cat.id]: seq } }))
                                    }} className="w-5 h-4 flex items-center justify-center text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20">▲</button>
                                    <button type="button" disabled={idx >= (customSeq?.length ? customSeq.length : cat.angles.length) - 1} onClick={() => {
                                      const seq = [...(customSeq?.length ? customSeq : cat.angles)]
                                      ;[seq[idx], seq[idx + 1]] = [seq[idx + 1], seq[idx]]
                                      setBrandForm((f) => ({ ...f, still_life_angle_sequences: { ...f.still_life_angle_sequences, [cat.id]: seq } }))
                                    }} className="w-5 h-4 flex items-center justify-center text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20">▼</button>
                                  </div>
                                  <button type="button" onClick={() => {
                                    const seq = [...(customSeq?.length ? customSeq : cat.angles)]
                                    seq.splice(idx, 1)
                                    setBrandForm((f) => ({ ...f, still_life_angle_sequences: { ...f.still_life_angle_sequences, [cat.id]: seq } }))
                                  }} className="w-5 h-4 flex items-center justify-center text-[var(--text3)] hover:text-[var(--accent3)] disabled:opacity-20">×</button>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => {
                                const seq = [...(customSeq?.length ? customSeq : cat.angles), 'front']
                                setBrandForm((f) => ({ ...f, still_life_angle_sequences: { ...f.still_life_angle_sequences, [cat.id]: seq } }))
                              }} className="text-[0.78rem] text-[var(--accent)] hover:underline">+ Add angle</button>
                              {hasCustom && (
                                <button type="button" onClick={() => {
                                  setBrandForm((f) => {
                                    const seqs = { ...f.still_life_angle_sequences }
                                    delete seqs[cat.id]
                                    return { ...f, still_life_angle_sequences: seqs }
                                  })
                                }} className="text-[0.78rem] text-[var(--text3)] hover:text-[var(--accent3)] ml-auto">Reset to default</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Ghost mannequin position */}
              <div className="border-t border-[var(--line)] pt-3">
                <p className="text-[0.8rem] font-medium text-[var(--text2)] mb-1">Ghost Mannequin Position</p>
                <p className="text-[0.86rem] text-[var(--text3)] mb-2">Where the GM shot appears in the exported image sequence</p>
                <div className="inline-flex bg-[var(--bg3)] p-[3px] rounded-sm gap-[2px]">
                  {(['first', 'last'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setBrandForm((f) => ({ ...f, gm_position: pos }))}
                      className={`px-4 py-[5px] rounded-sm text-[0.78rem] font-medium transition-all ${
                        brandForm.gm_position === pos
                          ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm'
                          : 'text-[var(--text3)] hover:text-[var(--text2)]'
                      }`}
                    >
                      {pos === 'first' ? 'Image 1 (Hero)' : 'Last Image'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Naming template */}
              <div className="border-t border-[var(--line)] pt-3">
                <p className="text-[0.8rem] font-medium text-[var(--text2)] mb-2 flex items-center gap-1">
                  Default Naming Template
                  <HelpTooltip
                    position="right"
                    width={260}
                    content={
                      <span>
                        This is your default template — it pre-fills the export panel where you can adjust it per-export. Click tokens to add or remove them; they are joined with underscores in the order shown.<br /><br />
                        <strong>Example:</strong> <code style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{'{SKU}_{COLOR}_{VIEW}'}</code> → <code style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>NS27502_BLACK_FRONT.jpg</code><br /><br />
                        Empty tokens are automatically removed so you never get double underscores.
                      </span>
                    }
                  />
                </p>
                <div className="flex flex-wrap gap-[6px] mb-3">
                  {NAMING_TOKENS.map((t) => {
                    const active = brandForm.naming_template.includes(t.token)
                    return (
                      <button
                        key={t.token}
                        type="button"
                        onClick={() => setBrandForm((f) => ({ ...f, naming_template: toggleToken(f.naming_template, t.token) }))}
                        title={active ? `Remove ${t.token}` : `Add ${t.token}`}
                        className={`px-2 py-[3px] rounded-sm border text-[0.78rem] font-mono transition-all ${
                          active
                            ? 'border-current opacity-100'
                            : 'border-[var(--line2)] text-[var(--text3)] opacity-50 hover:opacity-80'
                        }`}
                        style={active ? { color: t.color, borderColor: t.color, background: `color-mix(in srgb, ${t.color} 10%, transparent)` } : {}}
                      >
                        {t.token}
                        <span className="ml-1 opacity-60 text-[0.6rem] not-italic" style={{ fontFamily: 'inherit' }}>{t.desc}</span>
                      </button>
                    )
                  })}
                </div>
                <input
                  className="input"
                  style={{ fontFamily: 'var(--font-dm-mono)' }}
                  value={brandForm.naming_template}
                  onChange={(e) => setBrandForm((f) => ({ ...f, naming_template: e.target.value }))}
                  placeholder="{BRAND}_{SEQ}_{VIEW}"
                />
                <p className="text-[0.86rem] text-[var(--text3)] mt-2">
                  Preview: <span className="text-[var(--text2)] font-mono">
                    {brandForm.naming_template
                      .replace('{BRAND}', brandForm.brand_code.toUpperCase() || 'BRAND')
                      .replace('{SEQ}', '001')
                      .replace('{SKU}', 'TOP-BLK-001')
                      .replace('{COLOR}', 'BLACK')
                      .replace('{VIEW}', 'FRONT')
                      .replace('{INDEX}', '01')}.jpg
                  </span>
                </p>
              </div>

              {/* Shopify credentials */}
              <div className="border-t border-[var(--line)] pt-3">
                <p className="text-[0.8rem] font-medium text-[var(--text2)] mb-3">Shopify Integration <span className="text-[var(--text3)] font-normal">(optional)</span></p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[0.8rem] text-[var(--text3)] mb-[5px] block">Store Domain</label>
                    <input
                      className="input"
                      style={{ fontFamily: 'var(--font-dm-mono)' }}
                      placeholder="your-store.myshopify.com"
                      autoComplete="off"
                      value={brandForm.shopify_store_url}
                      onChange={(e) => setBrandForm((f) => ({ ...f, shopify_store_url: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[0.8rem] text-[var(--text3)] mb-[5px] block">Access Token</label>
                    <input
                      className="input"
                      type="password"
                      style={{ fontFamily: 'var(--font-dm-mono)' }}
                      placeholder="shpat_..."
                      autoComplete="new-password"
                      value={brandForm.shopify_access_token}
                      onChange={(e) => setBrandForm((f) => ({ ...f, shopify_access_token: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {brandError && (
                <p className="text-[0.78rem] text-[var(--accent3)] bg-[rgba(232,122,122,0.08)] border border-[rgba(232,122,122,0.2)] rounded-sm px-3 py-2">
                  {brandError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--line)]">
              <button onClick={closeBrandModal} className="btn btn-ghost">Cancel</button>
              <button onClick={saveBrand} disabled={brandSaving} className="btn btn-primary">
                {brandSaving ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="6" cy="6" r="4" strokeDasharray="16 8"/>
                    </svg>
                    Saving…
                  </>
                ) : brandModal === 'add' ? 'Add Brand' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
