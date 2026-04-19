'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import { useMarketplaceRules } from '@/lib/marketplace/useMarketplaceRules'
import { useBrand } from '@/context/BrandContext'
import { usePlan } from '@/context/PlanContext'
import { useSession } from '@/store/session'
import { UsageBar } from '@/components/billing/UsageBar'
import { PLANS } from '@/lib/plans'
import { applyNamingTemplate } from '@/lib/brands'
import type { Brand } from '@/lib/brands'
import { ACCESSORY_CATEGORIES } from '@/lib/accessories/categories'
import type { MarketplaceName, ViewLabel } from '@/types'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

type Tab = 'general' | 'shopify' | 'marketplaces' | 'brands' | 'billing' | 'team' | 'integrations'

const ALL_VIEWS: ViewLabel[] = ['front', 'back', 'side', 'detail', 'mood', 'full-length']

const VIEW_PILL_CLS: Record<ViewLabel, string> = {
  front:             'shot-front',
  back:              'shot-back',
  side:              'shot-side',
  detail:            'shot-detail',
  mood:              'shot-mood',
  'full-length':     'shot-full-length',
  'ghost-mannequin': 'shot-gm',
  'flat-lay':        'shot-flat',
  'top-down':        'shot-topdown',
  'inside':          'shot-inside',
  'front-3/4':       'shot-threequarter',
  'back-3/4':        'shot-threequarter',
  unknown:           'shot-unknown',
}

// Toggle a token in a naming template string (add if absent, remove if present)
function toggleToken(template: string, token: string): string {
  const parts = template.split('_').filter(Boolean)
  if (parts.includes(token)) {
    return parts.filter((p) => p !== token).join('_')
  }
  return parts.length ? `${template}_${token}` : token
}

const NAMING_TOKENS = [
  { token: '{BRAND}',         color: 'var(--accent3)',  desc: 'Brand code e.g. FBC' },
  { token: '{SEQ}',           color: 'var(--accent)',   desc: 'Look # e.g. 001' },
  { token: '{SKU}',           color: 'var(--accent)',   desc: 'SKU e.g. SS25-0042' },
  { token: '{STYLE_NUMBER}',  color: 'var(--accent)',   desc: 'Style number e.g. 05324' },
  { token: '{COLOR}',         color: 'var(--accent2)',  desc: 'Colour name e.g. BURGUNDY' },
  { token: '{COLOUR_CODE}',   color: 'var(--accent2)',  desc: 'Colour code e.g. 062' },
  { token: '{VIEW}',          color: 'var(--accent4)',  desc: 'Angle e.g. FRONT' },
  { token: '{INDEX}',         color: 'var(--accent4)',  desc: 'Image # e.g. 01' },
  { token: '{CUSTOM_TEXT}',   color: 'var(--text3)',    desc: 'Fixed text string' },
]

export default function SettingsPage() {
  return <Suspense><SettingsInner /></Suspense>
}

