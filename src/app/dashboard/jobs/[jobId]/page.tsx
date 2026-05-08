'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { PipelineSteps } from '@/components/processing/PipelineSteps'
import { useSession } from '@/store/session'
import type { Job } from '@/types'

const STEP_LABELS: Record<number, string> = {
  0: 'Starting…',
  1: 'Storing images',
  2: 'Generating embeddings',
  3: 'Clustering images',
  4: 'Creating clusters',
  5: 'Matching Shopify products',
  6: 'Detecting shot angles',
  7: 'Validating shots',
  8: 'Ready for review',
}

function CompletedJobView({ job, jobId }: { job: Job; jobId: string }) {
  const isHistoryJob = (job as any)._source === 'history'
  const marketplaces: string[] = (job as any).marketplaces ?? []
  const router = useRouter()
  const { setSession } = useSession()
  const [hasStoredSession, setHasStoredSession] = useState(false)
  const [sessionSource, setSessionSource] = useState<'local' | 'cloud' | null>(null)
  const [reopening, setReopening] = useState(false)
  const [reopenError, setReopenError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLoadSessionFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.clusters?.length) throw new Error('Invalid file')
      sessionStorage.setItem('shotsync:reimport', JSON.stringify(data))
      router.push('/dashboard/upload')
    } catch {
      alert('Could not read session file. Make sure you\'re loading a .shotsync file.')
    }
    // Reset so same file can be picked again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    if (!isHistoryJob) return
    import('@/lib/session-store').then(({ hasSession }) =>
      hasSession(jobId)
    ).then(async (hasLocal) => {
      if (hasLocal) {
        setHasStoredSession(true)
        setSessionSource('local')
        return
      }
      // No local session — check Supabase for cross-device access
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`/api/jobs/${jobId}/session`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (res.ok) {
        const { clusters } = await res.json()
        if (clusters?.length > 0) {
          setHasStoredSession(true)
          setSessionSource('cloud')
        }
      }
    }).catch(() => { /* IDB or network unavailable */ })
  }, [jobId, isHistoryJob])

  const handleReopen = async () => {
    setReopening(true)
    setReopenError(null)
    try {
      if (sessionSource === 'local') {
        const { loadSession } = await import('@/lib/session-store')
        const result = await loadSession(jobId)
        if (!result) { setReopenError('Session data could not be loaded.'); return }
        setSession(result.jobName, result.clusters, result.marketplaces)
        router.push('/dashboard/review')
      } else {
        // Cloud session — fetch metadata, store for upload page filename matching
        const { createClient } = await import('@/lib/supabase/client')
        const { data: { session } } = await createClient().auth.getSession()
        const res = await fetch(`/api/jobs/${jobId}/session`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        if (!res.ok) throw new Error('Failed to load session')
        const payload = await res.json()
        if (!payload.clusters?.length) throw new Error('No cluster data found')
        sessionStorage.setItem('shotsync:reimport', JSON.stringify(payload))
        router.push('/dashboard/upload')
      }
    } catch (err) {
      console.error('Failed to reopen session:', err)
      setReopenError('Failed to restore session.')
    } finally {
      setReopening(false)
    }
  }

  const header = (
    <Topbar
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'All Jobs', href: '/dashboard/jobs' },
        { label: job.name ?? 'Job' },
      ]}
      actions={
        !isHistoryJob ? (
          <Link href={`/dashboard/jobs/${jobId}/download`} className="btn btn-primary">
            Download Exports
          </Link>
        ) : (
          <Link href="/dashboard/upload" className="btn btn-primary">
            New Upload
          </Link>
        )
      }
    />
  )

  const jobMeta = (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <h1 className="text-[1.5rem] font-[600] tracking-[-0.5px] text-[var(--text)]">
          {job.name}
        </h1>
        <span className="chip chip-success">Exported</span>
      </div>
      <p className="text-[0.88rem] text-[var(--text3)]">
        {job.total_images} images · {(job as any).cluster_count ?? 0} clusters
        {(job as any).created_at && (
          <> · {new Date((job as any).created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</>
        )}
      </p>
    </div>
  )

  const statsRow = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
      {[
        { label: 'Images',       value: job.total_images ?? 0 },
        { label: 'Clusters',     value: (job as any).cluster_count ?? '—' },
        { label: 'Marketplaces', value: marketplaces.length || '—' },
        { label: 'Status',       value: 'Exported', isAccent: true },
      ].map(({ label, value, isAccent }) => (
        <div key={label} className="card" style={{ padding: '16px 18px' }}>
          <p className="text-[0.8rem] text-[var(--text3)] mb-1">{label}</p>
          <p className={`text-[1.25rem] font-[600] tracking-[-0.3px] ${isAccent ? 'text-[var(--accent2)]' : 'text-[var(--text)]'}`}>{value}</p>
        </div>
      ))}
    </div>
  )

  // History jobs — session data is gone, show summary record only
  if (isHistoryJob) {
    return (
      <div>
        {header}
        <div style={{ padding: '28px' }}>
          {jobMeta}

          {/* Marketplace tags */}
          {marketplaces.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {marketplaces.map((m) => (
                <span key={m} className="chip">{m}</span>
              ))}
            </div>
          )}

          {/* Hidden file input for .shotsync loading */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".shotsync"
            style={{ display: 'none' }}
            onChange={handleLoadSessionFile}
          />

          {/* Session restore card or info note */}
          {sessionSource === 'local' ? (
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.95rem] font-[600] text-[var(--text)] mb-1">Session saved on this device</p>
                  <p className="text-[0.85rem] text-[var(--text3)] leading-relaxed">
                    The original images and cluster data are available. Reopen to re-export or make changes.
                  </p>
                  {reopenError && <p className="text-[0.8rem] text-red-500 mt-2">{reopenError}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost btn-sm">
                    Load .shotsync
                  </button>
                  <button onClick={handleReopen} disabled={reopening} className="btn btn-primary btn-sm">
                    {reopening ? (
                      <><svg width="12" height="12" viewBox="0 0 12 12" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="4" strokeDasharray="16 8"/></svg>Restoring…</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 7a6 6 0 1 0 6-6"/><path d="M1 3v4h4"/></svg>Reopen Session</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : sessionSource === 'cloud' ? (
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.95rem] font-[600] text-[var(--text)] mb-1">Cluster data saved</p>
                  <p className="text-[0.85rem] text-[var(--text3)] leading-relaxed">
                    All SKU assignments and cluster groupings are saved. Upload the original images to re-export — they'll be matched to their clusters automatically.
                  </p>
                  {reopenError && <p className="text-[0.8rem] text-red-500 mt-2">{reopenError}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost btn-sm">
                    Load .shotsync
                  </button>
                  <button onClick={handleReopen} disabled={reopening} className="btn btn-primary btn-sm">
                    {reopening ? (
                      <><svg width="12" height="12" viewBox="0 0 12 12" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="4" strokeDasharray="16 8"/></svg>Loading…</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 7a6 6 0 1 0 6-6"/><path d="M1 3v4h4"/></svg>Re-import & Re-export</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.95rem] font-[600] text-[var(--text)] mb-1">Export record</p>
                  <p className="text-[0.85rem] text-[var(--text3)] leading-relaxed">
                    This is a record of a completed export. To re-export, open on the original device or load a .shotsync session file.
                  </p>
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost btn-sm flex-shrink-0">
                  Load .shotsync
                </button>
              </div>
            </div>
          )}

          {statsRow}
        </div>
      </div>
    )
  }

  // Pipeline jobs — full action cards
  const actions = [
    {
      label: 'View Clusters',
      description: 'Browse and re-confirm SKU assignments for every cluster in this job.',
      href: `/dashboard/jobs/${jobId}/review`,
      primary: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="9" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          <rect x="3" y="16" width="7" height="5" rx="1.5"/>
        </svg>
      ),
    },
    {
      label: 'Download Exports',
      description: 'Download the renamed image packages that were generated for this job.',
      href: `/dashboard/jobs/${jobId}/download`,
      primary: true,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3v13M7 11l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 21h18" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Re-export',
      description: 'Generate a new export package with different marketplace or naming settings.',
      href: `/dashboard/jobs/${jobId}/export`,
      primary: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div>
      {header}
      <div className="p-7">
        {jobMeta}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`card flex flex-col gap-3 p-[22px] no-underline transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] ${action.primary ? 'bg-[var(--text)] border-0' : ''}`}
            >
              <span className={action.primary ? 'text-[rgba(245,245,247,0.7)]' : 'text-[var(--text3)]'}>{action.icon}</span>
              <div>
                <p className={`text-[14px] font-[600] tracking-[-0.2px] mb-1 ${action.primary ? 'text-[#f5f5f7]' : 'text-[var(--text)]'}`}>{action.label}</p>
                <p className={`text-[14px] leading-relaxed ${action.primary ? 'text-[rgba(245,245,247,0.5)]' : 'text-[var(--text3)]'}`}>{action.description}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={action.primary ? 'rgba(245,245,247,0.35)' : 'var(--text3)'} strokeWidth="1.5" className="self-end">
                <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ))}
        </div>
        {statsRow}
      </div>
    </div>
  )
}

