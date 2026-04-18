'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { useSession } from '@/store/session'
import { usePlan } from '@/context/PlanContext'
import { useBrand } from '@/context/BrandContext'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import { useMarketplaceRules } from '@/lib/marketplace/useMarketplaceRules'
import type { EditableRules } from '@/lib/marketplace/useMarketplaceRules'
import { applyNamingTemplate } from '@/lib/brands'
import { detectColourFromFilename } from '@/lib/processor'
import { ACCESSORY_CATEGORIES, getCategoryById, getAngleDisplayName } from '@/lib/accessories/categories'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { MarketplaceSelector } from '@/components/export/MarketplaceSelector'
import type { ViewLabel, MarketplaceName } from '@/types'
import type { SessionCluster } from '@/store/session'
import type { Brand } from '@/lib/brands'

const ALL_VIEWS: ViewLabel[] = ['full-length', 'front', 'back', 'side', 'detail', 'mood', 'front-3/4', 'back-3/4']

const VIEW_CLS: Record<ViewLabel, string> = {
  front:             'shot-front',
  back:              'shot-back',
  side:              'shot-side',
  detail:            'shot-detail',
  mood:              'shot-mood',
  'full-length':     'shot-full-length',
  'ghost-mannequin': 'shot-gm',
  'flat-lay':        'shot-flat',
  'top-down':        'shot-topdown',
  'inside':          'shot-inside',
  'front-3/4':       'shot-threequarter',
  'back-3/4':        'shot-threequarter',
  unknown:           'shot-unknown',
}

// ReviewPage uses useSearchParams() which requires a Suspense boundary in Next.js App Router.
// The wrapper is the default export; the actual page logic lives in ReviewPage below.
export default function ReviewPageWrapper() {
  return <Suspense><ReviewPage /></Suspense>
}

function ReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeBrand } = useBrand()
  const {
    jobName, clusters, marketplaces: sessionMarketplaces, styleList, shootType, isReady,
    moveImage, copyImageToCluster, mergeCluster, splitImages, reorderImages, relabelCluster,
    updateClusterSku, updateClusterColor, updateClusterColourCode, updateClusterStyleNumber,
    setClusterCategory, setImageViewLabel, confirmCluster, setAllConfirmed, deleteCluster, deleteImages, reset,
  } = useSession()

  // Resolves the AccessoryCategory config for a cluster.
  // Returns undefined for on-model shoots — category logic only applies to still-life.
  // This drives angle sequences, selectable views, and display name overrides per cluster.
  const getCategoryForCluster = (cluster: SessionCluster) =>
    shootType === 'still-life' ? getCategoryById(cluster.category ?? '') : undefined

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
  const [colourCodeInput, setColourCodeInput] = useState<Record<string, string>>({})
  const [styleNumberInput, setStyleNumberInput] = useState<Record<string, string>>({})
  const [skuSearchOpen, setSkuSearchOpen] = useState<string | null>(null)
  const [skuSearchQuery, setSkuSearchQuery] = useState<Record<string, string>>({})
  const [disabledAngles, setDisabledAngles] = useState<Record<string, Set<ViewLabel>>>({})

  const [detectingCategories, setDetectingCategories] = useState<Set<string>>(new Set())

  const [clusterCopy, setClusterCopy] = useState<Record<string, {
    title: string; description: string; bullets: string[]; loading: boolean; open: boolean
  }>>({})
  const [generatingAll, setGeneratingAll] = useState(false)
  const [generateAllProgress, setGenerateAllProgress] = useState({ done: 0, total: 0 })

  const COPY_LIMIT = 200

  const generateAllCopy = async () => {
    const targets = clusters.filter((c) => !clusterCopy[c.id]?.title).slice(0, COPY_LIMIT)
    if (targets.length === 0) return
    setGeneratingAll(true)
    setGenerateAllProgress({ done: 0, total: targets.length })
    for (let i = 0; i < targets.length; i++) {
      await generateCopy(targets[i])
      setGenerateAllProgress({ done: i + 1, total: targets.length })
    }
    setGeneratingAll(false)
    setGenerateAllProgress({ done: 0, total: 0 })
  }

  const generateCopy = async (cluster: SessionCluster) => {
    const angles = [...new Set(cluster.images.map((img) => img.viewLabel).filter(Boolean))]
    setClusterCopy((prev) => ({
      ...prev,
      [cluster.id]: { ...(prev[cluster.id] ?? { title: '', description: '', bullets: [] }), loading: true, open: true },
    }))

    // Convert the hero (front) image to base64 so GPT-4o vision can see the garment.
    // Uses the previewUrl (blob URL) which is valid as long as the session is in memory.
    let heroImage: string | undefined
    const heroImg = cluster.images.find((img) => img.viewLabel === 'front') ?? cluster.images[0]
    if (heroImg?.previewUrl) {
      try {
        heroImage = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            // strip "data:image/...;base64,"
            resolve(result.split(',')[1])
          }
          reader.onerror = reject
          // Fetch the blob URL and read it as a data URL
          fetch(heroImg.previewUrl)
            .then((r) => r.blob())
            .then((blob) => reader.readAsDataURL(blob))
            .catch(reject)
        })
      } catch { /* proceed without image */ }
    }

    try {
      const res = await fetch('/api/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: cluster.sku,
          productName: cluster.productName,
          color: cluster.color,
          brandName: activeBrand?.name ?? '',
          angles,
          heroImage,
        }),
      })
      const data = await res.json()
      setClusterCopy((prev) => ({
        ...prev,
        [cluster.id]: { title: data.title ?? '', description: data.description ?? '', bullets: data.bullets ?? [], loading: false, open: true },
      }))
    } catch {
      setClusterCopy((prev) => ({
        ...prev,
        [cluster.id]: { ...(prev[cluster.id] ?? { title: '', description: '', bullets: [] }), loading: false, open: true },
      }))
    }
  }

  const DEFAULT_VIEW_SEQUENCE: ViewLabel[] = ['full-length', 'front', 'side', 'mood', 'detail', 'back', 'front-3/4', 'back-3/4']
  const STILL_LIFE_EXTRA: ViewLabel[] = ['front', 'back', 'side', 'detail', 'top-down', 'inside', 'front-3/4', 'back-3/4', 'unknown']

  // Returns the ordered angle sequence for a cluster.
  // For still-life with a known category, uses that category's defined angle order.
  // For on-model (or unknown category), uses the default clothing sequence.
  const getViewSequence = (cluster: SessionCluster): ViewLabel[] => {
    const cat = getCategoryForCluster(cluster)
    return cat ? (cat.angles as ViewLabel[]) : DEFAULT_VIEW_SEQUENCE
  }

  // Returns all angles a user can assign to an image via the per-image dropdown.
  // For still-life: the category's standard angles + extra still-life options.
  // For on-model: the standard on-model angle set.
  const getSelectableViews = (cluster: SessionCluster): ViewLabel[] => {
    const cat = getCategoryForCluster(cluster)
    return cat
      ? [...new Set([...(cat.angles as ViewLabel[]), ...STILL_LIFE_EXTRA])]
      : ALL_VIEWS
  }

  // Returns the view sequence with any user-disabled angles removed.
  // Used to determine how many image slots are active in a cluster.
  const getActiveAngles = (cluster: SessionCluster): ViewLabel[] =>
    getViewSequence(cluster).filter((a) => !disabledAngles[cluster.id]?.has(a))

  // Toggles an angle pill on/off for a cluster.
  // When an angle is disabled, it's removed from the active sequence and images are
  // relabelled to match — so the angle assignment stays in sync with what's visible.
  const toggleAngle = (clusterId: string, angle: ViewLabel) => {
    setDisabledAngles((prev) => {
      const current = new Set(prev[clusterId] ?? [])
      if (current.has(angle)) current.delete(angle)
      else current.add(angle)
      const next = { ...prev, [clusterId]: current }
      const clusterObj = clusters.find((c) => c.id === clusterId)
      const seq = clusterObj ? getViewSequence(clusterObj) : DEFAULT_VIEW_SEQUENCE
      const activeAngles = seq.filter((a) => !current.has(a))
      relabelCluster(clusterId, activeAngles)
      return next
    })
  }
  const { rules: marketplaceRules } = useMarketplaceRules()
  const activeTemplate = activeBrand?.naming_template || '{BRAND}_{SEQ}_{VIEW}'
  const [showExportPanel, setShowExportPanel] = useState(false)

  const getMissingViewsForCluster = (cluster: SessionCluster, marketplace: MarketplaceName) => {
    // Still life shoots have different angle requirements per category — don't apply clothing rules
    if (shootType === 'still-life') return []
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
    if (isReady && searchParams.get('export') === '1') {
      setShowExportPanel(true)
    }
  }, [isReady, searchParams])

  // Auto-match clusters to the imported style list on first load.
  // If any image filename in a cluster contains the style code (case-insensitive),
  // the SKU and product name are assigned automatically. Colour is only set if not
  // already detected. Clusters that already have a SKU are skipped.
  useEffect(() => {
    if (!isReady || !styleList.length) return
    clusters.forEach((cluster) => {
      if (cluster.sku) return // already has a SKU, don't overwrite
      const filenames = cluster.images.map((img) => img.filename.toUpperCase())

      // Find all XLSX entries whose SKU appears in any of this cluster's filenames
      const candidates = styleList.filter((entry) =>
        filenames.some((fn) => fn.includes(entry.sku))
      )
      if (!candidates.length) return

      // When multiple entries share the same SKU (colour variants), pick the one
      // whose colour name appears in the filename — e.g. NS27502_CACTUS.jpg → CACTUS variant
      const match = candidates.length > 1
        ? candidates.find((entry) =>
            entry.colour && filenames.some((fn) => fn.includes(entry.colour.toUpperCase()))
          ) ?? candidates[0]
        : candidates[0]

      updateClusterSku(cluster.id, match.sku, match.productName)

      // Colour priority:
      // 1. Matched XLSX entry colour (already chosen by filename match above)
      // 2. Filename keyword detection
      // 3. Leave AI-detected colour as-is
      if (match.colour) {
        updateClusterColor(cluster.id, match.colour.toUpperCase())
      } else {
        const filenameColour = cluster.images
          .map((img) => detectColourFromFilename(img.filename))
          .find((c) => c !== null) ?? null
        if (filenameColour) updateClusterColor(cluster.id, filenameColour)
      }
      if (match.colourCode) updateClusterColourCode(cluster.id, match.colourCode)
      if (match.styleNumber) updateClusterStyleNumber(cluster.id, match.styleNumber)
    })
  }, [isReady, styleList])

  // Auto-detect accessory category for uncategorised still-life clusters using GPT-4o vision.
  // Runs once when the session loads. Only fires for still-life shoots with no category set.
  useEffect(() => {
    if (!isReady || shootType !== 'still-life') return
    // Treat null AND generic 'accessories' as uncategorised — the upload page assigns
    // 'accessories' as a catch-all when the user picks Still Life → Accessories, but
    // we want AI to refine that into shoes/bags/jewellery/etc. per cluster.
    const uncategorised = clusters.filter((c) => !c.category || c.category === 'accessories')
    if (!uncategorised.length) return

    uncategorised.forEach(async (cluster) => {
      if (!cluster.images.length) return

      setDetectingCategories((prev) => new Set(prev).add(cluster.id))
      try {
        // Resize first image to 512×512 JPEG on canvas before sending.
        // Product photos can be 5–10MB — resizing keeps the payload small and
        // ensures a valid JPEG regardless of original format.
        const img = cluster.images[0]
        const base64 = await new Promise<string>((resolve, reject) => {
          const image = new Image()
          image.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 512
            canvas.height = 512
            const ctx = canvas.getContext('2d')!
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, 512, 512)
            // Centre-crop to square
            const size = Math.min(image.width, image.height)
            const sx = (image.width - size) / 2
            const sy = (image.height - size) / 2
            ctx.drawImage(image, sx, sy, size, size, 0, 0, 512, 512)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
            resolve(dataUrl.split(',')[1])
          }
          image.onerror = reject
          image.src = img.previewUrl
        })

        const res = await fetch('/api/ai/classify-accessory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: [{ base64, filename: 'image.jpg' }] }),
        })
        if (!res.ok) {
          console.warn('[classify-accessory] failed:', res.status, await res.text())
          return
        }
        const { categoryId } = await res.json()
        if (!categoryId) return

        const cat = getCategoryById(categoryId)
        if (!cat) return
        setClusterCategory(cluster.id, categoryId)
        relabelCluster(cluster.id, cat.angles as ViewLabel[])
      } catch (err) {
        console.warn('[classify-accessory] error:', err)
      } finally {
        setDetectingCategories((prev) => { const s = new Set(prev); s.delete(cluster.id); return s })
      }
    })
  }, [isReady, shootType])

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
        if (fromIdx !== -1 && toIdx !== -1) reorderImages(toClusterId, fromIdx, toIdx, getActiveAngles(cluster))
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
            <span className="text-[0.78rem] text-[var(--text3)] flex items-center gap-1">
              {confirmedCount}/{clusters.length} confirmed
              <HelpTooltip
                position="bottom"
                width={230}
                content={
                  <span>
                    Only <strong>confirmed</strong> clusters are included in the export. Enter the SKU and verify the angles, then click <strong>Confirm</strong> on each cluster — or use <strong>Confirm all</strong> to confirm everything at once.
                  </span>
                }
              />
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
              onClick={generateAllCopy}
              disabled={generatingAll}
              className="btn btn-ghost btn-sm"
              title={clusters.length > COPY_LIMIT ? `Generates copy for first ${COPY_LIMIT} clusters` : 'Generate AI copy for all clusters'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {generatingAll
                ? `Generating ${generateAllProgress.done}/${generateAllProgress.total}…`
                : `Generate all copy${clusters.length > COPY_LIMIT ? ` (first ${COPY_LIMIT})` : ''}`}
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
        <div className="w-[220px] flex-shrink-0 border-r border-[var(--line)] flex flex-col bg-[var(--bg2)]">
          <div className="px-3 pt-3 pb-2 border-b border-[var(--line)]">
            <button
              onClick={() => { reset(); router.push('/dashboard/upload') }}
              className="btn btn-ghost btn-sm w-full justify-center"
            >
              New Upload
            </button>
          </div>
          <div className="p-3 flex-1 overflow-y-auto">
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
                    {shootType === 'still-life' && (
                      detectingCategories.has(cluster.id)
                        ? <span className="text-[0.68rem] text-[var(--text3)] animate-pulse px-1">detecting…</span>
                        : <select
                            value={cluster.category ?? ''}
                            onChange={(e) => {
                              const newCatId = e.target.value || null
                              setClusterCategory(cluster.id, newCatId)
                              const newCat = newCatId ? getCategoryById(newCatId) : undefined
                              const newAngles: ViewLabel[] = newCat ? (newCat.angles as ViewLabel[]) : DEFAULT_VIEW_SEQUENCE
                              relabelCluster(cluster.id, newAngles)
                            }}
                            className="text-[0.68rem] px-[6px] py-[2px] rounded-sm border border-[var(--line2)] bg-[var(--bg4)] text-[var(--text2)] cursor-pointer"
                            title="Product category"
                          >
                            <option value="">— category —</option>
                            {ACCESSORY_CATEGORIES.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                          </select>
                    )}
                    <div className="flex-1 flex flex-wrap gap-1">
                      {(() => {
                        const activeLabels = new Set(cluster.images.map((i) => i.viewLabel))
                        const clusterDisabled = disabledAngles[cluster.id] ?? new Set()
                        const pillAngles = getViewSequence(cluster).filter(
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
                          style={{ width: 'calc(33.333% - 3px)' }}
                          title={img.filename}
                        >
                          {/* Image */}
                          <div
                            className={`aspect-[3/4] rounded-[3px] overflow-hidden relative border-2 transition-all cursor-pointer ${
                              isReorderTarget ? 'border-[var(--accent)] shadow-[0_0_0_3px_rgba(74,158,255,0.25)]'
                              : isSelected ? 'border-[var(--accent)] shadow-[0_0_0_3px_rgba(74,158,255,0.25)]'
                              : 'border-transparent hover:border-white/20'
                            }`}
                            onClick={() => toggleSelect(img.id, cluster.id)}
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
                                {getSelectableViews(cluster).map((v) => (
                                  <option key={v} value={v} className="text-black bg-white">{getAngleDisplayName(getCategoryForCluster(cluster), v)}</option>
                                ))}
                              </select>
                            </div>
                            {/* Duplicate button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); copyImageToCluster(img.id, cluster.id) }}
                              className="absolute top-1 left-1 w-[20px] h-[20px] rounded-[3px] bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Duplicate — then drag the copy to another cluster"
                            >
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="4" y="4" width="7" height="7" rx="1"/>
                                <path d="M1 8V2a1 1 0 0 1 1-1h6"/>
                              </svg>
                            </button>
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
                    <div className="flex-1 relative">
                      {styleList.length > 0 ? (
                        <>
                          <input
                            className="input text-[0.8rem] py-[5px]"
                            placeholder="Search style list…"
                            value={skuSearchOpen === cluster.id ? (skuSearchQuery[cluster.id] ?? currentSku) : currentSku}
                            onFocus={() => { setSkuSearchOpen(cluster.id); setSkuSearchQuery((q) => ({ ...q, [cluster.id]: currentSku })) }}
                            onChange={(e) => setSkuSearchQuery((q) => ({ ...q, [cluster.id]: e.target.value }))}
                            onBlur={() => setTimeout(() => setSkuSearchOpen(null), 150)}
                            style={{ fontFamily: 'var(--font-dm-mono)' }}
                          />
                          {skuSearchOpen === cluster.id && (
                            <div className="absolute top-full left-0 right-0 mt-[2px] bg-[var(--bg)] border border-[var(--line2)] rounded-sm shadow-xl z-30 max-h-[200px] overflow-y-auto">
                              {styleList
                                .filter((e) => {
                                  const q = (skuSearchQuery[cluster.id] ?? '').toLowerCase()
                                  return !q || e.sku.toLowerCase().includes(q) || e.productName.toLowerCase().includes(q) || e.colour.toLowerCase().includes(q)
                                })
                                .slice(0, 20)
                                .map((entry, i) => (
                                  <button
                                    key={i}
                                    className="w-full text-left px-3 py-[7px] hover:bg-[var(--bg3)] transition-colors flex items-center gap-2"
                                    onMouseDown={() => {
                                      updateClusterSku(cluster.id, entry.sku, entry.productName)
                                      if (entry.colour) {
                                        const col = entry.colour.toUpperCase()
                                        updateClusterColor(cluster.id, col)
                                        // Clear stale colorInput so onBlur doesn't overwrite the new value
                                        setColorInput((s) => ({ ...s, [cluster.id]: col }))
                                      }
                                      if (entry.colourCode) updateClusterColourCode(cluster.id, entry.colourCode)
                                      if (entry.styleNumber) updateClusterStyleNumber(cluster.id, entry.styleNumber)
                                      setSkuInput((s) => ({ ...s, [cluster.id]: entry.sku }))
                                      setSkuSearchOpen(null)
                                    }}
                                  >
                                    <span className="text-[0.78rem] text-[var(--text)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{entry.sku}</span>
                                    <span className="text-[0.72rem] text-[var(--text3)] truncate flex-1">{entry.productName}</span>
                                    {entry.colour && <span className="text-[0.68rem] text-[var(--text3)] flex-shrink-0">{entry.colour}</span>}
                                  </button>
                                ))}
                              {styleList.filter((e) => {
                                const q = (skuSearchQuery[cluster.id] ?? '').toLowerCase()
                                return !q || e.sku.toLowerCase().includes(q) || e.productName.toLowerCase().includes(q) || e.colour.toLowerCase().includes(q)
                              }).length === 0 && (
                                <p className="px-3 py-2 text-[0.75rem] text-[var(--text3)]">No matches</p>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
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
                      )}
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
                    <span className="text-[0.7rem] text-[var(--text3)] flex items-center gap-1">
                      Colour
                      <HelpTooltip
                        position="top"
                        width={220}
                        content={
                          <span>
                            The colour name used in exported filenames — e.g. <strong>NAVY</strong>, <strong>BLACK</strong>.<br /><br />
                            Auto-filled from your style list if a match is found. Can also be detected from the filename itself.
                          </span>
                        }
                      />
                    </span>
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

                  {/* Colour code + style number */}
                  <div className="px-3 pb-[8px] flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[0.68rem] text-[var(--text3)]">Colour code</span>
                      <input
                        className="input text-[0.72rem] py-[2px] w-[64px]"
                        style={{ fontFamily: 'var(--font-dm-mono)' }}
                        placeholder="062"
                        value={colourCodeInput[cluster.id] ?? cluster.colourCode}
                        onChange={(e) => setColourCodeInput((s) => ({ ...s, [cluster.id]: e.target.value.toUpperCase() }))}
                        onBlur={() => {
                          const val = (colourCodeInput[cluster.id] ?? cluster.colourCode).trim().toUpperCase()
                          updateClusterColourCode(cluster.id, val)
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[0.68rem] text-[var(--text3)]">Style #</span>
                      <input
                        className="input text-[0.72rem] py-[2px] w-[80px]"
                        style={{ fontFamily: 'var(--font-dm-mono)' }}
                        placeholder="05324"
                        value={styleNumberInput[cluster.id] ?? cluster.styleNumber}
                        onChange={(e) => setStyleNumberInput((s) => ({ ...s, [cluster.id]: e.target.value.toUpperCase() }))}
                        onBlur={() => {
                          const val = (styleNumberInput[cluster.id] ?? cluster.styleNumber).trim().toUpperCase()
                          updateClusterStyleNumber(cluster.id, val)
                        }}
                      />
                    </div>
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

                  {/* ── AI Product Copy ── */}
                  {(() => {
                    const copy = clusterCopy[cluster.id]
                    const isOpen = copy?.open ?? false
                    return (
                      <div className="border-t border-[var(--line)]">
                        {/* Toggle header */}
                        <button
                          className="w-full flex items-center gap-2 px-3 py-[8px] text-left hover:bg-[var(--bg3)] transition-colors"
                          onClick={() => setClusterCopy((prev) => ({
                            ...prev,
                            [cluster.id]: { ...(prev[cluster.id] ?? { title: '', description: '', bullets: [], loading: false }), open: !isOpen },
                          }))}
                        >
                          <svg viewBox="0 0 16 16" fill="none" width="12" height="12" stroke="none">
                            <path d="M8 1l1.4 3.2L13 5.2l-2.4 2.3.6 3.3L8 9.2l-3.2 1.6.6-3.3L3 5.2l3.6-.9L8 1z" fill="var(--accent4)" opacity="0.9"/>
                          </svg>
                          <span className="text-[0.72rem] font-medium text-[var(--text2)] flex-1">AI Product Copy</span>
                          {copy?.title && !isOpen && (
                            <span className="text-[0.65rem] text-[var(--text3)] truncate max-w-[140px]">{copy.title}</span>
                          )}
                          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10"
                            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s', flexShrink: 0, color: 'var(--text3)' }}>
                            <path d="M2 3.5l3 3 3-3" strokeLinecap="round"/>
                          </svg>
                        </button>

                        {isOpen && (
                          <div className="px-3 pb-3 flex flex-col gap-[10px]">
                            {copy?.loading ? (
                              <div className="flex items-center justify-center gap-2 py-4">
                                <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--accent4)" strokeWidth="2">
                                  <circle cx="6.5" cy="6.5" r="4.5" strokeDasharray="18 8"/>
                                </svg>
                                <span className="text-[0.72rem] text-[var(--text3)]">Generating copy…</span>
                              </div>
                            ) : copy?.title ? (
                              <>
                                <div>
                                  <label className="text-[0.63rem] font-medium text-[var(--text3)] uppercase tracking-wide block mb-[4px]">Title</label>
                                  <input
                                    className="input text-[0.78rem] py-[5px]"
                                    value={copy.title}
                                    onChange={(e) => setClusterCopy((prev) => ({ ...prev, [cluster.id]: { ...prev[cluster.id], title: e.target.value } }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-[0.63rem] font-medium text-[var(--text3)] uppercase tracking-wide block mb-[4px]">Description</label>
                                  <textarea
                                    className="input text-[0.78rem] py-[5px] resize-none"
                                    rows={3}
                                    value={copy.description}
                                    onChange={(e) => setClusterCopy((prev) => ({ ...prev, [cluster.id]: { ...prev[cluster.id], description: e.target.value } }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-[0.63rem] font-medium text-[var(--text3)] uppercase tracking-wide block mb-[4px]">Bullet Points</label>
                                  <div className="flex flex-col gap-[5px]">
                                    {copy.bullets.map((bullet, i) => (
                                      <div key={i} className="flex items-center gap-[6px]">
                                        <span className="text-[var(--text3)] text-[0.8rem] flex-shrink-0">·</span>
                                        <input
                                          className="input text-[0.78rem] py-[4px] flex-1"
                                          value={bullet}
                                          onChange={(e) => {
                                            const next = [...copy.bullets]
                                            next[i] = e.target.value
                                            setClusterCopy((prev) => ({ ...prev, [cluster.id]: { ...prev[cluster.id], bullets: next } }))
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <button
                                  onClick={() => generateCopy(cluster)}
                                  className="flex items-center gap-1 text-[0.7rem] text-[var(--text3)] hover:text-[var(--text2)] transition-colors self-start"
                                >
                                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.5 2A5.5 5.5 0 1 0 10.5 10"/>
                                    <path d="M10.5 5V2H7.5"/>
                                  </svg>
                                  Regenerate
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => generateCopy(cluster)}
                                className="btn btn-ghost btn-sm w-full justify-center gap-[6px]"
                              >
                                <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                                  <path d="M8 1l1.4 3.2L13 5.2l-2.4 2.3.6 3.3L8 9.2l-3.2 1.6.6-3.3L3 5.2l3.6-.9L8 1z" fill="var(--accent4)" opacity="0.9"/>
                                </svg>
                                Generate with AI
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
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
          namingTemplate={activeTemplate}
          clusterCopy={clusterCopy}
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
  namingTemplate,
  clusterCopy,
  onClose,
}: {
  jobName: string
  clusters: SessionCluster[]
  activeBrand: Brand | null
  marketplaces: MarketplaceName[]
  marketplaceRules: EditableRules
  namingTemplate: string
  clusterCopy: Record<string, { title: string; description: string; bullets: string[]; loading: boolean; open: boolean }>
  onClose: () => void
}) {
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<MarketplaceName[]>(
    marketplaces.length > 0 ? marketplaces : []
  )
  const [localTemplate, setLocalTemplate] = useState(namingTemplate || '{BRAND}_{SEQ}_{VIEW}')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
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
  const [flatExport, setFlatExport] = useState(false)

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

  const saveTemplateAsDefault = async () => {
    if (!activeBrand?.id || !localTemplate.trim()) return
    setSavingTemplate(true)
    try {
      const { data: { session } } = await import('@/lib/supabase/client').then(({ createClient }) => createClient().auth.getSession())
      await fetch(`/api/brands/${activeBrand.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ naming_template: localTemplate.trim() }),
      })
      setTemplateSaved(true)
      setTimeout(() => setTemplateSaved(false), 2500)
    } catch { /* non-critical */ }
    setSavingTemplate(false)
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
        const copy = clusterCopy[cluster.id]
        return {
          sku: cluster.sku || cluster.label,
          images,
          ...(copy?.title ? { copy: { title: copy.title, description: copy.description, bullets: copy.bullets } } : {}),
        }
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

    const sourceImageCount = confirmedClusters.reduce((s, c) => s + c.images.length, 0)
    const totalImages = sourceImageCount * selectedMarketplaces.length
    let doneCount = 0
    setProgress({ done: 0, total: totalImages, phase: 'Processing images…' })

    const CONCURRENCY = 6
    const brandCode = activeBrand?.brand_code ?? 'BRAND'
    const supplierCode = ''
    const season = ''
    const copyClusters = confirmedClusters.filter((c) => clusterCopy[c.id]?.title)

    // Helper: build the task list for a marketplace (shared by both paths)
    type ExportTask = { cluster: typeof confirmedClusters[0]; seq: number; img: typeof confirmedClusters[0]['images'][0]; imgIdx: number; folderName: string }
    const buildTasks = (template: string): ExportTask[] => {
      const tasks: ExportTask[] = []
      for (let clusterIdx = 0; clusterIdx < confirmedClusters.length; clusterIdx++) {
        const cluster = confirmedClusters[clusterIdx]
        const seq = clusterIdx + 1
        const folderName = applyNamingTemplate(
          template.replace(/_{VIEW}/g, '').replace(/_{INDEX}/g, '').replace(/_{ANGLE}/g, '').replace(/_{ANGLE_NUMBER}/g, ''),
          { brand: brandCode, seq, sku: cluster.sku, color: cluster.color, view: '', index: 0, supplierCode, season, styleNumber: cluster.styleNumber, colourCode: cluster.colourCode }
        ).replace(/_+$/, '') || `${brandCode}_${String(seq).padStart(3, '0')}`
        const gmPosition = activeBrand?.gm_position ?? 'last'
        const sortedImages = [...cluster.images].sort((a, b) => {
          const aIsGM = a.viewLabel === 'ghost-mannequin'
          const bIsGM = b.viewLabel === 'ghost-mannequin'
          if (aIsGM && !bIsGM) return gmPosition === 'first' ? -1 : 1
          if (!aIsGM && bIsGM) return gmPosition === 'first' ? 1 : -1
          return 0
        })
        for (let imgIdx = 0; imgIdx < sortedImages.length; imgIdx++) {
          tasks.push({ cluster, seq, img: sortedImages[imgIdx], imgIdx, folderName })
        }
      }
      return tasks
    }

    if (exportMode === 'folder' && folderRef.current) {
      // ── Folder export: write directly to disk, one image at a time ──────────
      // No ZIP ever built — memory stays flat regardless of job size.
      const rootHandle = folderRef.current

      for (const marketplace of selectedMarketplaces) {
        const rule = marketplaceRules[marketplace] ?? MARKETPLACE_RULES[marketplace]
        const template = rule.naming_template || localTemplate || '{BRAND}_{SEQ}_{VIEW}'
        // Always create the marketplace folder — flatExport only skips SKU subfolders
        const mpHandle = await rootHandle.getDirectoryHandle(rule.name.replace(/\s+/g, '_'), { create: true })
        const tasks = buildTasks(template)

        for (let i = 0; i < tasks.length; i += CONCURRENCY) {
          await Promise.all(tasks.slice(i, i + CONCURRENCY).map(async ({ cluster, seq, img, imgIdx, folderName }) => {
            try {
              const buffer = await processImageOnCanvas(
                img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0,
              )
              const filename = applyNamingTemplate(template, {
                brand: brandCode, seq, sku: cluster.sku, color: cluster.color,
                view: img.viewLabel, index: imgIdx + 1, supplierCode, season,
                styleNumber: cluster.styleNumber, colourCode: cluster.colourCode,
              }) + '.jpg'
              const dirHandle = flatExport ? mpHandle : await mpHandle.getDirectoryHandle(folderName, { create: true })
              const fh = await dirHandle.getFileHandle(filename, { create: true })
              const writable = await fh.createWritable()
              await writable.write(buffer)
              await writable.close()
            } catch (err) {
              console.warn(`Export skipped: ${img.filename}`, err)
            }
            doneCount++
            setProgress({ done: doneCount, total: totalImages, phase: `${rule.name} · ${doneCount}/${totalImages}` })
          }))
        }
      }

      // Write CSV directly to the folder root
      if (copyClusters.length > 0) {
        setProgress((p) => ({ ...p, phase: 'Writing CSV…' }))
        const headers = ['SKU', 'Product Name', 'Colour', 'Title', 'Description', 'Bullet 1', 'Bullet 2', 'Bullet 3', 'Bullet 4', 'Bullet 5']
        const rows = copyClusters.map((c) => {
          const copy = clusterCopy[c.id]
          return [c.sku, c.productName, c.color, copy.title, copy.description, ...copy.bullets]
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',')
        })
        const csvFh = await rootHandle.getFileHandle('product_copy.csv', { create: true })
        const csvWritable = await csvFh.createWritable()
        await csvWritable.write([headers.join(','), ...rows].join('\n'))
        await csvWritable.close()
      }

    } else {
      // ── ZIP download: batch by 2 marketplaces when job exceeds safe memory limit ──
      const SAFE_OUTPUT_LIMIT = 1200
      const marketplacesPerBatch = sourceImageCount * selectedMarketplaces.length > SAFE_OUTPUT_LIMIT
        ? 2
        : selectedMarketplaces.length
      const batches: MarketplaceName[][] = []
      for (let i = 0; i < selectedMarketplaces.length; i += marketplacesPerBatch) {
        batches.push(selectedMarketplaces.slice(i, i + marketplacesPerBatch) as MarketplaceName[])
      }

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()

        for (const marketplace of batches[batchIdx]) {
          const rule = marketplaceRules[marketplace] ?? MARKETPLACE_RULES[marketplace]
          const template = rule.naming_template || localTemplate || '{BRAND}_{SEQ}_{VIEW}'
          const marketplaceFolder = zip.folder(rule.name.replace(/\s+/g, '_'))!
          const tasks = buildTasks(template)

          for (let i = 0; i < tasks.length; i += CONCURRENCY) {
            await Promise.all(tasks.slice(i, i + CONCURRENCY).map(async ({ cluster, seq, img, imgIdx, folderName }) => {
              try {
                const buffer = await processImageOnCanvas(
                  img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                  rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0,
                )
                const filename = applyNamingTemplate(template, {
                  brand: brandCode, seq, sku: cluster.sku, color: cluster.color,
                  view: img.viewLabel, index: imgIdx + 1, supplierCode, season,
                  styleNumber: cluster.styleNumber, colourCode: cluster.colourCode,
                }) + '.jpg'
                marketplaceFolder.file(flatExport ? filename : `${folderName}/${filename}`, buffer)
              } catch (err) {
                console.warn(`Export skipped: ${img.filename}`, err)
              }
              doneCount++
              const batchLabel = batches.length > 1 ? `Part ${batchIdx + 1}/${batches.length} · ` : ''
              setProgress({ done: doneCount, total: totalImages, phase: `${batchLabel}${rule.name} · ${doneCount}/${totalImages}` })
            }))
          }
        }

        // CSV goes in the first batch only
        if (batchIdx === 0 && copyClusters.length > 0) {
          const headers = ['SKU', 'Product Name', 'Colour', 'Title', 'Description', 'Bullet 1', 'Bullet 2', 'Bullet 3', 'Bullet 4', 'Bullet 5']
          const rows = copyClusters.map((c) => {
            const copy = clusterCopy[c.id]
            return [c.sku, c.productName, c.color, copy.title, copy.description, ...copy.bullets]
              .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
              .join(',')
          })
          zip.file('product_copy.csv', [headers.join(','), ...rows].join('\n'))
        }

        const batchSuffix = batches.length > 1 ? `_part${batchIdx + 1}of${batches.length}` : ''
        setProgress((p) => ({ ...p, phase: batches.length > 1 ? `Building ZIP ${batchIdx + 1} of ${batches.length}…` : 'Building ZIP…' }))
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${jobName || 'export'}${batchSuffix}.zip`
        a.click()
        URL.revokeObjectURL(url)

        // Let browser GC the old ZIP before starting the next batch
        if (batchIdx < batches.length - 1) await new Promise((r) => setTimeout(r, 800))
      }
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

          {/* Marketplaces — editable here so users can fix missed selections */}
          <div>
            <p className="text-[0.75rem] text-[var(--text2)] mb-2 font-medium">Marketplaces</p>
            {selectedMarketplaces.length === 0 && (
              <p className="text-[0.72rem] text-[var(--accent3)] mb-2">Select at least one marketplace to export.</p>
            )}
            <MarketplaceSelector selected={selectedMarketplaces} onChange={setSelectedMarketplaces} />
          </div>

          {/* Output mode */}
          <div>
            <p className="text-[0.75rem] text-[var(--text2)] mb-2 font-medium">Output</p>
            <div className="inline-flex bg-[var(--bg3)] p-[3px] rounded-sm gap-[2px]">
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
              <p className="text-[0.7rem] text-[var(--text3)] mt-[5px] mb-3">Chrome and Edge only — not supported in Safari or Firefox</p>
            )}
            {exportMode === 'zip' && <div className="mb-3" />}

            {/* Flat export toggle */}
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <div
                onClick={() => setFlatExport((v) => !v)}
                className="relative w-[36px] h-[20px] rounded-full transition-colors cursor-pointer flex-shrink-0"
                style={{ background: flatExport ? 'var(--accent)' : 'var(--bg4)' }}
              >
                <span
                  className="absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: flatExport ? '18px' : '2px' }}
                />
              </div>
              <span className="text-[0.78rem] text-[var(--text2)]">Flat export <span className="text-[var(--text3)]">— all images in one folder per marketplace</span></span>
            </label>

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

          {/* Naming template — editable per-export, with save-as-default */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[0.75rem] text-[var(--text2)] font-medium">File Naming Template</p>
              {activeBrand && (
                <button
                  onClick={saveTemplateAsDefault}
                  disabled={savingTemplate || localTemplate === namingTemplate}
                  className="text-[0.7rem] text-[var(--accent)] hover:underline disabled:opacity-40 disabled:no-underline transition-opacity"
                >
                  {templateSaved ? '✓ Saved as default' : savingTemplate ? 'Saving…' : 'Save as default'}
                </button>
              )}
            </div>
            <input
              className="input w-full"
              style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '0.78rem' }}
              value={localTemplate}
              onChange={(e) => setLocalTemplate(e.target.value)}
              placeholder="{BRAND}_{SEQ}_{VIEW}"
            />
            <p className="text-[0.68rem] text-[var(--text3)] mt-1">
              Tokens: {['{BRAND}','{SKU}','{COLOR}','{VIEW}','{SEQ}','{INDEX}','{STYLE_NUMBER}','{COLOUR_CODE}'].map(t => (
                <code key={t} className="mx-[2px]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{t}</code>
              ))}
            </p>
            {selectedMarketplaces.some((m) => (marketplaceRules[m] ?? MARKETPLACE_RULES[m]).naming_locked) && (
              <div className="mt-2 flex flex-col gap-[3px]">
                {selectedMarketplaces.filter((m) => (marketplaceRules[m] ?? MARKETPLACE_RULES[m]).naming_locked).map((m) => {
                  const rule = marketplaceRules[m] ?? MARKETPLACE_RULES[m]
                  return (
                    <p key={m} className="text-[0.68rem]" style={{ color: '#ff9f0a' }}>
                      ⚠ {rule.name} uses a platform-mandated format (<code style={{ fontFamily: 'var(--font-dm-mono)' }}>{rule.naming_template}</code>) and ignores the template above.
                    </p>
                  )
                })}
              </div>
            )}
          </div>

          {/* Output structure preview — uses localTemplate + real cluster data */}
          {confirmedClusters.length > 0 && selectedMarketplaces.length > 0 && (
            <div className="bg-[var(--bg3)] border border-[var(--line)] rounded-sm px-3 py-3 text-[0.72rem]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
              <p className="text-[var(--text3)] mb-1">Output structure preview:</p>
              {selectedMarketplaces.slice(0, 2).map((m) => {
                const rule = marketplaceRules[m] ?? MARKETPLACE_RULES[m]
                const template = rule.naming_template || localTemplate || '{BRAND}_{SEQ}_{VIEW}'
                const mpFolder = rule.name.replace(/\s+/g, '_')
                const brandCode = activeBrand?.brand_code ?? 'BRAND'
                return (
                  <div key={m} className="mb-2">
                    <span className="text-[var(--accent)]">{mpFolder}/</span>
                    {flatExport ? (
                      <>
                        {confirmedClusters.slice(0, 3).map((c, ci) => {
                          const firstView = c.images[0]?.viewLabel ?? 'front'
                          const filename = applyNamingTemplate(template, {
                            brand: brandCode, seq: ci + 1, sku: c.sku, color: c.color,
                            view: firstView, index: 1, supplierCode: '', season: '',
                            styleNumber: c.styleNumber, colourCode: c.colourCode,
                          }) + '.jpg'
                          return <div key={c.id} className="pl-3 text-[var(--text3)]">└─ {filename}</div>
                        })}
                        {confirmedClusters.length > 3 && (
                          <div className="pl-3 text-[var(--text3)]">└─ ({confirmedClusters.length - 3} more files)</div>
                        )}
                      </>
                    ) : (
                      <>
                        {confirmedClusters.slice(0, 2).map((c, ci) => {
                          const fName = applyNamingTemplate(
                            template.replace(/_{VIEW}/g, '').replace(/_{INDEX}/g, '').replace(/_{ANGLE}/g, '').replace(/_{ANGLE_NUMBER}/g, ''),
                            { brand: brandCode, seq: ci + 1, sku: c.sku, color: c.color, view: '', index: 0, supplierCode: '', season: '', styleNumber: c.styleNumber, colourCode: c.colourCode }
                          ).replace(/_+$/, '') || `${brandCode}_${String(ci + 1).padStart(3, '0')}`
                          const firstView = c.images[0]?.viewLabel ?? 'front'
                          const firstFile = applyNamingTemplate(template, {
                            brand: brandCode, seq: ci + 1, sku: c.sku, color: c.color,
                            view: firstView, index: 1, supplierCode: '', season: '',
                            styleNumber: c.styleNumber, colourCode: c.colourCode,
                          }) + '.jpg'
                          return (
                            <div key={c.id} className="pl-3 text-[var(--text3)]">
                              └─ <span className="text-[var(--text2)]">{fName}/</span>{firstFile} …
                            </div>
                          )
                        })}
                        {confirmedClusters.length > 2 && (
                          <div className="pl-3 text-[var(--text3)]">└─ ({confirmedClusters.length - 2} more folders)</div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
              {selectedMarketplaces.length > 2 && (
                <p className="text-[var(--text3)] mt-1">+ {selectedMarketplaces.length - 2} more marketplace{selectedMarketplaces.length - 2 !== 1 ? 's' : ''}</p>
              )}
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
// Resizes, crops, and encodes a single image to the target marketplace dimensions.
// Returns an ArrayBuffer (JPEG bytes) ready to be added to the ZIP.
//
// Key behaviours:
// - Center crop: trims the image to the target aspect ratio before scaling
// - Multi-step downscaling: halves dimensions iteratively until within 2× of target,
//   then does a final draw. This prevents the blurry result you get from a single
//   large-to-small canvas drawImage call.
// - imageSmoothingQuality = 'high' on all canvas contexts for sharpest output
// - Optional file size cap: if maxFileSizeKb > 0, binary-searches JPEG quality
//   downwards (up to 6 iterations) until the output fits within the cap

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
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

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
      currentCtx.imageSmoothingEnabled = true
      currentCtx.imageSmoothingQuality = 'high'
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
        stepCtx.imageSmoothingEnabled = true
        stepCtx.imageSmoothingQuality = 'high'
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
