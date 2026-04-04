'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'
import { useMarketplaceRules } from '@/lib/marketplace/useMarketplaceRules'

interface JobRecord {
  id: string
  job_name: string
  image_count: number
  cluster_count: number
  marketplaces: string[]
  status: string
  created_at: string
}

const STATUS_CHIP: Record<string, string> = {
  processing: 'chip-processing',
  completed: 'chip-ready',
  failed: 'chip-error',
}

const STATUS_LABELS: Record<string, string> = {
  processing: 'Processing',
  completed: 'Exported',
  failed: 'Failed',
}

interface LifetimeStats {
  total_jobs: number
  total_images: number
  total_clusters: number
  total_exports: number
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [stats, setStats] = useState<LifetimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState<string | null>(null)
  const { activeBrand } = useBrand()
  const { rules } = useMarketplaceRules()

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) => {
      if (!session?.access_token) return
      fetch('/api/orgs/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then((r) => r.json()).then(({ data }) => {
        if (data?.name) setOrgName(data.name)
      }).catch(() => {})
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = activeBrand?.id
      ? `/api/jobs/history?brand_id=${activeBrand.id}`
      : '/api/jobs/history'
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) =>
      fetch(url, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
    ).then((r) => r.json())
      .then(({ data, stats: s }) => {
        setJobs(Array.isArray(data) ? data.slice(0, 4) : [])
        if (s) setStats(s)
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [activeBrand?.id])

  const marketplaceNames = Object.keys(rules)
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div>
      <Topbar
        breadcrumbs={[{ label: 'ShotSync.ai' }, { label: 'Dashboard' }]}
        actions={
          <Link href="/dashboard/upload" className="btn btn-primary">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 10V3M3 6l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New Job
          </Link>
        }
      />

      <div className="p-6">
        {/* Page title */}
        <h1
          className="text-[1.4rem] font-bold tracking-[-0.8px] text-[var(--text)] mb-[3px]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {greeting}{orgName ? `, ${orgName}` : ''}
        </h1>
        <p className="text-[0.8rem] text-[var(--text2)] mb-5">
          {loading ? 'Loading…' : `${jobs.length} recent jobs`}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Images Processed', value: stats?.total_images ?? 0, sub: 'lifetime total' },
            { label: 'Active Clusters',  value: stats?.total_clusters ?? 0, sub: 'across all jobs' },
            { label: 'Exports Ready',    value: stats?.total_exports ?? 0, sub: 'completed jobs' },
            { label: 'Total Jobs',       value: stats?.total_jobs ?? 0, sub: 'all time' },
          ].map((s, i) => (
            <div
              key={s.label}
              className="bg-[var(--bg2)] border border-[var(--line)] rounded-[10px] px-4 py-[14px] relative overflow-hidden"
              style={i === 0 ? { borderColor: 'rgba(74,158,255,0.2)' } : {}}
            >
              {i === 0 && (
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'var(--accent)' }} />
              )}
              <p className="text-[10px] text-[var(--text3)] uppercase tracking-[0.07em] mb-[6px]">{s.label}</p>
              <p className="text-[1.5rem] font-bold text-[var(--text)] leading-none mb-[5px]" style={{ fontFamily: 'var(--font-display)' }}>
                {loading ? '—' : s.value.toLocaleString()}
              </p>
              <p className="text-[11px] text-[var(--text2)]">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-[1fr_280px] gap-4 mb-4">

          {/* Recent Jobs */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">Recent Jobs</span>
              <Link href="/dashboard/jobs" className="btn btn-ghost btn-sm" style={{ fontSize: '10px', padding: '4px 10px' }}>
                View all →
              </Link>
            </div>
            {loading ? (
              <p className="text-[0.82rem] text-[var(--text3)] p-4">Loading…</p>
            ) : jobs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[0.85rem] text-[var(--text2)] font-medium">No jobs yet</p>
                <p className="text-[0.78rem] text-[var(--text3)] mt-1 mb-4">Upload your first shoot to get started.</p>
                <Link href="/dashboard/upload" className="btn btn-primary inline-flex">New Upload</Link>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 px-4 py-[11px] border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg3)] transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-sm bg-[var(--bg3)] border border-[var(--line2)] flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text2)" strokeWidth="1.5">
                      <rect x="1" y="1" width="5" height="7" rx="0.8"/>
                      <rect x="8" y="1" width="5" height="4" rx="0.8"/>
                      <rect x="8" y="7" width="5" height="6" rx="0.8"/>
                      <rect x="1" y="10" width="5" height="3" rx="0.8"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[var(--text)] truncate">{job.job_name}</p>
                    <p className="text-[10px] text-[var(--text3)] mt-[2px]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {job.image_count} images · {job.cluster_count} clusters · {new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className={`chip ${STATUS_CHIP[job.status] ?? 'chip-uploading'}`} style={{ fontSize: '10px' }}>
                    {STATUS_LABELS[job.status] ?? job.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Marketplace Coverage */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Marketplaces</span>
              </div>
              <div className="p-4 flex flex-col gap-[14px]">
                {marketplaceNames.map((name) => (
                  <div key={name}>
                    <div className="flex justify-between text-[11px] mb-[5px]">
                      <span className="text-[var(--text)] font-medium">{name}</span>
                      <span className="text-[var(--accent)]" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                        Active
                      </span>
                    </div>
                    <div className="h-[4px] bg-[var(--bg4)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, var(--accent-deep), var(--accent))' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Quick Actions</span>
              </div>
              <div className="p-3 flex flex-col gap-[4px]">
                {[
                  { label: 'New Upload', href: '/dashboard/upload', color: 'var(--accent)' },
                  { label: 'Marketplace Rules', href: '/dashboard/settings?tab=marketplaces', color: 'var(--accent4)' },
                  { label: 'Shopify Sync', href: '/dashboard/settings?tab=shopify', color: 'var(--accent2)' },
                  { label: 'Team Settings', href: '/dashboard/settings?tab=team', color: 'var(--text2)' },
                ].map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="flex items-center gap-2 px-3 py-[7px] rounded-sm hover:bg-[var(--bg3)] transition-colors text-[11px] text-[var(--text2)] hover:text-[var(--text)]"
                  >
                    <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: a.color }} />
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
