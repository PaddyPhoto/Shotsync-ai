'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function JobProcessingPage({ params }: { params: { jobId: string } }) {
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${params.jobId}`)
        const { data } = await res.json()
        if (data) {
          setJob(data)
          setLoading(false)

          // Redirect when ready for review
          if (data.status === 'review') {
            clearInterval(interval)
            router.push(`/dashboard/jobs/${params.jobId}/review`)
          }
          if (data.status === 'complete') {
            clearInterval(interval)
            router.push(`/dashboard/jobs/${params.jobId}/download`)
          }
          if (data.status === 'error') {
            clearInterval(interval)
          }
        }
      } catch (err) {
        console.error('Failed to poll job:', err)
      }
    }

    poll()
    interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [params.jobId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Jobs', href: '/dashboard/jobs' },
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
            ) : job?.status === 'review' ? (
              <span className="chip chip-review">Review Ready</span>
            ) : (
              <span className="chip chip-processing">Processing</span>
            )}
          </div>
          <p className="text-[0.88rem] text-[var(--text2)]">
            {job?.total_images} images · {STEP_LABELS[job?.pipeline_step ?? 0]}
          </p>
        </div>

        {/* Error state */}
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

        {/* Progress bar */}
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

        {/* Pipeline steps */}
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

        {/* Navigation to review if ready */}
        {job?.status === 'review' && (
          <div className="mt-6 flex justify-end">
            <Link
              href={`/dashboard/jobs/${params.jobId}/review`}
              className="btn btn-primary"
            >
              Review Clusters
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
