'use client'

// Module-level cache — survives re-renders and back-navigation within the same session
let _orgCache: { name: string; role: string | null } | null = null
const ORG_LS_KEY = 'shotsync:org'

import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { BrandSwitcher } from './BrandSwitcher'
import { usePlan } from '@/context/PlanContext'
import { useSession } from '@/store/session'
import { openWelcomeModal } from '@/components/onboarding/WelcomeModal'
import { openHelpModal } from '@/components/help/HelpModal'
import type { SessionHeader } from '@/lib/session-store'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: { text: string; variant: 'blue' | 'green' | 'red' | 'amber' }
  disabled?: boolean
  activeWhen?: (pathname: string) => boolean
}

const NAV_WORKSPACE: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1"/>
        <rect x="9" y="1" width="6" height="6" rx="1"/>
        <rect x="1" y="9" width="6" height="6" rx="1"/>
        <rect x="9" y="9" width="6" height="6" rx="1"/>
      </svg>
    ),
  },
]

const NAV_WORKFLOW: NavItem[] = [
  {
    label: 'Upload',
    href: '/dashboard/upload',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 11V4M5 7l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 13h12" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Clusters',
    href: '/dashboard/review',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1"/>
        <rect x="9" y="1" width="6" height="6" rx="1"/>
        <rect x="1" y="9" width="6" height="6" rx="1"/>
        <rect x="9" y="9" width="6" height="6" rx="1"/>
      </svg>
    ),
  },
  {
    label: 'Export',
    href: '/dashboard/jobs/session/export',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 10V3M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 13h12" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'All Jobs',
    href: '/dashboard/jobs',
    activeWhen: (p) => p === '/dashboard/jobs' || (p.startsWith('/dashboard/jobs/') && !p.includes('/session/')),
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="10" rx="1.5"/>
        <path d="M10 3V2a2 2 0 0 0-4 0v1" strokeLinecap="round"/>
      </svg>
    ),
  },
]

const NAV_CONFIG: NavItem[] = [
  {
    label: 'Brands',
    href: '/dashboard/brands',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="6" r="2.5"/>
        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Marketplaces',
    href: '/dashboard/marketplaces',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 3H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3" strokeLinecap="round"/>
        <path d="M10 3h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3" strokeLinecap="round"/>
        <path d="M6 10H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3" strokeLinecap="round"/>
        <path d="M10 10h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3" strokeLinecap="round"/>
        <path d="M6 4.5h4M6 11.5h4M8 7v2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="2.5"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M11.4 3.2l-1.4 1.4M3.2 11.4l1.4 1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
]

function NavLink({ item, disabled }: { item: NavItem; disabled?: boolean }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [hrefPath, hrefQuery] = item.href.split('?')
  const isActive = item.activeWhen
    ? item.activeWhen(pathname)
    : item.href === '/dashboard'
      ? pathname === '/dashboard'
      : hrefQuery
        ? pathname === hrefPath && searchParams.get('tab') === new URLSearchParams(hrefQuery).get('tab')
        : pathname.startsWith(hrefPath)

  const isDisabled = disabled ?? item.disabled

  const baseClass = cn(
    'flex items-center gap-[8px] px-[10px] py-[6px] rounded-[8px] text-[14px] transition-all duration-150 w-full border-0',
    isDisabled
      ? 'opacity-35 cursor-not-allowed'
      : isActive
      ? 'font-medium'
      : 'font-normal'
  )

  const activeStyle = isActive && !isDisabled
    ? { background: 'rgba(255,255,255,0.10)', color: 'var(--text)' }
    : { color: 'var(--text3)' }

  const inner = (
    <>
      <span className={cn('w-[15px] h-[15px] flex-shrink-0', isActive && !isDisabled ? 'opacity-90' : 'opacity-50')}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className={cn(
          'ml-auto text-[0.83rem] font-bold px-[6px] py-[1px] rounded-[8px]',
          item.badge.variant === 'blue'  && 'bg-[var(--accent)] text-black',
          item.badge.variant === 'green' && 'bg-[var(--accent2)] text-black',
          item.badge.variant === 'red'   && 'bg-[var(--accent3)] text-white',
          item.badge.variant === 'amber' && 'bg-[var(--accent4)] text-black',
        )}>
          {item.badge.text}
        </span>
      )}
    </>
  )

  if (isDisabled) {
    return <span className={baseClass} style={{ color: 'var(--text3)' }}>{inner}</span>
  }

  return (
    <Link href={item.href} className={baseClass} style={activeStyle}>
      {inner}
    </Link>
  )
}

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', business: 'Business' }

