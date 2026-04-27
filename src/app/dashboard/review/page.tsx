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
import { ClusterTour, useClusterTour } from '@/components/onboarding/ClusterTour'
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
    moveImage, copyImageToCluster, mergeCluster, splitImages, splitAndReflow, reorderImages, relabelCluster,
    updateClusterSku, updateClusterColor, updateClusterColourCode, updateClusterStyleNumber,
    setClusterCategory, setImageViewLabel, confirmCluster, setAllConfirmed, deleteCluster, deleteConfirmedClusters, deleteImages, undo, reset,
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

  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set())
  const [detectingCategories, setDetectingCategories] = useState<Set<string>>(new Set())
  const { active: tourActive, startTour, stopTour } = useClusterTour()

  const [clusterCopy, setClusterCopy] = useState<Record<string, {
    title: string; description: string; bullets: string[]; loading: boolean; open: boolean; error?: string
  }>>({})
  const [generatingAll, setGeneratingAll] = useState(false)
  const [generateAllProgress, setGenerateAllProgress] = useState({ done: 0, total: 0, failed: 0 })

  const COPY_LIMIT = 200

  const generateAllCopy = async () => {
    const targets = clusters.filter((c) => !clusterCopy[c.id]?.title).slice(0, COPY_LIMIT)
    if (targets.length === 0) return
    setGeneratingAll(true)
    setGenerateAllProgress({ done: 0, total: targets.length, failed: 0 })
    let failed = 0
    for (let i = 0; i < targets.length; i++) {
      const ok = await generateCopy(targets[i])
      if (!ok) failed++
      setGenerateAllProgress({ done: i + 1, total: targets.length, failed })
      // Small gap between requests to avoid hitting OpenAI RPM limits
      if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 500))
    }
    setGeneratingAll(false)
    setGenerateAllProgress({ done: 0, total: 0, failed: 0 })
  }

  const generateCopy = async (cluster: SessionCluster): Promise<boolean> => {
    const angles = [...new Set(cluster.images.map((img) => img.viewLabel).filter(Boolean))]
    setClusterCopy((prev) => ({
      ...prev,
      [cluster.id]: { ...(prev[cluster.id] ?? { title: '', description: '', bullets: [] }), loading: true, open: true, error: undefined },
    }))

    // Convert the hero (front) image to a compressed JPEG base64 for GPT-4o vision.
    // Images are resized to max 1024px on the long edge and re-encoded at 0.7 quality
    // to keep the payload well under Next.js/Vercel's 4MB body limit.
    let heroImage: string | undefined
    const heroImg = cluster.images.find((img) => img.viewLabel === 'front') ?? cluster.images[0]
    if (heroImg?.previewUrl) {
      try {
        heroImage = await new Promise<string>((resolve, reject) => {
          fetch(heroImg.previewUrl)
            .then((r) => r.blob())
            .then((blob) => {
              const img = new Image()
              img.onload = () => {
                const MAX = 1024
                const scale = Math.min(1, MAX / Math.max(img.width, img.height))
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.width * scale)
                canvas.height = Math.round(img.height * scale)
                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
                resolve(dataUrl.split(',')[1])
              }
              img.onerror = reject
              img.src = URL.createObjectURL(blob)
            })
            .catch(reject)
        })
      } catch { /* proceed without image */ }
    }

    const styleEntry = styleList.find((e) => e.sku.toUpperCase() === cluster.sku.toUpperCase())
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
          composition: styleEntry?.composition ?? '',
          care: styleEntry?.care ?? '',
          fit: styleEntry?.fit ?? '',
          rrp: styleEntry?.rrp ?? '',
          season: styleEntry?.season ?? '',
          occasion: styleEntry?.occasion ?? '',
          gender: styleEntry?.gender ?? '',
          category: styleEntry?.category ?? '',
          origin: styleEntry?.origin ?? '',
          sizeRange: styleEntry?.sizeRange ?? '',
        }),
      })
      // Read as text first — if the server returns a non-JSON error page (e.g. 413 "Request Entity
      // Too Large") calling res.json() directly would throw a misleading SyntaxError.
      const text = await res.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(text) } catch { /* non-JSON response */ }

      if (!res.ok) {
        const errMsg = (data.error as string) ?? `Server error ${res.status}`
        setClusterCopy((prev) => ({
          ...prev,
          [cluster.id]: { ...(prev[cluster.id] ?? { title: '', description: '', bullets: [] }), loading: false, open: true, error: errMsg },
        }))
        return false
      }
      setClusterCopy((prev) => ({
        ...prev,
        [cluster.id]: { title: (data.title as string) ?? '', description: (data.description as string) ?? '', bullets: Array.isArray(data.bullets) ? data.bullets as string[] : [], loading: false, open: true, error: undefined },
      }))
      return true
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error'
      setClusterCopy((prev) => ({
        ...prev,
        [cluster.id]: { ...(prev[cluster.id] ?? { title: '', description: '', bullets: [] }), loading: false, open: true, error: errMsg },
      }))
      return false
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
  const [confirmDeleteConfirmed, setConfirmDeleteConfirmed] = useState(false)

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
      const tag = (e.target as HTMLElement).tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (isTyping) return
        e.preventDefault()
        undo()
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImages.size > 0) {
        if (isTyping) return
        deleteImages(Array.from(selectedImages))
        setSelectedImages(new Set())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImages, deleteImages, undo])

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
            {confirmedCount > 0 && (
              confirmDeleteConfirmed ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      deleteConfirmedClusters()
                      setConfirmDeleteConfirmed(false)
                    }}
                    className="btn btn-sm"
                    style={{ background: 'rgba(255,59,48,0.1)', color: '#ff3b30', border: '0.5px solid rgba(255,59,48,0.25)' }}
                  >
                    Delete {confirmedCount} confirmed?
                  </button>
                  <button
                    onClick={() => setConfirmDeleteConfirmed(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteConfirmed(true)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--accent3)' }}
                  title="Remove all confirmed clusters from this job"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h8M5 3V2h2v1M4 3v6h4V3"/>
                  </svg>
                  Delete confirmed
                </button>
              )
            )}
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
                ? `Generating ${generateAllProgress.done}/${generateAllProgress.total}…${generateAllProgress.failed > 0 ? ` (${generateAllProgress.failed} failed)` : ''}`
                : `Generate all copy${clusters.length > COPY_LIMIT ? ` (first ${COPY_LIMIT})` : ''}`}
            </button>
            <button
              onClick={startTour}
              className="btn btn-ghost btn-sm"
              title="Show quick guide"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="7" cy="7" r="6"/>
                <path d="M7 10v-.5"/>
                <path d="M7 8.5c0-1.5 2-1.5 2-3a2 2 0 1 0-4 0"/>
              </svg>
              Guide
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

      {tourActive && clusters.length > 0 && (
        <ClusterTour onDismiss={stopTour} />
      )}

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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-5">
            {clusters.map((cluster, clusterIdx) => {
              const isDropTarget = dragOverCluster === cluster.id && draggingFromCluster !== cluster.id
              const currentSku = skuInput[cluster.id] ?? cluster.sku

              return (
                <div
                  id={`cluster-${cluster.id}`}
                  key={cluster.id}
                  data-tour={clusterIdx === 0 ? 'cluster-card' : undefined}
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
                    <div className="flex-1 flex flex-wrap gap-1" data-tour={clusterIdx === 0 ? 'angle-pills' : undefined}>
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
                  <div className="p-2 flex flex-wrap gap-1" data-tour={clusterIdx === 0 ? 'cluster-images' : undefined}>
                    {cluster.images.map((img, imgPosIdx) => {
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
                          {/* Split-and-reflow button — only on images after the first */}
                          {imgPosIdx > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); splitAndReflow(cluster.id, img.id) }}
                              className="absolute -left-[1px] top-0 bottom-0 z-10 w-[18px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title={`Split cluster here — this image starts a new look, all following clusters realign`}
                            >
                              <div className="w-[3px] h-full bg-[var(--accent)] rounded-full shadow-sm" />
                              <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 bg-[var(--accent)] text-white text-[8px] font-bold px-[3px] py-[1px] rounded-[3px] whitespace-nowrap leading-tight">
                                split
                              </div>
                            </button>
                          )}
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
                  <div className="px-3 pt-[10px] pb-[6px] border-t border-[var(--line)] flex items-center gap-2" data-tour={clusterIdx === 0 ? 'confirm-btn' : undefined}>
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
                          if (val) updateClusterSku(cluster.id, val)
                          confirmCluster(cluster.id)
                        }}
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

                  {/* Product details from style sheet — collapsible */}
                  {(() => {
                    const entry = styleList.find((e) => e.sku.toUpperCase() === cluster.sku.toUpperCase())
                    const fields = entry ? [
                      entry.composition && { label: 'Composition', value: entry.composition },
                      entry.care        && { label: 'Care',        value: entry.care },
                      entry.fit         && { label: 'Fit',         value: entry.fit },
                      entry.sizeRange   && { label: 'Sizes',       value: entry.sizeRange },
                      entry.gender      && { label: 'Gender',      value: entry.gender },
                      entry.category    && { label: 'Category',    value: entry.category },
                      entry.occasion    && { label: 'Occasion',    value: entry.occasion },
                      entry.season      && { label: 'Season',      value: entry.season },
                      entry.origin      && { label: 'Origin',      value: entry.origin },
                      entry.rrp         && { label: 'RRP',         value: `$${entry.rrp}` },
                    ].filter(Boolean) as { label: string; value: string }[] : []
                    if (!fields.length) return null
                    const key = `details-${cluster.id}`
                    const open = expandedDetails.has(key)
                    return (
                      <div className="border-t border-[var(--line)]">
                        <button
                          className="w-full flex items-center justify-between px-3 py-[7px] text-left hover:bg-[var(--bg3)] transition-colors"
                          onClick={() => setExpandedDetails((prev) => {
                            const next = new Set(prev)
                            next.has(key) ? next.delete(key) : next.add(key)
                            return next
                          })}
                        >
                          <span className="text-[0.72rem] text-[var(--text3)]">Product details</span>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text3)" strokeWidth="1.5" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                            <path d="M2 3.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {open && (
                          <div className="px-3 pb-3 grid grid-cols-2 gap-x-4 gap-y-[5px]">
                            {fields.map(({ label, value }) => (
                              <div key={label} className="flex flex-col">
                                <span className="text-[0.62rem] text-[var(--text3)] uppercase tracking-wide leading-tight">{label}</span>
                                <span className="text-[0.72rem] text-[var(--text2)] leading-snug">{value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

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
                      <div className="border-t border-[var(--line)]" data-tour={clusterIdx === 0 ? 'ai-copy' : undefined}>
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
                            ) : copy?.error ? (
                              <div className="flex flex-col gap-2 py-2">
                                <p className="text-[0.72rem] text-[#ff3b30]">Failed: {copy.error}</p>
                                <button
                                  onClick={() => generateCopy(cluster)}
                                  className="btn btn-ghost btn-sm self-start gap-[6px]"
                                >
                                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.5 2A5.5 5.5 0 1 0 10.5 10"/><path d="M10.5 5V2H7.5"/>
                                  </svg>
                                  Retry
                                </button>
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
          onStartNewJob={() => { reset(); router.push('/dashboard/upload') }}
          onBackToDashboard={() => { reset(); router.push('/dashboard') }}
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
  onStartNewJob,
  onBackToDashboard,
}: {
  jobName: string
  clusters: SessionCluster[]
  activeBrand: Brand | null
  marketplaces: MarketplaceName[]
  marketplaceRules: EditableRules
  namingTemplate: string
  clusterCopy: Record<string, { title: string; description: string; bullets: string[]; loading: boolean; open: boolean }>
  onClose: () => void
  onStartNewJob: () => void
  onBackToDashboard: () => void
}) {
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<MarketplaceName[]>(
    marketplaces.length > 0 ? marketplaces : []
  )
  const [localTemplate, setLocalTemplate] = useState(namingTemplate || '{BRAND}_{SEQ}_{VIEW}')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, phase: '' })
  const [exportError, setExportError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [shopifyUploading, setShopifyUploading] = useState(false)
  const [shopifyResults, setShopifyResults] = useState<{ sku: string; status: string; adminUrl?: string; message?: string }[] | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folderRef = useRef<any>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [fsaSupported] = useState(() => typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function')
  const [exportMode, setExportMode] = useState<'zip' | 'folder' | 'dropbox' | 'google-drive' | 's3'>('zip')
  const [flatExport, setFlatExport] = useState(false)
  const [bgRemovalEnabled, setBgRemovalEnabled] = useState(true)
  const [cloudExportStatus, setCloudExportStatus] = useState<{ done: number; total: number; errors: number } | null>(null)

  const { canExportThisMonth, recordExport, openUpgrade, plan } = usePlan()
  const markClustersExported = useSession((s) => s.markClustersExported)
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
    console.log('[shopify v4] handleShopifyUpload called', { brandId: activeBrand?.id, clusters: confirmedClusters.length })
    if (!activeBrand?.id || !confirmedClusters.length) return
    setShopifyUploading(true)
    setShopifyResults(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let session: any = null
    try {
      const { createClient } = await import('@/lib/supabase/client')
      supabase = createClient()
      const { data } = await supabase.auth.getSession()
      session = data.session
      console.log('[shopify v4] session ok, user:', session?.user?.id)
    } catch (e) {
      console.error('[shopify v4] session error', e)
      setShopifyResults([{ sku: 'auth', status: 'error', message: `Auth failed: ${e instanceof Error ? e.message : e}` }])
      setShopifyUploading(false)
      return
    }

    // Use first available marketplace rule for export dimensions — same crop/quality as ZIP export
    const firstRule = Object.values(marketplaceRules)[0] ?? Object.values(MARKETPLACE_RULES)[0]
    const { width, height } = firstRule.image_dimensions
    const bgColor = firstRule.background_color ?? '#ffffff'
    const quality = (firstRule.quality ?? 100) / 100
    console.log('[shopify v4] dimensions', { width, height, bgColor, quality })

    const results: { sku: string; status: string; adminUrl?: string; message?: string }[] = []

    for (const cluster of confirmedClusters) {
      const tempPaths: string[] = []
      try {
        const images: { src: string; filename: string }[] = []

        for (let i = 0; i < cluster.images.length; i++) {
          const img = cluster.images[i]
          setShopifyResults([...results, { sku: cluster.sku || cluster.label, status: 'uploading', message: `Processing image ${i + 1}/${cluster.images.length}…` }])

          // Step 1: canvas resize
          let buffer: ArrayBuffer
          try {
            buffer = await processImageOnCanvas(img.file, width, height, bgColor, quality, 0, (firstRule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? ''))
          } catch (e) {
            throw new Error(`Canvas: ${e instanceof Error ? e.message : e}`)
          }
          const blob = new Blob([buffer], { type: 'image/jpeg' })

          // Step 2: browser → Supabase Storage
          const path = `${session?.user.id}/${Date.now()}-${cluster.id}-${i}.jpg`
          let uploadErr: { message: string } | null = null
          try {
            const res = await supabase.storage
              .from('shopify-temp')
              .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
            uploadErr = res.error
          } catch (e) {
            throw new Error(`Storage threw: ${e instanceof Error ? e.message : e}`)
          }
          if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

          tempPaths.push(path)
          const { data: { publicUrl } } = supabase.storage.from('shopify-temp').getPublicUrl(path)
          images.push({ src: publicUrl, filename: img.filename.replace(/\.[^.]+$/, '.jpg') })
        }

        // Step 3: send URL list to API route — Shopify fetches images directly from Supabase
        // Re-fetch session each cluster so we always send a fresh token — the initial
        // session.access_token can expire mid-export on large jobs (50+ clusters).
        const { data: { session: freshSession } } = await supabase.auth.getSession()
        const copy = clusterCopy[cluster.id]
        let apiRes: Response
        try {
          apiRes = await fetch('/api/shopify/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...((freshSession?.access_token ?? session?.access_token) ? { Authorization: `Bearer ${freshSession?.access_token ?? session?.access_token}` } : {}),
            },
            body: JSON.stringify({
              brand_id: activeBrand.id,
              vendor: activeBrand.name,
              clusters: [{
                sku: cluster.sku || cluster.label,
                productName: cluster.productName || cluster.sku || cluster.label,
                color: cluster.color || '',
                images,
                ...(copy?.title ? { copy: { title: copy.title, description: copy.description, bullets: copy.bullets } } : {}),
              }],
              tempPaths,
            }),
          })
        } catch (e) {
          throw new Error(`API fetch failed: ${e instanceof Error ? e.message : e}`)
        }

        const contentType = apiRes.headers.get('content-type') ?? ''
        const rawText = await apiRes.text().catch(() => '')
        let parsed: { data?: { results?: { sku: string; status: string; adminUrl?: string; message?: string }[] } } | null = null
        try {
          parsed = JSON.parse(rawText)
        } catch {
          // rawText is not JSON — will be shown as error body below
        }

        if (!apiRes.ok || !parsed) {
          const msg = parsed
            ? (parsed.data?.results?.[0]?.message ?? `HTTP ${apiRes.status}`)
            : `HTTP ${apiRes.status}: ${rawText.slice(0, 200)}`
          results.push({ sku: cluster.sku || cluster.label, status: 'error', message: msg })
          await supabase.storage.from('shopify-temp').remove(tempPaths).catch(() => {})
        } else {
          results.push(...(parsed.data?.results ?? [{ sku: cluster.sku || cluster.label, status: 'error', message: 'No response' }]))
        }
      } catch (err) {
        console.error('[shopify-upload v3] outer catch —', cluster.sku || cluster.label, err)
        results.push({ sku: cluster.sku || cluster.label, status: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
        // Clean up any temp files uploaded before the error
        if (tempPaths.length) await supabase.storage.from('shopify-temp').remove(tempPaths).catch(() => {})
      }
      setShopifyResults([...results])
    }

    setShopifyUploading(false)
  }

  const handleExport = async () => {
    if (!selectedMarketplaces.length || !confirmedClusters.length) return
    if (!canExportThisMonth()) {
      openUpgrade(`You've used all ${plan.limits.exportsPerMonth} exports this month on the Free plan. Upgrade for unlimited exports.`)
      return
    }
    setIsExporting(true)
    setDone(false)
    setExportError(null)

    const sourceImageCount = confirmedClusters.reduce((s, c) => s + c.images.length, 0)
    const totalImages = sourceImageCount * selectedMarketplaces.length
    let doneCount = 0
    setProgress({ done: 0, total: totalImages, phase: 'Processing images…' })

    const CONCURRENCY = 6
    const brandCode = activeBrand?.brand_code ?? 'BRAND'
    const supplierCode = ''
    const season = ''
    const copyClusters = confirmedClusters.filter((c) => clusterCopy[c.id]?.title)

    // ── Phase 0: parallel bg removal pre-pass ────────────────────────────────
    // Runs all Replicate calls at up to 8 concurrent BEFORE the export loops,
    // so the canvas compositing phase never blocks on individual API calls.
    const bgRemovalCache = new Map<string, Blob>() // imageId → transparent PNG
    const anyBgRemovalMarketplace = selectedMarketplaces.some(
      (m) => (marketplaceRules[m] ?? MARKETPLACE_RULES[m]).remove_background
    )
    if (bgRemovalEnabled && anyBgRemovalMarketplace) {
      const bgTasks = confirmedClusters.flatMap((c) =>
        c.images.filter((img) => PLAIN_BG_VIEWS.has(img.viewLabel ?? '')).map((img) => img)
      )
      if (bgTasks.length > 0) {
        const BG_CONCURRENCY = 8
        let bgDone = 0
        let bgPlanBlocked = false
        setProgress({ done: 0, total: bgTasks.length, phase: `Removing backgrounds 0/${bgTasks.length}…` })
        for (let i = 0; i < bgTasks.length; i += BG_CONCURRENCY) {
          if (bgPlanBlocked) break
          await Promise.all(bgTasks.slice(i, i + BG_CONCURRENCY).map(async (img) => {
            if (bgPlanBlocked) return
            try {
              const compressed = await preCompressImage(img.file)
              const fd = new FormData()
              fd.append('image', compressed, 'image.jpg')
              const res = await fetch('/api/remove-background', { method: 'POST', body: fd })
              if (res.status === 403) { bgPlanBlocked = true; return }
              if (res.ok) bgRemovalCache.set(img.id, await res.blob())
            } catch { /* cache miss — processImageOnCanvas falls back to @imgly */ }
            bgDone++
            setProgress({ done: bgDone, total: bgTasks.length, phase: `Removing backgrounds ${bgDone}/${bgTasks.length}…` })
          }))
        }
        if (bgPlanBlocked) {
          setIsExporting(false)
          setProgress(null)
          openUpgrade('Background removal is available on the Brand plan and above.')
          return
        }
        // Reset progress counter for the export phase
        doneCount = 0
        setProgress({ done: 0, total: totalImages, phase: 'Exporting…' })
      }
    }

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
            const useBgRemoval = bgRemovalEnabled && (rule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? '')
            const preRemovedBlob = useBgRemoval ? bgRemovalCache.get(img.id) : undefined
            let buffer: ArrayBuffer
            try {
              buffer = await processImageOnCanvas(
                img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0,
                useBgRemoval && !preRemovedBlob, preRemovedBlob,
              )
            } catch (err) {
              if (useBgRemoval) {
                const msg = err instanceof Error ? err.message : String(err)
                const stack = err instanceof Error && err.stack ? ` | ${err.stack.split('\n')[1]?.trim()}` : ''
                console.error('[background-removal] failed, retrying without BG removal:', err)
                setExportError(`AI background removal failed: "${msg}"${stack} — exporting without BG removal.`)
                buffer = await processImageOnCanvas(
                  img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                  rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0, false,
                )
              } else {
                const msg = err instanceof Error ? err.message : String(err)
                console.error(`Export failed: ${img.filename}`, err)
                setExportError(`${img.filename}: ${msg}`)
                doneCount++
                setProgress({ done: doneCount, total: totalImages, phase: `${rule.name} · ${doneCount}/${totalImages}` })
                return
              }
            }
            try {
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
              const msg = err instanceof Error ? err.message : String(err)
              console.error(`Export failed: ${img.filename}`, err)
              setExportError(`${img.filename}: ${msg}`)
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

    } else if (exportMode === 'zip') {
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
                const useBgRemoval = bgRemovalEnabled && (rule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? '')
                const preRemovedBlob = useBgRemoval ? bgRemovalCache.get(img.id) : undefined
                const buffer = await processImageOnCanvas(
                  img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                  rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0,
                  useBgRemoval && !preRemovedBlob, preRemovedBlob,
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
    } else if (exportMode === 'dropbox' || exportMode === 'google-drive' || exportMode === 's3') {
      // ── Cloud export: upload directly to the configured cloud destination ────
      const cloudLib = exportMode === 'dropbox'
        ? await import('@/lib/cloud/dropbox')
        : exportMode === 'google-drive'
          ? await import('@/lib/cloud/google-drive')
          : null

      // For S3: get presigned PUT URLs from server
      let s3PresignedUrls: Record<string, string> = {}
      if (exportMode === 's3') {
        const { createClient } = await import('@/lib/supabase/client')
        const { data: { session } } = await createClient().auth.getSession()
        const allKeys: string[] = []
        for (const marketplace of selectedMarketplaces) {
          const rule = marketplaceRules[marketplace] ?? MARKETPLACE_RULES[marketplace]
          const template = rule.naming_template || localTemplate || '{BRAND}_{SEQ}_{VIEW}'
          const tasks = buildTasks(template)
          for (const { cluster, seq, img, imgIdx } of tasks) {
            const filename = applyNamingTemplate(template, {
              brand: brandCode, seq, sku: cluster.sku, color: cluster.color,
              view: img.viewLabel, index: imgIdx + 1, supplierCode, season,
              styleNumber: cluster.styleNumber, colourCode: cluster.colourCode,
            }) + '.jpg'
            const mpFolder = rule.name.replace(/\s+/g, '_')
            allKeys.push(`${mpFolder}/${filename}`)
          }
        }
        const presignRes = await fetch('/api/integrations/s3/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ brandId: activeBrand?.id, keys: allKeys }),
        })
        if (presignRes.ok) {
          const { urls } = await presignRes.json()
          s3PresignedUrls = urls ?? {}
        }
      }

      // Dropbox: get access token (may need refresh)
      let dropboxToken = activeBrand?.cloud_connections?.dropbox?.access_token ?? ''
      // Google Drive: get current token from in-memory session (set during chooser) or from stored token
      let driveToken = ''
      if (exportMode === 'google-drive') {
        const { getCurrentGoogleToken } = await import('@/lib/cloud/google-drive')
        driveToken = getCurrentGoogleToken() ?? activeBrand?.cloud_connections?.google_drive?.access_token ?? ''
      }

      // Create root folder in Dropbox/Drive named after the job
      let dropboxRootPath = `/${jobName || 'ShotSync Export'}`
      let driveRootFolderId: string | undefined
      if (exportMode === 'dropbox' && cloudLib && 'ensureDropboxFolder' in cloudLib) {
        await (cloudLib as typeof import('@/lib/cloud/dropbox')).ensureDropboxFolder(dropboxToken, dropboxRootPath)
      } else if (exportMode === 'google-drive' && cloudLib && 'createDriveFolder' in cloudLib) {
        driveRootFolderId = await (cloudLib as typeof import('@/lib/cloud/google-drive')).createDriveFolder(driveToken, jobName || 'ShotSync Export')
      }

      let cloudDone = 0
      let cloudErrors = 0
      const cloudTotal = confirmedClusters.reduce((s, c) => s + c.images.length, 0) * selectedMarketplaces.length
      setCloudExportStatus({ done: 0, total: cloudTotal, errors: 0 })

      for (const marketplace of selectedMarketplaces) {
        const rule = marketplaceRules[marketplace] ?? MARKETPLACE_RULES[marketplace]
        const template = rule.naming_template || localTemplate || '{BRAND}_{SEQ}_{VIEW}'
        const mpFolderName = rule.name.replace(/\s+/g, '_')

        // Create per-marketplace subfolder
        let driveMpFolderId: string | undefined
        if (exportMode === 'dropbox' && cloudLib && 'ensureDropboxFolder' in cloudLib) {
          await (cloudLib as typeof import('@/lib/cloud/dropbox')).ensureDropboxFolder(dropboxToken, `${dropboxRootPath}/${mpFolderName}`)
        } else if (exportMode === 'google-drive' && cloudLib && 'createDriveFolder' in cloudLib) {
          driveMpFolderId = await (cloudLib as typeof import('@/lib/cloud/google-drive')).createDriveFolder(driveToken, mpFolderName, driveRootFolderId)
        }

        const tasks = buildTasks(template)
        for (let i = 0; i < tasks.length; i += CONCURRENCY) {
          await Promise.all(tasks.slice(i, i + CONCURRENCY).map(async ({ cluster, seq, img, imgIdx }) => {
            try {
              const useBgRemoval = bgRemovalEnabled && (rule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? '')
              const preRemovedBlob = useBgRemoval ? bgRemovalCache.get(img.id) : undefined
              const buffer = await processImageOnCanvas(
                img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0,
                useBgRemoval && !preRemovedBlob, preRemovedBlob,
              )
              const filename = applyNamingTemplate(template, {
                brand: brandCode, seq, sku: cluster.sku, color: cluster.color,
                view: img.viewLabel, index: imgIdx + 1, supplierCode, season,
                styleNumber: cluster.styleNumber, colourCode: cluster.colourCode,
              }) + '.jpg'

              if (exportMode === 'dropbox' && cloudLib && 'uploadToDropbox' in cloudLib) {
                await (cloudLib as typeof import('@/lib/cloud/dropbox')).uploadToDropbox(
                  dropboxToken, `${dropboxRootPath}/${mpFolderName}/${filename}`, buffer
                )
              } else if (exportMode === 'google-drive' && cloudLib && 'uploadToDrive' in cloudLib) {
                await (cloudLib as typeof import('@/lib/cloud/google-drive')).uploadToDrive(
                  driveToken, filename, buffer, driveMpFolderId
                )
              } else if (exportMode === 's3') {
                const s3Key = `${mpFolderName}/${filename}`
                const presignedUrl = s3PresignedUrls[s3Key]
                if (presignedUrl) {
                  const res = await fetch(presignedUrl, { method: 'PUT', body: buffer, headers: { 'Content-Type': 'image/jpeg' } })
                  if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`)
                }
              }
            } catch {
              cloudErrors++
            }
            cloudDone++
            setCloudExportStatus({ done: cloudDone, total: cloudTotal, errors: cloudErrors })
            doneCount++
            setProgress({ done: doneCount, total: totalImages, phase: `${rule.name} · ${doneCount}/${totalImages}` })
          }))
        }
      }
    }

    recordExport()

    // Save job to history + persist session to IndexedDB (best-effort — don't block export)
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(async ({ data: { session } }) => {
      const res = await fetch('/api/jobs/history', {
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
      if (res.ok) {
        const { data: historyRecord } = await res.json()
        if (historyRecord?.id) {
          // Persist full session so the job can be reopened without re-uploading
          // and remove the draft (job is now complete)
          import('@/lib/session-store').then(({ saveSession, deleteSession }) =>
            Promise.all([
              saveSession(historyRecord.id, jobName, confirmedClusters, selectedMarketplaces, activeBrand?.id ?? null),
              deleteSession('draft'),
            ])
          ).catch(() => { /* non-critical */ })
        }
      }
    }).catch(() => { /* non-critical */ })

    // Bill for background removal (fire-and-forget — must not block export completion)
    if (bgRemovalEnabled && anyBgRemovalMarketplace && bgRemovalCache.size > 0) {
      import('@/lib/supabase/client').then(({ createClient }) =>
        createClient().auth.getSession()
      ).then(({ data: { session } }) => {
        if (!session?.access_token) return
        fetch('/api/billing/bg-removal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ count: bgRemovalCache.size, jobName }),
        }).catch(() => { /* non-critical */ })
      }).catch(() => { /* non-critical */ })
    }

    markClustersExported(confirmedClusters.map((c) => c.id))
    setIsExporting(false)
    setDone(true)
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const totalSourceImages = confirmedClusters.reduce((s, c) => s + c.images.length, 0)
  const ANZ_MARKETPLACES: MarketplaceName[] = ['the-iconic', 'myer', 'david-jones']
  const lockedMarketplaces: MarketplaceName[] = plan.limits.marketplaces < 2 ? ANZ_MARKETPLACES : []
  const hasBgRemoval = selectedMarketplaces.some((m) => (marketplaceRules[m] ?? MARKETPLACE_RULES[m]).remove_background)
  const bgCount = confirmedClusters.reduce((n, c) => n + c.images.filter((img) => PLAIN_BG_VIEWS.has(img.viewLabel ?? '')).length, 0)
  const estBgMins = Math.max(1, Math.ceil(bgCount / 8 * 10 / 60))
  const bgCostAud = (bgCount * 0.16).toFixed(2)
  const brandCode = activeBrand?.brand_code ?? 'BRAND'
  const canUseBgRemoval = plan.limits.bgRemoval

  // ── Shared toggle component ────────────────────────────────────────────────
  const Toggle = ({ on, onToggle, label, sub }: { on: boolean; onToggle: () => void; label: string; sub?: string }) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={onToggle} className="relative w-[36px] h-[20px] rounded-full transition-colors cursor-pointer flex-shrink-0" style={{ background: on ? 'var(--accent)' : 'var(--bg4)' }}>
        <span className="absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all duration-200" style={{ left: on ? '18px' : '2px' }} />
      </div>
      <span className="text-[0.82rem] text-[var(--text2)]">{label}{sub && <span className="text-[var(--text3)] ml-1">{sub}</span>}</span>
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 h-[56px] border-b border-[var(--line)] flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[0.78rem] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to review
        </button>
        <div className="h-4 w-px bg-[var(--line2)]" />
        <h1 className="text-[0.92rem] font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
          Export{jobName ? ` · ${jobName}` : ''}
        </h1>
        {confirmedClusters.length > 0 && (
          <span className="text-[0.75rem] text-[var(--text3)]">
            {confirmedClusters.length} cluster{confirmedClusters.length !== 1 ? 's' : ''} · {totalSourceImages} images
          </span>
        )}
      </div>

      {/* ── Body: 3-column grid, no scroll ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-[420px_260px_1fr] divide-x divide-[var(--line)] overflow-hidden">

        {/* ── LEFT: Marketplaces ─────────────────────────────────────────── */}
        <div
          className="flex flex-col px-6 py-6 overflow-hidden transition-opacity duration-200"
          style={{ opacity: isExporting ? 0.3 : 1, pointerEvents: isExporting ? 'none' : 'auto' }}
        >
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <p className="text-[0.7rem] font-semibold text-[var(--text3)] uppercase tracking-wide">Marketplaces</p>
            {selectedMarketplaces.length === 0 && (
              <p className="text-[0.72rem] text-[var(--accent3)]">Select at least one</p>
            )}
          </div>
          <MarketplaceSelector
            selected={selectedMarketplaces}
            lockedMarketplaces={lockedMarketplaces}
            onLockedClick={() => openUpgrade('ANZ marketplace exports (The Iconic, Myer, David Jones) are available on the Starter plan and above.')}
            onChange={(next) => {
              if (next.length > selectedMarketplaces.length && plan.limits.marketplaces !== -1 && next.length > plan.limits.marketplaces) {
                openUpgrade(`Your plan allows up to ${plan.limits.marketplaces} marketplace${plan.limits.marketplaces !== 1 ? 's' : ''}. Upgrade to select more.`)
                return
              }
              setSelectedMarketplaces(next)
            }}
          />
        </div>

        {/* ── MIDDLE: Settings ───────────────────────────────────────────── */}
        <div
          className="flex flex-col px-5 py-6 gap-0 overflow-hidden transition-opacity duration-200"
          style={{ opacity: isExporting ? 0.3 : 1, pointerEvents: isExporting ? 'none' : 'auto' }}
        >
          {/* Output format */}
          <div className="flex-shrink-0 pb-5 border-b border-[var(--line)]">
            <p className="text-[0.7rem] font-semibold text-[var(--text3)] uppercase tracking-wide mb-3">Output format</p>
            <div className="flex flex-col gap-[2px] bg-[var(--bg3)] p-[3px] rounded-sm">
              {([
                ['zip', 'Download ZIP'],
                ['folder', 'Save to Folder'],
                ...(activeBrand?.cloud_connections?.dropbox ? [['dropbox', 'Dropbox']] : []),
                ...(activeBrand?.cloud_connections?.google_drive ? [['google-drive', 'Google Drive']] : []),
                ...(activeBrand?.cloud_connections?.s3 ? [['s3', 'AWS S3']] : []),
              ] as [string, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setExportMode(id as typeof exportMode)}
                  className={`w-full px-3 py-[6px] rounded-[4px] text-left text-[0.8rem] font-medium transition-all ${exportMode === id ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm' : 'text-[var(--text2)] hover:text-[var(--text)]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-2 min-h-[18px]">
              {exportMode === 'folder' && <p className="text-[0.72rem] text-[var(--text3)]">Chrome and Edge only</p>}
              {exportMode === 'dropbox' && <p className="text-[0.72rem] text-[var(--text3)]">→ <span className="font-medium text-[var(--text2)]">{activeBrand?.cloud_connections?.dropbox?.account_email}</span></p>}
              {exportMode === 'google-drive' && <p className="text-[0.72rem] text-[var(--text3)]">→ <span className="font-medium text-[var(--text2)]">{activeBrand?.cloud_connections?.google_drive?.email}</span></p>}
              {exportMode === 's3' && <p className="text-[0.72rem] text-[var(--text3)]">→ <span className="font-medium text-[var(--text2)]">{activeBrand?.cloud_connections?.s3?.bucket}{activeBrand?.cloud_connections?.s3?.prefix ? `/${activeBrand.cloud_connections.s3.prefix}` : ''}</span></p>}
            </div>
            {exportMode === 'folder' && (
              <div className="flex items-center gap-2 mt-2">
                <button onClick={pickFolder} disabled={!fsaSupported} className="btn btn-ghost btn-sm">Choose folder</button>
                {folderName
                  ? <span className="text-[0.75rem] text-[var(--accent2)] truncate" style={{ fontFamily: 'var(--font-dm-mono)' }}>/{folderName}</span>
                  : <span className="text-[0.72rem] text-[var(--text3)]">{fsaSupported ? 'None selected' : 'Requires Chrome/Edge'}</span>
                }
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex-shrink-0 py-5 border-b border-[var(--line)]">
            <p className="text-[0.7rem] font-semibold text-[var(--text3)] uppercase tracking-wide mb-4">Options</p>
            <div className="flex flex-col gap-4">
              <Toggle on={flatExport} onToggle={() => setFlatExport(v => !v)}
                label="Flat export" sub="All images in one folder per marketplace" />
              {hasBgRemoval && (
                canUseBgRemoval ? (
                  <Toggle on={bgRemovalEnabled} onToggle={() => setBgRemovalEnabled(v => !v)}
                    label="Background removal"
                    sub={bgRemovalEnabled
                      ? `${bgCount} images · $${bgCostAud} AUD · billed on use`
                      : 'Off · faster export'} />
                ) : (
                  <div className="flex items-center gap-3 opacity-50">
                    <div className="relative w-[36px] h-[20px] rounded-full flex-shrink-0" style={{ background: 'var(--bg4)' }}>
                      <span className="absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-white shadow" />
                    </div>
                    <span className="text-[0.82rem] text-[var(--text2)]">
                      Background removal
                      <span className="text-[var(--text3)] ml-1">— </span>
                      <button onClick={() => openUpgrade('Background removal is available on Starter and above')}
                        className="text-[0.78rem] text-[var(--accent)] hover:underline">
                        Starter plan required
                      </button>
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* File naming */}
          <div className="flex-shrink-0 pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[0.7rem] font-semibold text-[var(--text3)] uppercase tracking-wide">File naming</p>
              {activeBrand && (
                <button onClick={saveTemplateAsDefault} disabled={savingTemplate || localTemplate === namingTemplate}
                  className="text-[0.7rem] text-[var(--accent)] hover:underline disabled:opacity-40 disabled:no-underline transition-opacity">
                  {templateSaved ? '✓ Saved' : savingTemplate ? 'Saving…' : 'Save default'}
                </button>
              )}
            </div>
            <input className="input w-full mb-2" style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '0.8rem' }}
              value={localTemplate} onChange={(e) => setLocalTemplate(e.target.value)} placeholder="{BRAND}_{SEQ}_{VIEW}" />
            <p className="text-[0.67rem] text-[var(--text3)] leading-loose flex flex-wrap gap-x-1">
              {['{BRAND}','{SKU}','{COLOR}','{VIEW}','{SEQ}','{INDEX}','{STYLE_NUMBER}','{COLOUR_CODE}'].map(t => (
                <code key={t} style={{ fontFamily: 'var(--font-dm-mono)' }}>{t}</code>
              ))}
            </p>
            {selectedMarketplaces.some((m) => (marketplaceRules[m] ?? MARKETPLACE_RULES[m]).naming_locked) && (
              <div className="mt-2 flex flex-col gap-1">
                {selectedMarketplaces.filter((m) => (marketplaceRules[m] ?? MARKETPLACE_RULES[m]).naming_locked).map((m) => {
                  const rule = marketplaceRules[m] ?? MARKETPLACE_RULES[m]
                  return (
                    <p key={m} className="text-[0.67rem]" style={{ color: '#ff9f0a' }}>
                      ⚠ {rule.name} uses <code style={{ fontFamily: 'var(--font-dm-mono)' }}>{rule.naming_template}</code>
                    </p>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Summary / Progress / Done ───────────────────────────── */}
        <div className="flex flex-col px-7 py-6 overflow-hidden">

          {/* ── DONE STATE ─────────────────────────────────────────────── */}
          {done ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-[400px] mx-auto">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(62,207,142,0.12)]">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--accent2)" strokeWidth="2.5"><polyline points="5 14 11 20 23 8"/></svg>
              </div>
              <div>
                <p className="text-[1.5rem] font-semibold text-[var(--text)] leading-tight" style={{ fontFamily: 'var(--font-syne)', letterSpacing: '-.3px' }}>Job complete</p>
                <p className="text-[0.85rem] text-[var(--text3)] mt-2">
                  {totalSourceImages} images exported across {selectedMarketplaces.length} marketplace{selectedMarketplaces.length !== 1 ? 's' : ''}.
                </p>
              </div>
              {exportError && (
                <div className="text-[0.75rem] text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-left w-full">
                  <span className="font-medium">Note:</span> {exportError}
                </div>
              )}
              <div className="flex gap-3 w-full justify-center">
                <button onClick={onBackToDashboard} className="btn btn-ghost">Back to dashboard</button>
                <button onClick={onStartNewJob} className="btn btn-primary">Start new job</button>
              </div>
            </div>

          /* ── EXPORTING STATE ───────────────────────────────────────── */
          ) : isExporting ? (
            <div className="flex flex-col justify-center h-full gap-7 max-w-[520px]">
              <div>
                <p className="text-[0.72rem] text-[var(--text3)] uppercase tracking-wide font-semibold mb-2">In progress</p>
                <p className="text-[1.15rem] font-semibold text-[var(--text)] leading-snug" style={{ fontFamily: 'var(--font-syne)' }}>{progress.phase}</p>
              </div>
              <div>
                <div className="flex justify-between text-[0.8rem] mb-2">
                  <span className="text-[var(--text2)]">{progress.done} of {progress.total}</span>
                  <span style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--accent)', fontWeight: 600 }}>{pct}%</span>
                </div>
                <div className="h-[10px] bg-[var(--bg3)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
                </div>
              </div>
              {cloudExportStatus && (exportMode === 'dropbox' || exportMode === 'google-drive' || exportMode === 's3') && (
                <div className="px-4 py-3 rounded-sm bg-[var(--bg3)] border border-[var(--line)] text-[0.78rem] text-[var(--text2)]">
                  Uploading {cloudExportStatus.done} / {cloudExportStatus.total} files
                  {cloudExportStatus.errors > 0 && <span className="text-[var(--accent3)] ml-2">· {cloudExportStatus.errors} failed</span>}
                </div>
              )}
              {exportError && (
                <div className="text-[0.75rem] text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <span className="font-medium">Warning:</span> {exportError}
                </div>
              )}
            </div>

          /* ── IDLE STATE ────────────────────────────────────────────── */
          ) : (
            <div className="flex flex-col gap-5 h-full min-h-0">

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                {[
                  { label: 'Clusters', value: confirmedClusters.length },
                  { label: 'Images', value: totalSourceImages },
                  { label: 'Marketplaces', value: selectedMarketplaces.length },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[var(--bg3)] border border-[var(--line)] rounded-sm px-4 py-4">
                    <p className="text-[1.6rem] font-semibold text-[var(--text)] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>{value}</p>
                    <p className="text-[0.72rem] text-[var(--text3)] mt-1.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* BG removal estimate */}
              {hasBgRemoval && bgRemovalEnabled && canUseBgRemoval && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-sm border border-[var(--line2)] bg-[var(--bg3)] w-fit text-[0.75rem] text-[var(--text2)] flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5" strokeLinecap="round"/></svg>
                  Background removal · {bgCount} images · est. <strong className="text-[var(--text)] mx-1">~{estBgMins} min</strong> · <strong className="text-[var(--text)] ml-1">${bgCostAud} AUD</strong>&nbsp;billed on use
                </div>
              )}

              {/* Shopify — show inline when connected */}
              {activeBrand?.shopify_store_url && (
                <div className="flex-shrink-0 border border-[var(--line)] rounded-sm px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[0.85rem] font-medium text-[var(--text)]">Shopify draft listings</p>
                    <span className="text-[0.65rem] text-[var(--accent2)] bg-[rgba(62,207,142,0.1)] px-2 py-[2px] rounded-[6px]">Connected</span>
                  </div>
                  <p className="text-[0.75rem] text-[var(--text3)] mb-3 leading-relaxed">
                    Creates a draft product in Shopify for each cluster — images, SKU, colour and AI copy included.
                    {(() => { const n = confirmedClusters.filter(c => clusterCopy[c.id]?.title).length; return n > 0 ? <> <span className="text-[var(--accent2)] font-medium">AI copy ready for {n} listing{n !== 1 ? 's' : ''}.</span></> : null })()}
                  </p>
                  {shopifyResults && (
                    <div className="bg-[var(--bg3)] rounded-sm p-2.5 mb-3 flex flex-col gap-1 max-h-[100px] overflow-y-auto">
                      {shopifyResults.map((r) => (
                        <div key={r.sku} className="flex items-center justify-between text-[0.72rem]">
                          <span className="text-[var(--text2)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{r.sku}</span>
                          <span className={r.status === 'created' ? 'text-[var(--accent2)]' : r.status === 'uploading' ? 'text-[var(--text3)]' : 'text-[#ff3b30]'}>
                            {r.status === 'created' ? '✓ Draft created' : r.status === 'uploading' ? '↑ Uploading…' : `✗ ${r.message ?? 'Failed'}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={handleShopifyUpload} disabled={shopifyUploading || !confirmedClusters.length} className="btn btn-ghost btn-sm w-full justify-center">
                    {shopifyUploading
                      ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Creating drafts…</>
                      : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>Create {confirmedClusters.length} draft{confirmedClusters.length !== 1 ? 's' : ''} in Shopify</>
                    }
                  </button>
                </div>
              )}

              {/* Output preview — takes remaining vertical space */}
              {confirmedClusters.length > 0 && selectedMarketplaces.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <p className="text-[0.7rem] font-semibold text-[var(--text3)] uppercase tracking-wide mb-2 flex-shrink-0">Output preview</p>
                  <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--bg3)] border border-[var(--line)] rounded-sm px-4 py-3 text-[0.75rem]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                    {selectedMarketplaces.slice(0, 3).map((m) => {
                      const rule = marketplaceRules[m] ?? MARKETPLACE_RULES[m]
                      const template = rule.naming_template || localTemplate || '{BRAND}_{SEQ}_{VIEW}'
                      const mpFolder = rule.name.replace(/\s+/g, '_')
                      return (
                        <div key={m} className="mb-3 last:mb-0">
                          <div className="text-[var(--accent)] font-medium">{mpFolder}/</div>
                          {flatExport ? (
                            <>
                              {confirmedClusters.slice(0, 2).map((c, ci) => (
                                <div key={c.id} className="pl-4 text-[var(--text3)]">└─ {applyNamingTemplate(template, { brand: brandCode, seq: ci + 1, sku: c.sku, color: c.color, view: c.images[0]?.viewLabel ?? 'front', index: 1, supplierCode: '', season: '', styleNumber: c.styleNumber, colourCode: c.colourCode }) + '.jpg'}</div>
                              ))}
                              {confirmedClusters.length > 2 && <div className="pl-4 text-[var(--text3)]">└─ ({confirmedClusters.length - 2} more…)</div>}
                            </>
                          ) : (
                            <>
                              {confirmedClusters.slice(0, 2).map((c, ci) => {
                                const fName = applyNamingTemplate(
                                  template.replace(/_{VIEW}/g,'').replace(/_{INDEX}/g,'').replace(/_{ANGLE}/g,'').replace(/_{ANGLE_NUMBER}/g,''),
                                  { brand: brandCode, seq: ci+1, sku: c.sku, color: c.color, view: '', index: 0, supplierCode: '', season: '', styleNumber: c.styleNumber, colourCode: c.colourCode }
                                ).replace(/_+$/, '') || `${brandCode}_${String(ci+1).padStart(3,'0')}`
                                const firstFile = applyNamingTemplate(template, { brand: brandCode, seq: ci+1, sku: c.sku, color: c.color, view: c.images[0]?.viewLabel ?? 'front', index: 1, supplierCode: '', season: '', styleNumber: c.styleNumber, colourCode: c.colourCode }) + '.jpg'
                                return <div key={c.id} className="pl-4 text-[var(--text3)]">└─ <span className="text-[var(--text2)]">{fName}/</span>{firstFile} …</div>
                              })}
                              {confirmedClusters.length > 2 && <div className="pl-4 text-[var(--text3)]">└─ ({confirmedClusters.length - 2} more folders…)</div>}
                            </>
                          )}
                        </div>
                      )
                    })}
                    {selectedMarketplaces.length > 3 && <p className="text-[var(--text3)] mt-2">+ {selectedMarketplaces.length - 3} more marketplace{selectedMarketplaces.length - 3 !== 1 ? 's' : ''}</p>}
                  </div>
                </div>
              )}

              {exportError && (
                <div className="text-[0.75rem] text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex-shrink-0">
                  <span className="font-medium">Export error:</span> {exportError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer CTA ─────────────────────────────────────────────────────── */}
      {!done && (
        <div className="border-t border-[var(--line)] px-6 h-[60px] flex items-center justify-between flex-shrink-0">
          <p className="text-[0.75rem] text-[var(--text3)]">
            {confirmedClusters.length === 0
              ? 'Confirm at least one cluster to export'
              : selectedMarketplaces.length === 0
              ? 'Select at least one marketplace to continue'
              : `${totalSourceImages} image${totalSourceImages !== 1 ? 's' : ''} × ${selectedMarketplaces.length} marketplace${selectedMarketplaces.length !== 1 ? 's' : ''}`
            }
          </p>
          <div className="flex items-center gap-3">
            {!isExporting && <button onClick={onClose} className="btn btn-ghost">Cancel</button>}
            <button
              onClick={handleExport}
              disabled={isExporting || !confirmedClusters.length || !selectedMarketplaces.length || (exportMode === 'folder' && !folderRef.current)}
              className="btn btn-primary"
            >
              {isExporting
                ? <><svg className="animate-spin mr-2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Exporting…</>
                : exportMode === 'zip' ? 'Download ZIP'
                : exportMode === 'folder' ? 'Save to Folder'
                : exportMode === 'dropbox' ? 'Upload to Dropbox'
                : exportMode === 'google-drive' ? 'Upload to Drive'
                : 'Upload to S3'
              }
            </button>
          </div>
        </div>
      )}
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

// Views with plain/white backgrounds where AI removal makes sense.
// Detail, mood, flat-lay, top-down, inside shots are excluded — complex backgrounds.
const PLAIN_BG_VIEWS = new Set<string>(['front', 'back', 'side', 'mood', 'full-length', 'ghost-mannequin', 'front-3/4', 'back-3/4'])

// Resize a File to max 1500 px JPEG — keeps Replicate payloads small
async function preCompressImage(file: File): Promise<Blob> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('load failed')) }
    img.onload = () => {
      const MAX = 1500
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob((b) => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', 0.88)
    }
    img.src = url
  })
}

async function processImageOnCanvas(
  file: File, width: number, height: number, bgColor: string,
  quality = 1.0, maxFileSizeKb = 0, removeBg = false,
  preRemovedBgBlob?: Blob,  // transparent PNG already fetched from Replicate — skip API call
): Promise<ArrayBuffer> {
  // Background removal — use pre-fetched blob if available, otherwise call API with @imgly fallback
  let sourceBlob: Blob = file
  if (preRemovedBgBlob) {
    sourceBlob = preRemovedBgBlob
  } else if (removeBg) {
    try {
      const compressed = await preCompressImage(file)
      const fd = new FormData()
      fd.append('image', compressed, 'image.jpg')
      const apiRes = await fetch('/api/remove-background', { method: 'POST', body: fd })
      if (apiRes.ok) {
        sourceBlob = await apiRes.blob()
      } else if (apiRes.status === 403) {
        throw new Error('plan_upgrade_required')
      } else if (apiRes.status === 503) {
        throw new Error('not configured')
      } else {
        throw new Error(`API ${apiRes.status}`)
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'plan_upgrade_required') throw err
      console.warn('[remove-bg] server API failed, falling back to @imgly:', err)
      const { removeBackground } = await import('@imgly/background-removal')
      sourceBlob = await removeBackground(file, { output: { format: 'image/png', quality: 1 } })
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(sourceBlob)
    const img = new window.Image()
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image failed to load')) }
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
