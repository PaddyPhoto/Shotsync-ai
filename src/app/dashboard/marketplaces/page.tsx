'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import { useMarketplaceRules } from '@/lib/marketplace/useMarketplaceRules'
import { applyNamingTemplate } from '@/lib/brands'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import type { ReactNode } from 'react'
import type { MarketplaceName, ViewLabel, CategoryOverride } from '@/types'

const ALL_VIEWS: ViewLabel[] = ['front', 'back', 'side', 'detail', 'mood', 'full-length']

const VIEW_PILL_CLS: Record<ViewLabel, string> = {
  front: 'shot-front', back: 'shot-back', side: 'shot-side', detail: 'shot-detail',
  mood: 'shot-mood', 'full-length': 'shot-full-length', 'ghost-mannequin': 'shot-gm',
  'flat-lay': 'shot-flat', 'top-down': 'shot-topdown', inside: 'shot-inside',
  'front-3/4': 'shot-threequarter', 'back-3/4': 'shot-threequarter', unknown: 'shot-unknown',
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

function toggleToken(template: string, token: string): string {
  const parts = template.split('_').filter(Boolean)
  if (parts.includes(token)) return parts.filter((p) => p !== token).join('_')
  return parts.length ? `${template}_${token}` : token
}

export default function MarketplacesPage() {
  return <Suspense><MarketplacesInner /></Suspense>
}

function MarketplacesInner() {
  const searchParams = useSearchParams()
  const { brands, refreshBrands, activeBrand } = useBrand()
  const [confirmResetAll, setConfirmResetAll] = useState(false)
  const [unlockedNaming, setUnlockedNaming] = useState<Set<string>>(new Set())

  // Cloud storage — follows the global active brand from the top-left dropdown
  const [selectedBrandId, setSelectedBrandId] = useState(activeBrand?.id ?? brands[0]?.id ?? '')
  useEffect(() => {
    if (activeBrand?.id) setSelectedBrandId(activeBrand.id)
  }, [activeBrand?.id])
  const { rules, updateRule, resetRule, resetAll, saved } = useMarketplaceRules(selectedBrandId || undefined)
  const [s3Form, setS3Form] = useState({ bucket: '', region: 'ap-southeast-2', access_key_id: '', secret_access_key: '', prefix: '' })
  const [s3Saving, setS3Saving] = useState(false)
  const [s3Saved, setS3Saved] = useState(false)
  const [s3Error, setS3Error] = useState('')
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [connectModal, setConnectModal] = useState<null | 'google_drive' | 'dropbox'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [overridesOpen, setOverridesOpen] = useState<Set<MarketplaceName>>(new Set())
  const [editingOverride, setEditingOverride] = useState<{ mpId: MarketplaceName; overrideId: string } | null>(null)

  useEffect(() => {
    const connected = searchParams.get('cloud_connected')
    if (connected) {
      const name = connected === 'google_drive' ? 'Google Drive' : connected === 'dropbox' ? 'Dropbox' : connected
      setToast(`${name} connected successfully`)
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) ?? activeBrand ?? brands[0] ?? null
  const cc = selectedBrand?.cloud_connections ?? {}

  useEffect(() => {
    const s3 = (selectedBrand?.cloud_connections as Record<string, Record<string, string> | null> | null)?.s3
    setS3Form({
      bucket: s3?.bucket ?? '',
      region: s3?.region ?? 'ap-southeast-2',
      access_key_id: s3?.access_key_id ?? '',
      secret_access_key: s3?.secret_access_key ? '••••••••••••••••' : '',
      prefix: s3?.prefix ?? '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandId])

  const saveS3 = async () => {
    if (!selectedBrand) return
    if (!s3Form.bucket || !s3Form.region || !s3Form.access_key_id) { setS3Error('Bucket, region, and access key ID are required.'); return }
    setS3Saving(true); setS3Error('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const existing = selectedBrand.cloud_connections ?? {}
      const newS3: Record<string, string> = { bucket: s3Form.bucket.trim(), region: s3Form.region.trim(), access_key_id: s3Form.access_key_id.trim(), prefix: s3Form.prefix.trim() }
      if (s3Form.secret_access_key && !s3Form.secret_access_key.startsWith('•')) {
        newS3.secret_access_key = s3Form.secret_access_key.trim()
      } else {
        const existingSecret = (selectedBrand.cloud_connections as Record<string, Record<string, string>> | null)?.s3?.secret_access_key
        if (existingSecret) newS3.secret_access_key = existingSecret
      }
      const res = await fetch(`/api/brands/${selectedBrand.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ cloud_connections: { ...existing, s3: newS3 } }) })
      if (res.ok) { setS3Saved(true); refreshBrands(); setTimeout(() => setS3Saved(false), 2000) }
      else setS3Error('Failed to save. Check your credentials.')
    } finally { setS3Saving(false) }
  }

  const disconnectProvider = async (provider: 'dropbox' | 'google_drive' | 's3') => {
    if (!selectedBrand) return
    setDisconnecting(provider)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const existing = { ...(selectedBrand.cloud_connections ?? {}) } as Record<string, unknown>
      delete existing[provider]
      await fetch(`/api/brands/${selectedBrand.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ cloud_connections: existing }) })
      refreshBrands()
    } finally { setDisconnecting(null) }
  }

  const doConnect = () => {
    if (!selectedBrand || !connectModal) return
    const modal = connectModal; setConnectModal(null)
    if (modal === 'google_drive') {
      import('@/lib/cloud/google-drive').then(({ getGoogleAuthUrl }) => { window.location.href = getGoogleAuthUrl(selectedBrand.id) })
    } else {
      import('@/lib/cloud/dropbox').then(({ getDropboxAuthUrl }) => { window.location.href = getDropboxAuthUrl(selectedBrand.id) })
    }
  }

  const dropboxEnabled = !!process.env.NEXT_PUBLIC_DROPBOX_APP_KEY
  const googleEnabled = !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
  const modalMeta = connectModal === 'google_drive'
    ? { label: 'Google Drive', cta: 'Continue to Google', perms: ['Browse your Drive folders to select source images', 'Export finished images to any Drive folder you choose', 'Create folders to organise your exports'] }
    : connectModal === 'dropbox'
    ? { label: 'Dropbox', cta: 'Continue to Dropbox', perms: ['Browse your Dropbox folders to select source images', 'Export finished images to any Dropbox folder you choose', 'Create folders to organise your exports'] }
    : null

  return (
    <div>
      <Topbar breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Marketplaces' }]} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-[10px] bg-[#1dc44a] text-white text-[0.8rem] font-medium shadow-lg">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="rgba(255,255,255,0.25)"/><path d="M4.5 8l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {toast}
        </div>
      )}

      {connectModal && modalMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConnectModal(null)}>
          <div className="bg-[var(--bg2)] border border-[var(--line)] rounded-[14px] shadow-2xl w-full max-w-[400px] mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[1rem] font-semibold text-[var(--text)] mb-1">Connect {modalMeta.label}</h3>
            <p className="text-[0.85rem] text-[var(--text3)] mb-4">You&apos;ll be redirected to {connectModal === 'google_drive' ? 'Google' : 'Dropbox'} to sign in and approve access. ShotSync will be able to:</p>
            <ul className="flex flex-col gap-2 mb-5">
              {modalMeta.perms.map((p) => (
                <li key={p} className="flex items-start gap-2 text-[0.85rem] text-[var(--text2)]">
                  <svg className="mt-[2px] flex-shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="var(--accent)"/><path d="M4 7l2.2 2.2 3.8-4.4" stroke="black" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {p}
                </li>
              ))}
            </ul>
            <p className="text-[0.85rem] text-[var(--text3)] mb-5">You can disconnect at any time from this page.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConnectModal(null)} className="btn btn-ghost text-[0.8rem]">Cancel</button>
              <button onClick={doConnect} className="btn btn-primary text-[0.8rem]">{modalMeta.cta} →</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-7">
        <div className="mb-7">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>Marketplaces</h1>
          <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">Configure export rules and cloud storage per marketplace.</p>
        </div>

        <div className="flex flex-col gap-10 max-w-[760px]">

          {/* ── Marketplace Export Rules ─────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[1rem] font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>Marketplace Export Rules</h2>
              <div className="flex items-center gap-3">
                {saved && !confirmResetAll && (
                  <span className="text-[0.8rem] text-[var(--accent2)] flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 5 4.5 7.5 8 2.5"/></svg>
                    Saved
                  </span>
                )}
                {confirmResetAll ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[0.8rem] text-[#ff3b30]">Reset all 4 rules to defaults?</span>
                    <button onClick={() => { resetAll(); setConfirmResetAll(false) }} className="btn btn-sm" style={{ background: '#ff3b30', color: '#fff', borderColor: 'transparent' }}>Reset</button>
                    <button onClick={() => setConfirmResetAll(false)} className="btn btn-ghost btn-sm">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmResetAll(true)} className="btn btn-ghost btn-sm">Reset all to defaults</button>
                )}
              </div>
            </div>
            <p className="text-[0.85rem] text-[var(--text3)] mb-5">Changes save automatically to your browser.</p>

            <div className="flex flex-col gap-8">
              {(Object.keys(rules) as MarketplaceName[]).map((id) => {
                const rule = rules[id]
                const isModified = JSON.stringify(rule) !== JSON.stringify(MARKETPLACE_RULES[id])
                return (
                  <div key={id} className="card">
                    <div className="card-head">
                      <div className="flex items-center gap-2">
                        <span className="card-title">{rule.name}</span>
                        {isModified && <span className="text-[0.83rem] font-semibold uppercase tracking-[0.05em] px-[6px] py-[2px] rounded-[4px] bg-[rgba(232,217,122,0.12)] text-[var(--accent)]">Modified</span>}
                      </div>
                      <button onClick={() => resetRule(id)} className="text-[0.85rem] text-[var(--text3)] hover:text-[var(--text2)] transition-colors">Reset to default</button>
                    </div>
                    <div className="card-body">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                        <div className="col-span-2 flex items-start justify-between py-[12px] border-b border-[var(--line)]">
                          <div>
                            <p className="text-[0.8rem] text-[var(--text2)]">Required Views</p>
                            <p className="text-[0.86rem] text-[var(--text3)] mt-[2px]">Shot angles mandatory for this marketplace</p>
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            {ALL_VIEWS.map((v) => {
                              const active = rule.required_views.includes(v)
                              return (
                                <button key={v} onClick={() => { const next = active ? rule.required_views.filter((x) => x !== v) : [...rule.required_views, v]; updateRule(id, { required_views: next }) }} className={`shot-pill transition-all ${active ? VIEW_PILL_CLS[v] : 'shot-missing opacity-50 hover:opacity-80'}`}>{v}</button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Angle export order */}
                        <div className="col-span-2 flex items-start justify-between py-[12px] border-b border-[var(--line)]">
                          <div className="flex-shrink-0 mr-6">
                            <p className="text-[0.8rem] text-[var(--text2)]">Export Image Order</p>
                            <p className="text-[0.86rem] text-[var(--text3)] mt-[2px]">Drag or use arrows to set the angle sequence in exported files</p>
                          </div>
                          <div className="flex flex-col gap-[4px] min-w-[180px]">
                            {(rule.angle_order ?? MARKETPLACE_RULES[id].angle_order).map((v, i, arr) => (
                              <div key={v} className="flex items-center gap-2 bg-[var(--bg3)] rounded-[6px] px-2 py-[5px]">
                                <span className="text-[0.75rem] text-[var(--text3)] w-[16px] text-center flex-shrink-0">{i + 1}</span>
                                <span className={`shot-pill text-[0.75rem] flex-1 ${VIEW_PILL_CLS[v] ?? ''}`}>{v}</span>
                                <div className="flex flex-col gap-[1px]">
                                  <button
                                    disabled={i === 0}
                                    onClick={() => {
                                      const next = [...arr]
                                      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                                      updateRule(id, { angle_order: next })
                                    }}
                                    className="w-[18px] h-[14px] flex items-center justify-center rounded-[3px] hover:bg-[var(--line2)] disabled:opacity-20 transition-opacity"
                                  >
                                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 4.5L4 1.5L7 4.5"/></svg>
                                  </button>
                                  <button
                                    disabled={i === arr.length - 1}
                                    onClick={() => {
                                      const next = [...arr]
                                      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                                      updateRule(id, { angle_order: next })
                                    }}
                                    className="w-[18px] h-[14px] flex items-center justify-center rounded-[3px] hover:bg-[var(--line2)] disabled:opacity-20 transition-opacity"
                                  >
                                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1.5L4 4.5L7 1.5"/></svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Category Overrides accordion */}
                        <div className="col-span-2 border-b border-[var(--line)]">
                          <button
                            type="button"
                            onClick={() => setOverridesOpen((prev) => {
                              const next = new Set(prev)
                              if (next.has(id)) next.delete(id); else next.add(id)
                              return next
                            })}
                            className="w-full flex items-center justify-between py-[12px] text-left group"
                          >
                            <div>
                              <p className="text-[0.8rem] text-[var(--text2)] flex items-center gap-1">
                                Category Overrides
                                <HelpTooltip position="right" width={280} content="Per-garment-category export rules. When a cluster's category matches, these settings override the default angle order, hero view, and excluded views." />
                                {(rule.category_overrides?.length ?? 0) > 0 && (
                                  <span className="ml-1 px-[5px] py-[1px] rounded-full text-[0.7rem] bg-[var(--bg3)] text-[var(--text3)]">{rule.category_overrides!.length}</span>
                                )}
                              </p>
                              <p className="text-[0.86rem] text-[var(--text3)] mt-[2px]">Override angle order and views for specific garment categories</p>
                            </div>
                            <svg
                              width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                              className={`text-[var(--text3)] transition-transform flex-shrink-0 ${overridesOpen.has(id) ? 'rotate-180' : ''}`}
                            >
                              <path d="M2 4l4 4 4-4"/>
                            </svg>
                          </button>

                          {overridesOpen.has(id) && (
                            <div className="pb-3 flex flex-col gap-2">
                              {(rule.category_overrides ?? []).map((ov) => {
                                const isEditing = editingOverride?.mpId === id && editingOverride?.overrideId === ov.id
                                return (
                                  <div key={ov.id} className="rounded-[8px] border border-[var(--line2)] bg-[var(--bg3)] overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-2">
                                      <span className="text-[0.85rem] font-medium text-[var(--text2)] flex-1 truncate">{ov.label || ov.category || '(unnamed)'}</span>
                                      <button
                                        type="button"
                                        onClick={() => setEditingOverride(isEditing ? null : { mpId: id, overrideId: ov.id })}
                                        className="text-[0.78rem] text-[var(--text3)] hover:text-[var(--text2)] transition-colors px-1"
                                      >
                                        {isEditing ? 'Done' : 'Edit'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateRule(id, { category_overrides: (rule.category_overrides ?? []).filter((o) => o.id !== ov.id) })}
                                        className="text-[var(--text3)] hover:text-[#ff3b30] transition-colors"
                                        title="Delete override"
                                      >
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l6 6M8 2L2 8"/></svg>
                                      </button>
                                    </div>
                                    {!isEditing && (
                                      <div className="px-3 pb-2 flex flex-wrap gap-x-4 gap-y-1">
                                        {ov.hero_view && <span className="text-[0.78rem] text-[var(--text3)]">Hero: <span className="text-[var(--text2)]">{ov.hero_view}</span></span>}
                                        {ov.exclude_views && ov.exclude_views.length > 0 && <span className="text-[0.78rem] text-[var(--text3)]">Exclude: <span className="text-[var(--text2)]">{ov.exclude_views.join(', ')}</span></span>}
                                        {ov.angle_order && ov.angle_order.length > 0 && <span className="text-[0.78rem] text-[var(--text3)]">Order: <span className="text-[var(--text2)]">{ov.angle_order.join(' → ')}</span></span>}
                                        {!ov.hero_view && (!ov.exclude_views || ov.exclude_views.length === 0) && (!ov.angle_order || ov.angle_order.length === 0) && (
                                          <span className="text-[0.78rem] text-[var(--text3)] italic">No overrides set — click Edit to configure</span>
                                        )}
                                      </div>
                                    )}
                                    {isEditing && (
                                      <div className="px-3 pb-3 flex flex-col gap-3 border-t border-[var(--line)]">
                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                          <div>
                                            <label className="text-[0.78rem] text-[var(--text3)] mb-1 block">Category name</label>
                                            <input
                                              className="input text-[0.8rem] py-[4px] w-full"
                                              placeholder="e.g. Mens Suits"
                                              value={ov.category}
                                              onChange={(e) => updateRule(id, { category_overrides: (rule.category_overrides ?? []).map((o) => o.id === ov.id ? { ...o, category: e.target.value, label: e.target.value } : o) })}
                                            />
                                            <p className="text-[0.72rem] text-[var(--text3)] mt-1">Must match the garment category on the cluster exactly (case-insensitive)</p>
                                          </div>
                                          <div>
                                            <label className="text-[0.78rem] text-[var(--text3)] mb-1 block">Hero view <span className="text-[var(--text3)]">(override position 1)</span></label>
                                            <select
                                              className="input text-[0.8rem] py-[4px] w-full"
                                              value={ov.hero_view ?? ''}
                                              onChange={(e) => updateRule(id, { category_overrides: (rule.category_overrides ?? []).map((o) => o.id === ov.id ? { ...o, hero_view: e.target.value as ViewLabel || undefined } : o) })}
                                            >
                                              <option value="">— none —</option>
                                              {ALL_VIEWS.map((v) => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[0.78rem] text-[var(--text3)] mb-1 block">Exclude views <span className="text-[var(--text3)]">(click to toggle)</span></label>
                                          <div className="flex flex-wrap gap-[5px]">
                                            {ALL_VIEWS.map((v) => {
                                              const excluded = (ov.exclude_views ?? []).includes(v)
                                              return (
                                                <button
                                                  key={v}
                                                  type="button"
                                                  onClick={() => {
                                                    const next = excluded
                                                      ? (ov.exclude_views ?? []).filter((x) => x !== v)
                                                      : [...(ov.exclude_views ?? []), v]
                                                    updateRule(id, { category_overrides: (rule.category_overrides ?? []).map((o) => o.id === ov.id ? { ...o, exclude_views: next } : o) })
                                                  }}
                                                  className={`shot-pill transition-all text-[0.75rem] ${excluded ? 'opacity-25 line-through' : VIEW_PILL_CLS[v] ?? ''}`}
                                                >
                                                  {v}
                                                </button>
                                              )
                                            })}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[0.78rem] text-[var(--text3)] mb-2 block">Custom angle order <span className="text-[var(--text3)]">(leave empty to use marketplace default)</span></label>
                                          {(!ov.angle_order || ov.angle_order.length === 0) ? (
                                            <button
                                              type="button"
                                              onClick={() => updateRule(id, { category_overrides: (rule.category_overrides ?? []).map((o) => o.id === ov.id ? { ...o, angle_order: [...(rule.angle_order ?? MARKETPLACE_RULES[id].angle_order)] } : o) })}
                                              className="text-[0.78rem] text-[var(--accent)] hover:underline"
                                            >
                                              + Set custom order (copies from marketplace default)
                                            </button>
                                          ) : (
                                            <div className="flex flex-col gap-[3px]">
                                              {ov.angle_order.map((v, i, arr) => (
                                                <div key={`${v}-${i}`} className="flex items-center gap-2 bg-[var(--bg4)] rounded-[5px] px-2 py-[4px]">
                                                  <span className="text-[0.72rem] text-[var(--text3)] w-[14px] text-center">{i + 1}</span>
                                                  <span className={`shot-pill text-[0.72rem] flex-1 ${VIEW_PILL_CLS[v] ?? ''}`}>{v}</span>
                                                  <div className="flex flex-col gap-[1px]">
                                                    <button disabled={i === 0} onClick={() => { const next = [...arr]; [next[i-1], next[i]] = [next[i], next[i-1]]; updateRule(id, { category_overrides: (rule.category_overrides ?? []).map((o) => o.id === ov.id ? { ...o, angle_order: next } : o) }) }} className="w-[16px] h-[12px] flex items-center justify-center rounded-[2px] hover:bg-[var(--line2)] disabled:opacity-20">
                                                      <svg width="7" height="5" viewBox="0 0 8 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 4.5L4 1.5L7 4.5"/></svg>
                                                    </button>
                                                    <button disabled={i === arr.length - 1} onClick={() => { const next = [...arr]; [next[i], next[i+1]] = [next[i+1], next[i]]; updateRule(id, { category_overrides: (rule.category_overrides ?? []).map((o) => o.id === ov.id ? { ...o, angle_order: next } : o) }) }} className="w-[16px] h-[12px] flex items-center justify-center rounded-[2px] hover:bg-[var(--line2)] disabled:opacity-20">
                                                      <svg width="7" height="5" viewBox="0 0 8 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1.5L4 4.5L7 1.5"/></svg>
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                              <button
                                                type="button"
                                                onClick={() => updateRule(id, { category_overrides: (rule.category_overrides ?? []).map((o) => o.id === ov.id ? { ...o, angle_order: undefined } : o) })}
                                                className="text-[0.72rem] text-[var(--text3)] hover:text-[#ff3b30] transition-colors mt-1 self-start"
                                              >
                                                Remove custom order
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                              <button
                                type="button"
                                onClick={() => {
                                  const newOverride: CategoryOverride = {
                                    id: `override-${Date.now()}`,
                                    category: '',
                                    label: '',
                                  }
                                  updateRule(id, { category_overrides: [...(rule.category_overrides ?? []), newOverride] })
                                  setEditingOverride({ mpId: id, overrideId: newOverride.id })
                                }}
                                className="text-[0.8rem] text-[var(--accent)] hover:underline flex items-center gap-1 mt-1"
                              >
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 1v8M1 5h8"/></svg>
                                Add category override
                              </button>
                            </div>
                          )}
                        </div>

                        <SRow label="Width (px)" sub="Output image width"><input type="number" className="input w-[120px] text-right" style={{ fontFamily: 'var(--font-dm-mono)' }} value={rule.image_dimensions.width} min={100} max={9999} onChange={(e) => updateRule(id, { image_dimensions: { ...rule.image_dimensions, width: Number(e.target.value) } })} /></SRow>
                        <SRow label="Height (px)" sub="Output image height"><input type="number" className="input w-[120px] text-right" style={{ fontFamily: 'var(--font-dm-mono)' }} value={rule.image_dimensions.height} min={100} max={9999} onChange={(e) => updateRule(id, { image_dimensions: { ...rule.image_dimensions, height: Number(e.target.value) } })} /></SRow>
                        <SRow label="File Format" sub="Output file type">
                          <div className="inline-flex bg-[var(--bg3)] p-[2px] rounded-sm gap-[2px]">
                            {(['jpg', 'png'] as const).map((fmt) => (
                              <button key={fmt} onClick={() => updateRule(id, { file_format: fmt })} className={`px-3 py-[4px] rounded-[4px] text-[0.8rem] font-medium transition-all ${rule.file_format === fmt ? 'bg-[var(--bg)] text-[var(--text)]' : 'text-[var(--text3)] hover:text-[var(--text2)]'}`} style={{ fontFamily: 'var(--font-dm-mono)' }}>{fmt.toUpperCase()}</button>
                            ))}
                          </div>
                        </SRow>
                        <SRow label="JPEG Quality" sub={`${rule.quality}% — affects file size`}>
                          <div className="flex items-center gap-3 w-[180px]">
                            <input type="range" min={50} max={100} step={1} value={rule.quality} onChange={(e) => updateRule(id, { quality: Number(e.target.value) })} className="flex-1 accent-[var(--accent)] h-[3px]" />
                            <span className="text-[0.85rem] w-8 text-right text-[var(--text)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{rule.quality}%</span>
                          </div>
                        </SRow>
                        <SRow label="Max File Size" sub="Soft limit in KB">
                          <div className="flex items-center gap-2">
                            <input type="number" className="input w-[100px] text-right" style={{ fontFamily: 'var(--font-dm-mono)' }} value={rule.max_file_size_kb} min={50} max={10000} onChange={(e) => updateRule(id, { max_file_size_kb: Number(e.target.value) })} />
                            <span className="text-[0.8rem] text-[var(--text3)]">KB</span>
                          </div>
                        </SRow>
                        <SRow label="Background Colour" sub="Fill colour for transparent areas">
                          <div className="flex items-center gap-2">
                            <input type="color" value={rule.background_color} onChange={(e) => updateRule(id, { background_color: e.target.value })} className="w-8 h-8 rounded-sm border border-[var(--line2)] bg-transparent cursor-pointer" />
                            <input className="input w-[100px]" style={{ fontFamily: 'var(--font-dm-mono)' }} value={rule.background_color} onChange={(e) => updateRule(id, { background_color: e.target.value })} />
                          </div>
                        </SRow>
                        <SRow label="AI Background Removal" sub="Remove background during export. Required by Myer.">
                          <button onClick={() => updateRule(id, { remove_background: !rule.remove_background })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.remove_background ? 'bg-[var(--accent2)]' : 'bg-[var(--line2)]'}`}>
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${rule.remove_background ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                          </button>
                        </SRow>
                        <div className="col-span-2 py-[12px] border-t border-[var(--line)]">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[0.8rem] text-[var(--text2)] flex items-center gap-1">
                              Naming Convention
                              <HelpTooltip position="right" width={260} content={<span>The file naming format required by this marketplace. Platform-mandated formats cannot be changed here — adjust at export time if needed.<br /><br />Unlock only if the retailer has updated their official requirements.</span>} />
                            </p>
                            {unlockedNaming.has(id) ? (
                              <button type="button" onClick={() => setUnlockedNaming((prev) => { const next = new Set(prev); next.delete(id); return next })} className="text-[0.86rem] text-[var(--text3)] hover:text-[var(--text2)] flex items-center gap-1 transition-colors">
                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="7" height="5" rx="1"/><path d="M4 5V3.5a1.5 1.5 0 013 0V5"/></svg>Lock
                              </button>
                            ) : (
                              <button type="button" onClick={() => setUnlockedNaming((prev) => new Set([...prev, id]))} className="text-[0.86rem] text-[var(--text3)] hover:text-[var(--accent3)] flex items-center gap-1 transition-colors">
                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="7" height="5" rx="1"/><path d="M4 5V3a1.5 1.5 0 013 0"/></svg>Unlock to edit
                              </button>
                            )}
                          </div>
                          {unlockedNaming.has(id) ? (
                            <>
                              {MARKETPLACE_RULES[id].naming_locked && <p className="text-[0.86rem] mb-2" style={{ color: '#ff9f0a' }}>⚠ This is a platform-mandated format. Only change it if {rule.name} has officially updated their requirements.</p>}
                              <div className="flex flex-wrap gap-[6px] mb-2">
                                {NAMING_TOKENS.filter((t) => t.token !== '{SEQ}').map((t) => {
                                  const active = rule.naming_template.includes(t.token)
                                  return (
                                    <button key={t.token} type="button" onClick={() => updateRule(id, { naming_template: toggleToken(rule.naming_template, t.token) })} className={`px-2 py-[3px] rounded-sm border text-[0.85rem] font-mono transition-all ${active ? 'border-current opacity-100' : 'border-[var(--line2)] text-[var(--text3)] opacity-50 hover:opacity-80'}`} style={active ? { color: t.color, borderColor: t.color, background: `color-mix(in srgb, ${t.color} 10%, transparent)` } : {}}>{t.token}</button>
                                  )
                                })}
                              </div>
                              <input className="input" style={{ fontFamily: 'var(--font-dm-mono)' }} value={rule.naming_template} onChange={(e) => updateRule(id, { naming_template: e.target.value })} />
                            </>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-[var(--bg3)] border border-[var(--line)]">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text3)" strokeWidth="1.5"><rect x="2.5" y="5.5" width="7" height="5" rx="1"/><path d="M4.5 5.5V4a1.5 1.5 0 013 0v1.5"/></svg>
                              <code className="text-[0.85rem] text-[var(--text2)] flex-1" style={{ fontFamily: 'var(--font-dm-mono)' }}>{rule.naming_template}</code>
                              {MARKETPLACE_RULES[id].naming_locked && <span className="text-[0.83rem] text-[#ff9f0a] bg-[rgba(255,159,10,0.1)] px-[6px] py-[2px] rounded-full flex-shrink-0">platform mandated</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center gap-3">
                        <span className="text-[0.85rem] text-[var(--text3)] flex-shrink-0">Preview:</span>
                        <span className="text-[0.8rem] text-[var(--text2)] truncate" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                          {applyNamingTemplate(rule.naming_template, { brand: activeBrand?.brand_code ?? 'BRAND', sku: activeBrand ? `${activeBrand.brand_code}-001` : 'SKU-001', color: 'BLACK', view: activeBrand?.on_model_angle_sequence?.[0] ?? 'front', seq: 1, index: 1, styleNumber: activeBrand ? `${activeBrand.brand_code}-001` : 'SKU-001', colourCode: '001' })}.{rule.file_format}
                        </span>
                        <span className="text-[0.86rem] text-[var(--text3)] flex-shrink-0 ml-auto" style={{ fontFamily: 'var(--font-dm-mono)' }}>{rule.image_dimensions.width}×{rule.image_dimensions.height} · Q{rule.quality}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Cloud Storage ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-4" style={{ fontFamily: 'var(--font-syne)' }}>Cloud Storage</h2>
            {brands.length > 1 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[0.85rem] text-[var(--text3)]">Configure for:</span>
                <select className="input text-[0.8rem] py-[5px] w-auto" value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)}>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div className="card">
              <div className="card-body flex flex-col gap-4">
                {/* Dropbox */}
                <div className="flex items-center justify-between py-3 border-b border-[var(--line)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[7px] bg-[#0061ff] flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 40 40" fill="white"><path d="M20 8.3L10 15l10 6.7 10-6.7zm-10 13.4L0 15l10-6.7 10 6.7zm10-6.7L20 21.7 30 28.4l10-6.7zm-10 13.4L0 21.7l10-6.7 10 6.7zM20 30.1l10-6.7 10 6.7-10 6.7z"/></svg>
                    </div>
                    <div>
                      <p className="text-[1rem] font-medium text-[var(--text)] flex items-center gap-1.5">Dropbox <HelpTooltip position="right" width={260} content="Import source images directly from your Dropbox folders, and export finished images to any Dropbox folder you choose." /></p>
                      {(cc as Record<string, Record<string, string> | undefined>).dropbox?.account_email ? <p className="text-[0.85rem] text-[#1dc44a]">Connected · {(cc as Record<string, Record<string, string> | undefined>).dropbox?.account_email}</p> : <p className="text-[0.85rem] text-[var(--text3)]">Browse and export to Dropbox folders</p>}
                    </div>
                  </div>
                  {(cc as Record<string, unknown>).dropbox ? (
                    <button onClick={() => disconnectProvider('dropbox')} disabled={disconnecting === 'dropbox'} className="text-[0.8rem] text-[var(--text3)] hover:text-[#ff3b30] transition-colors">{disconnecting === 'dropbox' ? 'Disconnecting…' : 'Disconnect'}</button>
                  ) : (
                    <button onClick={() => { if (selectedBrand) setConnectModal('dropbox') }} disabled={!dropboxEnabled} className="btn btn-ghost text-[0.85rem]" title={!dropboxEnabled ? 'Set NEXT_PUBLIC_DROPBOX_APP_KEY to enable' : ''}>{dropboxEnabled ? 'Connect' : 'Not configured'}</button>
                  )}
                </div>
                {/* Google Drive */}
                <div className="flex items-center justify-between py-3 border-b border-[var(--line)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[7px] bg-white border border-[var(--line2)] flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 87.3 78" fill="none">
                        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.1c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 49.5c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.87 11.2z" fill="#ea4335"/>
                        <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="M59.85 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z" fill="#2684fc"/>
                        <path d="M73.4 26.5l-13.1-22.7c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.2 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[1rem] font-medium text-[var(--text)] flex items-center gap-1.5">Google Drive <HelpTooltip position="right" width={270} content="Import source images from your Google Drive and export finished images directly to any Drive folder." /></p>
                      {(cc as Record<string, Record<string, string> | undefined>).google_drive?.email ? <p className="text-[0.85rem] text-[#1dc44a]">Connected · {(cc as Record<string, Record<string, string> | undefined>).google_drive?.email}</p> : <p className="text-[0.85rem] text-[var(--text3)]">Browse and export to Google Drive folders</p>}
                    </div>
                  </div>
                  {(cc as Record<string, unknown>).google_drive ? (
                    <button onClick={() => disconnectProvider('google_drive')} disabled={disconnecting === 'google_drive'} className="text-[0.8rem] text-[var(--text3)] hover:text-[#ff3b30] transition-colors">{disconnecting === 'google_drive' ? 'Disconnecting…' : 'Disconnect'}</button>
                  ) : (
                    <button onClick={() => { if (selectedBrand) setConnectModal('google_drive') }} disabled={!googleEnabled} className="btn btn-ghost text-[0.85rem]" title={!googleEnabled ? 'Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable' : ''}>{googleEnabled ? 'Connect' : 'Not configured'}</button>
                  )}
                </div>
                {/* AWS S3 */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-[7px] bg-[#ff9900] flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 80 80" fill="white"><path d="M40 0C17.9 0 0 17.9 0 40s17.9 40 40 40 40-17.9 40-40S62.1 0 40 0zm0 70C23.4 70 10 56.6 10 40S23.4 10 40 10s30 13.4 30 30-13.4 30-30 30z"/><path d="M40 20c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 32c-6.6 0-12-5.4-12-12s5.4-12 12-12 12 5.4 12 12-5.4 12-12 12z"/></svg>
                    </div>
                    <div>
                      <p className="text-[1rem] font-medium text-[var(--text)] flex items-center gap-1.5">AWS S3 <HelpTooltip position="right" width={270} content="Connect your own S3 bucket to import raw images and export finished files. Credentials are stored securely per brand." /></p>
                      {(cc as Record<string, Record<string, string> | undefined>).s3?.bucket ? <p className="text-[0.85rem] text-[#1dc44a]">Connected · {(cc as Record<string, Record<string, string> | undefined>).s3?.bucket}</p> : <p className="text-[0.85rem] text-[var(--text3)]">Direct upload/download from your S3 bucket</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 ml-11">
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      <div><label className="text-[0.85rem] text-[var(--text3)] mb-1 block">Bucket name *</label><input className="input text-[0.8rem]" placeholder="my-brand-assets" value={s3Form.bucket} onChange={(e) => setS3Form((f) => ({ ...f, bucket: e.target.value }))} /></div>
                      <div><label className="text-[0.85rem] text-[var(--text3)] mb-1 block">Region *</label><input className="input text-[0.8rem]" placeholder="ap-southeast-2" value={s3Form.region} onChange={(e) => setS3Form((f) => ({ ...f, region: e.target.value }))} /></div>
                    </div>
                    <div><label className="text-[0.85rem] text-[var(--text3)] mb-1 block">Access Key ID *</label><input className="input text-[0.8rem]" placeholder="AKIAIOSFODNN7EXAMPLE" value={s3Form.access_key_id} onChange={(e) => setS3Form((f) => ({ ...f, access_key_id: e.target.value }))} autoComplete="off" /></div>
                    <div><label className="text-[0.85rem] text-[var(--text3)] mb-1 block">Secret Access Key *</label><input className="input text-[0.8rem]" type="password" placeholder="••••••••••••••••••••••••••••••••" value={s3Form.secret_access_key} onChange={(e) => setS3Form((f) => ({ ...f, secret_access_key: e.target.value }))} autoComplete="new-password" /></div>
                    <div className="col-span-2"><label className="text-[0.85rem] text-[var(--text3)] mb-1 block">Key prefix <span className="text-[var(--text3)]">(optional — e.g. shoots/)</span></label><input className="input text-[0.8rem]" placeholder="shoots/" value={s3Form.prefix} onChange={(e) => setS3Form((f) => ({ ...f, prefix: e.target.value }))} /></div>
                    {s3Error && <p className="col-span-2 text-[0.8rem] text-[#ff3b30]">{s3Error}</p>}
                    <div className="col-span-2 flex items-center gap-3">
                      <button onClick={saveS3} disabled={s3Saving} className="btn btn-primary text-[0.85rem]">{s3Saving ? 'Saving…' : s3Saved ? 'Saved ✓' : 'Save S3 config'}</button>
                      {!!(cc as Record<string, unknown>).s3 && <button onClick={() => disconnectProvider('s3')} disabled={disconnecting === 's3'} className="text-[0.8rem] text-[var(--text3)] hover:text-[#ff3b30] transition-colors">{disconnecting === 's3' ? 'Removing…' : 'Remove'}</button>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

function SRow({ label, sub, children }: { label: string; sub: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[12px] border-b border-[var(--line)]">
      <div><p className="text-[0.8rem] text-[var(--text2)]">{label}</p><p className="text-[0.86rem] text-[var(--text3)] mt-[2px]">{sub}</p></div>
      {children}
    </div>
  )
}
