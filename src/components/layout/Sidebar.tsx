'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { BrandSwitcher } from './BrandSwitcher'
import { usePlan } from '@/context/PlanContext'
import { useSession } from '@/store/session'
import { openWelcomeModal } from '@/components/onboarding/WelcomeModal'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: { text: string; variant: 'blue' | 'green' | 'red' | 'amber' }
  disabled?: boolean
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
  {
    label: 'All Jobs',
    href: '/dashboard/jobs',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="10" rx="1.5"/>
        <path d="M10 3V2a2 2 0 0 0-4 0v1" strokeLinecap="round"/>
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
    href: '/dashboard/review',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 11V4M5 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 13h12" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Integrations',
    href: '/dashboard/settings?tab=integrations',
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
]

const NAV_CONFIG: NavItem[] = [
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

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [hrefPath, hrefQuery] = item.href.split('?')
  const isActive = item.href === '/dashboard'
    ? pathname === '/dashboard'
    : hrefQuery
      ? pathname === hrefPath && searchParams.get('tab') === new URLSearchParams(hrefQuery).get('tab')
      : pathname.startsWith(hrefPath)

  const baseClass = cn(
    'flex items-center gap-[9px] px-[8px] py-[7px] rounded-sm text-[0.8rem] font-medium transition-all duration-150 w-full',
    item.disabled
      ? 'opacity-35 cursor-not-allowed text-[var(--text3)]'
      : isActive
      ? 'text-[var(--accent)] bg-[rgba(77,101,255,0.08)]'
      : 'text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
  )

  const inner = (
    <>
      <span className={cn('w-[14px] h-[14px] flex-shrink-0', isActive && !item.disabled ? 'opacity-100' : 'opacity-70')}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className={cn(
          'ml-auto text-[0.65rem] font-bold px-[6px] py-[1px] rounded-[8px]',
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

  if (item.disabled) {
    return <span className={baseClass} title="No session active">{inner}</span>
  }

  return (
    <Link href={item.href} className={baseClass}>
      {inner}
    </Link>
  )
}

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', business: 'Business' }

export function Sidebar() {
  const { planId, plan, usage } = usePlan()
  const { isReady, clusters } = useSession((s) => ({ isReady: s.isReady, clusters: s.clusters }))
  const hasSession = isReady && clusters.length > 0
  const exportsLimit = plan.limits.exportsPerMonth
  const exportsUsed = usage.exportsThisMonth
  const [orgName, setOrgName] = useState<string | null>(null)
  const [orgRole, setOrgRole] = useState<string | null>(null)

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

  const canSeeBilling = !orgRole || orgRole === 'owner' || orgRole === 'admin'

  return (
    <aside className="w-[216px] min-w-[216px] bg-[var(--bg2)] flex flex-col sticky top-0 h-screen overflow-hidden" style={{ boxShadow: '1px 0 0 var(--line), 2px 0 12px rgba(0,0,0,0.04)' }}>

      {/* Logo */}
      <div className="px-4 py-5 border-b border-[var(--line)] flex items-center gap-[10px]">
        <div
          className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-deep)', boxShadow: '0 0 16px rgba(26,79,255,0.4)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
        </div>
        <div
          className="text-[0.95rem] font-bold tracking-[-0.5px] text-[var(--text)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Shot<span style={{ color: 'var(--accent)' }}>Sync</span><span style={{ color: 'var(--text3)', fontWeight: 300 }}>.ai</span>
        </div>
      </div>

      {/* Brand Switcher */}
      <BrandSwitcher />

      <Suspense fallback={null}>
      {/* Workspace */}
      <div className="px-[10px] pt-[14px] pb-[6px]">
        <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-[var(--text3)] px-[6px] mb-[5px]">
          Workspace
        </p>
        <nav className="flex flex-col gap-[1px]">
          {NAV_WORKSPACE.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
      </div>

      {/* Workflow */}
      <div className="px-[10px] pt-[10px] pb-[6px]">
        <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-[var(--text3)] px-[6px] mb-[5px]">
          Workflow
        </p>
        <nav className="flex flex-col gap-[1px]">
          {NAV_WORKFLOW.map((item) => {
            if (item.label === 'Export') {
              return (
                <NavLink
                  key="export"
                  item={{
                    ...item,
                    href: '/dashboard/review?export=1',
                    disabled: !hasSession,
                  }}
                />
              )
            }
            return <NavLink key={item.href} item={item} />
          })}
        </nav>
      </div>

      {/* Config */}
      <div className="px-[10px] pt-[10px] pb-[6px]">
        <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-[var(--text3)] px-[6px] mb-[5px]">
          Config
        </p>
        <nav className="flex flex-col gap-[1px]">
          {NAV_CONFIG.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
      </div>

      </Suspense>

      {/* Quick Guide */}
      <div className="px-[10px] pb-[6px]">
        <button
          onClick={openWelcomeModal}
          className="flex items-center gap-[9px] px-[8px] py-[7px] rounded-sm text-[0.8rem] w-full text-[var(--text3)] hover:bg-[var(--bg3)] hover:text-[var(--text2)] border border-transparent transition-all duration-150"
        >
          <span className="w-[14px] h-[14px] flex-shrink-0 opacity-70">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="7"/>
              <path d="M8 11v-1a2 2 0 1 0-2-2" strokeLinecap="round"/>
              <circle cx="8" cy="12.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
          </span>
          Quick Guide
        </button>
      </div>

      {/* Plan indicator — hidden from members */}
      {canSeeBilling && (
        <div className="mt-auto border-t border-[var(--line)] p-3">
          <Link
            href="/dashboard/settings?tab=billing"
            className="block bg-[var(--bg3)] rounded-[10px] p-[10px] px-3 hover:bg-[var(--bg4)] transition-colors"
          >
            <div className="flex items-center gap-[9px] mb-2">
              <div
                className="w-[28px] h-[28px] rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))', fontFamily: 'var(--font-display)' }}
              >
                {orgName ? orgName[0].toUpperCase() : 'S'}
              </div>
              <div>
                <p className="text-[11px] font-medium text-[var(--text)] truncate max-w-[130px]">{orgName ?? 'My Workspace'}</p>
                <p className="text-[9px] text-[var(--text3)] mt-[1px]">
                  {PLAN_LABEL[planId] ?? planId} Plan
                  {exportsLimit !== -1 && ` · ${exportsUsed}/${exportsLimit} exports`}
                  {exportsLimit === -1 && ' · Unlimited'}
                </p>
              </div>
            </div>
            {exportsLimit !== -1 && (
              <div className="h-[3px] bg-[var(--bg4)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((exportsUsed / exportsLimit) * 100))}%`,
                    background: exportsUsed >= exportsLimit
                      ? 'var(--accent3)'
                      : exportsUsed / exportsLimit >= 0.8
                      ? 'var(--accent4)'
                      : 'var(--accent)',
                  }}
                />
              </div>
            )}
          </Link>
        </div>
      )}
    </aside>
  )
}
