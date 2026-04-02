'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { DownloadCard } from '@/components/download/DownloadCard'
import { formatBytes } from '@/lib/utils'
import type { ExportRecord, Job } from '@/types'

export default function DownloadPage({ params }: { params: { jobId: string } }) {
  const [job, setJob] = useState<Job | null>(null)
  const [exports, setExports] = useState<ExportRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobRes, exportsRes] = await Promise.all([
          fetch(`/api/jobs/${params.jobId}`),
          fetch(`/api/export?job_id=${params.jobId}`),
        ])
        const { data: jobData } = await jobRes.json()
        const { data: exportsData } = await exportsRes.json()
        if (jobData) setJob(jobData)
        if (exportsData) setExports(exportsData)
      } catch {
        // Demo fallback
        setExports([
          {
            id: 'demo-export-1',
            job_id: params.jobId,
            cluster_id: null,
            marketplace: 'the-iconic' as const,
            output_files: [],
            download_url: '#',
            file_size_bytes: 48234567,
            image_count: 72,
            status: 'ready',
            created_at: new Date().toISOString(),
          },
        ])
      }
      setLoading(false)
    }
    fetchData()
  }, [params.jobId])

  const totalSize = exports.reduce((s, e) => s + e.file_size_bytes, 0)
  const totalImages = exports.reduce((s, e) => s + e.image_count, 0)

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
          { label: job?.name ?? 'Job', href: `/dashboard/jobs/${params.jobId}` },
          { label: 'Download' },
        ]}
        actions={
          <Link href="/dashboard/upload" className="btn btn-primary">
            New Upload
          </Link>
        }
      />

      <div className="p-7">
        {/* Success state */}
        <div className="flex flex-col items-center text-center py-8 mb-8">
          <div className="w-16 h-16 rounded-full bg-[rgba(109,224,179,0.1)] border border-[rgba(109,224,179,0.3)] flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--accent2)" strokeWidth="2">
              <polyline points="6 14 11 19 22 8"/>
            </svg>
          </div>
          <h1
            className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)] mb-2"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Export Complete
          </h1>
          <p className="text-[0.88rem] text-[var(--text2)]">
            {totalImages} images packaged across {exports.length} export set{exports.length !== 1 ? 's' : ''}
            {totalSize > 0 && ` · ${formatBytes(totalSize)} total`}
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card">
            <p className="stat-label">Total Images</p>
            <p className="stat-value">{totalImages}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Export Sets</p>
            <p className="stat-value">{exports.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Size</p>
            <p className="stat-value text-[1.4rem]">{formatBytes(totalSize)}</p>
          </div>
        </div>

        {/* Download cards */}
        {exports.length > 0 ? (
          <div className="flex flex-col gap-3 mb-6">
            {exports.map((exp) => (
              <DownloadCard key={exp.id} exportRecord={exp} />
            ))}
          </div>
        ) : (
          <div className="card mb-6">
            <div className="card-body flex flex-col items-center py-10 gap-3">
              <p className="text-[0.82rem] text-[var(--text3)]">
                No exports found. Go back and generate an export.
              </p>
              <Link
                href={`/dashboard/jobs/${params.jobId}/export`}
                className="btn btn-ghost btn-sm"
              >
                Back to Export
              </Link>
            </div>
          </div>
        )}

        {/* Naming preview */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">File Naming Convention</span>
          </div>
          <div className="card-body">
            <p className="text-[0.78rem] text-[var(--text3)] mb-3">
              All images are renamed using the structured format:
            </p>
            <div className="bg-[var(--bg3)] border border-[var(--line2)] rounded-sm px-4 py-3 text-[0.82rem] mb-4" style={{ fontFamily: 'var(--font-dm-mono)' }}>
              <span className="text-[var(--accent)]">BRAND</span>
              <span className="text-[var(--text3)]">_</span>
              <span className="text-[var(--accent2)]">SKU</span>
              <span className="text-[var(--text3)]">_</span>
              <span className="text-[var(--accent4)]">COLOR</span>
              <span className="text-[var(--text3)]">_</span>
              <span className="text-[var(--accent3)]">VIEW</span>
              <span className="text-[var(--text3)]">.jpg</span>
            </div>
            <div className="flex flex-col gap-1 text-[0.78rem]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
              {[
                'BRAND_TOP-BLK-001_BLACK_FRONT.jpg',
                'BRAND_TOP-BLK-001_BLACK_BACK.jpg',
                'BRAND_DRS-NVY-002_NAVY_FRONT.jpg',
                'BRAND_DRS-NVY-002_NAVY_BACK.jpg',
                'BRAND_DRS-NVY-002_NAVY_DETAIL.jpg',
              ].map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--accent2)" strokeWidth="1.5">
                    <rect x="1" y="1" width="8" height="8" rx="1"/>
                  </svg>
                  <span className="text-[var(--text2)]">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Link href="/dashboard" className="btn btn-ghost">
            Back to Dashboard
          </Link>
          <Link href="/dashboard/upload" className="btn btn-primary">
            New Upload
          </Link>
        </div>
      </div>
    </div>
  )
}