export default function JobProcessingPage({ params }: { params: { jobId: string } }) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${params.jobId}`)
        const { data } = await res.json()
        if (data) {
          setJob(data)
          setLoading(false)
          // Stop polling for terminal states
          if (data.status === 'complete' || data.status === 'error') {
            if (intervalRef.current) clearInterval(intervalRef.current)
          }
          return
        }

        // Pipeline job not found — try job_history (exported sessions are saved there)
        const { createClient } = await import('@/lib/supabase/client')
        const { data: { session } } = await createClient().auth.getSession()
        const histRes = await fetch(`/api/jobs/history/${params.jobId}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        if (histRes.ok) {
          const { data: histData } = await histRes.json()
          if (histData) {
            setJob(histData)
            setLoading(false)
            if (intervalRef.current) clearInterval(intervalRef.current)
          }
        } else {
          // Nothing found in either table — stop spinning, show nothing
          setLoading(false)
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch (err) {
        console.error('Failed to poll job:', err)
        setLoading(false)
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [params.jobId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-[var(--accent2)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Job not found in either table
  if (!job) {
    return (
      <div>
        <Topbar breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'All Jobs', href: '/dashboard/jobs' }, { label: 'Job' }]} />
        <div className="p-7">
          <p className="text-[0.95rem] text-[var(--text3)]">Job not found.</p>
        </div>
      </div>
    )
  }

  // Completed job — show hub view
  if (job.status === 'complete') {
    return <CompletedJobView job={job} jobId={params.jobId} />
  }

  // Review ready — show prompt to continue to review
  if (job?.status === 'review') {
    return (
      <div>
        <Topbar
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'All Jobs', href: '/dashboard/jobs' },
            { label: job?.name ?? 'Job' },
          ]}
          actions={
            <Link href={`/dashboard/jobs/${params.jobId}/review`} className="btn btn-primary">
              Review Clusters →
            </Link>
          }
        />
        <div className="p-7">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-[1.5rem] font-[600] tracking-[-0.5px] text-[var(--text)]">{job?.name}</h1>
            <span className="chip chip-warning">Ready for Review</span>
          </div>
          <p className="text-[0.88rem] text-[var(--text3)] mb-6">
            {job?.total_images} images · {STEP_LABELS[job?.pipeline_step ?? 0]}
          </p>
          <div className="card p-6 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[0.9rem] font-[500] text-[var(--text)] mb-1">Clusters are ready to review</p>
              <p className="text-[0.88rem] text-[var(--text3)]">Verify SKU assignments and confirm cluster groupings before generating your export.</p>
            </div>
            <Link href={`/dashboard/jobs/${params.jobId}/review`} className="btn btn-primary flex-shrink-0">
              Review Clusters
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Processing / error state — original pipeline view
  return (
    <div>
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'All Jobs', href: '/dashboard/jobs' },
          { label: job?.name ?? 'Job' },
        ]}
      />

      <div className="p-7">
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
              {job?.name}
            </h1>
            {job?.status === 'error' ? (
              <span className="chip chip-error">Error</span>
            ) : (
              <span className="chip chip-processing">Processing</span>
            )}
          </div>
          <p className="text-[0.88rem] text-[var(--text2)]">
            {job?.total_images} images · {STEP_LABELS[job?.pipeline_step ?? 0]}
          </p>
        </div>

        {job?.status === 'error' && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-sm bg-[rgba(232,122,122,0.08)] border border-[rgba(232,122,122,0.2)] mb-6">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-[2px]" stroke="var(--accent3)" strokeWidth="1.5">
              <path d="M7 1L1 13h12L7 1z" strokeLinejoin="round"/>
              <path d="M7 5.5v3M7 9.5h.01" strokeLinecap="round"/>
            </svg>
            <p className="text-[0.82rem] text-[var(--text)]">
              <span className="font-semibold text-[var(--accent3)]">Pipeline error: </span>
              {job.error_message}
            </p>
          </div>
        )}

        {job?.status !== 'error' && (
          <div className="card mb-6">
            <div className="card-head">
              <span className="card-title">Image Processing</span>
              <span className="text-[0.85rem] text-[var(--text2)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                {job?.processed_images ?? 0} / {job?.total_images ?? 0}
              </span>
            </div>
            <div className="card-body">
              <div className="h-2 bg-[var(--bg3)] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: job?.total_images
                      ? `${Math.round((job.processed_images / job.total_images) * 100)}%`
                      : '0%',
                    background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                  }}
                />
              </div>
              <p className="text-[0.82rem] text-[var(--text3)]">
                {job?.total_images
                  ? `${Math.round((job.processed_images / job.total_images) * 100)}% complete`
                  : 'Initialising…'}
              </p>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-head">
            <span className="card-title">Pipeline Steps</span>
          </div>
          <div className="card-body p-0">
            <PipelineSteps
              currentStep={job?.pipeline_step ?? 0}
              status={job?.status}
            />
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