const ANGLE_DOT: Record<string, string> = {
  'front': '#30d158', 'back': '#0a84ff', 'side': '#ff9f0a',
  'full-length': '#bf5af2', 'detail': '#ff453a', 'mood': '#ff375f',
  'front-3/4': '#30d158', 'back-3/4': '#0a84ff',
}

export function Sidebar() {
  const { planId, plan, usage } = usePlan()
  const { isReady, clusters, jobName, marketplaces, styleList, setSession, setStyleList } = useSession((s) => ({
    isReady: s.isReady,
    clusters: s.clusters,
    jobName: s.jobName,
    marketplaces: s.marketplaces,
    styleList: s.styleList,
    setSession: s.setSession,
    setStyleList: s.setStyleList,
  }))
  const allExported = clusters.length > 0 && clusters.every((c) => c.exported)
  const hasSession = isReady && clusters.length > 0 && !allExported
  const confirmedCount = clusters.filter((c) => c.confirmed).length
  const exportsLimit = plan.limits.exportsPerMonth
  const exportsUsed = usage.exportsThisMonth
  const [orgName, setOrgName] = useState<string | null>(() => {
    if (_orgCache) return _orgCache.name
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem(ORG_LS_KEY) || 'null')?.name ?? null } catch { return null }
  })
  const [orgRole, setOrgRole] = useState<string | null>(() => {
    if (_orgCache) return _orgCache.role
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem(ORG_LS_KEY) || 'null')?.role ?? null } catch { return null }
  })
  const [parkedJobs, setParkedJobs] = useState<SessionHeader[]>([])
  const [resumingId, setResumingId] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const onReviewPage = pathname === '/dashboard/review'

  const reloadParked = useCallback(async () => {
    try {
      const { listParkedJobs } = await import('@/lib/session-store')
      setParkedJobs(await listParkedJobs())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    reloadParked()
    const onChanged = () => reloadParked()
    window.addEventListener('shotsync:parked-changed', onChanged)
    window.addEventListener('storage', (e) => { if (e.key === 'shotsync:parked-version') reloadParked() })
    return () => window.removeEventListener('shotsync:parked-changed', onChanged)
  }, [reloadParked])

  async function handleResume(parkId: string) {
    setResumingId(parkId)
    try {
      const { parkJob, resumeParkedJob } = await import('@/lib/session-store')
      if (clusters.length > 0) {
        await parkJob(jobName || 'Untitled Job', clusters, marketplaces, null, styleList)
      }
      const result = await resumeParkedJob(parkId)
      if (result) {
        setSession(result.jobName, result.clusters, result.marketplaces)
        if (result.styleList.length > 0) setStyleList(result.styleList)
        router.push('/dashboard/review')
      }
      await reloadParked()
    } catch { /* silent */ } finally {
      setResumingId(null)
    }
  }

  async function handleDiscard(parkId: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const { deleteParkedJob } = await import('@/lib/session-store')
      await deleteParkedJob(parkId)
      await reloadParked()
    } catch { /* silent */ }
  }

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  useEffect(() => {
    if (_orgCache) return // already have it from this session
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) => {
      if (!session?.access_token) return
      return fetch('/api/orgs/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then((r) => r.json()).then(({ data, role }) => {
        if (data?.name) {
          setOrgName(data.name)
          setOrgRole(role ?? null)
          _orgCache = { name: data.name, role: role ?? null }
          try { localStorage.setItem(ORG_LS_KEY, JSON.stringify(_orgCache)) } catch { /* ignore */ }
        }
      })
    }).catch(() => {})
  }, [])

  const canSeeBilling = !orgRole || orgRole === 'owner' || orgRole === 'admin'

  const SL = { fontSize: '11px', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: 'var(--text3)', padding: '0 8px', marginBottom: '3px' }

  return (
    <aside className="w-[200px] min-w-[200px] flex flex-col sticky top-0 h-screen" style={{ background: '#1c1c1c', borderRight: '0.5px solid rgba(255,255,255,0.07)' }}>

      {/* Logo */}
      <div className="flex items-center gap-[9px]" style={{ padding: '20px 16px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <img src="/icon.png" alt="ShotSync" className="w-[28px] h-[28px] rounded-[7px] flex-shrink-0" />
        <div className="text-[16px] font-medium tracking-[-0.3px]" style={{ color: '#f0f0f0', fontFamily: "'Inter', sans-serif" }}>
          Shot<span style={{ color: 'rgba(255,255,255,0.4)' }}>Sync</span>
        </div>
      </div>

      {/* Brand Switcher */}
      <BrandSwitcher />

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '10px 0 0' }}>

        <Suspense fallback={null}>
          {/* Workspace */}
          <div style={{ padding: '0 10px 6px' }}>
            <p style={SL}>Workspace</p>
            <nav className="flex flex-col gap-[2px]">
              {NAV_WORKSPACE.map((item) => <NavLink key={item.href} item={item} />)}
            </nav>
          </div>

          {/* Pipeline */}
          <div style={{ padding: '8px 10px 6px' }}>
            <p style={SL}>Pipeline</p>
            <nav className="flex flex-col gap-[2px]">
              {NAV_WORKFLOW.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  disabled={
                    (item.href === '/dashboard/review' || item.href.includes('session/export'))
                      ? !hasSession
                      : item.disabled
                  }
                />
              ))}
            </nav>
          </div>

          {/* Configure */}
          <div style={{ padding: '8px 10px 6px' }}>
            <p style={SL}>Configure</p>
            <nav className="flex flex-col gap-[2px]">
              {NAV_CONFIG.map((item) => <NavLink key={item.href} item={item} />)}
            </nav>
          </div>
        </Suspense>

        {/* Cluster list — visible on review page when session has clusters */}
        {onReviewPage && hasSession && (() => {
          const sorted = [...clusters].sort((a, b) => {
            const labelA = a.sku || a.label || ''
            const labelB = b.sku || b.label || ''
            const numA = parseInt(labelA.match(/(\d+)/)?.[1] ?? '0', 10)
            const numB = parseInt(labelB.match(/(\d+)/)?.[1] ?? '0', 10)
            if (numA !== numB) return numA - numB
            return labelA.localeCompare(labelB)
          })
          return (
            <div style={{ padding: '8px 10px 6px', borderTop: '1.5px solid rgba(255,255,255,0.1)', marginTop: '4px' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ ...SL, padding: 0, marginBottom: 0 }}>{clusters.length} Clusters</p>
                  <span style={{ fontSize: '11px', color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: confirmedCount === clusters.length ? '#30d158' : 'var(--text2)' }}>{confirmedCount}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>/{clusters.length}</span>
                  </span>
                </div>
                {/* Scrollable list */}
                <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                  {sorted.map((c) => {
                    const dot = c.confirmed ? '#30d158' : 'rgba(255,255,255,0.2)'
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('shotsync:select-cluster', { detail: { id: c.id } }))
                          setTimeout(() => document.getElementById(`cluster-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                        }}
                        className="flex items-center gap-[8px] w-full text-left rounded-[6px] transition-all duration-150"
                        style={{ padding: '4px 7px', color: 'var(--text3)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text3)' }}
                      >
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: dot, border: c.confirmed ? 'none' : '1px solid rgba(255,255,255,0.25)' }} />
                        <span style={{ fontSize: '12.5px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.sku || c.label || '—'}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}>{c.images.length} img</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Parked Jobs */}
        {parkedJobs.length > 0 && (
          <div style={{ padding: '8px 10px 6px', borderTop: '0.5px solid rgba(255,255,255,0.06)', marginTop: '4px' }}>
            <p style={SL}>Parked ({parkedJobs.length})</p>
            <div className="flex flex-col">
              {parkedJobs.map((job) => (
                <div key={job.id} style={{ position: 'relative' }}>
                  <button
                    onClick={() => handleResume(job.id)}
                    disabled={!!resumingId}
                    className="flex flex-col items-start w-full text-left rounded-[7px] transition-all duration-150"
                    style={{ padding: '5px 28px 5px 8px', color: 'var(--text3)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <span className="text-[13px] font-medium truncate w-full" style={{ color: 'var(--text)', maxWidth: '148px', display: 'block' }}>
                      {resumingId === job.id ? 'Resuming…' : job.jobName}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
                      {job.clusterCount} cluster{job.clusterCount !== 1 ? 's' : ''} · {relativeTime(job.savedAt)}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleDiscard(job.id, e)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '4px', lineHeight: 1 }}
                    title="Discard"
                  >
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 2l8 8M10 2L2 10"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help & FAQ */}
        <div style={{ padding: '8px 10px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)', marginTop: '4px' }}>
          <button
            onClick={openHelpModal}
            className="flex items-center gap-[8px] px-[10px] py-[6px] rounded-[8px] text-[14px] w-full transition-all duration-150"
            style={{ color: 'var(--text3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text3)' }}
          >
            <span className="w-[14px] h-[14px] flex-shrink-0 opacity-50">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="7"/>
                <path d="M8 11v-1a2 2 0 1 0-2-2" strokeLinecap="round"/>
                <circle cx="8" cy="12.5" r="0.5" fill="currentColor" stroke="none"/>
              </svg>
            </span>
            Help & FAQ
          </button>
        </div>

        {/* Sign Out */}
        <div style={{ padding: '2px 10px 8px' }}>
          <button
            onClick={async () => {
              const { createClient } = await import('@/lib/supabase/client')
              await createClient().auth.signOut()
              await fetch('/api/auth/signout', { method: 'POST' })
              window.location.href = '/'
            }}
            className="flex items-center gap-[8px] px-[10px] py-[6px] rounded-[8px] text-[14px] w-full transition-all duration-150"
            style={{ color: 'var(--text3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text3)' }}
          >
            <span className="w-[14px] h-[14px] flex-shrink-0 opacity-50">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" strokeLinecap="round"/>
                <path d="M11 5l3 3-3 3M14 8H7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Sign out
          </button>
        </div>
      </div>

      {/* Plan indicator */}
      {canSeeBilling && (
        <div style={{ padding: '10px', borderTop: '0.5px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <Link
            href="/dashboard/settings?tab=billing"
            className="flex items-center gap-[9px] px-[10px] py-[8px] rounded-[10px] transition-colors"
            style={{ cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
          >
            <div
              className="w-[28px] h-[28px] rounded-full flex items-center justify-center font-medium text-[12px] flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--text)', letterSpacing: '-0.3px' }}
            >
              {orgName ? orgName[0].toUpperCase() : 'S'}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>{orgName ?? 'My Workspace'}</p>
              <p className="text-[11px] mt-[1px]" style={{ color: 'var(--text3)' }}>
                {PLAN_LABEL[planId] ?? planId} plan
              </p>
            </div>
          </Link>
          {exportsLimit !== -1 && (
            <div className="mx-[10px] mt-[5px] h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round((exportsUsed / exportsLimit) * 100))}%`,
                  background: exportsUsed >= exportsLimit ? '#ff453a' : exportsUsed / exportsLimit >= 0.8 ? '#ff9f0a' : 'rgba(255,255,255,0.4)',
                }}
              />
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
