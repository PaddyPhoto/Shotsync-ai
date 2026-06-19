'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
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
import { GARMENT_CATEGORIES } from '@/lib/garment-categories'
import { angleDisplayName } from '@/lib/angle-utils'
import { processImageOnCanvas, preCompressImage, PLAIN_BG_VIEWS } from '@/lib/export/image-processing'

const BOTTOMWEAR_CATEGORY_LABELS = new Set([
  'Mens Pants', 'Mens Shorts', 'Mens Swimwear',
  'Womens Pants', 'Womens Skirts', 'Womens Shorts', 'Womens Swimwear',
])
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { ClusterTour, useClusterTour } from '@/components/onboarding/ClusterTour'
import { MarketplaceSelector } from '@/components/export/MarketplaceSelector'
import { ExportView } from '@/components/export/ExportView'
import type { ViewLabel, MarketplaceName } from '@/types'
import type { SessionCluster } from '@/store/session'
import type { Brand } from '@/lib/brands'

const ALL_VIEWS: ViewLabel[] = ['front', 'back', 'side', 'detail', 'mood', 'mood-2', 'mood-3', 'full-length', 'full-length-side', 'full-length-back', 'front-3/4', 'back-3/4']

const VIEW_CLS: Record<ViewLabel, string> = {
  front:                'shot-front',
  back:                 'shot-back',
  side:                 'shot-side',
  detail:               'shot-detail',
  mood:                 'shot-mood',
  'mood-2':             'shot-mood',
  'mood-3':             'shot-mood',
  'full-length':        'shot-full-length',
  'full-length-side':   'shot-side',
  'full-length-back':   'shot-back',
  'ghost-mannequin':    'shot-gm',
  'flat-lay':           'shot-flat',
  'top-down':           'shot-topdown',
  'inside':             'shot-inside',
  'front-3/4':          'shot-threequarter',
  'back-3/4':           'shot-threequarter',
  unknown:              'shot-unknown',
}

const PILL_SHORT: Partial<Record<ViewLabel | 'unknown', string>> = {
  'full-length':      'FL',
  'full-length-side': 'FL·S',
  'full-length-back': 'FL·B',
  'front-3/4':        '¾F',
  'back-3/4':         '¾B',
  'ghost-mannequin':  'GM',
  'flat-lay':         'Flat',
  'top-down':         'Top',
  'mood-2':           'Mood 2',
  'mood-3':           'Mood 3',
}

// ReviewPage uses useSearchParams() which requires a Suspense boundary in Next.js App Router.
// Generates a medium-resolution blob URL from a File for lightbox display.
// Caps the longer dimension at maxPx, preserving aspect ratio.
async function generateMediumRes(file: File, maxPx = 2800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const src = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(src)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => {
        if (blob) resolve(URL.createObjectURL(blob))
        else reject(new Error('toBlob failed'))
      }, 'image/jpeg', 0.92)
    }
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('load failed')) }
    img.src = src
  })
}

// The wrapper is the default export; the actual page logic lives in ReviewPage below.
export default function ReviewPageWrapper() {
  return <Suspense><ReviewPage /></Suspense>
}

function ReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeBrand } = useBrand()
  const {
    jobName, clusters, marketplaces: sessionMarketplaces, shootType, angleSequence, isReady,
    useStyleList, styleList,
    setSession,
    moveImage, copyImageToCluster, mergeCluster, splitImages, splitAndReflow, reorderImages, relabelCluster, setClusterGarmentCategory,
    updateClusterSku, updateClusterColor, updateClusterColourCode, updateClusterStyleNumber, setClusterCopyText,
    setClusterCategory, setClusterBottomwear, setImageViewLabel, confirmCluster, unconfirmCluster, setClusterIncomplete, setAllConfirmed, deleteCluster, deleteConfirmedClusters, deleteImages, undo, reset,
    setClusterProduct,
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
  // Tracks clusters where a product-match result was just selected via mouse click,
  // so the blur handler doesn't overwrite the match with the raw search query.
  const skuMatchJustApplied = useRef<Set<string>>(new Set())
  const [skuSearchOpen, setSkuSearchOpen] = useState<string | null>(null)
  const [skuSearchQuery, setSkuSearchQuery] = useState<Record<string, string>>({})
  const [skuSearchResults, setSkuSearchResults] = useState<Record<string, ProductMatch[]>>({})
  const skuSearchTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [disabledAngles, setDisabledAngles] = useState<Record<string, Set<ViewLabel>>>({})
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const lightboxUrlCache = useRef<Map<string, string>>(new Map())
  const [mergeMenuOpen, setMergeMenuOpen] = useState<string | null>(null)

  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set())
  const [detectingCategories, setDetectingCategories] = useState<Set<string>>(new Set())
  const { active: tourActive, startTour, stopTour } = useClusterTour()

  const [clusterCopy, setClusterCopy] = useState<Record<string, {
    title: string; description: string; bullets: string[]; loading: boolean; open: boolean; error?: string
  }>>({})
  const [generatingAll, setGeneratingAll] = useState(false)
  const [generateAllProgress, setGenerateAllProgress] = useState({ done: 0, total: 0, failed: 0 })
  const generateAllCancel = useRef(false)
  const currentCopyAbort = useRef<AbortController | null>(null)

  type ProductMatch = {
    productId: string
    productTitle: string
    sku: string
    listings: { id: string; name: string; code: string | null; rrp: number | null }[]
    attributes: Record<string, string>
    gender: string | null
    season: string | null
    category: string | null
  }
  const [productMatchMap, setProductMatchMap] = useState<Record<string, ProductMatch>>({})
  const [linkingClusters, setLinkingClusters] = useState<Set<string>>(new Set())

  const COPY_LIMIT = 200

  const generateAllCopy = async () => {
    // Generate in the same ascending order the clusters are displayed in, so copy
    // visibly fills in cluster 1, 2, 3… rather than jumping around.
    const labelNum = (s: string) => parseInt(s?.match(/\d+/)?.[0] ?? '0', 10)
    const targets = [...clusters]
      .sort((a, b) => labelNum(a.label) - labelNum(b.label))
      .filter((c) => !clusterCopy[c.id]?.title)
      .slice(0, COPY_LIMIT)
    if (targets.length === 0) return
    generateAllCancel.current = false
    setGeneratingAll(true)
    setGenerateAllProgress({ done: 0, total: targets.length, failed: 0 })
    let failed = 0
    for (let i = 0; i < targets.length; i++) {
      if (generateAllCancel.current) break
      const ok = await generateCopy(targets[i])
      if (!ok) failed++
      setGenerateAllProgress({ done: i + 1, total: targets.length, failed })
      if (generateAllCancel.current) break
      // Small gap between requests to avoid hitting OpenAI RPM limits
      if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 500))
    }
    setGeneratingAll(false)
    setGenerateAllProgress({ done: 0, total: 0, failed: 0 })
  }

  const stopGenerateAll = () => {
    generateAllCancel.current = true
    currentCopyAbort.current?.abort()
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

    const pMatch = productMatchMap[cluster.sku?.toUpperCase() ?? '']
    const pAttr = pMatch?.attributes ?? {}
    const matchedCw = pMatch?.listings.find((c) => c.id === cluster.listingId) ?? pMatch?.listings[0]
    const controller = new AbortController()
    currentCopyAbort.current = controller
    try {
      const res = await fetch('/api/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          sku: cluster.sku,
          productName: cluster.productName,
          color: cluster.color || '',
          brandName: activeBrand?.name ?? '',
          angles,
          heroImage,
          composition: pAttr.composition ?? '',
          care: pAttr.care ?? '',
          fit: pAttr.fit ?? '',
          length: pAttr.length ?? '',
          rrp: matchedCw?.rrp ? String(matchedCw.rrp) : '',
          season: pMatch?.season ?? '',
          occasion: pAttr.occasion ?? '',
          gender: pMatch?.gender ?? '',
          category: pMatch?.category ?? '',
          subCategory: pAttr.sub_category ?? '',
          origin: pAttr.origin ?? '',
          sizeRange: pAttr.size_range ?? '',
          voiceBrief: activeBrand?.voice_brief ?? '',
          copyExamples: activeBrand?.copy_examples ?? [],
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
      const aiTitle = (data.title as string) ?? ''
      setClusterCopy((prev) => ({
        ...prev,
        [cluster.id]: { title: aiTitle, description: (data.description as string) ?? '', bullets: Array.isArray(data.bullets) ? data.bullets as string[] : [], loading: false, open: true, error: undefined },
      }))
      // Persist AI copy to session store so it survives page refreshes and is available
      // as a fallback in Shopify/Cin7 pushes even if clusterCopy state is cleared.
      if (aiTitle) updateClusterSku(cluster.id, cluster.sku, aiTitle)
      const aiDescription = (data.description as string) ?? ''
      const aiBullets = Array.isArray(data.bullets) ? data.bullets as string[] : []
      if (aiDescription || aiBullets.length) setClusterCopyText(cluster.id, aiDescription, aiBullets)

      // Write copy back to the product colourway record in Supabase
      if (cluster.productId && cluster.listingId && (aiTitle || aiDescription)) {
        import('@/lib/supabase/client').then(({ createClient }) =>
          createClient().auth.getSession()
        ).then(({ data: { session } }) => {
          if (!session) return
          fetch(`/api/products/${cluster.productId}/listings/${cluster.listingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              ...(aiTitle ? { listing_title: aiTitle } : {}),
              ...(aiDescription ? { listing_description: aiDescription } : {}),
              ...(aiBullets.length ? { listing_bullets: aiBullets } : {}),
            }),
          })
        }).catch(() => { /* non-critical */ })
      }

      return true
    } catch (err) {
      // Cancelled via the Stop button — collapse quietly without flagging an error.
      if (err instanceof DOMException && err.name === 'AbortError') {
        setClusterCopy((prev) => ({
          ...prev,
          [cluster.id]: { ...(prev[cluster.id] ?? { title: '', description: '', bullets: [] }), loading: false, open: false },
        }))
        return false
      }
      const errMsg = err instanceof Error ? err.message : 'Network error'
      setClusterCopy((prev) => ({
        ...prev,
        [cluster.id]: { ...(prev[cluster.id] ?? { title: '', description: '', bullets: [] }), loading: false, open: true, error: errMsg },
      }))
      return false
    }
  }

  // Rehydrate the AI-copy panel from persisted cluster fields so generated copy
  // survives a page reload / browser restart — description + bullets are saved on
  // the cluster, and the title lives in productName once copy has been generated.
  useEffect(() => {
    setClusterCopy((prev) => {
      let changed = false
      const next = { ...prev }
      for (const c of clusters) {
        if (prev[c.id]) continue // keep live UI state (generated or being edited)
        const hasCopy = (c.copyDescription?.length ?? 0) > 0 || (c.copyBullets?.length ?? 0) > 0
        if (hasCopy) {
          next[c.id] = {
            title: c.productName ?? '',
            description: c.copyDescription ?? '',
            bullets: c.copyBullets ?? [],
            loading: false,
            open: false,
          }
          changed = true
        }
      }
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters])

  const DEFAULT_VIEW_SEQUENCE: ViewLabel[] = ['full-length', 'front', 'side', 'mood', 'detail', 'back', 'mood-2', 'mood-3', 'full-length-side', 'full-length-back']
  const STILL_LIFE_EXTRA: ViewLabel[] = ['front', 'back', 'side', 'detail', 'top-down', 'inside', 'front-3/4', 'back-3/4', 'unknown']

  // Returns the ordered angle sequence for a cluster.
  // For still-life with a known category, uses that category's defined angle order.
  // For on-model (or unknown category), uses the default clothing sequence.
  const getViewSequence = (cluster: SessionCluster): ViewLabel[] => {
    const cat = getCategoryForCluster(cluster)
    if (cat) return cat.angles as ViewLabel[]
    return angleSequence.length > 0 ? angleSequence : DEFAULT_VIEW_SEQUENCE
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
  const { rules: marketplaceRules } = useMarketplaceRules(activeBrand?.id)

  const activeTemplate = '{SKU}_{VIEW}'
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

  // removed: no longer redirect to upload when no session — show empty state instead

  // Auto-restore the draft session from IndexedDB if Zustand state was lost (e.g. after a page refresh).
  useEffect(() => {
    if (isReady) return
    import('@/lib/session-store').then(({ loadSession }) =>
      loadSession('draft')
    ).then((result) => {
      if (result && result.clusters.length > 0) {
        setSession(result.jobName, result.clusters, result.marketplaces)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isReady && searchParams.get('export') === '1') {
      setShowExportPanel(true)
    }
  }, [isReady, searchParams])

  // Fetch product matches for all cluster SKUs from the DB once the session is ready.
  // Populates productMatchMap with attributes, colourways, gender, season etc.
  // On load: match cluster SKUs against product data and back-fill fields.
  // If useStyleList is on, matches against the uploaded CSV. Otherwise hits the product DB.
  useEffect(() => {
    if (!isReady) return
    const skus = [...new Set(clusters.filter((c) => c.sku).map((c) => c.sku.trim().toUpperCase()))]
    if (!skus.length) return

    if (useStyleList && styleList.length > 0) {
      // CSV mode — build a match map from the style list entries
      const csvMatches: Record<string, ProductMatch> = {}
      for (const entry of styleList) {
        if (!entry.sku) continue
        csvMatches[entry.sku] = {
          productId: '',
          productTitle: entry.sku,
          sku: entry.sku,
          listings: entry.color ? [{ id: entry.sku, name: entry.color, code: entry.colourCode ?? null, rrp: null }] : [],
          attributes: { ...(entry.styleNumber ? { style_number: entry.styleNumber } : {}) },
          gender: entry.gender ?? null,
          season: entry.season ?? null,
          category: entry.category ?? null,
        }
      }
      setProductMatchMap(csvMatches)
      clusters.forEach((cluster) => {
        if (!cluster.sku) return
        const match = csvMatches[cluster.sku.trim().toUpperCase()]
        if (!match) return
        if (match.attributes?.style_number && !cluster.styleNumber) updateClusterStyleNumber(cluster.id, match.attributes.style_number)
        const cw = match.listings[0] ?? null
        if (cw?.code && !cluster.colourCode) updateClusterColourCode(cluster.id, cw.code)
        if (cw?.name && !cluster.color) updateClusterColor(cluster.id, cw.name)
      })
      return
    }

    // DB mode
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) => {
      if (!session) return null
      return fetch('/api/products/match-skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ skus }),
      }).then((r) => r.json())
    }).then((result) => {
      if (!result?.matches) return
      setProductMatchMap(result.matches)
      clusters.forEach((cluster) => {
        if (!cluster.sku) return
        const match = result.matches[cluster.sku.trim().toUpperCase()]
        if (!match) return
        if (match.attributes?.style_number && !cluster.styleNumber) updateClusterStyleNumber(cluster.id, match.attributes.style_number)
        const matchedCw = match.listings[0] ?? null
        if (matchedCw?.code && !cluster.colourCode) updateClusterColourCode(cluster.id, matchedCw.code)
        if (matchedCw?.name && !cluster.color) updateClusterColor(cluster.id, matchedCw.name)
        if (matchedCw && !cluster.productId) {
          saveClusterToProduct(cluster, match.productId, matchedCw.id)
        }
      })
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady])

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

  // Auto-save clusters back to the 'draft' IDB session whenever they change,
  // so resuming always restores the latest edits (SKUs, confirmations, colours).
  useEffect(() => {
    if (!isReady || clusters.length === 0) return
    const timer = setTimeout(() => {
      import('@/lib/session-store').then(({ saveSession }) =>
        saveSession('draft', jobName || 'Untitled Job', clusters, sessionMarketplaces, activeBrand?.id ?? null)
      ).catch(() => {})
    }, 1500)
    return () => clearTimeout(timer)
  }, [clusters, isReady]) // eslint-disable-line react-hooks/exhaustive-deps

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

      if (e.key === ' ') {
        e.preventDefault()
        setLightboxImageId((current) => {
          if (current) return null
          if (selectedImages.size === 1) return Array.from(selectedImages)[0]
          return null
        })
      }

      if (e.key === 'Escape') {
        setLightboxImageId(null)
        setSelectedImages(new Set())
        setSelectedCluster(null)
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setLightboxImageId((current) => {
          if (!current) return current
          const allImages = clusters.flatMap((c) => c.images)
          const idx = allImages.findIndex((img) => img.id === current)
          if (idx === -1) return current
          const next = e.key === 'ArrowLeft' ? allImages[idx - 1] : allImages[idx + 1]
          return next ? next.id : current
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImages, deleteImages, undo, clusters])

  useEffect(() => {
    const handleSelectCluster = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      if (!id) return
      setExpandedCluster(id)
      setTimeout(() => document.getElementById(`cluster-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
    window.addEventListener('shotsync:select-cluster', handleSelectCluster)
    return () => window.removeEventListener('shotsync:select-cluster', handleSelectCluster)
  }, [])

  // On-demand medium-res generation for lightbox — show thumbnail immediately,
  // then upgrade to ~1400px as soon as the canvas render is done.
  useEffect(() => {
    if (!lightboxImageId) { setLightboxUrl(null); return }
    const allImages = clusters.flatMap((c) => c.images)
    const img = allImages.find((i) => i.id === lightboxImageId)
    if (!img) { setLightboxUrl(null); return }

    const cached = lightboxUrlCache.current.get(lightboxImageId)
    if (cached) { setLightboxUrl(cached); return }

    // Show the 420px thumbnail immediately so there's no blank flash.
    setLightboxUrl(img.previewUrl)

    let cancelled = false
    generateMediumRes(img.file).then((url) => {
      if (cancelled) { URL.revokeObjectURL(url); return }
      lightboxUrlCache.current.set(lightboxImageId, url)
      setLightboxUrl(url)
    }).catch(() => {})

    return () => { cancelled = true }
  }, [lightboxImageId, clusters])

  // Revoke all cached medium-res URLs on unmount.
  useEffect(() => {
    const cache = lightboxUrlCache.current
    return () => { cache.forEach((url) => URL.revokeObjectURL(url)) }
  }, [])

  const confirmedCount = clusters.filter((c) => c.confirmed).length
  const linkedCount = clusters.filter((c) => c.productId).length
  const uniqueLinkedProductIds = [...new Set(clusters.filter((c) => c.productId).map((c) => c.productId!))]
  const incompleteCount = clusters.filter((c) => c.incomplete).length
  const confirmableClusters = clusters.filter((c) => !c.incomplete)

  // ── SKU input ──────────────────────────────────────────────────────────────
  const applyProductMatch = (clusterId: string, match: ProductMatch) => {
    updateClusterSku(clusterId, match.sku, match.productTitle)
    setSkuInput((s) => ({ ...s, [clusterId]: match.sku }))
    setSkuSearchQuery((q) => ({ ...q, [clusterId]: match.sku }))
    const cw = match.listings[0] ?? null
    if (cw) {
      updateClusterColor(clusterId, cw.name)
      setColorInput((s) => ({ ...s, [clusterId]: cw.name }))
      if (cw.code) {
        updateClusterColourCode(clusterId, cw.code)
        setColourCodeInput((s) => ({ ...s, [clusterId]: cw.code! }))
      }
    }
    if (match.attributes?.style_number) {
      updateClusterStyleNumber(clusterId, match.attributes.style_number)
      setStyleNumberInput((s) => ({ ...s, [clusterId]: match.attributes.style_number }))
    }
    if (match.category) {
      setClusterGarmentCategory(clusterId, match.category)
      setClusterBottomwear(clusterId, BOTTOMWEAR_CATEGORY_LABELS.has(match.category))
    }
    setProductMatchMap((prev) => ({ ...prev, [match.sku]: match }))
    skuMatchJustApplied.current.add(clusterId)
    if (cw) {
      const cluster = clusters.find((c) => c.id === clusterId)
      if (cluster) saveClusterToProduct(cluster, match.productId, cw.id)
    }
  }

  const debouncedSearch = (clusterId: string, query: string) => {
    clearTimeout(skuSearchTimerRef.current[clusterId])
    if (!query.trim()) { setSkuSearchResults((prev) => ({ ...prev, [clusterId]: [] })); return }
    skuSearchTimerRef.current[clusterId] = setTimeout(async () => {
      try {
        if (useStyleList && styleList.length > 0) {
          const q = query.trim().toUpperCase()
          const results = styleList
            .filter((e) => e.sku.startsWith(q) || e.sku.includes(q))
            .slice(0, 12)
            .map((e) => ({
              productId: '',
              productTitle: e.sku,
              sku: e.sku,
              listings: e.color ? [{ id: e.sku, name: e.color, code: e.colourCode ?? null, rrp: null }] : [],
              attributes: { ...(e.styleNumber ? { style_number: e.styleNumber } : {}) },
              gender: e.gender ?? null,
              season: e.season ?? null,
              category: e.category ?? null,
            }))
          setSkuSearchResults((prev) => ({ ...prev, [clusterId]: results }))
          return
        }
        const { createClient: createSC } = await import('@/lib/supabase/client')
        const { data: { session: sc } } = await createSC().auth.getSession()
        if (!sc) return
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${sc.access_token}` },
        })
        if (!res.ok) return
        const { data } = await res.json()
        setSkuSearchResults((prev) => ({ ...prev, [clusterId]: data ?? [] }))
      } catch { /* silent */ }
    }, 200)
  }

  // Compress a File to a base64 JPEG string at max 1400px for product image storage.
  const compressToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const src = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(src)
        const scale = Math.min(1, 1400 / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('compress failed')); return }
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(blob)
        }, 'image/jpeg', 0.82)
      }
      img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('load failed')) }
      img.src = src
    })

  // Upload cluster images to the linked product colourway in the background after confirm.
  const saveClusterToProduct = async (cluster: SessionCluster, productId: string, listingId: string) => {
    setLinkingClusters((prev) => new Set([...prev, cluster.id]))
    try {
      const { data: { session } } = await import('@/lib/supabase/client').then((m) => m.createClient().auth.getSession())
      if (!session) return
      const images = await Promise.all(
        cluster.images.map(async (img, idx) => ({
          viewLabel: img.viewLabel as string,
          sortOrder: idx,
          filename: img.filename,
          data: await compressToBase64(img.file),
        }))
      )
      await fetch(`/api/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ listingId, images }),
      })
      setClusterProduct(cluster.id, productId, listingId)
    } catch {
      // non-critical — images can be linked later from the product page
    } finally {
      setLinkingClusters((prev) => { const n = new Set(prev); n.delete(cluster.id); return n })
    }
  }

  // After confirming a cluster, attempt to link its images to the matching PIM product.
  const triggerProductLink = (clusterId: string, overrideSku?: string) => {
    const cluster = clusters.find((c) => c.id === clusterId)
    if (!cluster) return
    const sku = (overrideSku ?? skuInput[clusterId] ?? cluster.sku).trim().toUpperCase()
    const match = productMatchMap[sku]
    if (!match) return
    const cw = match.listings[0]
    if (!cw) return
    saveClusterToProduct(cluster, match.productId, cw.id)
  }

  const handleConfirm = (clusterId: string) => {
    const cluster = clusters.find((c) => c.id === clusterId)
    if (!cluster) return
    const typed = (skuInput[clusterId] ?? cluster.sku).trim().toUpperCase()
    if (typed) updateClusterSku(clusterId, typed)
    confirmCluster(clusterId)
    triggerProductLink(clusterId, typed)
  }

  const handleSkuKeyDown = (clusterId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleConfirm(clusterId)
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

  // ── Image selection ───────────────────────────────────────────────────────
  // Plain click  → select only this image (deselect all others)
  // Cmd/Ctrl     → toggle this image in/out of the current selection
  // Shift        → range-select all images between last selected and this one (same cluster)
  const handleImageClick = (e: React.MouseEvent, imageId: string, clusterId: string) => {
    setSelectedCluster(clusterId)
    if (e.metaKey || e.ctrlKey) {
      setSelectedImages((prev) => {
        const next = new Set(prev)
        if (next.has(imageId)) next.delete(imageId)
        else next.add(imageId)
        return next
      })
    } else if (e.shiftKey) {
      const clusterImages = clusters.find((c) => c.id === clusterId)?.images ?? []
      const ids = clusterImages.map((img) => img.id)
      const clickedIdx = ids.indexOf(imageId)
      const lastSelectedIdx = ids.reduce((acc, id, i) => (selectedImages.has(id) ? i : acc), -1)
      if (lastSelectedIdx === -1) {
        setSelectedImages(new Set([imageId]))
      } else {
        const [from, to] = clickedIdx < lastSelectedIdx ? [clickedIdx, lastSelectedIdx] : [lastSelectedIdx, clickedIdx]
        setSelectedImages((prev) => {
          const next = new Set(prev)
          ids.slice(from, to + 1).forEach((id) => next.add(id))
          return next
        })
      }
    } else {
      setSelectedImages((prev) => (prev.size === 1 && prev.has(imageId) ? new Set() : new Set([imageId])))
    }
  }

  // ── Move all selected images to a cluster ─────────────────────────────────
  const moveSelectedImages = (toClusterId: string) => {
    Array.from(selectedImages).forEach((id) => moveImage(id, toClusterId))
    setSelectedImages(new Set())
    setSelectedCluster(null)
  }

  if (!isReady) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', padding: '40px' }}>
      <div style={{ width: '52px', height: '52px', background: 'rgba(0,0,0,0.04)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4e4e53" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="10" rx="1"/><rect x="14" y="3" width="7" height="6" rx="1"/><rect x="14" y="13" width="7" height="8" rx="1"/>
        </svg>
      </div>
      <p style={{ fontSize: 'var(--font-lg)', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>No active job</p>
      <p style={{ fontSize: 'var(--font-md)', color: '#4e4e53', textAlign: 'center', maxWidth: '280px', lineHeight: 1.5 }}>Start a new job to build and review your product listings.</p>
      <a href="/dashboard/upload" className="btn btn-primary" style={{ marginTop: '4px' }}>New job</a>
    </div>
  )

  if (showExportPanel) return (
    <ExportView
      jobName={jobName}
      clusters={clusters}
      activeBrand={activeBrand}
      marketplaces={sessionMarketplaces as MarketplaceName[]}
      marketplaceRules={marketplaceRules}
      namingTemplate={activeTemplate}
      clusterCopy={clusterCopy}
      shootType={shootType}
      onClose={() => setShowExportPanel(false)}
      onStartNewJob={() => { reset(); router.push('/dashboard/upload') }}
      onBackToDashboard={() => { reset(); router.push('/dashboard') }}
    />
  )

  return (
    <div className="flex flex-col h-full">
      <Topbar
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: jobName || 'Review' }]}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[length:var(--font-base)] text-[var(--text3)] flex items-center gap-1">
              {confirmedCount}/{clusters.length} confirmed
              {incompleteCount > 0 && (
                <span className="text-[length:var(--font-sm)] font-medium ml-1" style={{ color: '#ff9f0a' }}>
                  · {incompleteCount} incomplete
                </span>
              )}
              <HelpTooltip
                position="bottom"
                width={250}
                content={
                  <span>
                    Only <strong>confirmed</strong> clusters are included in the export. Enter the SKU and verify the angles, then click <strong>Confirm</strong> on each cluster — or use <strong>Confirm all</strong> to confirm everything at once. Clusters marked <strong>Incomplete</strong> are skipped by Confirm all.
                  </span>
                }
              />
            </span>
            <button
              onClick={() => {
                const confirming = confirmedCount < confirmableClusters.length
                if (confirming) {
                  // Flush any typed-but-unsaved SKUs from local input state to the store
                  confirmableClusters.forEach((c) => {
                    const typed = skuInput[c.id]?.trim().toUpperCase()
                    if (typed) updateClusterSku(c.id, typed)
                  })
                }
                setAllConfirmed(confirming)
              }}
              className="btn btn-ghost btn-sm"
              title={
                confirmedCount < confirmableClusters.length
                  ? incompleteCount > 0 ? `Confirm all (skips ${incompleteCount} incomplete)` : 'Confirm all'
                  : 'Unconfirm all'
              }
            >
              {confirmedCount < confirmableClusters.length ? (
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
            {generatingAll ? (
              <div className="flex items-center gap-[6px]">
                <span className="btn btn-ghost btn-sm" style={{ pointerEvents: 'none', opacity: 0.85 }}>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Generating {generateAllProgress.done}/{generateAllProgress.total}…{generateAllProgress.failed > 0 ? ` (${generateAllProgress.failed} failed)` : ''}
                </span>
                <button
                  onClick={stopGenerateAll}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ff3b30' }}
                  title="Stop generating copy"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="8" height="8" rx="1.5"/></svg>
                  Stop
                </button>
              </div>
            ) : (
              <button
                onClick={generateAllCopy}
                className="btn btn-ghost btn-sm"
                title={clusters.length > COPY_LIMIT ? `Generates copy for first ${COPY_LIMIT} clusters` : 'Generate AI copy for all clusters'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Generate all copy{clusters.length > COPY_LIMIT ? ` (first ${COPY_LIMIT})` : ''}
              </button>
            )}
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
            {linkedCount > 0 && (
              <Link
                href="/dashboard/products"
                className="btn btn-sm flex items-center gap-[6px]"
                style={{ background: 'rgba(48,209,88,0.12)', color: '#30d158', border: '0.5px solid rgba(48,209,88,0.3)', fontWeight: 600, textDecoration: 'none' }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 6 5 9 10 3"/></svg>
                {linkedCount === clusters.length ? 'Go to Products →' : `${linkedCount} linked — Products →`}
              </Link>
            )}
            <button
              onClick={() => {
                // Flush any pending skuInput edits to session store before export
                for (const c of clusters) {
                  const pending = skuInput[c.id]?.trim().toUpperCase()
                  if (pending && pending !== c.sku) updateClusterSku(c.id, pending)
                }
                setShowExportPanel(true)
              }}
              className="btn btn-primary"
              disabled={confirmedCount === 0}
              title={confirmedCount === 0 ? 'Confirm at least one cluster to export' : undefined}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 10V2M4 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12h10" strokeLinecap="round"/>
              </svg>
              Export listings
            </button>
          </div>
        }
      />

      {tourActive && clusters.length > 0 && (
        <ClusterTour onDismiss={stopTour} />
      )}

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
                <span className="text-[length:var(--font-sm)] text-[var(--text2)]">
                  <span className="font-semibold text-[var(--accent)]">{clustersWithMissing.length} cluster{clustersWithMissing.length !== 1 ? 's' : ''}</span>
                  {' '}missing required shots for selected marketplaces
                </span>
              </div>
            )
          })()}


          {/* All-confirmed banner */}
          {confirmedCount === clusters.length && clusters.length > 0 && linkedCount > 0 && (
            <div style={{ background: 'rgba(48,209,88,0.06)', border: '0.5px solid rgba(48,209,88,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="7" stroke="#30d158" strokeWidth="1.5"/>
                <path d="M5 8l2 2 4-4" stroke="#30d158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#30d158' }}>
                  All {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} confirmed · images saved to {uniqueLinkedProductIds.length} product{uniqueLinkedProductIds.length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                  Ready to publish to channels from your product records.
                </div>
              </div>
              <Link href="/dashboard/products" style={{ padding: '8px 16px', borderRadius: '8px', background: '#30d158', color: '#000', fontSize: '13px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                Go to Products →
              </Link>
            </div>
          )}

          {/* Cluster cards */}
          <div className="grid grid-cols-3 gap-5">
            {[...clusters].sort((a, b) => {
              const n = (s: string) => parseInt(s?.match(/\d+/)?.[0] ?? '0', 10)
              return n(a.label) - n(b.label)
            }).map((cluster, clusterIdx) => {
              const isDropTarget = dragOverCluster === cluster.id && draggingFromCluster !== cluster.id
              const currentSku = skuInput[cluster.id] ?? cluster.sku

              return (
                <div
                  id={`cluster-${cluster.id}`}
                  key={cluster.id}
                  data-tour={clusterIdx === 0 ? 'cluster-card' : undefined}
                  style={{ background: '#3a3a3a' }}
                  className={`rounded-md border transition-all duration-150 overflow-hidden ${
                    cluster.incomplete
                      ? 'border-[#ff9f0a] opacity-70'
                      : cluster.confirmed
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
                    <div className="flex flex-col min-w-0 flex-shrink-0 mr-1">
                      <span className="text-[length:var(--font-base)] font-semibold text-[var(--text)] leading-tight truncate max-w-[160px]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{cluster.sku || cluster.label}</span>
                    </div>
                    {/* Garment category — tags cluster for export overrides + relabels angles if a per-category shoot sequence is configured */}
                    <select
                      value={cluster.garmentCategory ?? ''}
                      onChange={(e) => {
                        const newCat = e.target.value || null
                        setClusterGarmentCategory(cluster.id, newCat)
                        setClusterBottomwear(cluster.id, newCat ? BOTTOMWEAR_CATEGORY_LABELS.has(newCat) : false)
                        if (newCat) {
                          const catSeq = activeBrand?.category_angle_sequences?.find(
                            (s) => s.category.trim().toLowerCase() === newCat.trim().toLowerCase()
                          )
                          if (catSeq?.angles?.length) {
                            relabelCluster(cluster.id, catSeq.angles as ViewLabel[])
                          }
                        }
                      }}
                      title="Garment category — relabels angles if a per-category shoot sequence is configured in Brand Settings"
                      className="text-[length:var(--font-sm)] px-[5px] py-[1px] rounded-sm border border-[var(--line2)] bg-[var(--bg4)] text-[var(--text2)] cursor-pointer hover:border-[var(--line3)] transition-colors"
                    >
                      <option value="">— category —</option>
                      {GARMENT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.label}>{cat.label}</option>
                      ))}
                    </select>
                    {shootType === 'still-life' && (
                      detectingCategories.has(cluster.id)
                        ? <span className="text-[length:var(--font-base)] text-[var(--text3)] animate-pulse px-1">detecting…</span>
                        : <select
                            value={cluster.category ?? ''}
                            onChange={(e) => {
                              const newCatId = e.target.value || null
                              setClusterCategory(cluster.id, newCatId)
                              const newCat = newCatId ? getCategoryById(newCatId) : undefined
                              const newAngles: ViewLabel[] = newCat ? (newCat.angles as ViewLabel[]) : DEFAULT_VIEW_SEQUENCE
                              relabelCluster(cluster.id, newAngles)
                            }}
                            className="text-[length:var(--font-base)] px-[6px] py-[2px] rounded-sm border border-[var(--line2)] bg-[var(--bg4)] text-[var(--text2)] cursor-pointer"
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
                          const fullName = angleDisplayName(v)
                          const shortLabel = PILL_SHORT[v] ?? fullName
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => toggleAngle(cluster.id, v)}
                              title={isDisabled ? `Re-enable: ${fullName}` : fullName}
                              className={`shot-pill normal-case ${VIEW_CLS[v]} transition-all cursor-pointer select-none ${
                                isDisabled ? 'opacity-25 line-through' : 'hover:opacity-75'
                              }`}
                              style={{ letterSpacing: 0 }}
                            >
                              {shortLabel}
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
                            onClick={(e) => handleImageClick(e, img.id, cluster.id)}
                          >
                            <img
                              src={img.previewUrl}
                              alt={img.filename}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              draggable={false}
                            />
                            {/* Angle badge */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1 pt-3 pb-[3px]">
                              <select
                                value={img.viewLabel}
                                onChange={(e) => setImageViewLabel(img.id, cluster.id, e.target.value as ViewLabel)}
                                className="w-full bg-transparent text-white text-[length:var(--font-2xs)] font-semibold uppercase outline-none cursor-pointer"
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
                            {/* Zoom / lightbox button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setLightboxImageId(img.id) }}
                              className="absolute top-1 right-1 w-[20px] h-[20px] rounded-[3px] bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Full-size view (or select + Space)"
                            >
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                                <circle cx="5" cy="5" r="3.5"/><path d="M8 8l2.5 2.5"/>
                                <path d="M3.5 5h3M5 3.5v3"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {/* Drop zone hint — only for cross-cluster moves */}
                    {isDropTarget && draggingFromCluster !== cluster.id && (
                      <div className="w-full flex items-center justify-center py-4 border-2 border-dashed border-[var(--accent)] rounded-[3px] text-[length:var(--font-sm)] text-[var(--accent)]">
                        Drop here to move
                      </div>
                    )}
                  </div>

                  {/* SKU input + actions */}
                  <div className="px-3 pt-[10px] pb-[6px] border-t border-[var(--line)] flex items-center gap-2" data-tour={clusterIdx === 0 ? 'confirm-btn' : undefined}>
                    <div className="flex-1 relative">
                      <>
                          <input
                            className="input text-[length:var(--font-sm)] py-[5px]"
                            placeholder="SKU or product name…"
                            value={skuSearchQuery[cluster.id] ?? currentSku}
                            onFocus={() => { setSkuSearchOpen(cluster.id); setSkuSearchQuery((q) => ({ ...q, [cluster.id]: currentSku })); debouncedSearch(cluster.id, currentSku) }}
                            onChange={(e) => { setSkuSearchQuery((q) => ({ ...q, [cluster.id]: e.target.value })); debouncedSearch(cluster.id, e.target.value) }}
                            onBlur={() => {
                              const typed = (skuSearchQuery[cluster.id] ?? '').trim().toUpperCase()
                              setTimeout(() => {
                                setSkuSearchOpen(null)
                                if (skuMatchJustApplied.current.has(cluster.id)) {
                                  skuMatchJustApplied.current.delete(cluster.id)
                                  return
                                }
                                // Only update local display state — SKU commits to the store on Confirm
                                setSkuInput((s) => ({ ...s, [cluster.id]: typed }))
                              }, 150)
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { setSkuInput((s) => ({ ...s, [cluster.id]: skuSearchQuery[cluster.id] ?? currentSku })); handleConfirm(cluster.id); setSkuSearchOpen(null) } }}
                            style={{ fontFamily: 'var(--font-dm-mono)' }}
                          />
                          {skuSearchOpen === cluster.id && (skuSearchResults[cluster.id]?.length ?? 0) > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-[2px] bg-[var(--bg)] border border-[var(--line2)] rounded-sm shadow-xl z-30 max-h-[200px] overflow-y-auto">
                              {(skuSearchResults[cluster.id] ?? []).map((match, i) => (
                                <button
                                  key={i}
                                  className="w-full text-left px-3 py-[7px] hover:bg-[var(--bg3)] transition-colors flex items-center gap-2"
                                  onMouseDown={() => { applyProductMatch(cluster.id, match); setSkuSearchOpen(null) }}
                                >
                                  <span className="text-[length:var(--font-base)] text-[var(--text)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{match.sku}</span>
                                  <span className="text-[length:var(--font-base)] text-[var(--text3)] truncate flex-1">{match.productTitle}</span>
                                  {match.listings.length === 1
                                    ? <span className="text-[length:var(--font-base)] text-[var(--text3)] flex-shrink-0">{match.listings[0].name}</span>
                                    : <span className="text-[length:var(--font-xs)] text-[var(--text3)] flex-shrink-0">{match.listings.length} listings</span>
                                  }
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                    </div>
                    <button
                      onClick={() => setClusterBottomwear(cluster.id, !cluster.isBottomwear)}
                      title={cluster.isBottomwear ? 'Tagged as Bottomwear — click to switch to Topwear' : 'Tag as Bottomwear (pants, skirts, shorts) for correct {VIEW_NUM} numbering'}
                      className={`btn btn-sm flex-shrink-0 text-[length:var(--font-sm)] gap-1 ${cluster.isBottomwear ? 'btn-accent' : 'btn-ghost'}`}
                    >
                      {cluster.isBottomwear ? 'Bottoms' : 'Tops'}
                    </button>
                    {cluster.incomplete ? (
                      <button
                        onClick={() => setClusterIncomplete(cluster.id, false)}
                        title="Marked incomplete — click to unmark"
                        className="group flex items-center gap-1 flex-shrink-0 text-[length:var(--font-sm)] font-semibold px-[8px] py-[3px] rounded-[5px] border transition-colors"
                        style={{ color: '#ff9f0a', borderColor: 'rgba(255,159,10,0.35)', background: 'rgba(255,159,10,0.08)' }}
                      >
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 1v5M6 8.5h.01"/></svg>
                        <span className="group-hover:hidden">Incomplete</span>
                        <span className="hidden group-hover:inline">Unmark</span>
                      </button>
                    ) : cluster.confirmed ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {linkingClusters.has(cluster.id) ? (
                          <span className="text-[length:var(--font-xs)] text-[var(--text3)] flex items-center gap-1">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent2)', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                            linking…
                          </span>
                        ) : cluster.productId ? (
                          (() => {
                            const match = productMatchMap[cluster.sku?.toUpperCase()]
                            const cw = match?.listings.find((c) => c.id === cluster.listingId)
                            return (
                              <span
                                className="text-[length:var(--font-xs)] flex items-center gap-1 px-[6px] py-[2px] rounded-[5px]"
                                style={{ background: 'rgba(48,209,88,0.1)', color: '#30d158' }}
                                title={`Images saved to ${match?.productTitle ?? 'product'}${cw ? ` — ${cw.name}` : ''}`}
                              >
                                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 5 4.5 7.5 8 2.5"/></svg>
                                {cw ? cw.name : 'Linked'}
                              </span>
                            )
                          })()
                        ) : (() => {
                          const sku = cluster.sku?.toUpperCase()
                          const match = sku ? productMatchMap[sku] : null
                          return match ? (
                            <span className="text-[length:var(--font-xs)] text-[var(--text3)] italic">no colourway match</span>
                          ) : null
                        })()}
                        <button
                          onClick={() => unconfirmCluster(cluster.id)}
                          title="Click to unconfirm"
                          className="group text-[length:var(--font-base)] font-semibold text-[var(--accent2)] flex items-center gap-1 hover:text-[var(--text3)] transition-colors"
                        >
                          <svg className="group-hover:hidden" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 5 4.5 7.5 8 2.5"/></svg>
                          <svg className="hidden group-hover:block" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l6 6M8 2L2 8"/></svg>
                          <span className="group-hover:hidden">Confirmed</span>
                          <span className="hidden group-hover:inline">Unconfirm</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(() => {
                          const sku = (skuInput[cluster.id] ?? cluster.sku)?.trim().toUpperCase()
                          const match = sku ? productMatchMap[sku] : null
                          return match ? (
                            <span
                              className="text-[length:var(--font-xs)] flex items-center gap-1 px-[6px] py-[2px] rounded-[5px]"
                              style={{ background: 'rgba(48,209,88,0.06)', color: 'rgba(48,209,88,0.7)', border: '0.5px solid rgba(48,209,88,0.2)' }}
                              title={`Will link to product: ${match.productTitle}`}
                            >
                              <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 5h6M6 2.5l2.5 2.5L6 7.5"/></svg>
                              {match.productTitle}
                            </span>
                          ) : null
                        })()}
                        <button
                          onClick={() => setClusterIncomplete(cluster.id, true)}
                          title="Mark as incomplete — skips this cluster when confirming all"
                          className="btn btn-ghost btn-sm text-[length:var(--font-xs)]"
                          style={{ color: 'var(--text3)' }}
                        >
                          Incomplete
                        </button>
                        <button
                          onClick={() => handleConfirm(cluster.id)}
                          className="btn btn-primary btn-sm"
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SKU match feedback — colourway picker or no-match message */}
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
                        <span className="text-[length:var(--font-base)] text-[var(--text2)]">
                          <span className="font-medium">{ruleName}:</span>
                          {' '}missing{' '}
                          {missing.map((v, i) => (
                            <span key={v}>
                              <span className={`shot-pill ${VIEW_CLS[v as ViewLabel] ?? ''}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>{angleDisplayName(v)}</span>
                              {i < missing.length - 1 ? ' ' : ''}
                            </span>
                          ))}
                        </span>
                      </div>
                    )
                  })}

                  {/* Colour chip */}
                  <div className="px-3 pb-[8px] flex items-center gap-2">
                    <span className="text-[length:var(--font-base)] text-[var(--text3)] flex items-center gap-1">
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
                        className="input text-[length:var(--font-sm)] py-[3px] w-[110px]"
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
                        className={`flex items-center gap-1 px-2 py-[3px] rounded-sm border text-[length:var(--font-base)] transition-all ${
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
                      <span className="text-[length:var(--font-base)] text-[var(--text3)]">auto-detected</span>
                    )}
                  </div>

                  {/* Colour code + style number */}
                  <div className="px-3 pb-[8px] flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[length:var(--font-base)] text-[var(--text3)]">Colour code</span>
                      <input
                        className="input text-[length:var(--font-base)] py-[2px] w-[64px]"
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
                      <span className="text-[length:var(--font-base)] text-[var(--text3)]">Style #</span>
                      <input
                        className="input text-[length:var(--font-base)] py-[2px] w-[80px]"
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

                  {/* Listing data — product attributes from DB */}
                  {(() => {
                    const pMatch = productMatchMap[cluster.sku?.toUpperCase() ?? '']
                    const pAttr = pMatch?.attributes ?? {}
                    const matchedCw = pMatch?.listings.find((c) => c.id === cluster.listingId) ?? pMatch?.listings[0]
                    const fields = pMatch ? [
                      matchedCw?.rrp    && { label: 'RRP',         value: `$${matchedCw.rrp}` },
                      pMatch.season     && { label: 'Season',      value: pMatch.season },
                      pMatch.gender     && { label: 'Gender',      value: pMatch.gender },
                      pAttr.fit         && { label: 'Fit',         value: pAttr.fit },
                      pAttr.size_range  && { label: 'Sizes',       value: pAttr.size_range },
                      pAttr.composition && { label: 'Fabric',      value: pAttr.composition },
                      pAttr.care        && { label: 'Care',        value: pAttr.care },
                      pAttr.occasion    && { label: 'Occasion',    value: pAttr.occasion },
                      pAttr.origin      && { label: 'Origin',      value: pAttr.origin },
                      pMatch.category   && { label: 'Category',    value: pMatch.category },
                    ].filter(Boolean) as { label: string; value: string }[] : []
                    if (!fields.length) return null
                    return (
                      <div className="px-3 pb-[10px] border-t border-[var(--line)] pt-[8px]">
                        <p className="text-[length:var(--font-2xs)] text-[var(--text3)] uppercase tracking-widest mb-[6px]">Listing data</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-[5px]">
                          {fields.map(({ label, value }) => (
                            <div key={label} className="flex flex-col min-w-[60px]">
                              <span className="text-[length:var(--font-2xs)] text-[var(--text3)] uppercase tracking-wide leading-tight">{label}</span>
                              <span className="text-[length:var(--font-sm)] text-[var(--text)] leading-snug font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Merge / split actions */}
                  <div className="px-3 pb-[10px] flex items-center gap-2">
                    <span className="text-[length:var(--font-base)] text-[var(--text3)]">{cluster.images.length} images</span>
                    <div className="flex-1" />
                    {/* Split — visible when images in this cluster are selected */}
                    {Array.from(selectedImages).some((id) => cluster.images.some((img) => img.id === id)) && (
                      <button
                        onClick={() => handleSplit(cluster.id)}
                        className="text-[length:var(--font-base)] text-[var(--accent2)] hover:opacity-70 transition-opacity"
                        title="Move selected images into a new cluster"
                      >
                        Split selected
                      </button>
                    )}
                    {clusters.length > 1 && (
                      <div className="relative">
                        <button
                          className="text-[length:var(--font-base)] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
                          onClick={() => setMergeMenuOpen((prev) => prev === cluster.id ? null : cluster.id)}
                        >
                          Merge into…
                        </button>
                        {mergeMenuOpen === cluster.id && (
                          <>
                            {/* Backdrop to close on outside click */}
                            <div className="fixed inset-0 z-10" onClick={() => setMergeMenuOpen(null)} />
                            <div className="absolute bottom-full right-0 mb-1 bg-[var(--bg)] border border-[var(--line2)] rounded-[8px] shadow-xl min-w-[180px] z-20 overflow-hidden max-h-[260px] overflow-y-auto">
                              {clusters.filter((c) => c.id !== cluster.id).map((other) => (
                                <button
                                  key={other.id}
                                  onClick={() => { mergeCluster(cluster.id, other.id); setMergeMenuOpen(null) }}
                                  className="w-full text-left px-3 py-[8px] text-[length:var(--font-base)] text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)] transition-colors"
                                >
                                  {other.sku || other.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
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
                          <span className="text-[length:var(--font-base)] font-medium text-[var(--text2)] flex-1">AI Product Copy</span>
                          {copy?.title && !isOpen && (
                            <span className="text-[length:var(--font-base)] text-[var(--text3)] truncate max-w-[140px]">{copy.title}</span>
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
                                <span className="text-[length:var(--font-base)] text-[var(--text3)]">Generating copy…</span>
                              </div>
                            ) : copy?.error ? (
                              <div className="flex flex-col gap-2 py-2">
                                <p className="text-[length:var(--font-base)] text-[#ff3b30]">Failed: {copy.error}</p>
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
                                  <label className="text-[length:var(--font-base)] font-medium text-[var(--text3)] uppercase tracking-wide block mb-[4px]">Title</label>
                                  <input
                                    className="input text-[length:var(--font-base)] py-[5px]"
                                    value={copy.title}
                                    onChange={(e) => setClusterCopy((prev) => ({ ...prev, [cluster.id]: { ...prev[cluster.id], title: e.target.value } }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-[length:var(--font-base)] font-medium text-[var(--text3)] uppercase tracking-wide block mb-[4px]">Description</label>
                                  <textarea
                                    className="input text-[length:var(--font-base)] py-[5px] resize-none"
                                    rows={5}
                                    value={copy.description}
                                    onChange={(e) => setClusterCopy((prev) => ({ ...prev, [cluster.id]: { ...prev[cluster.id], description: e.target.value } }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-[length:var(--font-base)] font-medium text-[var(--text3)] uppercase tracking-wide block mb-[4px]">Bullet Points</label>
                                  <div className="flex flex-col gap-[2px]">
                                    {copy.bullets.map((bullet, i) => (
                                      <div key={i} className="flex items-start gap-[6px]">
                                        <span className="text-[var(--text3)] text-[length:var(--font-sm)] flex-shrink-0 mt-[4px]">·</span>
                                        <input
                                          className="text-[length:var(--font-base)] text-[var(--text2)] flex-1 bg-transparent border border-transparent rounded-[4px] px-[5px] py-[3px] focus:outline-none focus:border-[var(--line2)] hover:border-[var(--line2)] transition-colors leading-snug"
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
                                  className="flex items-center gap-1 text-[length:var(--font-base)] text-[var(--text3)] hover:text-[var(--text2)] transition-colors self-start"
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

                  {/* Product link footer */}
                  {cluster.productId && !linkingClusters.has(cluster.id) && (() => {
                    const sku = cluster.sku?.toUpperCase()
                    const match = sku ? productMatchMap[sku] : null
                    const cw = match?.listings.find((c) => c.id === cluster.listingId)
                    return (
                      <Link
                        href={`/dashboard/products/${cluster.productId}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderTop: '0.5px solid rgba(48,209,88,0.2)', background: 'rgba(48,209,88,0.04)', textDecoration: 'none' }}
                      >
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158', flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--font-sm)', color: '#30d158', fontWeight: 500, flex: 1 }}>
                          {match?.productTitle ?? 'Product'}{cw ? ` · ${cw.name}` : ''}
                        </span>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgba(48,209,88,0.6)' }}>View product →</span>
                      </Link>
                    )
                  })()}
                </div>
              )
            })}
          </div>
      </div>

      {/* Multi-select floating action bar */}
      {selectedImages.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-2.5 rounded-[12px] shadow-2xl"
          style={{ background: 'var(--bg)', border: '0.5px solid var(--line)', backdropFilter: 'blur(12px)' }}>
          <span className="text-[length:var(--font-sm)] font-medium text-[var(--text2)] whitespace-nowrap">
            {selectedImages.size} image{selectedImages.size !== 1 ? 's' : ''} selected
          </span>
          <div className="w-px h-4 bg-[var(--line)]" />
          <span className="text-[length:var(--font-sm)] text-[var(--text3)] whitespace-nowrap">Move to:</span>
          <select
            className="input text-[length:var(--font-sm)] py-[4px] pr-6"
            defaultValue=""
            onChange={(e) => { if (e.target.value) { moveSelectedImages(e.target.value); e.target.value = '' } }}
          >
            <option value="" disabled>Choose cluster…</option>
            {clusters.map((c, i) => (
              <option key={c.id} value={c.id}>
                {c.sku || `Cluster ${i + 1}`}
              </option>
            ))}
          </select>
          <button
            onClick={() => { setSelectedImages(new Set()); setSelectedCluster(null) }}
            className="text-[length:var(--font-sm)] text-[var(--text3)] hover:text-[var(--text)] transition-colors px-1"
            title="Clear selection (Esc)"
          >
            Clear
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImageId && (() => {
        const allImages = clusters.flatMap((c) => c.images.map((img) => ({ ...img, clusterId: c.id })))
        const currentIdx = allImages.findIndex((img) => img.id === lightboxImageId)
        const current = allImages[currentIdx]
        if (!current) return null
        const prev = currentIdx > 0 ? allImages[currentIdx - 1] : null
        const next = currentIdx < allImages.length - 1 ? allImages[currentIdx + 1] : null
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.92)' }}
            onClick={() => setLightboxImageId(null)}
          >
            {prev && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxImageId(prev.id) }}
                title="Previous image"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M11 4L6 9l5 5"/></svg>
              </button>
            )}
            <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <img
                src={lightboxUrl ?? current.previewUrl}
                alt={current.filename}
                className="max-w-full max-h-[82vh] object-contain rounded-[6px] shadow-2xl"
                style={{ userSelect: 'none' }}
              />
              <div className="flex items-center gap-3 text-[length:var(--font-base)]">
                <span className="px-2 py-0.5 rounded-[4px] bg-white/10 text-white/80 uppercase tracking-wide font-medium">{angleDisplayName(current.viewLabel)}</span>
                <span className="text-white/50 font-mono truncate max-w-[300px]">{current.filename}</span>
                <span className="text-white/30">{currentIdx + 1} / {allImages.length}</span>
              </div>
            </div>
            {next && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxImageId(next.id) }}
                title="Next image"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M7 4l5 5-5 5"/></svg>
              </button>
            )}
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              onClick={() => setLightboxImageId(null)}
              title="Close (Esc or Space)"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/25 text-[length:var(--font-sm)]">Space or Esc to close · ← → to navigate</div>
          </div>
        )
      })()}
    </div>
  )
}