function SettingsInner() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) ?? 'general'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [orgName, setOrgName] = useState('')
  const [orgNameSaving, setOrgNameSaving] = useState(false)
  const [orgNameSaved, setOrgNameSaved] = useState(false)
  const [shopifyUploading, setShopifyUploading] = useState(false)
  const [shopifyResults, setShopifyResults] = useState<{ sku: string; status: string; uploaded: number; message?: string }[]>([])
  const [shopifyDone, setShopifyDone] = useState(false)
  const [shopifyProgress, setShopifyProgress] = useState({ done: 0, total: 0, phase: '' })
  const [selectedShopifyBrandId, setSelectedShopifyBrandId] = useState('')

  const { plan, planId, usage, openUpgrade, canAddBrand, refreshPlan } = usePlan()

  // Refresh plan after returning from Stripe checkout.
  // Poll a few times with delays to account for webhook processing latency.
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      refreshPlan()
      const timers = [
        setTimeout(() => refreshPlan(), 3000),
        setTimeout(() => refreshPlan(), 7000),
        setTimeout(() => refreshPlan(), 15000),
      ]
      return () => timers.forEach(clearTimeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const { clusters, jobName, isReady } = useSession()
  const confirmedClusters = clusters.filter((c) => c.confirmed)
  const [portalLoading, setPortalLoading] = useState(false)

  const handleBillingPortal = async () => {
    setPortalLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const json = await res.json()
      if (json.url) window.location.href = json.url
      else if (json.error) console.warn('Billing portal:', json.error)
    } finally {
      setPortalLoading(false)
    }
  }

  const { rules, updateRule, resetRule, resetAll, saved } = useMarketplaceRules()
  const [confirmResetAll, setConfirmResetAll] = useState(false)
  const [unlockedNaming, setUnlockedNaming] = useState<Set<string>>(new Set())

  const [orgRole, setOrgRole] = useState<string | null>(null)
  const canSeeBilling = !orgRole || orgRole === 'owner' || orgRole === 'admin'

  // Load org name and role on mount
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) => {
      if (!session?.access_token) return
      return fetch('/api/orgs/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then((r) => r.json()).then(({ data, role }) => {
        if (data?.name) setOrgName(data.name)
        if (role) setOrgRole(role)
      })
    }).catch(() => {})
  }, [])

  const saveOrgName = async () => {
    if (!orgName.trim()) return
    setOrgNameSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/orgs/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ name: orgName.trim() }),
      })
      if (res.ok) {
        setOrgNameSaved(true)
        setTimeout(() => setOrgNameSaved(false), 2000)
      }
    } finally {
      setOrgNameSaving(false)
    }
  }

  // Team tab state
  const [teamMembers, setTeamMembers] = useState<{ user_id: string; role: string; joined_at: string }[]>([])
  const [pendingInvites, setPendingInvites] = useState<{ id: string; email: string; role: string; expires_at: string }[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url?: string; error?: string } | null>(null)
  const [teamLoaded, setTeamLoaded] = useState(false)

  useEffect(() => {
    if (tab === 'team' && !teamLoaded) {
      import('@/lib/supabase/client').then(({ createClient }) =>
        createClient().auth.getSession()
      ).then(({ data: { session } }) => {
        const headers: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
        return Promise.all([
          fetch('/api/orgs/members', { headers }).then((r) => r.json()),
          fetch('/api/orgs/invite', { headers }).then((r) => r.json()),
        ])
      }).then(([m, i]) => {
        setTeamMembers(m.data ?? [])
        setPendingInvites(i.data ?? [])
        setTeamLoaded(true)
      }).catch(() => setTeamLoaded(true))
    }
  }, [tab, teamLoaded])

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    setInviteResult(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/orgs/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const json = await res.json()
      if (!res.ok) {
        setInviteResult({ error: json.error ?? 'Failed to send invite' })
      } else {
        setInviteResult({ url: json.data?.inviteUrl })
        setInviteEmail('')
        setTeamLoaded(false) // refresh list
      }
    } catch {
      setInviteResult({ error: 'Network error' })
    }
    setInviteSending(false)
  }

  // Brands tab state
  const { brands, setBrands, refreshBrands, activeBrand } = useBrand()
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
        const res = await fetch('/api/brands', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(brandForm),
        })
        const d = await res.json()
        if (!res.ok) { setBrandError(d.error ?? 'Failed to create brand'); return }
        if (d.data) setBrands([...brands, d.data])
        else await refreshBrands()
      } else if (brandModal === 'edit' && editingBrand) {
        const res = await fetch(`/api/brands/${editingBrand.id}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify(brandForm),
        })
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
      if (res.ok) {
        setBrands(brands.filter((b) => b.id !== id))
      } else {
        await refreshBrands()
      }
    } finally {
      setDeletingBrandId(null)
    }
  }

  const handleShopifyUpload = async (replace: boolean, brand: Brand) => {
    if (!confirmedClusters.length) return
    setShopifyUploading(true)
    setShopifyDone(false)
    setShopifyResults([])

    const rule = Object.values(MARKETPLACE_RULES)[0]
    const template = brand.naming_template ?? '{BRAND}_{SEQ}_{VIEW}'
    const brandCode = brand.brand_code
    const totalImages = confirmedClusters.reduce((s, c) => s + c.images.length, 0)
    setShopifyProgress({ done: 0, total: totalImages, phase: 'Processing images…' })

    let doneCount = 0
    const clustersPayload = []

    for (let clusterIdx = 0; clusterIdx < confirmedClusters.length; clusterIdx++) {
      const cluster = confirmedClusters[clusterIdx]
      const seq = clusterIdx + 1
      const images = []

      for (let imgIdx = 0; imgIdx < cluster.images.length; imgIdx++) {
        const img = cluster.images[imgIdx]
        setShopifyProgress({ done: doneCount, total: totalImages, phase: `Processing ${cluster.sku || cluster.label} · ${imgIdx + 1}/${cluster.images.length}` })

        try {
          const buffer = await processImageForShopify(
            img.file,
            rule.image_dimensions.width,
            rule.image_dimensions.height,
            rule.background_color,
          )
          const filename = applyNamingTemplate(template, {
            brand: brandCode, seq, sku: cluster.sku, color: cluster.color, view: img.viewLabel, index: imgIdx + 1,
          }) + '.jpg'
          const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))
          images.push({ filename, base64, position: imgIdx + 1 })
        } catch (err) {
          console.warn(`Skipped: ${img.filename}`, err)
        }
        doneCount++
        await new Promise((r) => setTimeout(r, 0))
      }
      clustersPayload.push({ sku: cluster.sku || `${brandCode}-${String(seq).padStart(3, '0')}`, images })
    }

    setShopifyProgress({ done: totalImages, total: totalImages, phase: 'Uploading to Shopify…' })

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/shopify/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ brand_id: brand.id, clusters: clustersPayload, replace }),
      })
      const json = await res.json()
      setShopifyResults(json.data?.results ?? [])
    } catch (err) {
      console.error('Shopify upload failed:', err)
    }

    setShopifyUploading(false)
    setShopifyDone(true)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'shopify', label: 'Shopify' },
    { id: 'marketplaces', label: 'Marketplace Rules' },
    { id: 'brands', label: 'Brands' },
    ...(canSeeBilling ? [{ id: 'billing' as Tab, label: 'Billing' }] : []),
    { id: 'team', label: 'Team' },
    { id: 'integrations', label: 'Integrations' },
  ]

  return (
    <div>
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
      />

      <div className="p-7">
        <div className="mb-7">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
            Settings
          </h1>
          <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">
            Configure integrations, marketplace rules, and naming conventions.
          </p>
        </div>

        {/* Tabs */}
        <div className="inline-flex bg-[var(--bg3)] p-[3px] rounded-sm gap-[2px] mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-[14px] py-[6px] rounded-[5px] text-[0.8rem] font-medium transition-all duration-150 ${
                tab === t.id
                  ? 'bg-[var(--bg)] text-[var(--text)]'
                  : 'text-[var(--text2)] hover:text-[var(--text)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── General ───────────────────────────────────────────────────────── */}
        {tab === 'general' && (
          <div className="card">
            <div className="card-head">
              <span className="card-title">General Settings</span>
            </div>
            <div className="card-body">

              {/* Organisation name */}
              <div className="flex items-center justify-between py-[14px] border-b border-[var(--line)]">
                <div>
                  <p className="text-[0.85rem] font-medium text-[var(--text)]">Organisation Name</p>
                  <p className="text-[0.75rem] text-[var(--text3)] mt-[2px]">Shown in the sidebar and on exports</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="input w-[220px]"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveOrgName() }}
                    placeholder="Your company name"
                  />
                  <button
                    onClick={saveOrgName}
                    disabled={orgNameSaving || !orgName.trim()}
                    className="btn btn-primary btn-sm"
                  >
                    {orgNameSaved ? '✓ Saved' : orgNameSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Sign out */}
              <div className="flex items-center justify-between py-[14px] border-t border-[var(--line)] mt-2">
                <div>
                  <p className="text-[0.85rem] font-medium text-[var(--text)]">Account</p>
                  <p className="text-[0.75rem] text-[var(--text3)] mt-[2px]">Sign out of ShotSync</p>
                </div>
                <button
                  onClick={async () => {
                    const { createClient } = await import('@/lib/supabase/client')
                    await createClient().auth.signOut()
                    window.location.href = '/'
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--accent3)' }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Shopify ───────────────────────────────────────────────────────── */}
        {tab === 'shopify' && (
          <div className="flex flex-col gap-4 max-w-[680px]">
            {/* Banner */}
            <div className="flex items-center gap-4 px-5 py-4 rounded-md border border-[rgba(149,191,71,0.2)]" style={{ background: 'linear-gradient(135deg, rgba(149,191,71,0.08), rgba(149,191,71,0.03))' }}>
              <div className="w-9 h-9 rounded-sm bg-[#95BF47] flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                  <path d="M16.5 4.5c-.3-1.1-1.2-1.8-2.1-1.6l-6.2 1.2C7.1 4.3 6.5 5 6.5 5.8v9.4c0 .8.7 1.5 1.5 1.5h8.5c.8 0 1.5-.7 1.5-1.5V6.3c0-.7-.3-1.4-1.5-1.8zM10 14.5c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[0.85rem] font-semibold text-[var(--text)]">Shopify Integration</p>
                <p className="text-[0.8rem] text-[var(--text2)]">Push processed, renamed images directly to your Shopify product listings</p>
              </div>
            </div>

            {/* Connected brands */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Connected Brands</span>
                <p className="text-[0.75rem] text-[var(--text3)] mt-[2px]">Shopify credentials are configured per brand in the Brands tab.</p>
              </div>
              <div className="card-body">
                {brands.length === 0 ? (
                  <p className="text-[0.82rem] text-[var(--text3)]">No brands yet. Add a brand in the Brands tab to configure Shopify credentials.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {brands.map((b) => {
                      const connected = !!(b.shopify_store_url && b.shopify_access_token)
                      return (
                        <div key={b.id} className="flex items-center gap-3 py-[10px] border-b border-[var(--line)] last:border-0">
                          <div className="w-7 h-7 rounded-sm flex items-center justify-center text-[0.65rem] font-bold flex-shrink-0" style={{ background: b.logo_color, color: '#000' }}>
                            {b.brand_code.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[0.83rem] font-medium text-[var(--text)] truncate">{b.name}</p>
                            <p className="text-[0.72rem] text-[var(--text3)] truncate">{connected ? b.shopify_store_url : 'No Shopify credentials'}</p>
                          </div>
                          <div className={`flex items-center gap-1 text-[0.72rem] font-medium ${connected ? 'text-[var(--accent2)]' : 'text-[var(--text3)]'}`}>
                            <div className={`w-[6px] h-[6px] rounded-full ${connected ? 'bg-[var(--accent2)]' : 'bg-[var(--bg4)]'}`} />
                            {connected ? 'Connected' : 'Not connected'}
                          </div>
                          <button onClick={() => openEditBrand(b)} className="btn btn-ghost btn-sm">Edit</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Push to Shopify */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Push to Shopify</span>
                <p className="text-[0.75rem] text-[var(--text3)] mt-[2px]">Upload processed images from the current job to matching Shopify products by SKU.</p>
              </div>
              <div className="card-body">
                {(() => {
                  const shopifyBrands = brands.filter((b) => b.shopify_store_url && b.shopify_access_token)

                  if (shopifyBrands.length === 0) {
                    return (
                      <p className="text-[0.82rem] text-[var(--text3)]">
                        No brands have Shopify credentials configured. Edit a brand in the Brands tab to add your store domain and access token.
                      </p>
                    )
                  }

                  if (!isReady || confirmedClusters.length === 0) {
                    return (
                      <div className="flex flex-col gap-2">
                        <p className="text-[0.82rem] text-[var(--text3)]">
                          {isReady
                            ? 'No confirmed clusters in the current job. Go to Review and confirm at least one look to enable push.'
                            : 'No active job. Upload and review images first, then return here to push to Shopify.'}
                        </p>
                        <a href="/dashboard/upload" className="btn btn-ghost btn-sm self-start">Go to Upload</a>
                      </div>
                    )
                  }

                  const effectiveBrandId = selectedShopifyBrandId || shopifyBrands[0].id
                  const selectedBrand = shopifyBrands.find((b) => b.id === effectiveBrandId) ?? shopifyBrands[0]
                  const pct = shopifyProgress.total > 0 ? Math.round((shopifyProgress.done / shopifyProgress.total) * 100) : 0

                  return (
                    <div className="flex flex-col gap-4">
                      {/* Job summary */}
                      <div className="text-[0.82rem] text-[var(--text2)]">
                        <span className="text-[var(--accent2)] font-semibold">{confirmedClusters.length}</span> confirmed clusters ·{' '}
                        <span className="text-[var(--text)]">{confirmedClusters.reduce((s, c) => s + c.images.length, 0)}</span> images
                        {jobName && <span className="text-[var(--text3)]"> · {jobName}</span>}
                      </div>

                      {/* Brand selector */}
                      {shopifyBrands.length > 1 && (
                        <div>
                          <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">Brand</label>
                          <select
                            className="input"
                            value={effectiveBrandId}
                            onChange={(e) => setSelectedShopifyBrandId(e.target.value)}
                          >
                            {shopifyBrands.map((b) => (
                              <option key={b.id} value={b.id}>{b.name} — {b.shopify_store_url}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="bg-[var(--bg3)] rounded-sm p-3 text-[0.78rem] text-[var(--text2)]">
                        <p className="font-medium mb-1">Images will be uploaded to matching Shopify products by SKU.</p>
                        <p className="text-[var(--text3)]">Products without a matching SKU in Shopify will be skipped.</p>
                      </div>

                      {/* Progress */}
                      {shopifyUploading && (
                        <div>
                          <div className="flex items-center justify-between text-[0.78rem] mb-1">
                            <span className="text-[var(--text2)]">{shopifyProgress.phase}</span>
                            <span style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--accent)' }}>{pct}%</span>
                          </div>
                          <div className="h-[5px] bg-[var(--bg3)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-200" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
                          </div>
                        </div>
                      )}

                      {/* Results */}
                      {shopifyDone && shopifyResults.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {shopifyResults.map((r) => (
                            <div key={r.sku} className="flex items-center gap-2 text-[0.78rem]">
                              {r.status === 'uploaded' ? (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--accent2)" strokeWidth="2"><polyline points="2 6 5 9.5 10 2.5"/></svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--accent3)" strokeWidth="2"><path d="M2 2l8 8M10 2L2 10"/></svg>
                              )}
                              <span className="text-[var(--text2)]">{r.sku}</span>
                              <span className="text-[var(--text3)]">{r.status === 'uploaded' ? `${r.uploaded} images uploaded` : r.message}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleShopifyUpload(false, selectedBrand)}
                          disabled={shopifyUploading}
                          className="btn btn-ghost"
                        >
                          {shopifyUploading ? 'Uploading…' : 'Add images'}
                        </button>
                        <button
                          onClick={() => handleShopifyUpload(true, selectedBrand)}
                          disabled={shopifyUploading}
                          className="btn btn-primary"
                        >
                          {shopifyUploading ? 'Uploading…' : 'Replace & upload'}
                        </button>
                        {shopifyDone && !shopifyUploading && (
                          <button onClick={() => { setShopifyDone(false); setShopifyResults([]) }} className="btn btn-ghost btn-sm">
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── Marketplace Rules (editable) ──────────────────────────────────── */}
        {tab === 'marketplaces' && (
          <div className="flex flex-col gap-8 max-w-[760px]">

            {/* Save indicator + reset all */}
            <div className="flex items-center justify-between">
              <p className="text-[0.78rem] text-[var(--text3)]">
                Changes save automatically to your browser.
              </p>
              <div className="flex items-center gap-3">
                {saved && !confirmResetAll && (
                  <span className="text-[0.75rem] text-[var(--accent2)] flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 5 4.5 7.5 8 2.5"/></svg>
                    Saved
                  </span>
                )}
                {confirmResetAll ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[0.75rem] text-[#ff3b30]">Reset all 4 rules to defaults?</span>
                    <button
                      onClick={() => { resetAll(); setConfirmResetAll(false) }}
                      className="btn btn-sm"
                      style={{ background: '#ff3b30', color: '#fff', borderColor: 'transparent' }}
                    >
                      Reset
                    </button>
                    <button onClick={() => setConfirmResetAll(false)} className="btn btn-ghost btn-sm">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmResetAll(true)} className="btn btn-ghost btn-sm">
                    Reset all to defaults
                  </button>
                )}
              </div>
            </div>

            {(Object.keys(rules) as MarketplaceName[]).map((id) => {
              const rule = rules[id]
              const isModified = JSON.stringify(rule) !== JSON.stringify(MARKETPLACE_RULES[id])

              return (
                <div key={id} className="card">
                  <div className="card-head">
                    <div className="flex items-center gap-2">
                      <span className="card-title">{rule.name}</span>
                      {isModified && (
                        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.05em] px-[6px] py-[2px] rounded-[4px] bg-[rgba(232,217,122,0.12)] text-[var(--accent)]">
                          Modified
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => resetRule(id)}
                      className="text-[0.72rem] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
                    >
                      Reset to default
                    </button>
                  </div>

                  <div className="card-body">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-0">

                      {/* Required Views — checkboxes */}
                      <div className="col-span-2 flex items-start justify-between py-[12px] border-b border-[var(--line)]">
                        <div>
                          <p className="text-[0.82rem] text-[var(--text2)]">Required Views</p>
                          <p className="text-[0.7rem] text-[var(--text3)] mt-[2px]">Shot angles mandatory for this marketplace</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {ALL_VIEWS.map((v) => {
                            const active = rule.required_views.includes(v)
                            return (
                              <button
                                key={v}
                                onClick={() => {
                                  const next = active
                                    ? rule.required_views.filter((x) => x !== v)
                                    : [...rule.required_views, v]
                                  updateRule(id, { required_views: next })
                                }}
                                className={`shot-pill transition-all ${active ? VIEW_PILL_CLS[v] : 'shot-missing opacity-50 hover:opacity-80'}`}
                              >
                                {v}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Width */}
                      <SettingsRow label="Width (px)" sub="Output image width">
                        <input
                          type="number"
                          className="input w-[120px] text-right"
                          style={{ fontFamily: 'var(--font-dm-mono)' }}
                          value={rule.image_dimensions.width}
                          min={100} max={9999}
                          onChange={(e) => updateRule(id, { image_dimensions: { ...rule.image_dimensions, width: Number(e.target.value) } })}
                        />
                      </SettingsRow>

                      {/* Height */}
                      <SettingsRow label="Height (px)" sub="Output image height">
                        <input
                          type="number"
                          className="input w-[120px] text-right"
                          style={{ fontFamily: 'var(--font-dm-mono)' }}
                          value={rule.image_dimensions.height}
                          min={100} max={9999}
                          onChange={(e) => updateRule(id, { image_dimensions: { ...rule.image_dimensions, height: Number(e.target.value) } })}
                        />
                      </SettingsRow>

                      {/* File format */}
                      <SettingsRow label="File Format" sub="Output file type">
                        <div className="inline-flex bg-[var(--bg3)] p-[2px] rounded-sm gap-[2px]">
                          {(['jpg', 'png'] as const).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => updateRule(id, { file_format: fmt })}
                              className={`px-3 py-[4px] rounded-[4px] text-[0.75rem] font-medium transition-all ${
                                rule.file_format === fmt
                                  ? 'bg-[var(--bg)] text-[var(--text)]'
                                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
                              }`}
                              style={{ fontFamily: 'var(--font-dm-mono)' }}
                            >
                              {fmt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </SettingsRow>

                      {/* JPEG Quality */}
                      <SettingsRow label="JPEG Quality" sub={`${rule.quality}% — affects file size`}>
                        <div className="flex items-center gap-3 w-[180px]">
                          <input
                            type="range"
                            min={50} max={100} step={1}
                            value={rule.quality}
                            onChange={(e) => updateRule(id, { quality: Number(e.target.value) })}
                            className="flex-1 accent-[var(--accent)] h-[3px]"
                          />
                          <span className="text-[0.78rem] w-8 text-right text-[var(--text)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                            {rule.quality}%
                          </span>
                        </div>
                      </SettingsRow>

                      {/* Max file size */}
                      <SettingsRow label="Max File Size" sub="Soft limit in KB">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="input w-[100px] text-right"
                            style={{ fontFamily: 'var(--font-dm-mono)' }}
                            value={rule.max_file_size_kb}
                            min={50} max={10000}
                            onChange={(e) => updateRule(id, { max_file_size_kb: Number(e.target.value) })}
                          />
                          <span className="text-[0.75rem] text-[var(--text3)]">KB</span>
                        </div>
                      </SettingsRow>

                      {/* Background colour */}
                      <SettingsRow label="Background Colour" sub="Fill colour for transparent areas">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={rule.background_color}
                            onChange={(e) => updateRule(id, { background_color: e.target.value })}
                            className="w-8 h-8 rounded-sm border border-[var(--line2)] bg-transparent cursor-pointer"
                          />
                          <input
                            className="input w-[100px]"
                            style={{ fontFamily: 'var(--font-dm-mono)' }}
                            value={rule.background_color}
                            onChange={(e) => updateRule(id, { background_color: e.target.value })}
                          />
                        </div>
                      </SettingsRow>

                      {/* Naming convention */}
                      <div className="col-span-2 py-[12px] border-t border-[var(--line)]">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[0.82rem] text-[var(--text2)] flex items-center gap-1">
                            Naming Convention
                            <HelpTooltip
                              position="right"
                              width={260}
                              content={
                                <span>
                                  The file naming format required by this marketplace. Platform-mandated formats (like THE ICONIC) cannot be changed here — adjust at export time if needed.<br /><br />
                                  Unlock only if the retailer has updated their official requirements.
                                </span>
                              }
                            />
                          </p>
                          {unlockedNaming.has(id) ? (
                            <button
                              type="button"
                              onClick={() => setUnlockedNaming((prev) => { const next = new Set(prev); next.delete(id); return next })}
                              className="text-[0.7rem] text-[var(--text3)] hover:text-[var(--text2)] flex items-center gap-1 transition-colors"
                            >
                              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="7" height="5" rx="1"/><path d="M4 5V3.5a1.5 1.5 0 013 0V5"/></svg>
                              Lock
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setUnlockedNaming((prev) => new Set([...prev, id]))}
                              className="text-[0.7rem] text-[var(--text3)] hover:text-[var(--accent3)] flex items-center gap-1 transition-colors"
                            >
                              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="7" height="5" rx="1"/><path d="M4 5V3a1.5 1.5 0 013 0"/></svg>
                              Unlock to edit
                            </button>
                          )}
                        </div>

                        {unlockedNaming.has(id) ? (
                          <>
                            {MARKETPLACE_RULES[id].naming_locked && (
                              <p className="text-[0.7rem] mb-2" style={{ color: '#ff9f0a' }}>
                                ⚠ This is a platform-mandated format. Only change it if {rule.name} has officially updated their requirements.
                              </p>
                            )}
                            <div className="flex flex-wrap gap-[6px] mb-2">
                              {NAMING_TOKENS.filter((t) => t.token !== '{SEQ}').map((t) => {
                                const active = rule.naming_template.includes(t.token)
                                return (
                                  <button
                                    key={t.token}
                                    type="button"
                                    onClick={() => updateRule(id, { naming_template: toggleToken(rule.naming_template, t.token) })}
                                    title={active ? `Remove ${t.token}` : `Add ${t.token}`}
                                    className={`px-2 py-[3px] rounded-sm border text-[0.72rem] font-mono transition-all ${
                                      active
                                        ? 'border-current opacity-100'
                                        : 'border-[var(--line2)] text-[var(--text3)] opacity-50 hover:opacity-80'
                                    }`}
                                    style={active ? { color: t.color, borderColor: t.color, background: `color-mix(in srgb, ${t.color} 10%, transparent)` } : {}}
                                  >
                                    {t.token}
                                  </button>
                                )
                              })}
                            </div>
                            <input
                              className="input"
                              style={{ fontFamily: 'var(--font-dm-mono)' }}
                              value={rule.naming_template}
                              onChange={(e) => updateRule(id, { naming_template: e.target.value })}
                            />
                          </>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-[var(--bg3)] border border-[var(--line)]">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text3)" strokeWidth="1.5"><rect x="2.5" y="5.5" width="7" height="5" rx="1"/><path d="M4.5 5.5V4a1.5 1.5 0 013 0v1.5"/></svg>
                            <code className="text-[0.78rem] text-[var(--text2)] flex-1" style={{ fontFamily: 'var(--font-dm-mono)' }}>{rule.naming_template}</code>
                            {MARKETPLACE_RULES[id].naming_locked && (
                              <span className="text-[0.65rem] text-[#ff9f0a] bg-[rgba(255,159,10,0.1)] px-[6px] py-[2px] rounded-full flex-shrink-0">platform mandated</span>
                            )}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Live preview */}
                    <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center gap-3">
                      <span className="text-[0.72rem] text-[var(--text3)] flex-shrink-0">Preview:</span>
                      <span
                        className="text-[0.75rem] text-[var(--text2)] truncate"
                        style={{ fontFamily: 'var(--font-dm-mono)' }}
                      >
                        {applyNamingTemplate(rule.naming_template, {
                          brand: activeBrand?.brand_code ?? 'BRAND',
                          sku: activeBrand ? `${activeBrand.brand_code}-001` : 'SKU-001',
                          color: 'BLACK',
                          view: activeBrand?.on_model_angle_sequence?.[0] ?? 'front',
                          seq: 1,
                          index: 1,
                          styleNumber: activeBrand ? `${activeBrand.brand_code}-001` : 'SKU-001',
                          colourCode: '001',
                        })}.{rule.file_format}
                      </span>
                      <span className="text-[0.7rem] text-[var(--text3)] flex-shrink-0 ml-auto" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                        {rule.image_dimensions.width}×{rule.image_dimensions.height} · Q{rule.quality}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Brands ───────────────────────────────────────────────────────── */}
        {tab === 'brands' && (
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
                          className="w-[34px] h-[34px] rounded-[5px] flex items-center justify-center text-[0.65rem] font-bold text-black flex-shrink-0"
                          style={{ background: b.logo_color, fontFamily: 'var(--font-dm-mono)' }}
                        >
                          {b.brand_code}
                        </div>
                        <div>
                          <p className="text-[0.85rem] font-medium text-[var(--text)]">{b.name}</p>
                          <div className="flex items-center gap-2 mt-[2px]">
                            <span className="text-[0.72rem] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                              {b.brand_code}
                            </span>
                            {b.shopify_store_url && (
                              <>
                                <span className="text-[var(--line2)]">·</span>
                                <span className="text-[0.72rem] text-[var(--accent2)] flex items-center gap-1">
                                  <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor">
                                    <circle cx="6" cy="6" r="5"/>
                                  </svg>
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
        )}
      </div>

      {/* ── Billing ──────────────────────────────────────────────────────────── */}
      {tab === 'billing' && (
        <div className="p-7 pt-0 flex flex-col gap-4 max-w-[760px]">

          {/* Current plan */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">Current Plan</span>
              {planId !== 'free' && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                <button onClick={handleBillingPortal} disabled={portalLoading} className="text-[0.75rem] text-[var(--text3)] hover:text-[var(--text2)] transition-colors">
                  {portalLoading ? 'Loading…' : 'Manage subscription →'}
                </button>
              )}
            </div>
            <div className="card-body">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-[5px] rounded-sm text-[0.78rem] font-bold uppercase tracking-[0.05em] ${
                    planId === 'enterprise' ? 'bg-[rgba(232,122,122,0.15)] text-[var(--accent3)]'
                    : planId === 'scale'    ? 'bg-[rgba(122,180,232,0.15)] text-[var(--accent4)]'
                    : planId === 'brand'    ? 'bg-[rgba(232,217,122,0.15)] text-[var(--accent)]'
                    : planId === 'starter'  ? 'bg-[rgba(62,207,142,0.15)] text-[var(--accent2)]'
                    :                        'bg-[var(--bg3)] text-[var(--text3)]'
                  }`}>{plan.name}</div>
                  <div>
                    <p className="text-[0.88rem] font-semibold text-[var(--text)]">
                      {plan.priceAud === 0 ? 'Free forever' : `$${plan.priceAud} AUD/month`}
                    </p>
                    <p className="text-[0.75rem] text-[var(--text3)]">{plan.description}</p>
                  </div>
                </div>
                {planId === 'free' && (
                  <button onClick={() => openUpgrade('Upgrade to unlock more')} className="btn btn-primary btn-sm">
                    Upgrade Plan
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Usage */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">Usage</span>
              <span className="text-[0.75rem] text-[var(--text3)]">Resets 1st of each month</span>
            </div>
            <div className="card-body flex flex-col gap-4">
              <UsageBar label="Images per job" value={0} limit={plan.limits.imagesPerJob} />
              <UsageBar label="Exports this month" value={usage.exportsThisMonth} limit={plan.limits.exportsPerMonth} />
              <UsageBar label="Brands" value={brands.length} limit={plan.limits.brands} />
              <UsageBar label="Marketplaces per export" value={0} limit={plan.limits.marketplaces} />
            </div>
          </div>

          {/* Plan comparison */}
          {planId !== 'enterprise' && (
            <div className="card">
              <div className="card-head"><span className="card-title">Available Plans</span></div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[var(--text3)] px-3 py-2 border-b border-[var(--line)]">Feature</th>
                      {(['free', 'starter', 'brand', 'scale', 'enterprise'] as const).map((id) => (
                        <th key={id} className={`text-center text-[0.72rem] font-medium uppercase tracking-[0.08em] px-3 py-2 border-b border-[var(--line)] ${id === planId ? 'text-[var(--accent)]' : 'text-[var(--text3)]'}`}>
                          {PLANS[id].name}{id === planId && ' ✓'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: 'Images per month',  values: ['20', '500', '2,000', '10,000', 'Unlimited'] },
                      { feature: 'Marketplaces',      values: ['1', '2', '4', '4', '4'] },
                      { feature: 'Brands',            values: ['1', '1', '3', 'Unlimited', 'Unlimited'] },
                      { feature: 'Seats',             values: ['1', '2', '5', 'Unlimited', 'Unlimited'] },
                      { feature: 'Shopify sync',      values: ['—', '✓', '✓', '✓', '✓'] },
                      { feature: 'Price (AUD/mo)',    values: ['Free', '$79', '$199', '$399', 'Contact us'] },
                    ].map((row) => (
                      <tr key={row.feature} className="hover:bg-[var(--bg3)] transition-colors">
                        <td className="px-3 py-[9px] text-[0.82rem] text-[var(--text2)] border-b border-[var(--line)]">{row.feature}</td>
                        {row.values.map((v, i) => {
                          const id = (['free', 'starter', 'brand', 'scale', 'enterprise'] as const)[i]
                          return (
                            <td key={id} className={`px-3 py-[9px] text-[0.82rem] text-center border-b border-[var(--line)] ${id === planId ? 'font-semibold text-[var(--text)]' : 'text-[var(--text3)]'}`} style={v === '✓' ? { color: 'var(--accent2)' } : {}}>
                              {v}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-3 border-t border-[var(--line)] flex justify-end">
                <button onClick={() => openUpgrade('Upgrade to unlock more features')} className="btn btn-primary btn-sm">
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Team ─────────────────────────────────────────────────────────── */}
      {tab === 'team' && (
        <div className="p-7 pt-0 flex flex-col gap-4 max-w-[760px]">

          {/* Invite member */}
          <div className="card">
            <div className="card-head"><span className="card-title">Invite Team Member</span></div>
            <div className="card-body flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  className="input flex-1"
                  placeholder="colleague@brand.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <select
                  className="input w-[110px]"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={sendInvite}
                  disabled={inviteSending || !inviteEmail.trim()}
                  className="btn btn-primary"
                >
                  {inviteSending ? 'Sending…' : 'Invite'}
                </button>
              </div>

              {inviteResult?.error && (
                <p className="text-[0.78rem] text-[var(--accent3)]">{inviteResult.error}</p>
              )}
              {inviteResult?.url && (
                <div className="bg-[var(--bg3)] rounded-sm p-3 text-[0.78rem]">
                  <p className="text-[var(--text2)] mb-1 font-medium">Invite link (copy and send to teammate):</p>
                  <code className="text-[var(--accent2)] break-all select-all">{inviteResult.url}</code>
                </div>
              )}
            </div>
          </div>

          {/* Current members */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">Members</span>
              <span className="text-[0.75rem] text-[var(--text3)]">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="card-body p-0">
              {!teamLoaded ? (
                <p className="text-[0.82rem] text-[var(--text3)] px-4 py-3">Loading…</p>
              ) : teamMembers.length === 0 ? (
                <p className="text-[0.82rem] text-[var(--text3)] px-4 py-3">No members yet.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th className="text-left text-[0.72rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">User ID</th>
                      <th className="text-left text-[0.72rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">Role</th>
                      <th className="text-left text-[0.72rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((m) => (
                      <tr key={m.user_id} className="border-b border-[var(--line)] last:border-0">
                        <td className="px-4 py-[10px] text-[0.8rem] text-[var(--text)] font-mono truncate max-w-[200px]">{m.user_id.slice(0, 8)}…</td>
                        <td className="px-4 py-[10px]">
                          <span className={`chip ${m.role === 'owner' ? 'chip-ready' : m.role === 'admin' ? 'chip-review' : 'chip-uploading'}`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="px-4 py-[10px] text-[0.78rem] text-[var(--text3)]">
                          {new Date(m.joined_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div className="card">
              <div className="card-head">
                <span className="card-title">Pending Invites</span>
                <span className="text-[0.75rem] text-[var(--text3)]">{pendingInvites.length} pending</span>
              </div>
              <div className="card-body p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th className="text-left text-[0.72rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">Email</th>
                      <th className="text-left text-[0.72rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">Role</th>
                      <th className="text-left text-[0.72rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvites.map((inv) => (
                      <tr key={inv.id} className="border-b border-[var(--line)] last:border-0">
                        <td className="px-4 py-[10px] text-[0.8rem] text-[var(--text)]">{inv.email}</td>
                        <td className="px-4 py-[10px]">
                          <span className="chip chip-uploading">{inv.role}</span>
                        </td>
                        <td className="px-4 py-[10px] text-[0.78rem] text-[var(--text3)]">
                          {new Date(inv.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-[10px] text-right">
                          <button
                            onClick={async () => {
                              const { createClient } = await import('@/lib/supabase/client')
                              const { data: { session } } = await createClient().auth.getSession()
                              const res = await fetch(`/api/orgs/invite?id=${inv.id}`, {
                                method: 'DELETE',
                                headers: { authorization: `Bearer ${session?.access_token}` },
                              })
                              if (res.ok) setPendingInvites((prev) => prev.filter((i) => i.id !== inv.id))
                            }}
                            className="text-[0.75rem] text-[var(--text3)] hover:text-[var(--accent3)] transition-colors"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Integrations ─────────────────────────────────────────────────── */}
      {tab === 'integrations' && (
        <IntegrationsTab
          brands={brands}
          activeBrand={activeBrand ?? null}
          refreshBrands={refreshBrands}
          onShopifyClick={() => setTab('shopify')}
        />
      )}

      {/* ── Brand Modal ───────────────────────────────────────────────────── */}
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
                  className="w-[40px] h-[40px] rounded-[6px] flex items-center justify-center text-[0.7rem] font-bold text-black flex-shrink-0 transition-all"
                  style={{ background: brandForm.logo_color, fontFamily: 'var(--font-dm-mono)' }}
                >
                  {brandForm.brand_code.toUpperCase().slice(0, 6) || '??'}
                </div>
                <div>
                  <p className="text-[0.85rem] font-medium text-[var(--text)]">{brandForm.name || 'Brand Name'}</p>
                  <p className="text-[0.72rem] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                    {brandForm.brand_code.toUpperCase() || 'CODE'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[0.75rem] text-[var(--text2)] mb-[5px] block">Brand Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Studio Label"
                    value={brandForm.name}
                    onChange={(e) => setBrandForm((f) => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[0.75rem] text-[var(--text2)] mb-[5px] block">Brand Code * <span className="text-[var(--text3)]">(max 6)</span></label>
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
                  <label className="text-[0.75rem] text-[var(--text2)] mb-[5px] block">Accent Colour</label>
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
                <label className="text-[0.75rem] font-medium text-[var(--text2)] mb-2 block">Images per Look — On-Model</label>
                <p className="text-[0.72rem] text-[var(--text3)] mb-3">How many images are shot per product look for on-model shoots.</p>
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
                      className={`w-[38px] h-[38px] rounded-sm border text-[0.82rem] font-medium transition-all ${
                        brandForm.images_per_look === n
                          ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.1)] text-[var(--accent)]'
                          : 'border-[var(--line2)] text-[var(--text2)] hover:border-[var(--line)] hover:text-[var(--text)]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {/* Angle sequence editor */}
                <div className="mt-3 space-y-1">
                  {brandForm.on_model_angle_sequence.slice(0, brandForm.images_per_look).map((angle, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-[0.7rem] text-[var(--text3)] text-right shrink-0">{idx + 1}</span>
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

              {/* Still life angle sequences — per category */}
              <div className="border-t border-[var(--line)] pt-3">
                <p className="text-[0.75rem] font-medium text-[var(--text2)] mb-1">Still Life Angle Sequences</p>
                <p className="text-[0.7rem] text-[var(--text3)] mb-3">Override the default angle order per accessory category. Leave blank to use category defaults.</p>
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
                              ? <span className="text-[0.65rem] text-[var(--accent)] bg-[rgba(74,158,255,0.1)] px-[6px] py-[1px] rounded-full">custom</span>
                              : <span className="text-[0.65rem] text-[var(--text3)]">{cat.angles.join(' · ')}</span>
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
                                  <span className="w-5 text-[0.7rem] text-[var(--text3)] text-right shrink-0">{idx + 1}</span>
                                  <select
                                    value={angle}
                                    onChange={(e) => {
                                      const seq = [...(customSeq?.length ? customSeq : cat.angles)]
                                      seq[idx] = e.target.value
                                      setBrandForm((f) => ({ ...f, still_life_angle_sequences: { ...f.still_life_angle_sequences, [cat.id]: seq } }))
                                    }}
                                    className="flex-1 bg-[var(--bg)] border border-[var(--line2)] rounded-sm px-2 py-[4px] text-[0.75rem] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
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
                              }} className="text-[0.72rem] text-[var(--accent)] hover:underline">+ Add angle</button>
                              {hasCustom && (
                                <button type="button" onClick={() => {
                                  setBrandForm((f) => {
                                    const seqs = { ...f.still_life_angle_sequences }
                                    delete seqs[cat.id]
                                    return { ...f, still_life_angle_sequences: seqs }
                                  })
                                }} className="text-[0.72rem] text-[var(--text3)] hover:text-[var(--accent3)] ml-auto">Reset to default</button>
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
                <p className="text-[0.75rem] font-medium text-[var(--text2)] mb-1">Ghost Mannequin Position</p>
                <p className="text-[0.7rem] text-[var(--text3)] mb-2">Where the GM shot appears in the exported image sequence</p>
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
                <p className="text-[0.75rem] font-medium text-[var(--text2)] mb-2 flex items-center gap-1">
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
                {/* Clickable token chips */}
                <div className="flex flex-wrap gap-[6px] mb-3">
                  {NAMING_TOKENS.map((t) => {
                    const active = brandForm.naming_template.includes(t.token)
                    return (
                      <button
                        key={t.token}
                        type="button"
                        onClick={() => setBrandForm((f) => ({ ...f, naming_template: toggleToken(f.naming_template, t.token) }))}
                        title={active ? `Remove ${t.token}` : `Add ${t.token}`}
                        className={`px-2 py-[3px] rounded-sm border text-[0.72rem] font-mono transition-all ${
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
                <p className="text-[0.7rem] text-[var(--text3)] mt-2">
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

              <div className="border-t border-[var(--line)] pt-3">
                <p className="text-[0.75rem] font-medium text-[var(--text2)] mb-3">Shopify Integration <span className="text-[var(--text3)] font-normal">(optional)</span></p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[0.75rem] text-[var(--text3)] mb-[5px] block">Store Domain</label>
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
                    <label className="text-[0.75rem] text-[var(--text3)] mb-[5px] block">Access Token</label>
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

// Canvas image processing for Shopify upload
async function processImageForShopify(file: File, width: number, height: number, bgColor: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = bgColor || '#ffffff'
      ctx.fillRect(0, 0, width, height)
      const srcAspect = img.width / img.height
      const dstAspect = width / height
      let sx = 0, sy = 0, sw = img.width, sh = img.height
      if (srcAspect > dstAspect) { sw = img.height * dstAspect; sx = (img.width - sw) / 2 }
      else { sh = img.width / dstAspect; sy = (img.height - sh) / 2 }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Canvas toBlob failed')); return }
        blob.arrayBuffer().then(resolve).catch(reject)
      }, 'image/jpeg', 0.92)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

// Small layout helper for two-column rows
function SettingsRow({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[12px] border-b border-[var(--line)]">
      <div>
        <p className="text-[0.82rem] text-[var(--text2)]">{label}</p>
        <p className="text-[0.7rem] text-[var(--text3)] mt-[2px]">{sub}</p>
      </div>
      {children}
    </div>
  )
}

// ── Integrations Tab ──────────────────────────────────────────────────────────

function IntegrationsTab({
  brands,
  activeBrand,
  refreshBrands,
  onShopifyClick,
}: {
  brands: Brand[]
  activeBrand: Brand | null
  refreshBrands: () => void
  onShopifyClick: () => void
}) {
  const [selectedBrandId, setSelectedBrandId] = useState(activeBrand?.id ?? brands[0]?.id ?? '')
  const [s3Form, setS3Form] = useState({ bucket: '', region: 'ap-southeast-2', access_key_id: '', secret_access_key: '', prefix: '' })
  const [s3Saving, setS3Saving] = useState(false)
  const [s3Saved, setS3Saved] = useState(false)
  const [s3Error, setS3Error] = useState('')
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) ?? activeBrand ?? brands[0] ?? null
  const cc = selectedBrand?.cloud_connections ?? {}

  // Populate S3 form when brand changes
  useEffect(() => {
    const s3 = (selectedBrand?.cloud_connections as Record<string, Record<string, string>> | null)?.s3
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
    if (!s3Form.bucket || !s3Form.region || !s3Form.access_key_id) {
      setS3Error('Bucket, region, and access key ID are required.')
      return
    }
    setS3Saving(true)
    setS3Error('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const existing = selectedBrand.cloud_connections ?? {}
      const newS3: Record<string, string> = {
        bucket: s3Form.bucket.trim(),
        region: s3Form.region.trim(),
        access_key_id: s3Form.access_key_id.trim(),
        prefix: s3Form.prefix.trim(),
      }
      // Only update secret if it's not the placeholder
      if (s3Form.secret_access_key && !s3Form.secret_access_key.startsWith('•')) {
        newS3.secret_access_key = s3Form.secret_access_key.trim()
      } else {
        const existingSecret = (selectedBrand.cloud_connections as Record<string, Record<string, string>> | null)?.s3?.secret_access_key
        if (existingSecret) newS3.secret_access_key = existingSecret
      }
      const res = await fetch(`/api/brands/${selectedBrand.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ cloud_connections: { ...existing, s3: newS3 } }),
      })
      if (res.ok) { setS3Saved(true); refreshBrands(); setTimeout(() => setS3Saved(false), 2000) }
      else setS3Error('Failed to save. Check your credentials.')
    } finally {
      setS3Saving(false)
    }
  }

  const disconnectProvider = async (provider: 'dropbox' | 'google_drive' | 's3') => {
    if (!selectedBrand) return
    setDisconnecting(provider)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const existing = { ...(selectedBrand.cloud_connections ?? {}) } as Record<string, unknown>
      delete existing[provider]
      await fetch(`/api/brands/${selectedBrand.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ cloud_connections: existing }),
      })
      refreshBrands()
    } finally {
      setDisconnecting(null)
    }
  }

  const connectDropbox = () => {
    if (!selectedBrand) return
    import('@/lib/cloud/dropbox').then(({ getDropboxAuthUrl }) => {
      window.location.href = getDropboxAuthUrl(selectedBrand.id)
    })
  }

  const connectGoogle = () => {
    if (!selectedBrand) return
    import('@/lib/cloud/google-drive').then(({ getGoogleAuthUrl }) => {
      window.location.href = getGoogleAuthUrl(selectedBrand.id)
    })
  }

  const dropboxEnabled = !!process.env.NEXT_PUBLIC_DROPBOX_APP_KEY
  const googleEnabled = !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_API_KEY)

  return (
    <div className="p-7 pt-0 flex flex-col gap-4 max-w-[760px]">

      {/* Brand selector */}
      {brands.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-[0.78rem] text-[var(--text3)]">Configure for:</span>
          <select
            className="input text-[0.82rem] py-[5px] w-auto"
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
          >
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {/* Cloud Storage */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Cloud Storage</span>
          <span className="text-[0.72rem] text-[var(--text3)]">Import images from & export directly to your cloud</span>
        </div>
        <div className="card-body flex flex-col gap-4">

          {/* Dropbox */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[7px] bg-[#0061ff] flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 40 40" fill="white">
                  <path d="M20 8.3L10 15l10 6.7 10-6.7zm-10 13.4L0 15l10-6.7 10 6.7zm10-6.7L20 21.7 30 28.4l10-6.7zm-10 13.4L0 21.7l10-6.7 10 6.7zM20 30.1l10-6.7 10 6.7-10 6.7z"/>
                </svg>
              </div>
              <div>
                <p className="text-[0.85rem] font-medium text-[var(--text)]">Dropbox</p>
                {(cc as Record<string, Record<string, string> | undefined>).dropbox?.account_email ? (
                  <p className="text-[0.72rem] text-[#1dc44a]">Connected · {(cc as Record<string, Record<string, string> | undefined>).dropbox?.account_email}</p>
                ) : (
                  <p className="text-[0.72rem] text-[var(--text3)]">Browse and export to Dropbox folders</p>
                )}
              </div>
            </div>
            {(cc as Record<string, unknown>).dropbox ? (
              <button
                onClick={() => disconnectProvider('dropbox')}
                disabled={disconnecting === 'dropbox'}
                className="text-[0.75rem] text-[var(--text3)] hover:text-[#ff3b30] transition-colors"
              >
                {disconnecting === 'dropbox' ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : (
              <button
                onClick={connectDropbox}
                disabled={!dropboxEnabled}
                className="btn btn-ghost text-[0.78rem]"
                title={!dropboxEnabled ? 'Set NEXT_PUBLIC_DROPBOX_APP_KEY to enable' : ''}
              >
                {dropboxEnabled ? 'Connect' : 'Not configured'}
              </button>
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
                <p className="text-[0.85rem] font-medium text-[var(--text)]">Google Drive</p>
                {(cc as Record<string, Record<string, string> | undefined>).google_drive?.email ? (
                  <p className="text-[0.72rem] text-[#1dc44a]">Connected · {(cc as Record<string, Record<string, string> | undefined>).google_drive?.email}</p>
                ) : (
                  <p className="text-[0.72rem] text-[var(--text3)]">Browse and export to Google Drive folders</p>
                )}
              </div>
            </div>
            {(cc as Record<string, unknown>).google_drive ? (
              <button
                onClick={() => disconnectProvider('google_drive')}
                disabled={disconnecting === 'google_drive'}
                className="text-[0.75rem] text-[var(--text3)] hover:text-[#ff3b30] transition-colors"
              >
                {disconnecting === 'google_drive' ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : (
              <button
                onClick={connectGoogle}
                disabled={!googleEnabled}
                className="btn btn-ghost text-[0.78rem]"
                title={!googleEnabled ? 'Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable' : ''}
              >
                {googleEnabled ? 'Connect' : 'Not configured'}
              </button>
            )}
          </div>

          {/* AWS S3 */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-[7px] bg-[#ff9900] flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 80 80" fill="white">
                  <path d="M40 0C17.9 0 0 17.9 0 40s17.9 40 40 40 40-17.9 40-40S62.1 0 40 0zm0 70C23.4 70 10 56.6 10 40S23.4 10 40 10s30 13.4 30 30-13.4 30-30 30z"/>
                  <path d="M40 20c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 32c-6.6 0-12-5.4-12-12s5.4-12 12-12 12 5.4 12 12-5.4 12-12 12z"/>
                </svg>
              </div>
              <div>
                <p className="text-[0.85rem] font-medium text-[var(--text)]">AWS S3</p>
                {(cc as Record<string, Record<string, string> | undefined>).s3?.bucket ? (
                  <p className="text-[0.72rem] text-[#1dc44a]">Connected · {(cc as Record<string, Record<string, string> | undefined>).s3?.bucket}</p>
                ) : (
                  <p className="text-[0.72rem] text-[var(--text3)]">Direct upload/download from your S3 bucket</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 ml-11">
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[0.72rem] text-[var(--text3)] mb-1 block">Bucket name *</label>
                  <input className="input text-[0.82rem]" placeholder="my-brand-assets" value={s3Form.bucket} onChange={(e) => setS3Form((f) => ({ ...f, bucket: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[0.72rem] text-[var(--text3)] mb-1 block">Region *</label>
                  <input className="input text-[0.82rem]" placeholder="ap-southeast-2" value={s3Form.region} onChange={(e) => setS3Form((f) => ({ ...f, region: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-[0.72rem] text-[var(--text3)] mb-1 block">Access Key ID *</label>
                <input className="input text-[0.82rem]" placeholder="AKIAIOSFODNN7EXAMPLE" value={s3Form.access_key_id} onChange={(e) => setS3Form((f) => ({ ...f, access_key_id: e.target.value }))} autoComplete="off" />
              </div>
              <div>
                <label className="text-[0.72rem] text-[var(--text3)] mb-1 block">Secret Access Key *</label>
                <input className="input text-[0.82rem]" type="password" placeholder="••••••••••••••••••••••••••••••••••••••••" value={s3Form.secret_access_key} onChange={(e) => setS3Form((f) => ({ ...f, secret_access_key: e.target.value }))} autoComplete="new-password" />
              </div>
              <div className="col-span-2">
                <label className="text-[0.72rem] text-[var(--text3)] mb-1 block">Key prefix <span className="text-[var(--text3)]">(optional — e.g. shoots/)</span></label>
                <input className="input text-[0.82rem]" placeholder="shoots/" value={s3Form.prefix} onChange={(e) => setS3Form((f) => ({ ...f, prefix: e.target.value }))} />
              </div>
              {s3Error && <p className="col-span-2 text-[0.75rem] text-[#ff3b30]">{s3Error}</p>}
              <div className="col-span-2 flex items-center gap-3">
                <button onClick={saveS3} disabled={s3Saving} className="btn btn-primary text-[0.78rem]">
                  {s3Saving ? 'Saving…' : s3Saved ? 'Saved ✓' : 'Save S3 config'}
                </button>
                {!!(cc as Record<string, unknown>).s3 && (
                  <button onClick={() => disconnectProvider('s3')} disabled={disconnecting === 's3'} className="text-[0.75rem] text-[var(--text3)] hover:text-[#ff3b30] transition-colors">
                    {disconnecting === 's3' ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marketplace Integrations */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Marketplace Integrations</span>
        </div>
        <div className="card-body">
          <p className="text-[0.82rem] text-[var(--text3)] mb-4">
            Direct API integrations with marketplace partners are coming soon. Once enabled, ShotSync will push approved assets directly to each platform — no manual export required.
          </p>
          <div className="flex flex-col gap-3">
            {[
              { name: 'Shopify', desc: 'Sync product images to your Shopify store on export.', available: true },
              { name: 'THE ICONIC', desc: 'Auto-deliver approved image sets to THE ICONIC Content Portal.' },
              { name: 'Myer', desc: 'Push product imagery directly to the Myer supplier portal.' },
              { name: 'David Jones', desc: 'Deliver approved assets to David Jones via their content API.' },
            ].map((mp) => (
              <div key={mp.name} className="flex items-center justify-between px-4 py-3 rounded-sm bg-[var(--bg3)] border border-[var(--line)]">
                <div>
                  <p className="text-[0.85rem] font-medium text-[var(--text)]">{mp.name}</p>
                  <p className="text-[0.75rem] text-[var(--text3)] mt-[2px]">{mp.desc}</p>
                </div>
                {'available' in mp && mp.available ? (
                  <button onClick={onShopifyClick} className="chip chip-done text-[0.7rem] ml-4 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                    Available ↗
                  </button>
                ) : (
                  <span className="chip chip-uploading text-[0.7rem] ml-4 flex-shrink-0">Coming soon</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
