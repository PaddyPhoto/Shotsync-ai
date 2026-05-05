'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { ClusterGrid } from '@/components/clusters/ClusterGrid'
import type { Cluster, Job } from '@/types'

// Demo clusters for the UI (in production: fetched from API)
function buildDemoClusters(): Cluster[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `demo-cluster-${i + 1}`,
    job_id: 'demo',
    images: Array.from({ length: 3 + (i % 3) }, (_, j) => ({
      id: `img-${i}-${j}`,
      job_id: 'demo',
      original_filename: `IMG_${1000 + i * 10 + j}.jpg`,
      storage_path: '',
      storage_url: '',
      embedding_vector: null,
      cluster_id: `demo-cluster-${i + 1}`,
      view_label: (['front', 'back', 'side', 'detail', 'mood', 'full-length'] as const)[j % 6],
      view_confidence: 0.7 + Math.random() * 0.3,
      renamed_filename: null,
      file_size: 2400000,
      width: 3000,
      height: 4000,
      status: 'labeled',
      created_at: new Date().toISOString(),
    })),
    assigned_sku: i === 0 ? 'TOP-BLK-001' : null,
    assigned_product_name: i === 0 ? 'Classic Crew Neck Tee' : null,
    suggested_skus: [
      { sku: `SKU-${i + 1}00`, product_name: `Product ${i + 1}`, colour: ['Black', 'White', 'Navy'][i % 3], confidence: 0.82 - i * 0.05, shopify_product_id: `100${i}` },
      { sku: `SKU-${i + 1}01`, product_name: `Variant ${i + 1}`, colour: ['Blue', 'Red', 'Beige'][i % 3], confidence: 0.65 - i * 0.03, shopify_product_id: `100${i + 1}` },
    ],
    missing_views: i % 3 === 0 ? ['back'] : [],
    detected_views: ['front', 'side', i % 2 === 0 ? 'detail' : 'back', i % 3 === 0 ? 'mood' : 'full-length'],
    brand: 'BRAND',
    color: ['black', 'white', 'navy', 'beige', 'red', 'blue'][i % 6],
    status: i === 0 ? 'confirmed' : 'pending',
    image_count: 3 + (i % 3),
    created_at: new Date().toISOString(),
  }))
}

export default function ReviewPage({ params }: { params: { jobId: string } }) {
  const [job, setJob] = useState<Job | null>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/jobs/${params.jobId}`)
        const { data } = await res.json()
        if (data) {
          setJob(data)
          setClusters(data.clusters ?? [])
        }
      } catch {
        // Use demo data if API not available
        setIsDemoMode(true)
        setClusters(buildDemoClusters())
      }
      setLoading(false)
    }
    fetchData()
  }, [params.jobId])

  const confirmedCount = clusters.filter((c) => c.status === 'confirmed').length
  const allConfirmed = confirmedCount === clusters.length && clusters.length > 0

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
          { label: 'Review' },
        ]}
        actions={
          <Link
            href={`/dashboard/jobs/${params.jobId}/validation`}
            className={allConfirmed ? 'btn btn-primary' : 'btn btn-ghost'}
          >
            {allConfirmed ? 'Continue to Validation' : `Confirm All SKUs (${confirmedCount}/${clusters.length})`}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        }
      />

      <div className="p-7">
        <div className="mb-7">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
            Cluster Review
          </h1>
          <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">
            Verify AI groupings and confirm SKU assignments. Correct any misidentified angles.
          </p>
          {isDemoMode && (
            <div className="mt-3 inline-flex items-center gap-2 text-[0.82rem] text-[var(--accent)] bg-[rgba(232,217,122,0.08)] border border-[rgba(232,217,122,0.2)] px-3 py-[5px] rounded-sm">
              <span>Demo mode — connect Supabase to see real data</span>
            </div>
          )}
        </div>

        {/* Shopify optional hint */}
        {!job?.shopify_connected && !isDemoMode && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-sm border border-[var(--line)] bg-[var(--bg3)]">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--text3)" strokeWidth="1.5" className="flex-shrink-0">
              <circle cx="7" cy="7" r="6"/>
              <path d="M7 6v4M7 4.5h.01" strokeLinecap="round"/>
            </svg>
            <p className="text-[0.85rem] text-[var(--text3)]">
              Shopify not connected — SKU suggestions are unavailable. You can still manually assign SKUs or{' '}
              <Link href="/dashboard/brands" className="text-[var(--text2)] underline underline-offset-2 hover:text-[var(--text)]">
                add Shopify to a brand
              </Link>.
            </p>
          </div>
        )}

        <ClusterGrid
          clusters={clusters}
          onUpdate={setClusters}
        />
      </div>
    </div>
  )
}
