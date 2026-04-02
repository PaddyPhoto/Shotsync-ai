'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { BrandSwitcher } from './BrandSwitcher'
import { usePlan } from '@/context/PlanContext'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: { text: string; variant: 'gold' | 'green' | 'red' | 'blue' }
}

const NAV_MAIN: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="6" height="6" rx="1" opacity=".7"/>
        <rect x="9" y="1" width="6" height="6" rx="1" opacity=".7"/>
        <rect x="1" y="9" width="6" height="6" rx="1" opacity=".7"/>
        <rect x="9" y="9" width="6" height="6" rx="1" opacity=".7"/>
      </svg>
    ),
  },
  {
    label: 'New Upload',
    href: '/dashboard/upload',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 12V4M5 7l3-3 3 3"/>
        <path d="M2 14h12" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'All Jobs',
    href: '/dashboard/jobs',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="12" height="12" rx="2"/>
        <path d="M5 6h6M5 9h4" strokeLinecap="round"/>
      </svg>
    ),
  },
]

const NAV_TOOLS: NavItem[] = [
  {
    label: 'Shopify Sync',
    href: '/dashboard/settings?tab=shopify',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" opacity=".8">
        <path d="M11.5 1.5c-.3-1-1.2-1.5-2-1.3l-6 1.2C2.6 1.6 2 2.3 2 3.1v9.8c0 .8.7 1.5 1.5 1.5h9c.8 0 1.5-.7 1.5-1.5V4c0-.8-.5-1.8-2.5-2.5zm-3.5 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
      </svg>
    ),
  },
  {
    label: 'Marketplace Rules',
    href: '/dashboard/settings?tab=marketplaces',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6"/>
        <path d="M8 4v4l3 2" strokeLinecap="round"/>
      </svg>
    ),
  },
]

const NAV_ACCOUNT: NavItem[] = [
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
  const isActive = item.href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname.startsWith(item.href.split('?')[0])

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-[10px] px-[10px] py-2 rounded-sm text-[0.88rem] font-normal transition-all duration-150 relative',
        isActive
          ? 'bg-[rgba(232,217,122,0.08)] text-[var(--accent)]'
          : 'text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
      )}
    >
      <span className={cn('w-4 h-4 flex-shrink-0', isActive ? 'opacity-100' : 'opacity-70')}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className={cn(
          'ml-auto text-[0.65rem] font-bold px-[6px] py-[1px] rounded-[10px]',
          item.badge.variant === 'gold' && 'bg-[var(--accent)] text-black',
          item.badge.variant === 'green' && 'bg-[var(--accent2)] text-black',
          item.badge.variant === 'red' && 'bg-[var(--accent3)] text-black',
          item.badge.variant === 'blue' && 'bg-[var(--accent4)] text-black',
        )}>
          {item.badge.text}
        </span>
      )}
    </Link>
  )
}

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', business: 'Business' }
const PLAN_COLOR: Record<string, string> = { free: 'var(--text3)', pro: 'var(--accent)', business: 'var(--accent2)' }

export function Sidebar() {
  const { planId, plan, usage } = usePlan()
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
    <aside className="w-[240px] min-w-[240px] bg-[var(--bg2)] border-r border-[var(--line)] flex flex-col sticky top-0 h-screen overflow-hidden">
      {/* Logo */}
      <div className="px-5 py-[18px] border-b border-[var(--line)]">
        <div className="flex items-center gap-[10px]">
          <div className="w-[30px] h-[30px] bg-[var(--accent)] rounded-[8px] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="black">
              <rect x="2" y="2" width="5" height="7" rx="1"/>
              <rect x="9" y="2" width="5" height="5" rx="1"/>
              <rect x="9" y="9" width="5" height="5" rx="1"/>
              <rect x="2" y="11" width="5" height="3" rx="1"/>
            </svg>
          </div>
          <span
            className="text-[1.2rem] font-[800] tracking-[-0.5px] text-[var(--text)]"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Frames<span className="text-[var(--accent)]">Ops</span>
          </span>
        </div>
        {orgName && (
          <p className="text-[0.72rem] text-[var(--text3)] mt-[6px] pl-[40px] truncate" title={orgName}>
            {orgName}
          </p>
        )}
      </div>

      {/* Brand Switcher */}
      <BrandSwitcher />

      {/* Main Nav */}
      <div className="px-3 pt-2 pb-2">
        <p className="text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--text3)] px-2 mb-[6px]">
          Workspace
        </p>
        <nav className="flex flex-col gap-[1px]">
          {NAV_MAIN.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
      </div>

      <div className="px-3 pt-3 pb-2">
        <p className="text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--text3)] px-2 mb-[6px]">
          Integrations
        </p>
        <nav className="flex flex-col gap-[1px]">
          {NAV_TOOLS.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
      </div>

      <div className="px-3 pt-3 pb-2">
        <p className="text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--text3)] px-2 mb-[6px]">
          Account
        </p>
        <nav className="flex flex-col gap-[1px]">
          {NAV_ACCOUNT.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
      </div>

      {/* Plan indicator — hidden from members */}
      {canSeeBilling && <div className="mt-auto border-t border-[var(--line)] p-3">
        <Link href="/dashboard/settings?tab=billing" className="block bg-[var(--bg3)] rounded-md p-3 hover:bg-[var(--bg4)] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.78rem] font-medium text-[var(--text2)]">Current Plan</span>
            <span
              className="text-[0.65rem] font-bold px-[6px] py-[2px] rounded-[10px]"
              style={{ background: `color-mix(in srgb, ${PLAN_COLOR[planId]} 15%, transparent)`, color: PLAN_COLOR[planId] }}
            >
              {PLAN_LABEL[planId] ?? planId}
            </span>
          </div>
          {exportsLimit !== -1 && (
            <div>
              <div className="flex items-center justify-between mb-[4px]">
                <span className="text-[0.68rem] text-[var(--text3)]">Exports this month</span>
                <span className="text-[0.68rem] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                  {exportsUsed}/{exportsLimit}
                </span>
              </div>
              <div className="h-[3px] bg-[var(--bg4)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((exportsUsed / exportsLimit) * 100))}%`,
                    background: exportsUsed >= exportsLimit
                      ? 'var(--accent3)'
                      : exportsUsed / exportsLimit >= 0.8
                      ? 'var(--accent)'
                      : 'var(--accent2)',
                  }}
                />
              </div>
            </div>
          )}
          {exportsLimit === -1 && (
            <p className="text-[0.68rem] text-[var(--text3)]">Unlimited exports</p>
          )}
        </Link>
      </div>}
    </aside>
  )
}
