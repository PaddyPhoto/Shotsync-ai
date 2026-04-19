'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { PipelineSteps } from '@/components/processing/PipelineSteps'
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
  const actions = [
    {
      label: 'View Clusters',
      description: 'Browse and re-confirm SKU assignments for every cluster in this job.',
      href: `/dashboard/jobs/${jobId}/review`,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="9" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          <rect x="3" y="16" width="7" height="5" rx="1.5"/>
        </svg>
      ),
      primary: false,
    },
    {
      label: 'Download Exports',
      description: 'Download the renamed image packages that were generated for this job.',
      href: `/dashboard/jobs/${jobId}/download`,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3v13M7 11l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 21h18" strokeLinecap="round"/>
        </svg>
      ),
      primary: true,
    },
    {
      label: 'Re-export',
      description: 'Generate a new export package with different marketplace or naming settings.',
      href: `/dashboard/jobs/${jobId}/export`,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
        </svg>
      ),
      primary: false,
    },
  ]

  return (
    <div>
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'All Jobs', href: '/dashboard/jobs' },
          { label: job.name ?? 'Job' },
        ]}
        actions={
          <Link href={`/dashboard/jobs/${jobId}/download`} className="btn btn-primary">
            Download Exports
          </Link>
        }
      />

      <div style={{ padding: '28px' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 500, letterSpacing: '-.8px', color: '#1d1d1f' }}>
              {job.name}
            </h1>
            <span style={{ fontSize: '12px', fontWeight: 500, padding: '3px 9px', borderRadius: '6px', background: 'rgba(48,209,88,0.10)', color: '#1a8a35' }}>
              Completed
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#aeaeb2' }}>
            {job.total_images} images · {(job as any).cluster_count ?? 0} clusters
            {(job as any).created_at && (
              <> · {new Date((job as any).created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</>
            )}
          </p>
        </div>

        {/* Action cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '22px',
                background: action.primary ? '#1d1d1f' : 'rgba(255,255,255,0.8)',
                border: action.primary ? 'none' : '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: '16px',
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
            >
              <span style={{ color: action.primary ? '#f5f5f7' : '#6e6e73', opacity: action.primary ? 1 : 0.7 }}>
                {action.icon}
              </span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: action.primary ? '#f5f5f7' : '#1d1d1f', letterSpacing: '-.2px', marginBottom: '5px' }}>
                  {action.label}
                </p>
                <p style={{ fontSize: '13px', color: action.primary ? 'rgba(245,245,247,0.6)' : '#aeaeb2', lineHeight: 1.4 }}>
                  {action.description}
                </p>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={action.primary ? 'rgba(245,245,247,0.4)' : '#aeaeb2'} strokeWidth="1.5" style={{ alignSelf: 'flex-end' }}>
                <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Images',     value: job.total_images ?? 0 },
            { label: 'Clusters',   value: (job as any).cluster_count ?? '—' },
            { label: 'Marketplaces', value: (job as any).marketplaces?.length ?? '—' },
            { label: 'Status',     value: 'Exported', accent: '#30d158' },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px', padding: '16px 18px', backdropFilter: 'blur(8px)' }}>
              <p style={{ fontSize: '13px', color: '#aeaeb2', marginBottom: '6px' }}>{label}</p>
              <p style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '-.5px', color: accent ?? '#1d1d1f' }}>{value}</p>
            </div>
          ))}
        </div>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid #30d158', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // Job not found in either table
  if (!job) {
    return (
      <div>
        <Topbar breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'All Jobs', href: '/dashboard/jobs' }, { label: 'Job' }]} />
        <div style={{ padding: '28px' }}>
          <p style={{ fontSize: '14px', color: '#aeaeb2' }}>Job not found.</p>
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
        <div style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 500, letterSpacing: '-.8px', color: '#1d1d1f' }}>{job?.name}</h1>
            <span style={{ fontSize: '12px', fontWeight: 500, padding: '3px 9px', borderRadius: '6px', background: 'rgba(255,159,10,0.10)', color: '#c27800' }}>Ready for Review</span>
          </div>
          <p style={{ fontSize: '14px', color: '#aeaeb2', marginBottom: '24px' }}>
            {job?.total_images} images · {STEP_LABELS[job?.pipeline_step ?? 0]}
          </p>
          <div style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(8px)' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#1d1d1f', marginBottom: '4px' }}>Clusters are ready to review</p>
              <p style={{ fontSize: '14px', color: '#aeaeb2' }}>Verify SKU assignments and confirm cluster groupings before generating your export.</p>
            </div>
            <Link href={`/dashboard/jobs/${params.jobId}/review`} className="btn btn-primary" style={{ flexShrink: 0 }}>
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
              <span className="text-[0.78rem] text-[var(--text2)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
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
              <p className="text-[0.75rem] text-[var(--text3)]">
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
