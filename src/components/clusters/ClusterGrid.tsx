'use client'

import { useState } from 'react'
import { ClusterCard } from './ClusterCard'
import type { Cluster, ViewLabel } from '@/types'

interface ClusterGridProps {
  clusters: Cluster[]
  onUpdate: (updatedClusters: Cluster[]) => void
}

export function ClusterGrid({ clusters, onUpdate }: ClusterGridProps) {
  const [localClusters, setLocalClusters] = useState(clusters)

  const handleSkuChange = async (clusterId: string, sku: string, productName: string) => {
    const updated = localClusters.map((c) =>
      c.id === clusterId
        ? { ...c, assigned_sku: sku, assigned_product_name: productName }
        : c
    )
    setLocalClusters(updated)
    onUpdate(updated)

    await fetch(`/api/clusters/${clusterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_sku: sku, assigned_product_name: productName }),
    })
  }

  const handleConfirm = async (clusterId: string) => {
    const cluster = localClusters.find((c) => c.id === clusterId)
    if (!cluster?.assigned_sku) return

    const updated = localClusters.map((c) =>
      c.id === clusterId ? { ...c, status: 'confirmed' as const } : c
    )
    setLocalClusters(updated)
    onUpdate(updated)

    await fetch(`/api/clusters/${clusterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
  }

  const handleViewLabelChange = async (imageId: string, view: ViewLabel, clusterId: string) => {
    const updated = localClusters.map((c) => ({
      ...c,
      images: c.images.map((img) =>
        img.id === imageId ? { ...img, view_label: view } : img
      ),
    }))
    setLocalClusters(updated)
    onUpdate(updated)

    await fetch(`/api/clusters/${clusterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, view_label: view }),
    })
  }

  if (!localClusters.length) {
    return (
      <div className="text-center py-14 flex flex-col items-center gap-3">
        <div className="w-14 h-14 bg-[var(--bg3)] rounded-full border border-[var(--line2)] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <p className="text-[0.95rem] font-semibold text-[var(--text)]">No clusters yet</p>
        <p className="text-[0.82rem] text-[var(--text3)] max-w-[320px] leading-relaxed">
          Upload images and run the pipeline to automatically group products.
        </p>
      </div>
    )
  }

  const confirmed = localClusters.filter((c) => c.status === 'confirmed').length

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-5 text-[0.82rem]">
        <span className="text-[var(--text2)]">
          <span className="text-[var(--accent2)] font-semibold">{confirmed}</span> / {localClusters.length} clusters confirmed
        </span>
        {localClusters.some((c) => c.missing_views.length > 0) && (
          <span className="text-[var(--accent3)] flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 1L1 11h10L6 1zm0 3v3m0 2h.01" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
            {localClusters.filter((c) => c.missing_views.length > 0).length} clusters with missing shots
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {localClusters.map((cluster) => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            onSkuChange={handleSkuChange}
            onConfirm={handleConfirm}
            onViewLabelChange={(imgId, view) => handleViewLabelChange(imgId, view, cluster.id)}
          />
        ))}
      </div>
    </div>
  )
}
