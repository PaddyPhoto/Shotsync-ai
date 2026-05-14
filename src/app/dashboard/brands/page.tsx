'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'
import { usePlan } from '@/context/PlanContext'
import type { Brand } from '@/lib/brands'
import { ACCESSORY_CATEGORIES } from '@/lib/accessories/categories'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

function toggleToken(template: string, token: string): string {
  const parts = template.split('_').filter(Boolean)
  if (parts.includes(token)) return parts.filter((p) => p !== token).join('_')
  return parts.length ? `${template}_${token}` : token
}

const NAMING_TOKENS = [
  { token: '{BRAND}',        color: 'var(--accent3)', desc: 'Brand code' },
  { token: '{SEQ}',          color: 'var(--accent)',  desc: 'Look #' },
  { token: '{SKU}',          color: 'var(--accent)',  desc: 'SKU' },
  { token: '{STYLE_NUMBER}', color: 'var(--accent)',  desc: 'Style #' },
  { token: '{COLOR}',        color: 'var(--accent2)', desc: 'Colour' },
  { token: '{COLOUR_CODE}',  color: 'var(--accent2)', desc: 'Colour code' },
  { token: '{VIEW}',         color: 'var(--accent4)', desc: 'Angle (text)' },
  { token: '{VIEW_NUM}',     color: 'var(--accent4)', desc: 'Angle (number)' },
  { token: '{INDEX}',        color: 'var(--accent4)', desc: 'Image #' },
  { token: '{CUSTOM_TEXT}',  color: 'var(--text3)',   desc: 'Fixed text' },
]

const COMING_SOON_MARKETS = [
  { id: 'iconic',      name: 'THE ICONIC',  api: 'SellerCenter API' },
  { id: 'myer',        name: 'Myer',        api: 'Supplier Portal API' },
  { id: 'david-jones', name: 'David Jones', api: 'Content API' },
]

type BrandForm = {
  name: string
  brand_code: string
  shopify_store_url: string
  iconic_user_id: string
  iconic_api_key: string
  logo_color: string
  images_per_look: number
  on_model_angle_sequence: string[]
  still_life_angle_sequences: Record<string, string[]>
  naming_template: string
  gm_position: 'first' | 'last'
  voice_brief: string
  copy_examples: string[]
  cin7_account_id: string
  cin7_application_key: string
}

const DEFAULT_FORM: BrandForm = {
  name: '',
  brand_code: '',
  shopify_store_url: '',
  iconic_user_id: '',
  iconic_api_key: '',
  logo_color: '#e8d97a',
  images_per_look: 4,
  on_model_angle_sequence: ['full-length', 'front', 'side', 'mood', 'detail', 'back'],
  still_life_angle_sequences: {},
  naming_template: '{BRAND}_{SEQ}_{VIEW}',
  gm_position: 'last',
  voice_brief: '',
  copy_examples: [],
  cin7_account_id: '',
  cin7_application_key: '',
}

function brandToForm(b: Brand): BrandForm {
  return {
    name: b.name,
    brand_code: b.brand_code,
    shopify_store_url: b.shopify_store_url ?? '',
    iconic_user_id: b.iconic_user_id ?? '',
    iconic_api_key: b.iconic_api_key ?? '',
    logo_color: b.logo_color,
    images_per_look: b.images_per_look ?? 4,
    on_model_angle_sequence: b.on_model_angle_sequence?.length ? b.on_model_angle_sequence : DEFAULT_FORM.on_model_angle_sequence,
    still_life_angle_sequences: b.still_life_angle_sequences ?? {},
    naming_template: b.naming_template ?? DEFAULT_FORM.naming_template,
    gm_position: (b.gm_position ?? 'last') as 'first' | 'last',
    voice_brief: b.voice_brief ?? '',
    copy_examples: b.copy_examples ?? [],
    cin7_account_id: b.cin7_account_id ?? '',
    cin7_application_key: b.cin7_application_key ?? '',
  }
}

export default function BrandsPageWrapper() {
  return <Suspense><BrandsPage /></Suspense>
}

