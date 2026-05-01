'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'
import { useSession } from '@/store/session'

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

// IDB session IDs are loaded lazily — only after jobs are fetched
function useStoredSessions(jobIds: string[]): Set<string> {
  const [stored, setStored] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (jobIds.length === 0) return
    import('@/lib/session-store').then(async ({ hasSession }) => {
      const checks = await Promise.all(jobIds.map(async (id) => ({ id, has: await hasSession(id) })))
      setStored(new Set(checks.filter((c) => c.has).map((c) => c.id)))
    }).catch(() => { /* IDB unavailable */ })
  }, [jobIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  return stored
}

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  completed:  { bg: 'rgba(48,209,88,0.12)',  color: '#30d158', label: 'Completed'  },
  complete:   { bg: 'rgba(48,209,88,0.12)',  color: '#30d158', label: 'Completed'  },
  processing: { bg: 'rgba(0,122,255,0.12)',  color: '#4da3ff', label: 'Processing' },
  review:     { bg: 'rgba(255,159,10,0.12)', color: '#ff9f0a', label: 'Needs Review' },
  failed:     { bg: 'rgba(255,59,48,0.12)',  color: '#ff453a', label: 'Failed'     },
  error:      { bg: 'rgba(255,59,48,0.12)',  color: '#ff453a', label: 'Error'      },
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [reopeningId, setReopeningId] = useState<string | null>(null)
  const { activeBrand, isLoading: brandsLoading } = useBrand()
  const { setSession } = useSession()
  const router = useRouter()
  const storedSessions = useStoredSessions(jobs.map((j) => j.id))

  const handleReopen = async (jobId: string) => {
    setReopeningId(jobId)
    try {
      const { loadSession } = await import('@/lib/session-store')
      const result = await loadSession(jobId)
      if (!result) return
      setSession(result.jobName, result.clusters, result.marketplaces)
      router.push('/dashboard/review')
    } catch (err) {
      console.error('Failed to reopen session:', err)
    } finally {
      setReopeningId(null)
    }
  }

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
    if (brandsLoading) return
    setLoading(true)
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) =>
      fetchJobs(session?.access_token)
    ).catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [activeBrand?.id, brandsLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (jobId: string) => {
    setDeletingId(jobId)
    setConfirmDeleteId(null)
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
          { label: 'All Jobs' },
        ]}
        actions={
          <Link href="/dashboard/upload" className="btn btn-primary">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7-7 7 7"/>
            </svg>
            New Upload
          </Link>
        }
      />

      <div className="p-7">
        <div className="mb-6">
          <h1 style={{ fontSize: '24px', fontWeight: 500, letterSpacing: '-.8px', color: 'var(--text)', marginBottom: '3px' }}>
            All Jobs
          </h1>
          {!loading && (
            <p style={{ fontSize: '15px', color: 'var(--text3)' }}>
              {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} — click any row to open
            </p>
          )}
        </div>

        {loading ? (
          <div style={{ fontSize: '15px', color: 'var(--text3)' }}>Loading…</div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--bg3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text3)" strokeWidth="1.5">
                <rect x="2" y="2" width="7" height="9" rx="1.5"/>
                <rect x="11" y="2" width="7" height="7" rx="1.5"/>
                <rect x="11" y="11" width="7" height="7" rx="1.5"/>
                <rect x="2" y="13" width="7" height="5" rx="1.5"/>
              </svg>
            </div>
            <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>No jobs yet</p>
            <p style={{ fontSize: '15px', color: 'var(--text3)', marginBottom: '16px' }}>Completed jobs will appear here.</p>
            <Link href="/dashboard/upload" className="btn btn-primary">Start a shoot</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {jobs.map((job) => {
              const chip = STATUS_MAP[job.status] ?? STATUS_MAP.completed
              const isDeleting = deletingId === job.id
              const isConfirming = confirmDeleteId === job.id

              return (
                <div
                  key={job.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    background: 'var(--bg2)',
                    border: '0.5px solid var(--line)',
                    borderRadius: '14px',
                    padding: '0',
                    overflow: 'hidden',
                  }}
                >
                  {/* Clickable main area */}
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 18px',
                      textDecoration: 'none',
                      minWidth: 0,
                    }}
                    className="group"
                  >
                    {/* Brand colour icon */}
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: job.brands?.logo_color ? `${job.brands.logo_color}22` : 'rgba(0,0,0,0.04)',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 18 18" fill="none"
                        stroke={job.brands?.logo_color ?? '#4e4e53'} strokeWidth="1.5">
                        <rect x="2" y="2" width="6" height="8" rx="1"/>
                        <rect x="10" y="2" width="6" height="6" rx="1"/>
                        <rect x="10" y="10" width="6" height="6" rx="1"/>
                        <rect x="2" y="12" width="6" height="4" rx="1"/>
                      </svg>
                    </div>

                    {/* Name + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.job_name}
                      </p>
                      <p style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '2px' }}>
                        {job.image_count} images · {job.cluster_count} clusters
                        {job.brands && <> · <span style={{ color: 'var(--text3)' }}>{job.brands.name}</span></>}
                        {job.marketplaces?.length > 0 && <> · {job.marketplaces.length} marketplace{job.marketplaces.length !== 1 ? 's' : ''}</>}
                      </p>
                    </div>

                    {/* Date */}
                    <p style={{ fontSize: '14px', color: 'var(--text3)', flexShrink: 0 }}>
                      {new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>

                    {/* Status chip */}
                    <span style={{
                      flexShrink: 0,
                      fontSize: '14px', fontWeight: 500,
                      padding: '3px 9px', borderRadius: '6px',
                      background: chip.bg, color: chip.color,
                      letterSpacing: '-.1px',
                    }}>
                      {chip.label}
                    </span>

                    {/* Chevron */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text3)" strokeWidth="1.5" style={{ flexShrink: 0, transition: 'transform 0.15s' }} className="group-hover:translate-x-[2px]">
                      <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>

                  {/* Reopen button — outside Link so it doesn't also navigate to detail */}
                  {storedSessions.has(job.id) && (
                    <button
                      onClick={() => handleReopen(job.id)}
                      disabled={reopeningId === job.id}
                      style={{
                        flexShrink: 0,
                        fontSize: '14px', fontWeight: 500,
                        padding: '3px 9px', borderRadius: '6px',
                        background: 'rgba(0,122,255,0.12)', color: '#4da3ff',
                        border: 'none', cursor: 'pointer', letterSpacing: '-.1px',
                        opacity: reopeningId === job.id ? 0.6 : 1,
                      }}
                    >
                      {reopeningId === job.id ? 'Opening…' : 'Reopen'}
                    </button>
                  )}

                  {/* Delete zone — separated so it doesn't navigate */}
                  <div style={{ padding: '0 14px 0 0', flexShrink: 0 }}>
                    {isConfirming ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', color: '#ff3b30' }}>Delete?</span>
                        <button
                          onClick={() => handleDelete(job.id)}
                          style={{ fontSize: '14px', fontWeight: 500, color: '#fff', background: '#ff3b30', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ fontSize: '14px', color: 'var(--text3)', background: 'transparent', border: 'none', padding: '3px 4px', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(job.id)}
                        disabled={isDeleting}
                        title="Delete job"
                        style={{ padding: '6px', borderRadius: '6px', color: 'var(--text3)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: isDeleting ? 0.4 : 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,59,48,0.08)'; (e.currentTarget as HTMLElement).style.color = '#ff3b30' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#4e4e53' }}
                      >
                        {isDeleting ? (
                          <div style={{ width: '14px', height: '14px', border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5 3.5l.5 8M9 3.5l-.5 8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
