'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'
import { usePlan } from '@/context/PlanContext'
import { UsageBar } from '@/components/billing/UsageBar'
import { PLANS } from '@/lib/plans'

type Tab = 'general' | 'billing' | 'team'

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
  const [isAdmin, setIsAdmin] = useState(false)
  const [orgRole, setOrgRole] = useState<string | null>(null)
  const canSeeBilling = !orgRole || orgRole === 'owner' || orgRole === 'admin'

  const { plan, planId, usage, openUpgrade, refreshPlan } = usePlan()
  const { brands } = useBrand()
  const [portalLoading, setPortalLoading] = useState(false)

  // Team state
  const [teamMembers, setTeamMembers] = useState<{ user_id: string; email: string; role: string; joined_at: string }[]>([])
  const [pendingInvites, setPendingInvites] = useState<{ id: string; email: string; role: string; expires_at: string }[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url?: string; error?: string } | null>(null)
  const [teamLoaded, setTeamLoaded] = useState(false)

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      refreshPlan()
      const timers = [setTimeout(() => refreshPlan(), 3000), setTimeout(() => refreshPlan(), 7000), setTimeout(() => refreshPlan(), 15000)]
      return () => timers.forEach(clearTimeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) => {
      if (!session?.access_token) return
      if (session.user.email === 'photoworkssydney@gmail.com') setIsAdmin(true)
      return fetch('/api/orgs/me', { headers: { Authorization: `Bearer ${session.access_token}` } }).then((r) => r.json()).then(({ data, role }) => {
        if (data?.name) setOrgName(data.name)
        if (role) setOrgRole(role)
      })
    }).catch(() => {})
  }, [])

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

  const saveOrgName = async () => {
    if (!orgName.trim()) return
    setOrgNameSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/orgs/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ name: orgName.trim() }) })
      if (res.ok) { setOrgNameSaved(true); setTimeout(() => setOrgNameSaved(false), 2000) }
    } finally { setOrgNameSaving(false) }
  }

  const handleBillingPortal = async () => {
    setPortalLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/billing/portal', { method: 'POST', headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {} })
      const json = await res.json()
      if (json.url) window.location.href = json.url
    } finally { setPortalLoading(false) }
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteSending(true); setInviteResult(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/orgs/invite', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }) })
      const json = await res.json()
      if (!res.ok) { setInviteResult({ error: json.error ?? 'Failed to send invite' }) }
      else { setInviteResult({ url: json.data?.inviteUrl }); setInviteEmail(''); setTeamLoaded(false) }
    } catch { setInviteResult({ error: 'Network error' }) }
    setInviteSending(false)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    ...(canSeeBilling ? [{ id: 'billing' as Tab, label: 'Billing' }] : []),
    { id: 'team', label: 'Team' },
  ]

  return (
    <div>
      <Topbar breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]} />

      <div className="p-7">
        <div className="mb-7">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>Settings</h1>
          <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">Manage your account, team, and billing.</p>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="inline-flex bg-[var(--bg3)] p-[3px] rounded-sm gap-[2px]">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`px-[14px] py-[6px] rounded-[5px] text-[0.8rem] font-medium transition-all duration-150 ${tab === t.id ? 'bg-[var(--bg)] text-[var(--text)]' : 'text-[var(--text2)] hover:text-[var(--text)]'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {isAdmin && (
            <a href="/dashboard/admin" className="inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-[5px] text-[0.78rem] font-medium text-[var(--text3)] hover:text-[var(--text)] border border-[var(--line)] hover:border-[var(--line2)] transition-all">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              Admin
            </a>
          )}
        </div>

        {/* ── General ───────────────────────────────────────────────────────── */}
        {tab === 'general' && (
          <div className="flex flex-col gap-4 max-w-[760px]">
            <div className="card">
              <div className="card-head"><span className="card-title">General Settings</span></div>
              <div className="card-body">
                <div className="flex items-center justify-between py-[14px] border-b border-[var(--line)]">
                  <div>
                    <p className="text-[1rem] font-medium text-[var(--text)]">Organisation Name</p>
                    <p className="text-[0.8rem] text-[var(--text3)] mt-[2px]">Shown in the sidebar and on exports</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input className="input w-[220px]" value={orgName} onChange={(e) => setOrgName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveOrgName() }} placeholder="Your company name" />
                    <button onClick={saveOrgName} disabled={orgNameSaving || !orgName.trim()} className="btn btn-primary btn-sm">
                      {orgNameSaved ? '✓ Saved' : orgNameSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Billing ───────────────────────────────────────────────────────── */}
        {tab === 'billing' && (
          <div className="p-7 pt-0 flex flex-col gap-4 max-w-[760px]">
            <div className="card">
              <div className="card-head">
                <span className="card-title">Current Plan</span>
                {planId !== 'free' && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                  <button onClick={handleBillingPortal} disabled={portalLoading} className="text-[0.8rem] text-[var(--text3)] hover:text-[var(--text2)] transition-colors">{portalLoading ? 'Loading…' : 'Manage subscription →'}</button>
                )}
              </div>
              <div className="card-body">
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-[5px] rounded-sm text-[0.78rem] font-bold uppercase tracking-[0.05em] ${planId === 'enterprise' ? 'bg-[rgba(232,122,122,0.15)] text-[var(--accent3)]' : planId === 'scale' ? 'bg-[rgba(122,180,232,0.15)] text-[var(--accent4)]' : planId === 'brand' ? 'bg-[rgba(232,217,122,0.15)] text-[var(--accent)]' : planId === 'starter' ? 'bg-[rgba(62,207,142,0.15)] text-[var(--accent2)]' : 'bg-[var(--bg3)] text-[var(--text3)]'}`}>{plan.name}</div>
                    <div>
                      <p className="text-[0.88rem] font-semibold text-[var(--text)]">{plan.priceAud === 0 ? 'Free forever' : `$${plan.priceAud} AUD/month`}</p>
                      <p className="text-[0.8rem] text-[var(--text3)]">{plan.description}</p>
                    </div>
                  </div>
                  {planId === 'free' && <button onClick={() => openUpgrade('Upgrade to unlock more')} className="btn btn-primary btn-sm">Start free trial</button>}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><span className="card-title">Usage</span><span className="text-[0.8rem] text-[var(--text3)]">Resets 1st of each month</span></div>
              <div className="card-body flex flex-col gap-4">
                <UsageBar label="Images this month" value={usage.imagesThisMonth} limit={plan.limits.imagesPerMonth} />
                <UsageBar label="Exports this month" value={usage.exportsThisMonth} limit={plan.limits.exportsPerMonth} />
                <UsageBar label="Brands" value={brands.length} limit={plan.limits.brands} />
                <UsageBar label="Marketplaces per export" value={0} limit={plan.limits.marketplaces} />
              </div>
            </div>

            {planId !== 'enterprise' && (
              <div className="card">
                <div className="card-head"><span className="card-title">Available Plans</span></div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[var(--text3)] px-3 py-2 border-b border-[var(--line)]">Feature</th>
                        {(['free', 'starter', 'brand', 'scale', 'enterprise'] as const).map((id) => (
                          <th key={id} className={`text-center text-[0.78rem] font-medium uppercase tracking-[0.08em] px-3 py-2 border-b border-[var(--line)] ${id === planId ? 'text-[var(--accent)]' : 'text-[var(--text3)]'}`}>{PLANS[id].name}{id === planId && ' ✓'}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { feature: 'Images per month',   values: ['25', '500', '3,000', '6,000', 'Unlimited'] },
                        { feature: 'ANZ marketplaces',   values: ['—', '2', '4', '4', '4'] },
                        { feature: 'Shopify stores',     values: ['—', '1', '2', '5', 'Unlimited'] },
                        { feature: 'Brands',             values: ['1', '1', '2', '5', 'Unlimited'] },
                        { feature: 'Seats',              values: ['1', '2', '5', '10', 'Unlimited'] },
                        { feature: 'AI copywriting',     values: ['—', '—', '✓', '✓', '✓'] },
                        { feature: 'Background removal', values: ['—', '—', '+$0.16/img', '+$0.16/img', '+$0.16/img'] },
                        { feature: 'Price (AUD/mo)',     values: ['Free', '$79', '$199', '$399', 'Contact us'] },
                      ].map((row) => (
                        <tr key={row.feature} className="hover:bg-[var(--bg3)] transition-colors">
                          <td className="px-3 py-[9px] text-[0.8rem] text-[var(--text2)] border-b border-[var(--line)]">{row.feature}</td>
                          {row.values.map((v, i) => {
                            const id = (['free', 'starter', 'brand', 'scale', 'enterprise'] as const)[i]
                            return <td key={id} className={`px-3 py-[9px] text-[0.8rem] text-center border-b border-[var(--line)] ${id === planId ? 'font-semibold text-[var(--text)]' : 'text-[var(--text3)]'}`} style={v === '✓' ? { color: 'var(--accent2)' } : {}}>{v}</td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-3 border-t border-[var(--line)] flex justify-end">
                  <button onClick={() => openUpgrade('Upgrade to unlock more features')} className="btn btn-primary btn-sm">Start free trial</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Team ──────────────────────────────────────────────────────────── */}
        {tab === 'team' && (
          <div className="p-7 pt-0 flex flex-col gap-4 max-w-[760px]">
            <div className="card">
              <div className="card-head"><span className="card-title">Invite Team Member</span></div>
              <div className="card-body flex flex-col gap-3">
                <div className="flex gap-2">
                  <input type="email" className="input flex-1" placeholder="colleague@brand.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                  <select className="input w-[110px]" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={sendInvite} disabled={inviteSending || !inviteEmail.trim()} className="btn btn-primary">{inviteSending ? 'Sending…' : 'Invite'}</button>
                </div>
                {inviteResult?.error && <p className="text-[0.78rem] text-[var(--accent3)]">{inviteResult.error}</p>}
                {inviteResult?.url && (
                  <div className="bg-[var(--bg3)] rounded-sm p-3 text-[0.78rem]">
                    <p className="text-[var(--text2)] mb-1 font-medium">Invite link (copy and send to teammate):</p>
                    <code className="text-[var(--accent2)] break-all select-all">{inviteResult.url}</code>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><span className="card-title">Members</span><span className="text-[0.8rem] text-[var(--text3)]">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span></div>
              <div className="card-body p-0">
                {!teamLoaded ? <p className="text-[0.8rem] text-[var(--text3)] px-4 py-3">Loading…</p> : teamMembers.length === 0 ? <p className="text-[0.8rem] text-[var(--text3)] px-4 py-3">No members yet.</p> : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--line)]">
                        <th className="text-left text-[0.78rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">User</th>
                        <th className="text-left text-[0.78rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">Role</th>
                        <th className="text-left text-[0.78rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((m) => (
                        <tr key={m.user_id} className="border-b border-[var(--line)] last:border-0">
                          <td className="px-4 py-[10px] text-[0.8rem] text-[var(--text)] truncate max-w-[200px]">{m.email || m.user_id.slice(0, 8) + '…'}</td>
                          <td className="px-4 py-[10px]"><span className={`chip ${m.role === 'owner' ? 'chip-ready' : m.role === 'admin' ? 'chip-review' : 'chip-uploading'}`}>{m.role}</span></td>
                          <td className="px-4 py-[10px] text-[0.78rem] text-[var(--text3)]">{new Date(m.joined_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {pendingInvites.length > 0 && (
              <div className="card">
                <div className="card-head"><span className="card-title">Pending Invites</span><span className="text-[0.8rem] text-[var(--text3)]">{pendingInvites.length} pending</span></div>
                <div className="card-body p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--line)]">
                        <th className="text-left text-[0.78rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">Email</th>
                        <th className="text-left text-[0.78rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">Role</th>
                        <th className="text-left text-[0.78rem] font-medium uppercase tracking-[0.06em] text-[var(--text3)] px-4 py-2">Expires</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvites.map((inv) => (
                        <tr key={inv.id} className="border-b border-[var(--line)] last:border-0">
                          <td className="px-4 py-[10px] text-[0.8rem] text-[var(--text)]">{inv.email}</td>
                          <td className="px-4 py-[10px]"><span className="chip chip-uploading">{inv.role}</span></td>
                          <td className="px-4 py-[10px] text-[0.78rem] text-[var(--text3)]">{new Date(inv.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</td>
                          <td className="px-4 py-[10px] text-right">
                            <button onClick={async () => {
                              const { createClient } = await import('@/lib/supabase/client')
                              const { data: { session } } = await createClient().auth.getSession()
                              const res = await fetch(`/api/orgs/invite?id=${inv.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${session?.access_token}` } })
                              if (res.ok) setPendingInvites((prev) => prev.filter((i) => i.id !== inv.id))
                            }} className="text-[0.8rem] text-[var(--text3)] hover:text-[var(--accent3)] transition-colors">Revoke</button>
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
      </div>
    </div>
  )
}