function BrandsPage() {
  const { brands, setBrands, refreshBrands } = useBrand()
  const { plan, canAddBrand, openUpgrade } = usePlan()
  const searchParams = useSearchParams()

  const [toast, setToast] = useState<string | null>(null)
  const [toastOk, setToastOk] = useState(true)
  const [expandedId, setExpandedId] = useState<string | 'new' | null>(null)
  const [forms, setForms] = useState<Record<string, BrandForm>>({})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedStillLife, setExpandedStillLife] = useState<Record<string, string | null>>({})

  useEffect(() => {
    const connected = searchParams.get('shopify_connected')
    const error = searchParams.get('shopify_error')
    if (connected) {
      setToastOk(true); setToast('Shopify connected successfully!')
      refreshBrands()
      window.history.replaceState({}, '', '/dashboard/brands')
    } else if (error) {
      const msgs: Record<string, string> = {
        plan_limit: 'Your plan limit for Shopify stores has been reached.',
        unauthorized: 'Session expired — please log in again.',
        token_exchange_failed: 'Could not complete Shopify authorisation. Try again.',
        invalid_state: 'Security check failed. Try connecting again.',
        save_failed: 'Connected but failed to save — please try again.',
      }
      setToastOk(false); setToast(msgs[error] ?? 'Shopify connection failed. Try again.')
      window.history.replaceState({}, '', '/dashboard/brands')
    }
  }, [searchParams, refreshBrands])

  const getForm = (id: string): BrandForm => forms[id] ?? DEFAULT_FORM

  const openExpand = (id: string | 'new', brand?: Brand) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (id !== 'new' && brand) setForms((f) => ({ ...f, [id]: brandToForm(brand) }))
    if (id === 'new') setForms((f) => ({ ...f, new: { ...DEFAULT_FORM } }))
    setErrors((e) => ({ ...e, [id]: '' }))
  }

  const setFormField = (id: string, patch: Partial<BrandForm>) => {
    setForms((f) => ({ ...f, [id]: { ...(f[id] ?? DEFAULT_FORM), ...patch } }))
  }

  const saveBrand = async (id: string) => {
    const form = getForm(id)
    if (!form.name.trim() || !form.brand_code.trim()) {
      setErrors((e) => ({ ...e, [id]: 'Name and brand code are required.' })); return
    }
    if (form.brand_code.length > 6) {
      setErrors((e) => ({ ...e, [id]: 'Brand code must be 6 characters or fewer.' })); return
    }
    setSaving(true); setErrors((e) => ({ ...e, [id]: '' }))
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      }
      if (id === 'new') {
        const res = await fetch('/api/brands', { method: 'POST', headers: authHeaders, body: JSON.stringify(form) })
        const d = await res.json()
        if (!res.ok) { setErrors((e) => ({ ...e, new: d.error ?? 'Failed to create brand' })); return }
        if (d.data) setBrands([...brands, d.data])
        else await refreshBrands()
        if (d.data?.id && form.shopify_store_url.trim()) {
          window.location.href = `/api/shopify/connect?brand_id=${d.data.id}&shop=${encodeURIComponent(form.shopify_store_url.trim())}`
          return
        }
        setExpandedId(null)
      } else {
        const brand = brands.find((b) => b.id === id)
        if (!brand) return
        const res = await fetch(`/api/brands/${id}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify(form) })
        const d = await res.json()
        if (!res.ok) { setErrors((e) => ({ ...e, [id]: d.error ?? 'Failed to update brand' })); return }
        const updated = d.data ?? { ...brand, ...form }
        setBrands(brands.map((b) => (b.id === id ? updated : b)))
        setToastOk(true); setToast('Brand saved.')
        setTimeout(() => setToast(null), 2500)
      }
    } finally { setSaving(false) }
  }

  const deleteBrand = async (id: string) => {
    setDeletingId(id)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      await fetch(`/api/brands/${id}`, {
        method: 'DELETE',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      setBrands(brands.filter((b) => b.id !== id))
      if (expandedId === id) setExpandedId(null)
    } finally { setDeletingId(null) }
  }

  const disconnectShopify = async (brand: Brand) => {
    const { createClient } = await import('@/lib/supabase/client')
    const { data: { session } } = await createClient().auth.getSession()
    await fetch(`/api/brands/${brand.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ shopify_store_url: null, shopify_access_token: null }),
    })
    await refreshBrands()
    setFormField(brand.id, { shopify_store_url: '' })
  }

  return (
    <div>
      {toast && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-[10px] rounded-[10px] text-[0.85rem] font-medium shadow-lg cursor-pointer"
          style={{
            background: toastOk ? 'rgba(48,209,88,0.12)' : 'rgba(255,59,48,0.12)',
            border: `1px solid ${toastOk ? 'rgba(48,209,88,0.35)' : 'rgba(255,59,48,0.3)'}`,
            color: 'var(--text)', whiteSpace: 'nowrap',
          }}
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}

      <Topbar breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Brands' }]} />

      <div className="p-7">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>Brands</h1>
            <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">Configure brand settings, naming templates, and platform connections.</p>
          </div>
          <button
            onClick={() => canAddBrand(brands.length) ? openExpand('new') : openUpgrade(`Your plan supports up to ${plan.limits.brands} brand${plan.limits.brands === 1 ? '' : 's'}. Upgrade to add more.`)}
            className="btn btn-primary btn-sm flex-shrink-0"
          >
            {!canAddBrand(brands.length)
              ? <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor" opacity=".8"><rect x="2" y="5" width="7" height="5" rx="1"/><path d="M3.5 5V3.5a2 2 0 0 1 4 0V5" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>
              : <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
            }
            Add Brand
          </button>
        </div>

        <div className="flex flex-col gap-4 max-w-[900px]">
          {expandedId === 'new' && (
            <BrandCard
              id="new"
              brand={null}
              form={getForm('new')}
              expanded
              saving={saving}
              error={errors['new'] ?? ''}
              expandedStillLife={expandedStillLife['new'] ?? null}
              onToggle={() => openExpand('new')}
              onFormChange={(patch) => setFormField('new', patch)}
              onSave={() => saveBrand('new')}
              onDelete={null}
              onDisconnectShopify={null}
              onSetStillLife={(cat) => setExpandedStillLife((s) => ({ ...s, new: s['new'] === cat ? null : cat }))}
            />
          )}

          {brands.length === 0 && expandedId !== 'new' ? (
            <div className="card">
              <div className="card-body py-12 text-center">
                <p className="text-[0.88rem] text-[var(--text3)]">No brands yet.</p>
                <p className="text-[0.85rem] text-[var(--text3)] mt-1">Add a brand to start organising your jobs.</p>
                <button onClick={() => canAddBrand(0) ? openExpand('new') : openUpgrade('Upgrade to add brands.')} className="btn btn-primary btn-sm mt-4 mx-auto">
                  Add your first brand
                </button>
              </div>
            </div>
          ) : (
            brands.map((brand) => (
              <BrandCard
                key={brand.id}
                id={brand.id}
                brand={brand}
                form={getForm(brand.id)}
                expanded={expandedId === brand.id}
                saving={saving && expandedId === brand.id}
                error={errors[brand.id] ?? ''}
                expandedStillLife={expandedStillLife[brand.id] ?? null}
                deletingId={deletingId}
                onToggle={() => openExpand(brand.id, brand)}
                onFormChange={(patch) => setFormField(brand.id, patch)}
                onSave={() => saveBrand(brand.id)}
                onDelete={() => deleteBrand(brand.id)}
                onDisconnectShopify={() => disconnectShopify(brand)}
                onSetStillLife={(cat) => setExpandedStillLife((s) => ({ ...s, [brand.id]: s[brand.id] === cat ? null : cat }))}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Brand card ────────────────────────────────────────────────────────────────

interface BrandCardProps {
  id: string
  brand: Brand | null
  form: BrandForm
  expanded: boolean
  saving: boolean
  error: string
  expandedStillLife: string | null
  deletingId?: string | null
  onToggle: () => void
  onFormChange: (patch: Partial<BrandForm>) => void
  onSave: () => void
  onDelete: (() => void) | null
  onDisconnectShopify: (() => void) | null
  onSetStillLife: (cat: string) => void
}

function BrandCard({ id, brand, form, expanded, saving, error, expandedStillLife, deletingId, onToggle, onFormChange, onSave, onDelete, onDisconnectShopify, onSetStillLife }: BrandCardProps) {
  const isNew = id === 'new'
  const shopifyConnected = !!brand?.shopify_authenticated
  const shopifyUrlSaved = !!brand?.shopify_store_url

  // ── NEW BRAND: single card ───────────────────────────────────────────────
  if (isNew) {
    return (
      <div className="card overflow-hidden" style={{ borderLeft: '3px solid var(--line2)' }}>
        <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--line)]">
          <div className="w-10 h-10 rounded-[8px] flex items-center justify-center text-[0.85rem] font-bold flex-shrink-0 bg-[var(--bg4)] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>+</div>
          <h2 className="text-[1rem] font-semibold text-[var(--text)] flex-1">New Brand</h2>
          <button type="button" onClick={onToggle} className="text-[var(--text3)] hover:text-[var(--text)] transition-colors" title="Cancel">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
          </button>
        </div>

        <Section title="Brand Identity">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[0.85rem] text-[var(--text2)] mb-[5px] block">Brand Name *</label>
              <input className="input" placeholder="e.g. Studio Label" value={form.name} onChange={(e) => onFormChange({ name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="text-[0.85rem] text-[var(--text2)] mb-[5px] block">Brand Code * <span className="text-[var(--text3)]">(max 6 chars)</span></label>
              <input className="input font-mono" placeholder="SL" maxLength={6} value={form.brand_code} onChange={(e) => onFormChange({ brand_code: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="text-[0.85rem] text-[var(--text2)] mb-[5px] block">Accent Colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.logo_color} onChange={(e) => onFormChange({ logo_color: e.target.value })} className="w-9 h-9 rounded-sm border border-[var(--line2)] bg-transparent cursor-pointer flex-shrink-0" />
                <input className="input flex-1 font-mono" value={form.logo_color} onChange={(e) => onFormChange({ logo_color: e.target.value })} />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Shopify (optional)">
          <p className="text-[0.8rem] text-[var(--text3)] mb-2">Add a store domain to connect after saving.</p>
          <input className="input text-[0.82rem] font-mono" placeholder="your-store.myshopify.com" value={form.shopify_store_url} onChange={(e) => onFormChange({ shopify_store_url: e.target.value })} />
          {form.shopify_store_url.trim() && <p className="text-[0.77rem] text-[var(--text3)] mt-1">You&apos;ll be redirected to Shopify to authorise after saving.</p>}
        </Section>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--line)] bg-[var(--bg3)]">
          <div>{error && <p className="text-[0.85rem] text-[#ff3b30]">{error}</p>}</div>
          <button onClick={onSave} disabled={saving} className="btn btn-primary">
            {saving
              ? <><svg width="12" height="12" viewBox="0 0 12 12" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="4" strokeDasharray="16 8"/></svg>Saving…</>
              : form.shopify_store_url.trim() ? 'Add Brand & Connect Shopify' : 'Add Brand'}
          </button>
        </div>
      </div>
    )
  }

  // ── EXISTING BRAND: two cards ────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">

      {/* ═══ Card 1: Brand Settings ══════════════════════════════════════════ */}
      <div className="card overflow-hidden" style={{ borderLeft: `3px solid ${brand!.logo_color}` }}>

        {/* Header row */}
        <div className="flex items-center gap-4 px-6 py-4">
          <div
            className="w-11 h-11 rounded-[8px] flex items-center justify-center text-[0.85rem] font-bold flex-shrink-0"
            style={{ background: brand!.logo_color, color: '#000', fontFamily: 'var(--font-dm-mono)' }}
          >
            {brand!.brand_code.slice(0, 3)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[1rem] font-semibold text-[var(--text)] leading-tight">{brand!.name}</h2>
            <p className="text-[0.8rem] text-[var(--text3)] font-mono mt-[2px]">{brand!.brand_code}</p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="btn btn-ghost btn-sm flex-shrink-0 gap-[5px]"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {expanded ? 'Close' : 'Edit settings'}
          </button>
        </div>

        {/* Settings preview with gradient fade — collapsed only */}
        {!expanded && (
          <div className="border-t border-[var(--line)]">
            <div className="relative overflow-hidden" style={{ maxHeight: '86px' }}>
              <div className="px-6 pt-4 pb-2 grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-[0.73rem] uppercase tracking-[0.05em] text-[var(--text3)] mb-[3px]">Naming template</p>
                  <p className="text-[0.85rem] font-mono text-[var(--text2)]">{brand!.naming_template || '—'}</p>
                </div>
                <div>
                  <p className="text-[0.73rem] uppercase tracking-[0.05em] text-[var(--text3)] mb-[3px]">Shots per look</p>
                  <p className="text-[0.85rem] text-[var(--text2)]">{brand!.images_per_look ?? 4} on-model</p>
                </div>
                <div>
                  <p className="text-[0.73rem] uppercase tracking-[0.05em] text-[var(--text3)] mb-[3px]">GM position</p>
                  <p className="text-[0.85rem] text-[var(--text2)] capitalize">{brand!.gm_position ?? 'last'}</p>
                </div>
                <div>
                  <p className="text-[0.73rem] uppercase tracking-[0.05em] text-[var(--text3)] mb-[3px]">Accent colour</p>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: brand!.logo_color }} />
                    <p className="text-[0.85rem] font-mono text-[var(--text2)]">{brand!.logo_color}</p>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-[40px] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--bg2))' }} />
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="w-full flex items-center justify-center gap-1.5 py-[10px] text-[0.85rem] text-[var(--text3)] hover:text-[var(--text)] transition-colors border-t border-[var(--line)]"
            >
              <span>Expand to edit</span>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}

        {/* Full edit form — expanded only */}
        {expanded && (
          <div className="border-t border-[var(--line)]">

            {/* Brand Identity */}
            <Section title="Brand Identity">
              <div className="flex items-center gap-4 p-4 rounded-[8px] bg-[var(--bg3)] border border-[var(--line)] mb-4">
                <div
                  className="w-12 h-12 rounded-[8px] flex items-center justify-center text-[0.9rem] font-bold flex-shrink-0 transition-all"
                  style={{ background: form.logo_color || '#e8d97a', color: '#000', fontFamily: 'var(--font-dm-mono)' }}
                >
                  {form.brand_code.toUpperCase().slice(0, 3) || '??'}
                </div>
                <div>
                  <p className="text-[0.95rem] font-semibold text-[var(--text)]">{form.name || 'Brand Name'}</p>
                  <p className="text-[0.82rem] text-[var(--text3)] font-mono">{form.brand_code.toUpperCase() || 'CODE'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[0.85rem] text-[var(--text2)] mb-[5px] block">Brand Name *</label>
                  <input className="input" placeholder="e.g. Studio Label" value={form.name} onChange={(e) => onFormChange({ name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[0.85rem] text-[var(--text2)] mb-[5px] block">Brand Code * <span className="text-[var(--text3)]">(max 6 chars)</span></label>
                  <input className="input font-mono" placeholder="SL" maxLength={6} value={form.brand_code} onChange={(e) => onFormChange({ brand_code: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label className="text-[0.85rem] text-[var(--text2)] mb-[5px] block">Accent Colour</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.logo_color} onChange={(e) => onFormChange({ logo_color: e.target.value })} className="w-9 h-9 rounded-sm border border-[var(--line2)] bg-transparent cursor-pointer flex-shrink-0" />
                    <input className="input flex-1 font-mono" value={form.logo_color} onChange={(e) => onFormChange({ logo_color: e.target.value })} />
                  </div>
                </div>
              </div>
            </Section>

            {/* Shot Configuration */}
            <Section title="Shot Configuration">
              <div className="mb-4">
                <label className="text-[0.85rem] text-[var(--text2)] mb-2 block">Images per Look — On-Model</label>
                <div className="flex gap-2 flex-wrap mb-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        const seq = [...form.on_model_angle_sequence]
                        const ALL_ON_MODEL = ['full-length', 'front', 'side', 'mood', 'detail', 'back', 'front-3/4', 'back-3/4']
                        while (seq.length < n) seq.push(ALL_ON_MODEL[seq.length] ?? 'front')
                        onFormChange({ images_per_look: n, on_model_angle_sequence: seq.slice(0, n) })
                      }}
                      className={`w-9 h-9 rounded-sm border text-[0.8rem] font-medium transition-all ${form.images_per_look === n ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.1)] text-[var(--accent)]' : 'border-[var(--line2)] text-[var(--text2)] hover:border-[var(--line)]'}`}
                    >{n}</button>
                  ))}
                </div>
                <div className="space-y-1">
                  {form.on_model_angle_sequence.slice(0, form.images_per_look).map((angle, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-[0.82rem] text-[var(--text3)] text-right shrink-0">{idx + 1}</span>
                      <select value={angle} onChange={(e) => { const seq = [...form.on_model_angle_sequence]; seq[idx] = e.target.value; onFormChange({ on_model_angle_sequence: seq }) }} className="flex-1 bg-[var(--bg3)] border border-[var(--line2)] rounded-sm px-2 py-[4px] text-[0.85rem] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]">
                        {['full-length', 'front', 'back', 'side', 'detail', 'mood', 'front-3/4', 'back-3/4', 'flat-lay'].map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <button type="button" disabled={idx === 0} onClick={() => { const seq = [...form.on_model_angle_sequence]; [seq[idx - 1], seq[idx]] = [seq[idx], seq[idx - 1]]; onFormChange({ on_model_angle_sequence: seq }) }} className="text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20 px-1">▲</button>
                      <button type="button" disabled={idx >= form.images_per_look - 1} onClick={() => { const seq = [...form.on_model_angle_sequence]; [seq[idx], seq[idx + 1]] = [seq[idx + 1], seq[idx]]; onFormChange({ on_model_angle_sequence: seq }) }} className="text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20 px-1">▼</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[0.85rem] text-[var(--text2)] mb-1">Ghost Mannequin Position</p>
                <p className="text-[0.8rem] text-[var(--text3)] mb-2">Where the GM shot appears in the exported image sequence</p>
                <div className="inline-flex bg-[var(--bg3)] p-[3px] rounded-sm gap-[2px]">
                  {(['first', 'last'] as const).map((pos) => (
                    <button key={pos} type="button" onClick={() => onFormChange({ gm_position: pos })} className={`px-4 py-[5px] rounded-sm text-[0.85rem] font-medium transition-all ${form.gm_position === pos ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm' : 'text-[var(--text3)] hover:text-[var(--text2)]'}`}>
                      {pos === 'first' ? 'Image 1 (Hero)' : 'Last Image'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[0.85rem] text-[var(--text2)] mb-1">Still Life Angle Sequences</p>
                <p className="text-[0.8rem] text-[var(--text3)] mb-2">Override the default angle order per accessory category. Leave blank to use category defaults.</p>
                <div className="flex flex-col gap-2">
                  {ACCESSORY_CATEGORIES.filter((cat) => cat.id !== 'ghost-mannequin').map((cat) => {
                    const customSeq = form.still_life_angle_sequences[cat.id]
                    const isOpen = expandedStillLife === cat.id
                    const hasCustom = customSeq && customSeq.length > 0
                    return (
                      <div key={cat.id} className="border border-[var(--line2)] rounded-sm overflow-hidden">
                        <button type="button" onClick={() => onSetStillLife(cat.id)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--bg3)] transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-[0.85rem] text-[var(--text)]">{cat.label}</span>
                            {hasCustom
                              ? <span className="text-[0.77rem] text-[var(--accent)] bg-[rgba(74,158,255,0.1)] px-[6px] py-[1px] rounded-full">custom</span>
                              : <span className="text-[0.8rem] text-[var(--text3)]">{cat.angles.join(' · ')}</span>}
                          </div>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-[var(--text3)] transition-transform ${isOpen ? 'rotate-180' : ''}`}><path d="M2 3.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3 pt-1 bg-[var(--bg3)] border-t border-[var(--line)]">
                            <div className="flex flex-col gap-[5px] mb-2">
                              {(customSeq?.length ? customSeq : cat.angles).map((angle, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="w-5 text-[0.82rem] text-[var(--text3)] text-right shrink-0">{idx + 1}</span>
                                  <select value={angle} onChange={(e) => { const seq = [...(customSeq?.length ? customSeq : cat.angles)]; seq[idx] = e.target.value; onFormChange({ still_life_angle_sequences: { ...form.still_life_angle_sequences, [cat.id]: seq } }) }} className="flex-1 bg-[var(--bg)] border border-[var(--line2)] rounded-sm px-2 py-[4px] text-[0.85rem] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]">
                                    {['front', 'back', 'side', 'detail', 'inside', 'flat-lay', 'top-down', 'front-3/4', 'back-3/4'].map((a) => <option key={a} value={a}>{a}</option>)}
                                  </select>
                                  <button type="button" disabled={idx === 0} onClick={() => { const seq = [...(customSeq?.length ? customSeq : cat.angles)]; [seq[idx - 1], seq[idx]] = [seq[idx], seq[idx - 1]]; onFormChange({ still_life_angle_sequences: { ...form.still_life_angle_sequences, [cat.id]: seq } }) }} className="text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20 px-1">▲</button>
                                  <button type="button" disabled={idx >= (customSeq?.length || cat.angles.length) - 1} onClick={() => { const seq = [...(customSeq?.length ? customSeq : cat.angles)]; [seq[idx], seq[idx + 1]] = [seq[idx + 1], seq[idx]]; onFormChange({ still_life_angle_sequences: { ...form.still_life_angle_sequences, [cat.id]: seq } }) }} className="text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20 px-1">▼</button>
                                  <button type="button" onClick={() => { const seq = [...(customSeq?.length ? customSeq : cat.angles)]; seq.splice(idx, 1); onFormChange({ still_life_angle_sequences: { ...form.still_life_angle_sequences, [cat.id]: seq } }) }} className="text-[var(--text3)] hover:text-[var(--accent3)] px-1">×</button>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => { const seq = [...(customSeq?.length ? customSeq : cat.angles), 'front']; onFormChange({ still_life_angle_sequences: { ...form.still_life_angle_sequences, [cat.id]: seq } }) }} className="text-[0.82rem] text-[var(--accent)] hover:underline">+ Add angle</button>
                              {hasCustom && <button type="button" onClick={() => { const s = { ...form.still_life_angle_sequences }; delete s[cat.id]; onFormChange({ still_life_angle_sequences: s }) }} className="text-[0.82rem] text-[var(--text3)] hover:text-[var(--accent3)] ml-auto">Reset to default</button>}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </Section>

            {/* Naming Template */}
            <Section title="Default Naming Template" help={<span>Pre-fills the naming template in the export panel. Click tokens to add or remove them.<br /><br /><strong>Example:</strong> <code style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{'{SKU}_{COLOR}_{VIEW}'}</code> → <code style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>NS27502_BLACK_FRONT.jpg</code></span>}>
              <div className="flex flex-wrap gap-[6px] mb-3">
                {NAMING_TOKENS.map((t) => {
                  const active = form.naming_template.includes(t.token)
                  return (
                    <button key={t.token} type="button" onClick={() => onFormChange({ naming_template: toggleToken(form.naming_template, t.token) })} title={t.desc} className={`px-2 py-[3px] rounded-sm border text-[0.82rem] font-mono transition-all ${active ? 'border-current opacity-100' : 'border-[var(--line2)] text-[var(--text3)] opacity-50 hover:opacity-80'}`} style={active ? { color: t.color, borderColor: t.color, background: `color-mix(in srgb, ${t.color} 10%, transparent)` } : {}}>
                      {t.token}
                    </button>
                  )
                })}
              </div>
              <input className="input font-mono" value={form.naming_template} onChange={(e) => onFormChange({ naming_template: e.target.value })} placeholder="{BRAND}_{SEQ}_{VIEW}" />
              <p className="text-[0.8rem] text-[var(--text3)] mt-2">
                Preview: <span className="text-[var(--text2)] font-mono">
                  {form.naming_template.replace('{BRAND}', form.brand_code.toUpperCase() || 'BRAND').replace('{SEQ}', '001').replace('{SKU}', 'TOP-BLK-001').replace('{COLOR}', 'BLACK').replace('{VIEW_NUM}', '5').replace('{VIEW}', 'FRONT').replace('{INDEX}', '01')}.jpg
                </span>
              </p>
            </Section>

            {/* Brand Voice */}
            <Section title="Brand Voice" help={<span>Personalises AI-generated product copy to match your brand's tone.<br /><br /><strong>Tone brief:</strong> describe how your brand sounds — words you use, words to avoid, personality.<br /><strong>Example copy:</strong> paste 1–3 product descriptions you&apos;re happy with. The AI will mirror their structure and vocabulary closely.</span>}>
              <div className="mb-4">
                <label className="text-[0.85rem] text-[var(--text2)] mb-[5px] block">Tone Brief</label>
                <textarea
                  className="input text-[0.85rem] leading-relaxed resize-none"
                  rows={3}
                  placeholder={'e.g. Confident and editorial. We lead with the garment name, never with "Elevate" or "Discover". We avoid the word "timeless". We say "relaxed fit" not "relaxed silhouette".'}
                  value={form.voice_brief}
                  onChange={(e) => onFormChange({ voice_brief: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[0.85rem] text-[var(--text2)] mb-[5px] block">Example Descriptions <span className="text-[var(--text3)]">(1–3 product descriptions in your brand&apos;s voice)</span></label>
                <div className="flex flex-col gap-2">
                  {(form.copy_examples.length ? form.copy_examples : ['']).map((ex, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <textarea
                        className="input text-[0.85rem] leading-relaxed resize-none flex-1"
                        rows={4}
                        placeholder={`Example ${i + 1} — paste a product description you're happy with`}
                        value={ex}
                        onChange={(e) => {
                          const next = [...form.copy_examples]
                          next[i] = e.target.value
                          onFormChange({ copy_examples: next })
                        }}
                      />
                      {form.copy_examples.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onFormChange({ copy_examples: form.copy_examples.filter((_, j) => j !== i) })}
                          className="mt-[6px] text-[var(--text3)] hover:text-[var(--accent3)] transition-colors flex-shrink-0"
                          title="Remove example"
                        >
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.copy_examples.length < 3 && (
                  <button
                    type="button"
                    onClick={() => onFormChange({ copy_examples: [...form.copy_examples, ''] })}
                    className="mt-2 text-[0.82rem] text-[var(--accent)] hover:underline"
                  >
                    + Add example
                  </button>
                )}
              </div>
            </Section>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--line)] bg-[var(--bg3)]">
              <div>
                {error && <p className="text-[0.85rem] text-[#ff3b30]">{error}</p>}
              </div>
              <div className="flex items-center gap-3">
                {onDelete && (
                  <button type="button" onClick={onDelete} disabled={deletingId === id} className="text-[0.85rem] text-[var(--text3)] hover:text-[#ff3b30] transition-colors disabled:opacity-40">
                    {deletingId === id ? 'Deleting…' : 'Delete brand'}
                  </button>
                )}
                <button onClick={onSave} disabled={saving} className="btn btn-primary">
                  {saving
                    ? <><svg width="12" height="12" viewBox="0 0 12 12" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="4" strokeDasharray="16 8"/></svg>Saving…</>
                    : 'Save Changes'}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
      {/* end Card 1: Brand Settings */}

      {/* ═══ Card 2: Marketplace Integrations ═══════════════════════════════ */}
      <div className="card overflow-hidden" style={{ borderLeft: `3px solid ${brand!.logo_color}` }}>
        <div className="px-6 py-4 border-b border-[var(--line)]">
          <h3 className="text-[0.88rem] font-semibold text-[var(--text)]">Marketplace Integrations</h3>
          <p className="text-[0.85rem] text-[var(--text3)] mt-[3px]">Connect platforms to push images directly from any export.</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">

            {/* Shopify */}
            <div className="flex flex-col gap-3 p-4 rounded-[8px] border border-[var(--line2)] bg-[var(--bg3)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[6px] bg-[#96bf48] flex items-center justify-center flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M15.337 23.979l7.453-1.61S19.186 5.44 19.163 5.28a.326.326 0 0 0-.32-.28c-.146 0-2.718-.05-2.718-.05s-1.79-1.73-1.99-1.93v20.96zM11.43 6.08S10.64 5.8 9.6 5.8c-1.6 0-1.68.998-1.68 1.25 0 1.37 3.79 1.9 3.79 5.12 0 2.54-1.61 4.17-3.78 4.17-2.6 0-3.93-1.62-3.93-1.62l.7-2.3s1.37 1.17 2.52 1.17c.75 0 1.06-.59 1.06-1.02 0-1.79-3.11-1.87-3.11-4.82 0-2.48 1.79-4.88 5.38-4.88 1.38 0 2.07.4 2.07.4L11.43 6.08z"/></svg>
                </div>
                <span className="text-[0.82rem] font-semibold text-[var(--text)]">Shopify</span>
              </div>
              {brand?.shopify_store_url ? (
                <div className="flex-1 flex flex-col gap-2">
                  <div className={`flex items-center gap-1.5 text-[0.8rem] font-medium ${shopifyConnected ? 'text-[var(--accent2)]' : 'text-[#ff9f0a]'}`}>
                    <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: shopifyConnected ? 'var(--accent2)' : '#ff9f0a' }} />
                    {shopifyConnected ? 'Connected' : 'Auth needed'}
                  </div>
                  <p className="text-[0.77rem] text-[var(--text3)] truncate">{brand.shopify_store_url}</p>
                  <div className="flex flex-col gap-1 mt-auto">
                    <a href={`/api/shopify/connect?brand_id=${brand.id}&shop=${encodeURIComponent(brand.shopify_store_url)}`} className="btn btn-ghost btn-sm text-[0.8rem] text-center">
                      {shopifyConnected ? 'Re-authorise' : 'Connect Shopify'}
                    </a>
                    {onDisconnectShopify && (
                      <button type="button" onClick={onDisconnectShopify} className="text-[0.77rem] text-[var(--text3)] hover:text-[#ff3b30] transition-colors text-center">Disconnect</button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-2">
                  <p className="text-[0.8rem] text-[var(--text3)]">No store configured</p>
                  <input className="input text-[0.82rem] font-mono" placeholder="your-store.myshopify.com" value={form.shopify_store_url} onChange={(e) => onFormChange({ shopify_store_url: e.target.value })} />
                  {form.shopify_store_url.trim() && (
                    <a href={`/api/shopify/connect?brand_id=${brand!.id}&shop=${encodeURIComponent(form.shopify_store_url.trim())}`} className="btn btn-primary btn-sm text-[0.8rem] text-center">Connect Shopify</a>
                  )}
                </div>
              )}
            </div>

            {/* Cin7 Core */}
            <div className="flex flex-col gap-3 p-4 rounded-[8px] border border-[var(--line2)] bg-[var(--bg3)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0" style={{ background: '#00b4d8' }}>
                    <span className="text-white font-bold text-[0.7rem]" style={{ fontFamily: 'var(--font-dm-mono)' }}>C7</span>
                  </div>
                  <span className="text-[0.82rem] font-semibold text-[var(--text)]">Cin7 Core</span>
                </div>
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.06em] px-[6px] py-[2px] rounded-full border border-[var(--line2)] text-[var(--text3)]">Soon</span>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <input
                  className="input text-[0.82rem] font-mono"
                  placeholder="Account ID"
                  value={form.cin7_account_id}
                  onChange={(e) => onFormChange({ cin7_account_id: e.target.value })}
                  autoComplete="off"
                />
                <input
                  className="input text-[0.82rem] font-mono"
                  type="password"
                  placeholder="Application Key"
                  value={form.cin7_application_key}
                  onChange={(e) => onFormChange({ cin7_application_key: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
              <p className="text-[0.75rem] text-[var(--text3)]">Pulls your product catalogue and pushes enriched copy + images back to Cin7.</p>
            </div>

            {/* THE ICONIC — credential fields wired, disabled until live */}
            <div className="flex flex-col gap-3 p-4 rounded-[8px] border border-[var(--line2)] bg-[var(--bg3)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[6px] bg-[var(--bg)] border border-[var(--line2)] flex items-center justify-center flex-shrink-0">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="var(--text3)" strokeWidth="1.5"><rect x="1.5" y="5" width="8" height="5" rx="0.8"/><path d="M3.5 5V3.5a2 2 0 014 0V5"/></svg>
                  </div>
                  <span className="text-[0.82rem] font-semibold text-[var(--text)]">THE ICONIC</span>
                </div>
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.06em] px-[6px] py-[2px] rounded-full border border-[var(--line2)] text-[var(--text3)]">Soon</span>
              </div>
              <div className="flex flex-col gap-2 opacity-50 pointer-events-none select-none flex-1">
                <input className="input text-[0.82rem]" placeholder="seller@yourbrand.com" value={form.iconic_user_id} onChange={(e) => onFormChange({ iconic_user_id: e.target.value })} disabled autoComplete="off" />
                <input className="input text-[0.82rem] font-mono" type="password" placeholder="API key" value={form.iconic_api_key} onChange={(e) => onFormChange({ iconic_api_key: e.target.value })} disabled autoComplete="new-password" />
              </div>
              <p className="text-[0.75rem] text-[var(--text3)]">SellerCenter API — no OAuth required.</p>
            </div>

            {/* Myer + David Jones */}
            {COMING_SOON_MARKETS.filter((m) => m.id !== 'iconic').map((market) => (
              <div key={market.id} className="flex flex-col gap-3 p-4 rounded-[8px] border border-[var(--line2)] bg-[var(--bg3)] opacity-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[6px] bg-[var(--bg)] border border-[var(--line2)] flex items-center justify-center flex-shrink-0">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="var(--text3)" strokeWidth="1.5"><rect x="1.5" y="5" width="8" height="5" rx="0.8"/><path d="M3.5 5V3.5a2 2 0 014 0V5"/></svg>
                  </div>
                  <span className="text-[0.82rem] font-semibold text-[var(--text)]">{market.name}</span>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[0.8rem] text-[var(--text3)]">
                    <div className="w-[5px] h-[5px] rounded-full bg-[var(--bg4)] flex-shrink-0" />
                    Coming soon
                  </div>
                  <p className="text-[0.77rem] text-[var(--text3)]">{market.api}</p>
                </div>
                <button disabled className="btn btn-ghost btn-sm text-[0.8rem] cursor-not-allowed self-start">Connect</button>
              </div>
            ))}

          </div>
        </div>
      </div>
      {/* end Card 2: Marketplace Integrations */}

    </div>
  )
}

function Section({ title, help, children }: { title: string; help?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 border-b border-[var(--line)]">
      <div className="flex items-center gap-1 mb-4">
        <h3 className="text-[0.82rem] font-semibold text-[var(--text)] uppercase tracking-[0.05em]">{title}</h3>
        {help && <HelpTooltip position="right" width={260} content={help} />}
      </div>
      {children}
    </div>
  )
}

function StatusDot({ status, label }: { status: 'connected' | 'warning' | 'inactive' | 'locked'; label: string }) {
  const color = status === 'connected' ? 'var(--accent2)' : status === 'warning' ? '#ff9f0a' : 'var(--bg4)'
  return (
    <div className="flex items-center gap-1 text-[0.77rem] text-[var(--text3)]">
      {status === 'locked'
        ? <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="var(--text3)" strokeWidth="1.5"><rect x="1" y="5" width="8" height="4.5" rx="0.8"/><path d="M3 5V3.5a2 2 0 014 0V5"/></svg>
        : <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: color }} />
      }
      <span className="hidden sm:inline">{label}</span>
    </div>
  )
}
