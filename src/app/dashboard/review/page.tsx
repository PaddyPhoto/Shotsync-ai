'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { useSession } from '@/store/session'
import { usePlan } from '@/context/PlanContext'
import { useBrand } from '@/context/BrandContext'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import { useMarketplaceRules } from '@/lib/marketplace/useMarketplaceRules'
import type { EditableRules } from '@/lib/marketplace/useMarketplaceRules'
import { applyNamingTemplate } from '@/lib/brands'
import type { ViewLabel, MarketplaceName } from '@/types'
import type { SessionCluster } from '@/store/session'
import type { Brand } from '@/lib/brands'

const ALL_VIEWS: ViewLabel[] = ['front', 'back', 'side', 'detail', 'mood', 'full-length']

const VIEW_CLS: Record<ViewLabel, string> = {
  front: 'shot-front',
  back: 'shot-back',
  side: 'shot-side',
  detail: 'shot-detail',
  mood: 'shot-mood',
  'full-length': 'shot-full-length',
  unknown: 'shot-unknown',
}

export default function ReviewPage() {
  const router = useRouter()
  const { activeBrand } = useBrand()
  const {
    jobName, clusters, marketplaces: sessionMarketplaces, isReady,
    moveImage, mergeCluster, splitImages, reorderImages, relabelCluster,
    updateClusterSku, updateClusterColor, setImageViewLabel, confirmCluster, setAllConfirmed, deleteCluster, deleteImages,
  } = useSession()

  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null)
  const [draggingFromCluster, setDraggingFromCluster] = useState<string | null>(null)
  const [dragOverCluster, setDragOverCluster] = useState<string | null>(null)
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null)
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null)
  const [skuInput, setSkuInput] = useState<Record<string, string>>({})
  const [colorInput, setColorInput] = useState<Record<string, string>>({})
  const [editingColor, setEditingColor] = useState<string | null>(null)
  const [disabledAngles, setDisabledAngles] = useState<Record<string, Set<ViewLabel>>>({})

  const VIEW_SEQUENCE: ViewLabel[] = ['full-length', 'front', 'side', 'mood', 'detail', 'back']

  const getActiveAngles = (clusterId: string): ViewLabel[] =>
    VIEW_SEQUENCE.filter((a) => !disabledAngles[clusterId]?.has(a))

  const toggleAngle = (clusterId: string, angle: ViewLabel) => {
    setDisabledAngles((prev) => {
      const current = new Set(prev[clusterId] ?? [])
      if (current.has(angle)) current.delete(angle)
      else current.add(angle)
      const next = { ...prev, [clusterId]: current }
      const activeAngles = VIEW_SEQUENCE.filter((a) => !current.has(a))
      relabelCluster(clusterId, activeAngles)
      return next
    })
  }
  const { rules: marketplaceRules } = useMarketplaceRules()
  const [showExportPanel, setShowExportPanel] = useState(false)

  const getMissingViewsForCluster = (cluster: SessionCluster, marketplace: MarketplaceName) => {
    const rule = marketplaceRules[marketplace]
    if (!rule) return []
    const activeViews = new Set(
      cluster.images
        .filter((img) => !disabledAngles[cluster.id]?.has(img.viewLabel as ViewLabel))
        .map((img) => img.viewLabel)
    )
    return rule.required_views.filter((v) => !activeViews.has(v))
  }

  useEffect(() => {
    if (!isReady) router.replace('/dashboard/upload')
  }, [isReady, router])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImages.size > 0) {
        // Don't trigger if user is typing in an input
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        deleteImages(Array.from(selectedImages))
        setSelectedImages(new Set())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImages, deleteImages])

  const confirmedCount = clusters.filter((c) => c.confirmed).length

  // ── SKU input ──────────────────────────────────────────────────────────────
  const handleSkuKeyDown = (clusterId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = (skuInput[clusterId] ?? '').trim().toUpperCase()
      if (val) { updateClusterSku(clusterId, val); confirmCluster(clusterId) }
    }
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  const onImageDragStart = (e: React.DragEvent, imageId: string, fromClusterId: string) => {
    setDraggingImageId(imageId)
    setDraggingFromCluster(fromClusterId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('imageId', imageId)
    e.dataTransfer.setData('fromCluster', fromClusterId)
  }

  const onImageDragEnd = () => {
    setDraggingImageId(null)
    setDraggingFromCluster(null)
    setDragOverImageId(null)
    setDragOverCluster(null)
  }

  // Hovering over a specific image — show reorder target indicator
  const onImageDragOver = (e: React.DragEvent, imageId: string, clusterId: string) => {
    e.preventDefault()
    e.stopPropagation() // don't also trigger cluster-level dragOver
    e.dataTransfer.dropEffect = 'move'
    setDragOverImageId(imageId)
    setDragOverCluster(clusterId)
  }

  // Drop ON an image — reorder (same cluster) or move (cross-cluster)
  const onImageDrop = (e: React.DragEvent, toImageId: string, toClusterId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverImageId(null)
    setDragOverCluster(null)

    const fromImageId = e.dataTransfer.getData('imageId')
    const fromClusterId = e.dataTransfer.getData('fromCluster')
    if (!fromImageId || fromImageId === toImageId) { setDraggingImageId(null); setDraggingFromCluster(null); return }

    if (fromClusterId === toClusterId) {
      const cluster = clusters.find((c) => c.id === toClusterId)
      if (cluster) {
        const fromIdx = cluster.images.findIndex((i) => i.id === fromImageId)
        const toIdx = cluster.images.findIndex((i) => i.id === toImageId)
        if (fromIdx !== -1 && toIdx !== -1) reorderImages(toClusterId, fromIdx, toIdx, getActiveAngles(toClusterId))
      }
    } else {
      moveImage(fromImageId, toClusterId)
    }
    setDraggingImageId(null)
    setDraggingFromCluster(null)
  }

  // Cluster container fallback — only handles cross-cluster drops on empty space
  const onClusterDragOver = (e: React.DragEvent, clusterId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCluster(clusterId)
  }

  const onClusterDrop = (e: React.DragEvent, toClusterId: string) => {
    e.preventDefault()
    setDragOverCluster(null)
    setDragOverImageId(null)
    const imageId = e.dataTransfer.getData('imageId')
    const fromCluster = e.dataTransfer.getData('fromCluster')
    if (imageId && fromCluster !== toClusterId) {
      moveImage(imageId, toClusterId)
    }
    setDraggingImageId(null)
    setDraggingFromCluster(null)
  }

  const onClusterDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCluster(null)
      setDragOverImageId(null)
    }
  }

  // ── Split selected images ──────────────────────────────────────────────────
  const handleSplit = (clusterId: string) => {
    const toSplit = Array.from(selectedImages).filter((id) =>
      clusters.find((c) => c.id === clusterId)?.images.some((img) => img.id === id)
    )
    if (toSplit.length) {
      splitImages(clusterId, toSplit)
      setSelectedImages(new Set())
    }
  }

  // ── Toggle image selection ────────────────────────────────────────────────
  const toggleSelect = (imageId: string, clusterId: string) => {
    setSelectedCluster(clusterId)
    setSelectedImages((prev) => {
      const next = new Set(prev)
      if (next.has(imageId)) next.delete(imageId)
      else next.add(imageId)
      return next
    })
  }

  if (!isReady) return null

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: jobName || 'Review' }]}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[0.78rem] text-[var(--text3)]">
              {confirmedCount}/{clusters.length} confirmed
            </span>
            <button
              onClick={() => {
                const confirming = confirmedCount < clusters.length
                if (confirming) {
                  // Flush any typed-but-unsaved SKUs from local input state to the store
                  clusters.forEach((c) => {
                    const typed = skuInput[c.id]?.trim().toUpperCase()
                    if (typed) updateClusterSku(c.id, typed)
                  })
                }
                setAllConfirmed(confirming)
              }}
              className="btn btn-ghost btn-sm"
              title={confirmedCount < clusters.length ? 'Confirm all' : 'Unconfirm all'}
            >
              {confirmedCount < clusters.length ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="2 6 5 9 10 3"/>
                  </svg>
                  Confirm all
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round"/>
                  </svg>
                  Unconfirm all
                </>
              )}
            </button>
            <button
              onClick={() => setShowExportPanel(true)}
              className="btn btn-primary"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 10V2M4 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12h10" strokeLinecap="round"/>
              </svg>
              Export
            </button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — cluster list */}
        <div className="w-[220px] flex-shrink-0 border-r border-[var(--line)] overflow-y-auto bg-[var(--bg2)]">
          <div className="p-3">
            <p className="text-[0.7rem] text-[var(--text3)] uppercase tracking-[0.08em] mb-2 px-1">
              {clusters.length} clusters
            </p>
            {clusters.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setExpandedCluster(c.id)
                  document.getElementById(`cluster-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className={`w-full flex items-center gap-2 px-2 py-[7px] rounded-sm text-left transition-all mb-[2px] ${
                  expandedCluster === c.id
                    ? 'bg-[rgba(232,217,122,0.08)] text-[var(--text)]'
                    : 'hover:bg-[var(--bg3)] text-[var(--text2)]'
                }`}
              >
                <div className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${c.confirmed ? 'bg-[var(--accent2)]' : 'bg-[var(--bg4)]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.78rem] truncate">{c.sku || c.label}</p>
                  <p className="text-[0.65rem] text-[var(--text3)]">{c.images.length} img</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main workspace */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Selection toolbar */}
          {/* Missing shots summary banner */}
          {(() => {
            const clustersWithMissing = clusters.filter((c) =>
              sessionMarketplaces.some((mp) =>
                getMissingViewsForCluster(c, mp as MarketplaceName).length > 0
              )
            )
            if (!clustersWithMissing.length) return null
            return (
              <div className="flex items-center gap-3 px-4 py-[10px] mb-4 bg-[rgba(232,163,122,0.08)] border border-[rgba(232,163,122,0.25)] rounded-md">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth="1.5" className="flex-shrink-0">
                  <path d="M7 1L1 13h12L7 1z" strokeLinejoin="round"/>
                  <path d="M7 5.5v3M7 9.5h.01" strokeLinecap="round"/>
                </svg>
                <span className="text-[0.82rem] text-[var(--text2)]">
                  <span className="font-semibold text-[var(--accent)]">{clustersWithMissing.length} cluster{clustersWithMissing.length !== 1 ? 's' : ''}</span>
                  {' '}missing required shots for selected marketplaces
                </span>
              </div>
            )
          })()}

          {selectedImages.size > 0 && selectedCluster && (
            <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-[10px] mb-4 bg-[var(--bg)] border border-[var(--accent)] rounded-md shadow-lg">
              <span className="text-[0.82rem] text-[var(--accent)] font-medium">{selectedImages.size} selected</span>
              <div className="flex-1" />
              <button onClick={() => handleSplit(selectedCluster)} className="btn btn-ghost btn-sm">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 1v10M2 6l4-4 4 4M2 6l4 4 4-4" strokeLinecap="round"/>
                </svg>
                Split to new cluster
              </button>
              <button
                onClick={() => {
                  deleteImages(Array.from(selectedImages))
                  setSelectedImages(new Set())
                }}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--accent3)' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 3h8M5 3V2h2v1M4 3v6h4V3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Delete
              </button>
              <button onClick={() => setSelectedImages(new Set())} className="btn btn-ghost btn-sm">
                Cancel
              </button>
            </div>
          )}

          {/* Cluster cards */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
            {clusters.map((cluster) => {
              const isDropTarget = dragOverCluster === cluster.id && draggingFromCluster !== cluster.id
              const currentSku = skuInput[cluster.id] ?? cluster.sku

              return (
                <div
                  id={`cluster-${cluster.id}`}
                  key={cluster.id}
                  className={`bg-[var(--bg2)] rounded-md border transition-all duration-150 overflow-hidden ${
                    cluster.confirmed
                      ? 'border-[var(--accent2)]'
                      : isDropTarget
                      ? 'border-[var(--accent)] shadow-[0_0_0_2px_rgba(232,217,122,0.2)]'
                      : 'border-[var(--line)] hover:border-[var(--line2)]'
                  }`}
                  onDragOver={(e) => onClusterDragOver(e, cluster.id)}
                  onDrop={(e) => onClusterDrop(e, cluster.id)}
                  onDragLeave={onClusterDragLeave}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-2 px-3 py-[10px] bg-[var(--bg3)] border-b border-[var(--line)]">
                    <span className="text-[0.7rem] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                      {cluster.label}
                    </span>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {(() => {
                        const activeLabels = new Set(cluster.images.map((i) => i.viewLabel))
                        const clusterDisabled = disabledAngles[cluster.id] ?? new Set()
                        const pillAngles = VIEW_SEQUENCE.filter(
                          (a) => activeLabels.has(a) || clusterDisabled.has(a)
                        )
                        return pillAngles.map((v) => {
                          const isDisabled = clusterDisabled.has(v)
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => toggleAngle(cluster.id, v)}
                              title={isDisabled ? `Re-enable ${v}` : `Disable ${v}`}
                              className={`shot-pill ${VIEW_CLS[v]} transition-all cursor-pointer select-none ${
                                isDisabled ? 'opacity-25 line-through' : 'hover:opacity-75'
                              }`}
                            >
                              {v}
                            </button>
                          )
                        })
                      })()}
                    </div>
                    <button
                      onClick={() => deleteCluster(cluster.id)}
                      className="p-1 text-[var(--text3)] hover:text-[var(--accent3)] transition-colors"
                      title="Delete cluster"
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 2l7 7M9 2L2 9" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* Image strip */}
                  <div className="p-2 flex flex-wrap gap-1">
                    {cluster.images.map((img) => {
                      const isSelected = selectedImages.has(img.id)
                      const isDragging = draggingImageId === img.id
                      const isReorderTarget = dragOverImageId === img.id && draggingFromCluster === cluster.id

                      return (
                        <div
                          key={img.id}
                          draggable
                          onDragStart={(e) => onImageDragStart(e, img.id, cluster.id)}
                          onDragEnd={onImageDragEnd}
                          onDragOver={(e) => onImageDragOver(e, img.id, cluster.id)}
                          onDrop={(e) => onImageDrop(e, img.id, cluster.id)}
                          className={`relative group cursor-grab active:cursor-grabbing transition-all duration-100 ${isDragging ? 'opacity-20 scale-95' : ''}`}
                          style={{ width: 'calc(25% - 3px)' }}
                          title={img.filename}
                        >
                          {/* Image */}
                          <div
                            className={`aspect-[3/4] rounded-[3px] overflow-hidden relative border-2 transition-all ${
                              isReorderTarget ? 'border-[var(--accent)] shadow-[0_0_0_3px_rgba(232,217,122,0.25)]'
                              : isSelected ? 'border-[var(--accent)]'
                              : 'border-transparent'
                            }`}
                            onClick={(e) => {
                              if (e.shiftKey || e.metaKey || e.ctrlKey) {
                                toggleSelect(img.id, cluster.id)
                              }
                            }}
                          >
                            <img
                              src={img.previewUrl}
                              alt={img.filename}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                            {/* Angle badge */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1 pt-3 pb-[3px]">
                              <select
                                value={img.viewLabel}
                                onChange={(e) => setImageViewLabel(img.id, cluster.id, e.target.value as ViewLabel)}
                                className="w-full bg-transparent text-white text-[0.6rem] font-semibold uppercase outline-none cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {ALL_VIEWS.map((v) => (
                                  <option key={v} value={v} className="text-black bg-white">{v}</option>
                                ))}
                              </select>
                            </div>
                            {/* Select indicator */}
                            <div
                              className={`absolute top-1 right-1 w-[14px] h-[14px] rounded-full border-2 transition-all ${
                                isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-white/60 opacity-0 group-hover:opacity-100'
                              }`}
                              onClick={(e) => { e.stopPropagation(); toggleSelect(img.id, cluster.id) }}
                            />
                          </div>
                        </div>
                      )
                    })}

                    {/* Drop zone hint — only for cross-cluster moves */}
                    {isDropTarget && draggingFromCluster !== cluster.id && (
                      <div className="w-full flex items-center justify-center py-4 border-2 border-dashed border-[var(--accent)] rounded-[3px] text-[0.75rem] text-[var(--accent)]">
                        Drop here to move
                      </div>
                    )}
                  </div>

                  {/* SKU input + actions */}
                  <div className="px-3 pt-[10px] pb-[6px] border-t border-[var(--line)] flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        className="input text-[0.8rem] py-[5px]"
                        placeholder="Enter SKU"
                        value={currentSku}
                        onChange={(e) => setSkuInput((s) => ({ ...s, [cluster.id]: e.target.value }))}
                        onKeyDown={(e) => handleSkuKeyDown(cluster.id, e)}
                        onBlur={() => {
                          const val = (skuInput[cluster.id] ?? '').trim().toUpperCase()
                          if (val) updateClusterSku(cluster.id, val)
                        }}
                        style={{ fontFamily: 'var(--font-dm-mono)' }}
                      />
                    </div>
                    {cluster.confirmed ? (
                      <span className="text-[0.72rem] font-semibold text-[var(--accent2)] flex items-center gap-1 flex-shrink-0">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 5 4.5 7.5 8 2.5"/></svg>
                        Confirmed
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          const val = (skuInput[cluster.id] ?? cluster.sku).trim().toUpperCase()
                          if (val) { updateClusterSku(cluster.id, val); confirmCluster(cluster.id) }
                        }}
                        disabled={!(skuInput[cluster.id] ?? cluster.sku).trim()}
                        className="btn btn-primary btn-sm flex-shrink-0"
                      >
                        Confirm
                      </button>
                    )}
                  </div>

                  {/* Missing shots per marketplace */}
                  {sessionMarketplaces.map((mp) => {
                    const missing = getMissingViewsForCluster(cluster, mp as MarketplaceName)
                    if (!missing.length) return null
                    const ruleName = marketplaceRules[mp as MarketplaceName]?.name ?? mp
                    return (
                      <div key={mp} className="mx-3 mb-2 flex items-center gap-2 px-2 py-[5px] rounded-sm bg-[rgba(232,163,122,0.07)] border border-[rgba(232,163,122,0.2)]">
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="var(--accent)" strokeWidth="1.5" className="flex-shrink-0">
                          <path d="M5.5 1L1 10h9L5.5 1z" strokeLinejoin="round"/>
                          <path d="M5.5 4.5v2M5.5 7.5h.01" strokeLinecap="round"/>
                        </svg>
                        <span className="text-[0.7rem] text-[var(--text2)]">
                          <span className="font-medium">{ruleName}:</span>
                          {' '}missing{' '}
                          {missing.map((v, i) => (
                            <span key={v}>
                              <span className={`shot-pill ${VIEW_CLS[v as ViewLabel] ?? ''}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>{v}</span>
                              {i < missing.length - 1 ? ' ' : ''}
                            </span>
                          ))}
                        </span>
                      </div>
                    )
                  })}

                  {/* Colour chip */}
                  <div className="px-3 pb-[8px] flex items-center gap-2">
                    <span className="text-[0.7rem] text-[var(--text3)]">Colour</span>
                    {editingColor === cluster.id ? (
                      <input
                        autoFocus
                        className="input text-[0.75rem] py-[3px] w-[110px]"
                        placeholder="e.g. NAVY"
                        value={colorInput[cluster.id] ?? cluster.color}
                        onChange={(e) => setColorInput((s) => ({ ...s, [cluster.id]: e.target.value.toUpperCase() }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            const val = (colorInput[cluster.id] ?? cluster.color).trim().toUpperCase()
                            if (val) updateClusterColor(cluster.id, val)
                            setEditingColor(null)
                          }
                        }}
                        onBlur={() => {
                          const val = (colorInput[cluster.id] ?? cluster.color).trim().toUpperCase()
                          if (val) updateClusterColor(cluster.id, val)
                          setEditingColor(null)
                        }}
                        style={{ fontFamily: 'var(--font-dm-mono)' }}
                      />
                    ) : (
                      <button
                        onClick={() => { setColorInput((s) => ({ ...s, [cluster.id]: cluster.color })); setEditingColor(cluster.id) }}
                        className={`flex items-center gap-1 px-2 py-[3px] rounded-sm border text-[0.72rem] transition-all ${
                          cluster.color
                            ? 'border-[var(--line2)] text-[var(--text)] hover:border-[var(--accent)]'
                            : 'border-dashed border-[var(--line)] text-[var(--text3)] hover:border-[var(--accent)] hover:text-[var(--text2)]'
                        }`}
                        title="Click to edit colour"
                      >
                        {cluster.color ? (
                          <>
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M1 7l1.5-1.5L6 2M5 1l2 2" strokeLinecap="round"/>
                            </svg>
                            <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{cluster.color}</span>
                          </>
                        ) : (
                          <span>+ colour</span>
                        )}
                      </button>
                    )}
                    {cluster.color && editingColor !== cluster.id && (
                      <span className="text-[0.65rem] text-[var(--text3)]">auto-detected</span>
                    )}
                  </div>

                  {/* Merge / split actions */}
                  <div className="px-3 pb-[10px] flex items-center gap-2">
                    <span className="text-[0.7rem] text-[var(--text3)]">{cluster.images.length} images</span>
                    <div className="flex-1" />
                    {selectedImages.size > 0 && selectedCluster === cluster.id && (
                      <button onClick={() => handleSplit(cluster.id)} className="text-[0.72rem] text-[var(--accent)] hover:underline">
                        Split selection
                      </button>
                    )}
                    {clusters.length > 1 && (
                      <div className="relative group">
                        <button className="text-[0.72rem] text-[var(--text3)] hover:text-[var(--text2)]">Merge into…</button>
                        <div className="absolute bottom-full right-0 mb-1 bg-[var(--bg)] border border-[var(--line2)] rounded-sm shadow-lg min-w-[160px] hidden group-hover:block z-20">
                          {clusters.filter((c) => c.id !== cluster.id).map((other) => (
                            <button
                              key={other.id}
                              onClick={() => mergeCluster(cluster.id, other.id)}
                              className="w-full text-left px-3 py-[7px] text-[0.78rem] text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)] transition-colors"
                            >
                              {other.sku || other.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Export panel overlay */}
      {showExportPanel && (
        <ExportPanel
          jobName={jobName}
          clusters={clusters}
          activeBrand={activeBrand}
          marketplaces={sessionMarketplaces as MarketplaceName[]}
          marketplaceRules={marketplaceRules}
          onClose={() => setShowExportPanel(false)}
        />
      )}
    </div>
  )
}

// ── ExportPanel ───────────────────────────────────────────────────────────────

function ExportPanel({
  jobName,
  clusters,
  activeBrand,
  marketplaces,
  marketplaceRules,
  onClose,
}: {
  jobName: string
  clusters: SessionCluster[]
  activeBrand: Brand | null
  marketplaces: MarketplaceName[]
  marketplaceRules: EditableRules
  onClose: () => void
}) {
  const selectedMarketplaces = marketplaces
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, phase: '' })
  const [done, setDone] = useState(false)
  const [shopifyUploading, setShopifyUploading] = useState(false)
  const [shopifyResults, setShopifyResults] = useState<{ sku: string; status: string; uploaded: number }[] | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folderRef = useRef<any>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [fsaSupported] = useState(() => typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function')
  const [exportMode, setExportMode] = useState<'zip' | 'folder'>('zip')

  const { canExportThisMonth, recordExport, openUpgrade, plan } = usePlan()
  const confirmedClusters = clusters.filter((c) => c.confirmed)

  const pickFolder = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
      folderRef.current = handle
      setFolderName(handle.name)
    } catch { /* cancelled */ }
  }

  const handleShopifyUpload = async () => {
    if (!activeBrand?.id || !confirmedClusters.length) return
    setShopifyUploading(true)
    setShopifyResults(null)
    try {
      const { data: { session } } = await import('@/lib/supabase/client').then(({ createClient }) => createClient().auth.getSession())

      // Build base64 images for each cluster (use original files, Shopify handles resizing)
      const clusters = await Promise.all(confirmedClusters.map(async (cluster) => {
        const images = await Promise.all(cluster.images.map(async (img, i) => {
          const buf = await img.file.arrayBuffer()
          const bytes = new Uint8Array(buf)
          let binary = ''
          for (let j = 0; j < bytes.byteLength; j++) binary += String.fromCharCode(bytes[j])
          return { filename: img.filename, base64: btoa(binary), position: i + 1 }
        }))
        return { sku: cluster.sku || cluster.label, images }
      }))

      const res = await fetch('/api/shopify/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ brand_id: activeBrand.id, clusters, replace: true }),
      })
      const { data } = await res.json()
      setShopifyResults(data?.results ?? [])
    } catch {
      setShopifyResults([])
    } finally {
      setShopifyUploading(false)
    }
  }

  const handleExport = async () => {
    if (!selectedMarketplaces.length || !confirmedClusters.length) return
    if (!canExportThisMonth()) {
      openUpgrade(`You've used all ${plan.limits.exportsPerMonth} exports this month on the Free plan. Upgrade for unlimited exports.`)
      return
    }
    setIsExporting(true)
    setDone(false)

    const totalImages = confirmedClusters.reduce((s, c) => s + c.images.length, 0) * selectedMarketplaces.length
    setProgress({ done: 0, total: totalImages, phase: 'Processing images…' })

    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    let doneCount = 0

    for (const marketplace of selectedMarketplaces) {
      // Use the user-edited rule (from localStorage), not the static default
      const rule = marketplaceRules[marketplace] ?? MARKETPLACE_RULES[marketplace]
      const marketplaceFolder = zip.folder(rule.name.replace(/\s+/g, '_'))!

      // Marketplace template takes precedence; fall back to brand template
      const brandCode = activeBrand?.brand_code ?? 'BRAND'
      const template = rule.naming_template || activeBrand?.naming_template || '{BRAND}_{SEQ}_{VIEW}'

      for (let clusterIdx = 0; clusterIdx < confirmedClusters.length; clusterIdx++) {
        const cluster = confirmedClusters[clusterIdx]
        const seq = clusterIdx + 1

        // Folder name: strip {VIEW} and {INDEX} tokens, use result as SKU folder
        const folderName = applyNamingTemplate(
          template.replace(/_{VIEW}/g, '').replace(/_{INDEX}/g, ''),
          { brand: brandCode, seq, sku: cluster.sku, color: cluster.color, view: '', index: 0 }
        ).replace(/_+$/, '') || `${brandCode}_${String(seq).padStart(3, '0')}`

        for (let imgIdx = 0; imgIdx < cluster.images.length; imgIdx++) {
          const img = cluster.images[imgIdx]
          setProgress({ done: doneCount, total: totalImages, phase: `${rule.name} · ${folderName} · ${imgIdx + 1}/${cluster.images.length}` })

          try {
            const buffer = await processImageOnCanvas(
              img.file,
              rule.image_dimensions.width,
              rule.image_dimensions.height,
              rule.background_color,
              (rule.quality ?? 100) / 100,
              rule.max_file_size_kb ?? 0,
            )
            const filename = applyNamingTemplate(template, {
              brand: brandCode,
              seq,
              sku: cluster.sku,
              color: cluster.color,
              view: img.viewLabel,
              index: imgIdx + 1,
            }) + '.jpg'
            marketplaceFolder.file(`${folderName}/${filename}`, buffer)
          } catch (err) {
            console.warn(`Export skipped: ${img.filename}`, err)
          }

          doneCount++
          await new Promise((r) => setTimeout(r, 0))
        }
      }
    }

    setProgress((p) => ({ ...p, phase: 'Building ZIP…' }))

    if (exportMode === 'folder' && folderRef.current) {
      setProgress((p) => ({ ...p, phase: 'Writing to folder…' }))
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipData = await JSZip.loadAsync(zipBlob)
      const entries = Object.entries(zipData.files).filter(([, f]) => !f.dir)
      let written = 0
      for (const [path, file] of entries) {
        const parts = path.split('/')
        let handle = folderRef.current
        for (let i = 0; i < parts.length - 1; i++) {
          handle = await handle.getDirectoryHandle(parts[i], { create: true })
        }
        const fh = await handle.getFileHandle(parts[parts.length - 1], { create: true })
        const writable = await fh.createWritable()
        await writable.write(await file.async('arraybuffer'))
        await writable.close()
        written++
        setProgress({ done: written, total: entries.length, phase: 'Writing files…' })
      }
    } else {
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${jobName || 'export'}.zip`
      a.click()
      URL.revokeObjectURL(url)
    }

    recordExport()

    // Save job to history (best-effort — don't block or fail export)
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) =>
      fetch('/api/jobs/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          job_name: jobName,
          image_count: confirmedClusters.reduce((s, c) => s + c.images.length, 0),
          cluster_count: confirmedClusters.length,
          marketplaces: selectedMarketplaces,
          brand_id: activeBrand?.id ?? null,
        }),
      })
    ).catch(() => { /* non-critical */ })

    setIsExporting(false)
    setDone(true)
    setTimeout(() => onClose(), 1500)
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-[var(--bg)] border border-[var(--line2)] rounded-md w-[480px] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
          <h2 className="text-[0.95rem] font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
            Export
          </h2>
          <button onClick={onClose} className="text-[var(--text3)] hover:text-[var(--text2)] p-1 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {confirmedClusters.length === 0 ? (
            <p className="text-[0.82rem] text-[var(--accent3)]">Confirm at least one look to enable export. SKUs are optional — looks without one will use their label.</p>
          ) : (
            <p className="text-[0.82rem] text-[var(--text2)]">
              <span className="text-[var(--accent2)] font-semibold">{confirmedClusters.length}</span> clusters ·{' '}
              <span className="text-[var(--text)]">{confirmedClusters.reduce((s, c) => s + c.images.length, 0)}</span> images
            </p>
          )}

          {/* Marketplaces (read-only — set during upload) */}
          <div>
            <p className="text-[0.75rem] text-[var(--text2)] mb-2 font-medium">Marketplaces</p>
            <div className="flex flex-wrap gap-2">
              {selectedMarketplaces.map((id) => {
                const label: Record<string, string> = { 'the-iconic': 'THE ICONIC', 'myer': 'Myer', 'david-jones': 'David Jones', 'shopify': 'Shopify' }
                return (
                  <span key={id} className="px-3 py-[6px] rounded-sm border border-[var(--accent)] bg-[rgba(74,158,255,0.08)] text-[var(--text)] text-[0.78rem] font-medium">
                    {label[id] ?? id}
                  </span>
                )
              })}
            </div>
            <p className="text-[0.72rem] text-[var(--text3)] mt-2">
              To change marketplaces, start a new upload.
            </p>
          </div>

          {/* Output mode */}
          <div>
            <p className="text-[0.75rem] text-[var(--text2)] mb-2 font-medium">Output</p>
            <div className="inline-flex bg-[var(--bg3)] p-[3px] rounded-sm gap-[2px] mb-3">
              {([
                ['zip', 'Download ZIP'],
                ['folder', 'Save to Folder'],
              ] as [string, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setExportMode(id as 'zip' | 'folder')}
                  className={`px-3 py-[5px] rounded-[4px] text-[0.78rem] font-medium transition-all ${exportMode === id ? 'bg-[var(--bg)] text-[var(--text)]' : 'text-[var(--text2)] hover:text-[var(--text)]'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {exportMode === 'folder' && (
              <div className="flex items-center gap-2">
                <button onClick={pickFolder} disabled={!fsaSupported} className="btn btn-ghost btn-sm">
                  Choose folder
                </button>
                {folderName ? (
                  <span className="text-[0.78rem] text-[var(--accent2)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>/{folderName}</span>
                ) : (
                  <span className="text-[0.75rem] text-[var(--text3)]">{fsaSupported ? 'No folder selected' : 'Requires Chrome/Edge'}</span>
                )}
              </div>
            )}
          </div>

          {/* Output structure preview */}
          {confirmedClusters.length > 0 && selectedMarketplaces.length > 0 && (
            <div className="bg-[var(--bg3)] border border-[var(--line)] rounded-sm px-3 py-3 text-[0.72rem]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
              <p className="text-[var(--text3)] mb-1">Output structure:</p>
              {selectedMarketplaces.slice(0, 2).map((m) => {
                const rule = MARKETPLACE_RULES[m]
                const folderN = rule.name.replace(/\s+/g, '_')
                return (
                  <div key={m} className="mb-1">
                    <span className="text-[var(--accent)]">{folderN}/</span>
                    {confirmedClusters.slice(0, 2).map((c) => (
                      <div key={c.id} className="pl-3 text-[var(--text3)]">
                        └─ {c.sku}/{c.sku}_FRONT_01.jpg …
                      </div>
                    ))}
                    {confirmedClusters.length > 2 && <div className="pl-3 text-[var(--text3)]">└─ ({confirmedClusters.length - 2} more SKUs)</div>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Progress */}
          {isExporting && (
            <div>
              <div className="flex items-center justify-between text-[0.78rem] mb-1">
                <span className="text-[var(--text2)]">{progress.phase}</span>
                <span style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--accent)' }}>{pct}%</span>
              </div>
              <div className="h-[5px] bg-[var(--bg3)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-200" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
              </div>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-[0.82rem] text-[var(--accent2)]">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 7 5.5 10.5 11 3"/></svg>
              Export complete!
            </div>
          )}

          {/* Shopify direct upload */}
          {activeBrand?.shopify_store_url && (
            <div className="border-t border-[var(--line)] pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[0.75rem] text-[var(--text2)] font-medium">Shopify Direct Upload</p>
                <span className="text-[0.65rem] text-[var(--accent2)] bg-[rgba(62,207,142,0.1)] px-2 py-[2px] rounded-[6px]">Connected</span>
              </div>
              <p className="text-[0.72rem] text-[var(--text3)] mb-3">
                Upload images directly to matching Shopify product listings by SKU.
              </p>

              {shopifyResults && (
                <div className="bg-[var(--bg3)] rounded-sm p-3 mb-3 flex flex-col gap-[4px] max-h-[120px] overflow-y-auto">
                  {shopifyResults.map((r) => (
                    <div key={r.sku} className="flex items-center justify-between text-[0.72rem]">
                      <span className="text-[var(--text2)]" style={{ fontFamily: 'var(--font-mono)' }}>{r.sku}</span>
                      <span className={r.status === 'uploaded' ? 'text-[var(--accent2)]' : 'text-[var(--accent3)]'}>
                        {r.status === 'uploaded' ? `✓ ${r.uploaded} uploaded` : r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleShopifyUpload}
                disabled={shopifyUploading || !confirmedClusters.length}
                className="btn btn-ghost btn-sm w-full justify-center"
              >
                {shopifyUploading ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                    Uploading to Shopify…
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>
                    Upload to Shopify
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[var(--line)] flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">Close</button>
          <button
            onClick={handleExport}
            disabled={isExporting || !confirmedClusters.length || !selectedMarketplaces.length || (exportMode === 'folder' && !folderRef.current)}
            className="btn btn-primary"
          >
            {isExporting ? 'Exporting…' : exportMode === 'zip' ? 'Download ZIP' : 'Save to Folder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Canvas-based image processing ─────────────────────────────────────────────

async function processImageOnCanvas(
  file: File, width: number, height: number, bgColor: string,
  quality = 1.0, maxFileSizeKb = 0
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!

      // Fill background
      ctx.fillStyle = bgColor || '#ffffff'
      ctx.fillRect(0, 0, width, height)

      // Center crop
      const srcAspect = img.width / img.height
      const dstAspect = width / height
      let sx = 0, sy = 0, sw = img.width, sh = img.height
      if (srcAspect > dstAspect) {
        sw = img.height * dstAspect
        sx = (img.width - sw) / 2
      } else {
        sh = img.width / dstAspect
        sy = (img.height - sh) / 2
      }

      // Multi-step downscaling for sharper results when reducing by more than 50%
      // Each step halves the size, final step lands on target dimensions
      const sourceW = sw
      const sourceH = sh
      let currentCanvas = document.createElement('canvas')
      let currentCtx = currentCanvas.getContext('2d')!
      currentCanvas.width = sourceW
      currentCanvas.height = sourceH
      currentCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sourceW, sourceH)

      let stepW = sourceW
      let stepH = sourceH
      while (stepW > width * 2 || stepH > height * 2) {
        stepW = Math.max(Math.round(stepW / 2), width)
        stepH = Math.max(Math.round(stepH / 2), height)
        const stepCanvas = document.createElement('canvas')
        stepCanvas.width = stepW
        stepCanvas.height = stepH
        const stepCtx = stepCanvas.getContext('2d')!
        stepCtx.drawImage(currentCanvas, 0, 0, stepW, stepH)
        currentCanvas = stepCanvas
        currentCtx = stepCtx
      }

      // Final draw onto the target canvas
      ctx.drawImage(currentCanvas, 0, 0, width, height)
      URL.revokeObjectURL(url)

      const maxBytes = maxFileSizeKb > 0 ? maxFileSizeKb * 1024 : 0

      const encodeAt = (q: number) => new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => b ? res(b) : rej(new Error('canvas.toBlob failed')), 'image/jpeg', q)
      )

      const tryEncode = async () => {
        let blob = await encodeAt(quality)

        // If there's a size cap and we're over it, binary-search a lower quality
        if (maxBytes > 0 && blob.size > maxBytes) {
          let lo = 0.5, hi = quality
          for (let i = 0; i < 6; i++) {
            const mid = (lo + hi) / 2
            const attempt = await encodeAt(mid)
            if (attempt.size <= maxBytes) { blob = attempt; lo = mid }
            else hi = mid
          }
          // Final encode at the found quality
          if (blob.size > maxBytes) blob = await encodeAt(lo)
        }

        canvas.width = 0
        canvas.height = 0
        return blob.arrayBuffer()
      }

      tryEncode().then(resolve).catch(reject)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}
