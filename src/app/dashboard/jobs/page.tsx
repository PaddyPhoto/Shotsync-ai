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
  brands?: { name: string; brand_code: string; logo_color: string } | null
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { activeBrand } = useBrand()

  const fetchJobs = (token?: string) => {
    const url = activeBrand?.id
      ? `/api/jobs/history?brand_id=${activeBrand.id}`
      : '/api/jobs/history'
    return fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => r.json()).then(({ data }) => {
      setJobs(Array.isArray(data) ? data : [])
    })
  }

  useEffect(() => {
    setLoading(true)
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) =>
      fetchJobs(session?.access_token)
    ).catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [activeBrand?.id])

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this job from history?')) return
    setDeletingId(jobId)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      await fetch(`/api/jobs/history/${jobId}`, {
        method: 'DELETE',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      setJobs((prev) => prev.filter((j) => j.id !== jobId))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Job History' },
        ]}
        actions={
          <Link href="/dashboard/upload" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 12V4M4 7l3-3 3 3" strokeLinecap="round"/>
            </svg>
            New Upload
          </Link>
        }
      />

      <div className="p-7">
        <div className="mb-7">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
            Job History
          </h1>
          {!loading && (
            <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">
              {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} saved
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-[0.85rem] text-[var(--text3)]">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-[var(--bg2)] rounded-md flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text3)" strokeWidth="1.5">
                <rect x="2" y="2" width="7" height="9" rx="1.5"/>
                <rect x="11" y="2" width="7" height="7" rx="1.5"/>
                <rect x="11" y="11" width="7" height="7" rx="1.5"/>
                <rect x="2" y="13" width="7" height="5" rx="1.5"/>
              </svg>
            </div>
            <p className="text-[0.88rem] text-[var(--text2)] font-medium">No jobs yet</p>
            <p className="text-[0.78rem] text-[var(--text3)] mt-1">
              Completed exports will appear here.
            </p>
            <Link href="/dashboard/upload" className="btn btn-primary mt-4 inline-flex">
              Start a shoot
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-[14px] bg-[var(--bg2)] border border-[var(--line)] rounded-md px-[18px] py-[14px]"
              >
                {/* Brand colour dot or generic icon */}
                <div
                  className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
                  style={{ background: job.brands?.logo_color ? `${job.brands.logo_color}22` : 'var(--bg3)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
                    stroke={job.brands?.logo_color ?? 'var(--text3)'} strokeWidth="1.5">
                    <rect x="2" y="2" width="6" height="8" rx="1"/>
                    <rect x="10" y="2" width="6" height="6" rx="1"/>
                    <rect x="10" y="10" width="6" height="6" rx="1"/>
                    <rect x="2" y="12" width="6" height="4" rx="1"/>
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[0.88rem] font-medium text-[var(--text)] truncate">{job.job_name}</p>
                  <p className="text-[0.75rem] text-[var(--text3)] mt-[2px]">
                    {job.image_count} images · {job.cluster_count} clusters
                    {job.brands && <> · <span className="text-[var(--text2)]">{job.brands.name}</span></>}
                  </p>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-[0.75rem] text-[var(--text3)]">
                    {new Date(job.created_at).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                  {job.marketplaces.length > 0 && (
                    <p className="text-[0.72rem] text-[var(--text3)] mt-[2px]">
                      {job.marketplaces.length} marketplace{job.marketplaces.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <span className="chip chip-ready flex-shrink-0">Exported</span>

                <button
                  onClick={() => handleDelete(job.id)}
                  disabled={deletingId === job.id}
                  className="flex-shrink-0 p-1.5 rounded text-[var(--text3)] hover:text-[var(--accent3)] hover:bg-[rgba(232,122,122,0.08)] transition-colors disabled:opacity-40"
                  title="Delete job"
                >
                  {deletingId === job.id ? (
                    <div className="w-[14px] h-[14px] border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5 3.5l.5 8M9 3.5l-.5 8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
