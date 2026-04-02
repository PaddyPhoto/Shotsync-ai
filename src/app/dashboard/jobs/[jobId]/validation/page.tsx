'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { ValidationPanel } from '@/components/validation/ValidationPanel'
import { MarketplaceSelector } from '@/components/export/MarketplaceSelector'
import type { Cluster, Job, MarketplaceName } from '@/types'

export default function ValidationPage({ params }: { params: { jobId: string } }) {
  const [job, setJob] = useState<Job | null>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [marketplaces, setMarketplaces] = useState<MarketplaceName[]>(['the-iconic'])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/jobs/${params.jobId}`)
        const { data } = await res.json()
        if (data) {
          setJob(data)
          setClusters(data.clusters ?? [])
          if (data.selected_marketplaces?.length) {
            setMarketplaces(data.selected_marketplaces)
          }
        }
      } catch {
        // Demo fallback
        setClusters([
          {
            id: 'demo-1', job_id: 'demo', images: [], assigned_sku: 'TOP-BLK-001',
            assigned_product_name: 'Classic Crew Neck Tee', suggested_skus: [],
            missing_views: ['back'], detected_views: ['front', 'side'],
            brand: 'BRAND', color: 'black', status: 'confirmed', image_count: 3,
            created_at: new Date().toISOString(),
          },
          {
            id: 'demo-2', job_id: 'demo', images: [], assigned_sku: 'DRS-NVY-002',
            assigned_product_name: 'Wrap Midi Dress', suggested_skus: [],
            missing_views: [], detected_views: ['front', 'back', 'detail'],
            brand: 'BRAND', color: 'navy', status: 'confirmed', image_count: 4,
            created_at: new Date().toISOString(),
          },
        ])
      }
      setLoading(false)
    }
    fetchData()
  }, [params.jobId])

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
          { label: 'Validation' },
        ]}
        actions={
          <Link
            href={`/dashboard/jobs/${params.jobId}/export`}
            className="btn btn-primary"
          >
            Continue to Export
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        }
      />

      <div className="p-7">
        <div className="mb-7">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
            Shot Validation
          </h1>
          <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">
            Review missing required shots per marketplace. You can still export with missing angles.
          </p>
        </div>

        {/* Marketplace selector (editable here too) */}
        <div className="card mb-6">
          <div className="card-head">
            <span className="card-title">Checking Against</span>
          </div>
          <div className="card-body">
            <MarketplaceSelector selected={marketplaces} onChange={setMarketplaces} />
          </div>
        </div>

        {/* Validation results */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Validation Results</span>
          </div>
          <div className="card-body">
            <ValidationPanel clusters={clusters} marketplaces={marketplaces} />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Link
            href={`/dashboard/jobs/${params.jobId}/export`}
            className="btn btn-primary"
          >
            Continue to Export
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
