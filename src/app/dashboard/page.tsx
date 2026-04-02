'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'

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
  const { activeBrand } = useBrand()

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

  return (
    <div>
      <Topbar
        breadcrumbs={[{ label: 'FramesOps.ai' }, { label: 'Dashboard' }]}
        actions={
          <Link href="/dashboard/upload" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 12V4M4 7l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New Upload
          </Link>
        }
      />

      <div className="p-7">
        <div className="mb-6">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
            Dashboard
          </h1>
          <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">
            Overview of your post-production pipeline.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="stat-card">
            <p className="stat-label">Total Jobs</p>
            <p className="stat-value">{loading ? '—' : (stats?.total_jobs ?? 0).toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Images Processed</p>
            <p className="stat-value">{loading ? '—' : (stats?.total_images ?? 0).toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Exports Generated</p>
            <p className="stat-value">{loading ? '—' : (stats?.total_exports ?? 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Recent jobs */}
        <div className="card mb-6">
          <div className="card-head">
            <span className="card-title">Recent Jobs</span>
            <Link href="/dashboard/jobs" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {loading ? (
              <p className="text-[0.82rem] text-[var(--text3)] py-2">Loading…</p>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[0.85rem] text-[var(--text2)] font-medium">No jobs yet</p>
                <p className="text-[0.78rem] text-[var(--text3)] mt-1">Upload your first shoot to get started.</p>
                <Link href="/dashboard/upload" className="btn btn-primary mt-4 inline-flex">
                  New Upload
                </Link>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-[14px] bg-[var(--bg2)] border border-[var(--line)] rounded-md px-[18px] py-[14px]"
                >
                  <div className="w-10 h-10 rounded-sm bg-[var(--bg3)] flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--text3)" strokeWidth="1.5">
                      <rect x="2" y="2" width="6" height="8" rx="1"/>
                      <rect x="10" y="2" width="6" height="6" rx="1"/>
                      <rect x="10" y="10" width="6" height="6" rx="1"/>
                      <rect x="2" y="12" width="6" height="4" rx="1"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.88rem] font-medium text-[var(--text)]">{job.job_name}</p>
                    <p className="text-[0.75rem] text-[var(--text3)] mt-[2px]">
                      {job.image_count} images · {job.cluster_count} clusters · {new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className={`chip ${STATUS_CHIP[job.status] ?? 'chip-uploading'}`}>
                    {STATUS_LABELS[job.status] ?? job.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'New Shoot Upload',
              desc: 'Upload a new batch of product images',
              href: '/dashboard/upload',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <path d="M10 16V6M6 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 17h14" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              title: 'Shopify Sync',
              desc: 'Pull latest product data from your store',
              href: '/dashboard/settings?tab=shopify',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--accent2)" strokeWidth="1.5">
                  <path d="M4 10a6 6 0 016-6 6 6 0 015.9 5M16 10a6 6 0 01-6 6 6 6 0 01-5.9-5" strokeLinecap="round"/>
                  <path d="M14 6l2-2 2 2M4 14l-2 2-2-2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
            },
            {
              title: 'Marketplace Rules',
              desc: 'Configure export specs per platform',
              href: '/dashboard/settings?tab=marketplaces',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--accent4)" strokeWidth="1.5">
                  <path d="M3 6h14M3 10h10M3 14h7" strokeLinecap="round"/>
                </svg>
              ),
            },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="card p-5 hover:border-[var(--line2)] transition-colors cursor-pointer block"
            >
              <div className="w-10 h-10 rounded-sm bg-[var(--bg3)] flex items-center justify-center mb-3">
                {action.icon}
              </div>
              <p className="text-[0.88rem] font-semibold text-[var(--text)] mb-1">{action.title}</p>
              <p className="text-[0.78rem] text-[var(--text3)]">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
