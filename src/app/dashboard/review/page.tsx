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
    <ExportPanel
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

// ── ExportPanel ───────────────────────────────────────────────────────────────

function ExportPanel({
  jobName,
  clusters,
  activeBrand,
  marketplaces,
  marketplaceRules,
  namingTemplate,
  clusterCopy,
  shootType,
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
  shootType: string
  onClose: () => void
  onStartNewJob: () => void
  onBackToDashboard: () => void
}) {
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<MarketplaceName[]>(
    marketplaces.length > 0 ? marketplaces : []
  )
  const [localTemplate, setLocalTemplate] = useState(() => namingTemplate || '{SKU}_{VIEW}')
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, phase: '' })
  const [exportError, setExportError] = useState<string | null>(null)
  const [historySaveError, setHistorySaveError] = useState<string | null>(null)
  const [historySaved, setHistorySaved] = useState(false)
  const [done, setDone] = useState(false)
  const [shopifyUploading, setShopifyUploading] = useState(false)
  const [shopifyResults, setShopifyResults] = useState<{ sku: string; status: string; adminUrl?: string; message?: string }[] | null>(null)
  const [cin7Uploading, setCin7Uploading] = useState(false)
  const [cin7Results, setCin7Results] = useState<{ sku: string; status: string; message?: string }[] | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folderRef = useRef<any>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [fsaSupported] = useState(() => typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function')
  const [exportMode, setExportMode] = useState<'zip' | 'folder' | 'dropbox' | 'google-drive' | 's3'>('folder')
  const [flatExport, setFlatExport] = useState(false)
  const [useOriginalNames, setUseOriginalNames] = useState(false)
  const [bgRemovalEnabled, setBgRemovalEnabled] = useState(false)
  const [cloudExportStatus, setCloudExportStatus] = useState<{ done: number; total: number; errors: number } | null>(null)

  const { canExportThisMonth, recordExport, openUpgrade, plan } = usePlan()
  const markClustersExported = useSession((s) => s.markClustersExported)
  const confirmedClusters = clusters
    .filter((c) => c.confirmed)
    .sort((a, b) => parseInt(a.label?.match(/\d+/)?.[0] ?? '0', 10) - parseInt(b.label?.match(/\d+/)?.[0] ?? '0', 10))

  const pickFolder = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
      folderRef.current = handle
      setFolderName(handle.name)
    } catch { /* cancelled */ }
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
    const authHeader: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
    type ProdData = { attributes: Record<string, string>; gender?: string | null; season?: string | null; category?: string | null; listings: { id: string; rrp?: number | null }[] }
    const shopifyProductAttrMap: Record<string, ProdData> = {}
    for (const cluster of confirmedClusters) {
      if (cluster.productId && !shopifyProductAttrMap[cluster.productId]) {
        try {
          const res = await fetch(`/api/products/${cluster.productId}`, { headers: authHeader })
          if (res.ok) {
            const { data: prod } = await res.json()
            const attrs: Record<string, string> = {}
            for (const { key, value } of (prod?.product_attributes ?? [])) attrs[key] = value
            shopifyProductAttrMap[cluster.productId] = { attributes: attrs, gender: prod?.gender, season: prod?.season, category: prod?.category, listings: prod?.product_listings ?? [] }
          }
        } catch { /* no product data */ }
      }
    }

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
            buffer = await processImageOnCanvas(img.file, width, height, bgColor, quality, 0, shootType === 'still-life' && (firstRule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? ''))
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
        const sku = cluster.sku || cluster.label
        const prodDataShop = cluster.productId ? shopifyProductAttrMap[cluster.productId] : null
        const pAttr = prodDataShop?.attributes ?? {}
        const matchedCwShop = prodDataShop?.listings.find((c: { id: string }) => c.id === cluster.listingId) ?? prodDataShop?.listings[0]
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
                sku,
                productName: cluster.productName || sku,
                color: cluster.color || '',
                colourCode: cluster.colourCode || '',
                styleNumber: cluster.styleNumber || '',
                garmentCategory: cluster.garmentCategory || null,
                gmPosition: activeBrand.gm_position ?? 'last',
                images,
                ...(copy?.title || cluster.productName ? { copy: {
                  title: copy?.title || cluster.productName || '',
                  description: copy?.description || cluster.copyDescription || '',
                  bullets: copy?.bullets?.length ? copy.bullets : (cluster.copyBullets ?? []),
                } } : {}),
                ...(prodDataShop ? { styleEntry: {
                  composition: pAttr.composition,
                  care: pAttr.care,
                  fit: pAttr.fit,
                  length: pAttr.length,
                  rrp: matchedCwShop?.rrp != null ? String(matchedCwShop.rrp) : undefined,
                  season: prodDataShop.season ?? undefined,
                  occasion: pAttr.occasion,
                  gender: prodDataShop.gender ?? undefined,
                  subCategory: pAttr.sub_category,
                  origin: pAttr.origin,
                  sizeRange: pAttr.size_range,
                } } : {}),
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

  const handleCin7Upload = async () => {
    if (!activeBrand?.id || !confirmedClusters.length) return
    setCin7Uploading(true)
    setCin7Results(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let session: any = null
    try {
      const { createClient } = await import('@/lib/supabase/client')
      supabase = createClient()
      const { data } = await supabase.auth.getSession()
      session = data.session
    } catch (e) {
      setCin7Results([{ sku: 'auth', status: 'error', message: `Auth failed: ${e instanceof Error ? e.message : e}` }])
      setCin7Uploading(false)
      return
    }

    const firstRule = Object.values(marketplaceRules)[0] ?? Object.values(MARKETPLACE_RULES)[0]
    const { width, height } = firstRule.image_dimensions
    const bgColor = firstRule.background_color ?? '#ffffff'
    const quality = (firstRule.quality ?? 100) / 100
    const brandId = activeBrand.id
    const cin7AuthHeader: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
    type ProdDataCin7 = { attributes: Record<string, string>; gender?: string | null; season?: string | null; category?: string | null; listings: { id: string; rrp?: number | null }[] }
    const cin7ProductAttrMap: Record<string, ProdDataCin7> = {}
    for (const cluster of confirmedClusters) {
      if (cluster.productId && !cin7ProductAttrMap[cluster.productId]) {
        try {
          const res = await fetch(`/api/products/${cluster.productId}`, { headers: cin7AuthHeader })
          if (res.ok) {
            const { data: prod } = await res.json()
            const attrs: Record<string, string> = {}
            for (const { key, value } of (prod?.product_attributes ?? [])) attrs[key] = value
            cin7ProductAttrMap[cluster.productId] = { attributes: attrs, gender: prod?.gender, season: prod?.season, category: prod?.category, listings: prod?.product_listings ?? [] }
          }
        } catch { /* no product data */ }
      }
    }

    // Pre-allocate one result slot per cluster so parallel updates don't collide
    const results: { sku: string; status: string; message?: string }[] =
      confirmedClusters.map((c) => ({ sku: c.sku || c.label, status: 'pending' }))
    setCin7Results([...results])

    const processCluster = async (cluster: typeof confirmedClusters[0], idx: number) => {
      const sku = cluster.sku || cluster.label
      const tempPaths: string[] = []
      try {
        const images: { src: string; filename: string }[] = []

        for (let i = 0; i < cluster.images.length; i++) {
          const img = cluster.images[i]
          results[idx] = { sku, status: 'uploading', message: `${i + 1}/${cluster.images.length} images…` }
          setCin7Results([...results])

          let buffer: ArrayBuffer
          try {
            buffer = await processImageOnCanvas(img.file, width, height, bgColor, quality, 0, shootType === 'still-life' && (firstRule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? ''))
          } catch (e) {
            throw new Error(`Canvas: ${e instanceof Error ? e.message : e}`)
          }
          const blob = new Blob([buffer], { type: 'image/jpeg' })

          const path = `cin7/${session?.user.id}/${Date.now()}-${cluster.id}-${i}.jpg`
          const uploadRes = await supabase.storage
            .from('shopify-temp')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
          if (uploadRes.error) throw new Error(`Storage: ${uploadRes.error.message}`)

          tempPaths.push(path)
          const { data: { publicUrl } } = supabase.storage.from('shopify-temp').getPublicUrl(path)
          images.push({ src: publicUrl, filename: img.filename.replace(/\.[^.]+$/, '.jpg') })
        }

        const { data: { session: freshSession } } = await supabase.auth.getSession()
        const copy = clusterCopy[cluster.id]
        const prodDataCin7 = cluster.productId ? cin7ProductAttrMap[cluster.productId] : null
        const pAttrCin7 = prodDataCin7?.attributes ?? {}
        const matchedCwCin7 = prodDataCin7?.listings.find((c: { id: string }) => c.id === cluster.listingId) ?? prodDataCin7?.listings[0]

        const apiRes = await fetch('/api/cin7/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...((freshSession?.access_token ?? session?.access_token) ? { Authorization: `Bearer ${freshSession?.access_token ?? session?.access_token}` } : {}),
          },
          body: JSON.stringify({
            brand_id: brandId,
            clusters: [{
              sku,
              productName: cluster.productName || sku,
              color: cluster.color || '',
              colourCode: cluster.colourCode || '',
              styleNumber: cluster.styleNumber || '',
              garmentCategory: cluster.garmentCategory || null,
              images,
              ...(copy?.title || cluster.productName ? { copy: {
                title: copy?.title || cluster.productName || '',
                description: copy?.description || cluster.copyDescription || '',
                bullets: copy?.bullets?.length ? copy.bullets : (cluster.copyBullets ?? []),
              } } : {}),
              ...(prodDataCin7 ? { styleEntry: {
                composition: pAttrCin7.composition,
                care: pAttrCin7.care,
                fit: pAttrCin7.fit,
                length: pAttrCin7.length,
                rrp: matchedCwCin7?.rrp != null ? String(matchedCwCin7.rrp) : undefined,
                season: prodDataCin7.season ?? undefined,
                occasion: pAttrCin7.occasion,
                gender: prodDataCin7.gender ?? undefined,
                subCategory: pAttrCin7.sub_category,
                origin: pAttrCin7.origin,
                sizeRange: pAttrCin7.size_range,
              }} : {}),
            }],
            tempPaths,
          }),
        })

        const parsed = await apiRes.json().catch(() => null)
        if (!apiRes.ok || !parsed) {
          results[idx] = { sku, status: 'error', message: `HTTP ${apiRes.status}` }
          await supabase.storage.from('shopify-temp').remove(tempPaths).catch(() => {})
        } else {
          results[idx] = parsed.data?.results?.[0] ?? { sku, status: 'error', message: 'No response' }
        }
      } catch (err) {
        results[idx] = { sku, status: 'error', message: err instanceof Error ? err.message : 'Unknown error' }
        if (tempPaths.length) await supabase.storage.from('shopify-temp').remove(tempPaths).catch(() => {})
      }
      setCin7Results([...results])
    }

    // Process 4 clusters concurrently — 4× faster than sequential
    const CIN7_CONCURRENCY = 4
    for (let i = 0; i < confirmedClusters.length; i += CIN7_CONCURRENCY) {
      await Promise.all(
        confirmedClusters.slice(i, i + CIN7_CONCURRENCY).map((cluster, j) =>
          processCluster(cluster, i + j)
        )
      )
    }

    setCin7Uploading(false)
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
    setHistorySaveError(null)
    try {
      await handleExportInner()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[handleExport] unhandled exception:', err)
      setExportError(`Export failed: ${msg}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportInner = async () => {

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
          setProgress({ done: 0, total: 0, phase: '' })
          openUpgrade('Background removal is available on the Growth plan and above.')
          return
        }
        // Reset progress counter for the export phase
        doneCount = 0
        setProgress({ done: 0, total: totalImages, phase: 'Exporting…' })
      }
    }

    // Helper: build the task list for a marketplace (shared by both paths)
    type ExportTask = { cluster: typeof confirmedClusters[0]; seq: number; img: typeof confirmedClusters[0]['images'][0]; imgIdx: number; folderName: string; viewNum: number | undefined }
    const buildTasks = (template: string, rule: typeof MARKETPLACE_RULES[keyof typeof MARKETPLACE_RULES]): ExportTask[] => {
      const tasks: ExportTask[] = []
      for (let clusterIdx = 0; clusterIdx < confirmedClusters.length; clusterIdx++) {
        const cluster = confirmedClusters[clusterIdx]
        const seq = clusterIdx + 1
        const folderName = applyNamingTemplate(
          template.replace(/_{VIEW_NUM}/g, '').replace(/_{VIEW}/g, '').replace(/_{INDEX}/g, '').replace(/_{ANGLE}/g, '').replace(/_{ANGLE_NUMBER}/g, ''),
          { brand: brandCode, seq, sku: cluster.sku, color: cluster.color, view: '', index: 0, supplierCode, season, styleNumber: cluster.styleNumber, colourCode: cluster.colourCode, isBottomwear: cluster.isBottomwear ?? false }
        ).replace(/_+$/, '') || `${brandCode}_${String(seq).padStart(3, '0')}`

        // Resolve category override if one matches this cluster's garmentCategory
        const gc = cluster.garmentCategory?.trim().toLowerCase() ?? ''
        const override = gc
          ? rule.category_overrides?.find((o) => o.category.trim().toLowerCase() === gc)
          : undefined

        const baseOrder = rule.angle_order ?? []
        const angleOrder: string[] = override?.angle_order ?? baseOrder
        const excludeViews = new Set(override?.exclude_views ?? [])
        const heroView = override?.hero_view ?? null

        const gmPosition = activeBrand?.gm_position ?? 'last'
        const sortedImages = [...cluster.images]
          .filter((img) => !excludeViews.has(img.viewLabel ?? ''))
          .sort((a, b) => {
            const aIsGM = a.viewLabel === 'ghost-mannequin'
            const bIsGM = b.viewLabel === 'ghost-mannequin'
            if (aIsGM && !bIsGM) return gmPosition === 'first' ? -1 : 1
            if (!aIsGM && bIsGM) return gmPosition === 'first' ? 1 : -1
            // Hero view goes to position 0
            if (heroView) {
              if (a.viewLabel === heroView && b.viewLabel !== heroView) return -1
              if (b.viewLabel === heroView && a.viewLabel !== heroView) return 1
            }
            // Sort by angle order; unlisted angles go to the end
            const aIdx = angleOrder.indexOf(a.viewLabel ?? '')
            const bIdx = angleOrder.indexOf(b.viewLabel ?? '')
            return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
          })
        for (let imgIdx = 0; imgIdx < sortedImages.length; imgIdx++) {
          const img = sortedImages[imgIdx]
          // {VIEW_NUM} = 1-based position of this view in the user's configured angle order
          const orderIdx = angleOrder.indexOf(img.viewLabel ?? '')
          const viewNum = orderIdx >= 0 ? orderIdx + 1 : undefined
          tasks.push({ cluster, seq, img, imgIdx, folderName, viewNum })
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
        const tasks = buildTasks(template, rule)

        // Sequential writes — FSA API holds swap files open until close(), so concurrent
        // writes stack up in memory. One-at-a-time lets each file flush to disk before the next.
        for (const { cluster, seq, img, imgIdx, folderName, viewNum } of tasks) {
            if (!img.file) {
              console.warn(`[export] skipping ${img.filename} — file reference missing`)
              setExportError(`${img.filename}: file not available (try re-uploading)`)
              doneCount++
              setProgress({ done: doneCount, total: totalImages, phase: `${rule.name} · ${doneCount}/${totalImages}` })
              continue
            }
            const useBgRemoval = bgRemovalEnabled && (rule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? '')
            const preRemovedBlob = useBgRemoval ? bgRemovalCache.get(img.id) : undefined
            let buffer: ArrayBuffer | undefined
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
                try {
                  buffer = await processImageOnCanvas(
                    img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                    rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0, false,
                  )
                } catch (retryErr) {
                  const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
                  console.error(`Export retry failed: ${img.filename}`, retryErr)
                  setExportError(`${img.filename}: ${retryMsg}`)
                  doneCount++
                  setProgress({ done: doneCount, total: totalImages, phase: `${rule.name} · ${doneCount}/${totalImages}` })
                  continue
                }
              } else {
                const msg = err instanceof Error ? err.message : String(err)
                console.error(`Export failed: ${img.filename}`, err)
                setExportError(`${img.filename}: ${msg}`)
                doneCount++
                setProgress({ done: doneCount, total: totalImages, phase: `${rule.name} · ${doneCount}/${totalImages}` })
                continue
              }
            }
            if (!buffer) continue
            try {
              const filename = useOriginalNames
                ? img.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.jpg')
                : applyNamingTemplate(template, {
                    brand: brandCode, seq, sku: cluster.sku, color: cluster.color,
                    view: img.viewLabel, index: imgIdx + 1, viewNum, supplierCode, season,
                    styleNumber: cluster.styleNumber, colourCode: cluster.colourCode,
                    isBottomwear: cluster.isBottomwear ?? false,
                  }) + '.jpg'
              const dirHandle = flatExport ? mpHandle : await mpHandle.getDirectoryHandle(folderName, { create: true })
              const fh = await dirHandle.getFileHandle(filename, { create: true })
              const writable = await fh.createWritable()
              await writable.write(buffer)
              await writable.close()
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              console.error(`Export write failed: ${img.filename}`, err)
              setExportError(`${img.filename}: ${msg}`)
            }
            doneCount++
            setProgress({ done: doneCount, total: totalImages, phase: `${rule.name} · ${doneCount}/${totalImages}` })
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
          const tasks = buildTasks(template, rule)

          for (let i = 0; i < tasks.length; i += CONCURRENCY) {
            await Promise.all(tasks.slice(i, i + CONCURRENCY).map(async ({ cluster, seq, img, imgIdx, folderName, viewNum }) => {
              try {
                const useBgRemoval = bgRemovalEnabled && (rule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? '')
                const preRemovedBlob = useBgRemoval ? bgRemovalCache.get(img.id) : undefined
                const buffer = await processImageOnCanvas(
                  img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                  rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0,
                  useBgRemoval && !preRemovedBlob, preRemovedBlob,
                )
                const filename = useOriginalNames
                  ? img.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.jpg')
                  : applyNamingTemplate(template, {
                      brand: brandCode, seq, sku: cluster.sku, color: cluster.color,
                      view: img.viewLabel, index: imgIdx + 1, viewNum, supplierCode, season,
                      styleNumber: cluster.styleNumber, colourCode: cluster.colourCode,
                      isBottomwear: cluster.isBottomwear ?? false,
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
          const tasks = buildTasks(template, rule)
          for (const { cluster, seq, img, imgIdx, viewNum } of tasks) {
            const filename = useOriginalNames
              ? img.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.jpg')
              : applyNamingTemplate(template, {
                  brand: brandCode, seq, sku: cluster.sku, color: cluster.color,
                  view: img.viewLabel, index: imgIdx + 1, viewNum, supplierCode, season,
                  styleNumber: cluster.styleNumber, colourCode: cluster.colourCode,
                  isBottomwear: cluster.isBottomwear ?? false,
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

        const tasks = buildTasks(template, rule)
        for (let i = 0; i < tasks.length; i += CONCURRENCY) {
          await Promise.all(tasks.slice(i, i + CONCURRENCY).map(async ({ cluster, seq, img, imgIdx, viewNum }) => {
            try {
              const useBgRemoval = bgRemovalEnabled && (rule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? '')
              const preRemovedBlob = useBgRemoval ? bgRemovalCache.get(img.id) : undefined
              const buffer = await processImageOnCanvas(
                img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0,
                useBgRemoval && !preRemovedBlob, preRemovedBlob,
              )
              const filename = useOriginalNames
                ? img.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.jpg')
                : applyNamingTemplate(template, {
                    brand: brandCode, seq, sku: cluster.sku, color: cluster.color,
                    view: img.viewLabel, index: imgIdx + 1, viewNum, supplierCode, season,
                    styleNumber: cluster.styleNumber, colourCode: cluster.colourCode,
                    isBottomwear: cluster.isBottomwear ?? false,
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

    // Bill for background removal (fire-and-forget)
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

    // Save job to history (fire-and-forget — runs concurrently, done screen shows immediately)
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
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        setHistorySaveError(`HTTP ${res.status}: ${errBody?.error ?? 'Unknown error'}`)
        return
      }
      const { data: historyRecord } = await res.json()
      setHistorySaved(!!historyRecord?.id)
      if (historyRecord?.id) {
        const histId = historyRecord.id

        import('@/lib/session-store').then(({ saveSession, deleteSession }) =>
          Promise.all([
            saveSession(histId, jobName, clusters, selectedMarketplaces, activeBrand?.id ?? null),
            deleteSession('draft'),
          ])
        ).catch(() => { /* non-critical */ })

        ;(async () => {
          try {
            await fetch(`/api/jobs/${histId}/session`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
              },
              body: JSON.stringify({
                clusters: clusters.map((c, i) => ({
                  cluster_id: c.id,
                  cluster_order: i,
                  sku: c.sku,
                  product_name: c.productName,
                  color: c.color,
                  colour_code: c.colourCode,
                  style_number: c.styleNumber,
                  label: c.label,
                  category: c.category ?? null,
                  is_bottomwear: c.isBottomwear ?? false,
                  confirmed: c.confirmed ?? false,
                  images: c.images.map((img, j) => ({
                    image_id: img.id,
                    image_order: j,
                    filename: img.filename,
                    seq_index: img.seqIndex,
                    view_label: img.viewLabel,
                    view_confidence: img.viewConfidence,
                  })),
                })),
              }),
            })
          } catch { /* non-critical */ }
        })()
      }
    }).catch((err) => { setHistorySaveError(err instanceof Error ? err.message : 'Network error') })

    markClustersExported(confirmedClusters.map((c) => c.id))
    setDone(true)
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const totalSourceImages = confirmedClusters.reduce((s, c) => s + c.images.length, 0)
  const ANZ_MARKETPLACES: MarketplaceName[] = ['the-iconic', 'myer', 'david-jones']
  const lockedMarketplaces: MarketplaceName[] = plan.limits.marketplaces < 2 ? ANZ_MARKETPLACES : []
  const hasBgRemoval = shootType === 'still-life' && selectedMarketplaces.some((m) => (marketplaceRules[m] ?? MARKETPLACE_RULES[m]).remove_background)
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
      <span className="text-[length:var(--font-sm)] text-[var(--text)]">{label}{sub && <span className="ml-1" style={{ color: '#c8c8c8' }}>{sub}</span>}</span>
    </label>
  )

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 h-[56px] border-b border-[var(--line)] flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[length:var(--font-base)] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to review
        </button>
        <div className="h-4 w-px bg-[var(--line2)]" />
        <h1 className="text-[length:var(--font-md)] font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
          Export{jobName ? ` · ${jobName}` : ''}
        </h1>
        {confirmedClusters.length > 0 && (
          <span className="text-[length:var(--font-sm)] text-[var(--text3)]">
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
            <p className="text-[length:var(--font-base)] font-semibold uppercase tracking-wide" style={{ color: '#c8c8c8' }}>Marketplaces</p>
            {selectedMarketplaces.length === 0 && (
              <p className="text-[length:var(--font-base)] text-[var(--accent3)]">Select at least one</p>
            )}
          </div>
          <MarketplaceSelector
            selected={selectedMarketplaces}
            columns={2}
            lockedMarketplaces={lockedMarketplaces}
            onLockedClick={() => openUpgrade('ANZ marketplace exports (The Iconic, Myer, David Jones) are available on the Launch plan and above.')}
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
          className="flex flex-col px-5 py-6 gap-0 overflow-y-auto transition-opacity duration-200"
          style={{ opacity: isExporting ? 0.3 : 1, pointerEvents: isExporting ? 'none' : 'auto' }}
        >
          {/* Output format */}
          <div className="flex-shrink-0 pb-5 border-b border-[var(--line)]">
            <p className="text-[length:var(--font-base)] font-semibold uppercase tracking-wide mb-3" style={{ color: '#c8c8c8' }}>Output format</p>
            <div className="flex flex-col gap-[2px] bg-[var(--bg3)] p-[3px] rounded-sm">
              {([
                ['zip', 'Download ZIP'],
                ['folder', 'Save to Folder'],
                ...(activeBrand?.cloud_connections?.dropbox ? [['dropbox', 'Dropbox']] : []),
                ...(activeBrand?.cloud_connections?.google_drive ? [['google-drive', 'Google Drive']] : []),
                ...(activeBrand?.cloud_connections?.s3 ? [['s3', 'AWS S3']] : []),
              ] as [string, string][]).map(([id, label]) => (
                <button key={id} onClick={() => { setExportMode(id as typeof exportMode); if (id === 'folder' && !folderRef.current && fsaSupported) pickFolder() }}
                  className={`w-full px-3 py-[6px] rounded-[4px] text-left text-[length:var(--font-sm)] font-medium transition-all ${exportMode === id ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm' : 'text-[var(--text2)] hover:text-[var(--text)]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-2 min-h-[18px]">
              {exportMode === 'folder' && <p className="text-[length:var(--font-base)]" style={{ color: '#c8c8c8' }}>Chrome and Edge only</p>}
              {exportMode === 'dropbox' && <p className="text-[length:var(--font-base)] text-[var(--text3)]">→ <span className="font-medium text-[var(--text2)]">{activeBrand?.cloud_connections?.dropbox?.account_email}</span></p>}
              {exportMode === 'google-drive' && <p className="text-[length:var(--font-base)] text-[var(--text3)]">→ <span className="font-medium text-[var(--text2)]">{activeBrand?.cloud_connections?.google_drive?.email}</span></p>}
              {exportMode === 's3' && <p className="text-[length:var(--font-base)] text-[var(--text3)]">→ <span className="font-medium text-[var(--text2)]">{activeBrand?.cloud_connections?.s3?.bucket}{activeBrand?.cloud_connections?.s3?.prefix ? `/${activeBrand.cloud_connections.s3.prefix}` : ''}</span></p>}
            </div>
            {exportMode === 'folder' && (
              <div className="flex items-center gap-2 mt-2">
                <button onClick={pickFolder} disabled={!fsaSupported} className="btn btn-ghost btn-sm">Choose folder</button>
                {folderName
                  ? <span className="text-[length:var(--font-sm)] text-[var(--accent2)] truncate" style={{ fontFamily: 'var(--font-dm-mono)' }}>/{folderName}</span>
                  : <span className="text-[length:var(--font-base)]" style={{ color: '#c8c8c8' }}>{fsaSupported ? 'None selected' : 'Requires Chrome/Edge'}</span>
                }
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex-shrink-0 py-5 border-b border-[var(--line)]">
            <p className="text-[length:var(--font-base)] font-semibold uppercase tracking-wide mb-4" style={{ color: '#c8c8c8' }}>Options</p>
            <div className="flex flex-col gap-4">
              <Toggle on={flatExport} onToggle={() => setFlatExport(v => !v)}
                label="Flat export" sub="All images in one folder per marketplace" />
              <Toggle on={useOriginalNames} onToggle={() => setUseOriginalNames(v => !v)}
                label="Keep original filenames" sub="Skip renaming — export crops only" />
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
                    <span className="text-[length:var(--font-sm)] text-[var(--text2)]">
                      Background removal
                      <span className="text-[var(--text3)] ml-1">— </span>
                      <button onClick={() => openUpgrade('Background removal is available on the Growth plan and above')}
                        className="text-[length:var(--font-base)] text-[var(--accent)] hover:underline">
                        Growth plan required
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
              <p className="text-[length:var(--font-base)] font-semibold uppercase tracking-wide" style={{ color: '#c8c8c8' }}>File naming</p>
            </div>
            <input className="input w-full mb-2" style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 'var(--font-sm)' }}
              value={localTemplate} onChange={(e) => setLocalTemplate(e.target.value)} placeholder="{BRAND}_{SEQ}_{VIEW}" />
            <p className="text-[length:var(--font-base)] leading-loose flex flex-wrap gap-x-1" style={{ color: '#c8c8c8' }}>
              {['{BRAND}','{SKU}','{COLOR}','{VIEW}','{SEQ}','{INDEX}','{STYLE_NUMBER}','{COLOUR_CODE}'].map(t => (
                <code key={t} style={{ fontFamily: 'var(--font-dm-mono)' }}>{t}</code>
              ))}
            </p>
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
                <p className="text-[length:var(--font-2xl)] font-semibold text-[var(--text)] leading-tight" style={{ fontFamily: 'var(--font-syne)', letterSpacing: '-.3px' }}>Job complete</p>
                <p className="text-[1rem] text-[var(--text3)] mt-2">
                  {totalSourceImages} images exported across {selectedMarketplaces.length} marketplace{selectedMarketplaces.length !== 1 ? 's' : ''}.
                </p>
              </div>
              {exportError && (
                <div className="text-[length:var(--font-sm)] text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-left w-full">
                  <span className="font-medium">Note:</span> {exportError}
                </div>
              )}
              {historySaved && !historySaveError && (
                <div className="text-[length:var(--font-sm)] bg-[rgba(48,209,88,0.08)] border border-[rgba(48,209,88,0.3)] rounded-lg px-4 py-3 text-left w-full" style={{ color: '#30d158' }}>
                  <span className="font-medium">Saved to history.</span> This job is now visible in All Jobs.
                </div>
              )}
              {historySaveError && (
                <div className="text-[length:var(--font-sm)] bg-[rgba(255,159,10,0.08)] border border-[rgba(255,159,10,0.3)] rounded-lg px-4 py-3 text-left w-full" style={{ color: '#a05c00' }}>
                  <span className="font-medium">Job not saved to history.</span> Your export completed but this job couldn't be recorded in All Jobs.
                  <span className="block mt-1 font-mono text-[length:var(--font-xs)] opacity-70">{historySaveError}</span>
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
                <p className="text-[length:var(--font-base)] text-[var(--text3)] uppercase tracking-wide font-semibold mb-2">In progress</p>
                <p className="text-[length:var(--font-xl)] font-semibold text-[var(--text)] leading-snug" style={{ fontFamily: 'var(--font-syne)' }}>{progress.phase}</p>
              </div>
              <div>
                <div className="flex justify-between text-[length:var(--font-sm)] mb-2">
                  <span className="text-[var(--text2)]">{progress.done} of {progress.total}</span>
                  <span style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--accent)', fontWeight: 600 }}>{pct}%</span>
                </div>
                <div className="h-[10px] bg-[var(--bg3)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
                </div>
              </div>
              {cloudExportStatus && (exportMode === 'dropbox' || exportMode === 'google-drive' || exportMode === 's3') && (
                <div className="px-4 py-3 rounded-sm bg-[var(--bg3)] border border-[var(--line)] text-[length:var(--font-base)] text-[var(--text2)]">
                  Uploading {cloudExportStatus.done} / {cloudExportStatus.total} files
                  {cloudExportStatus.errors > 0 && <span className="text-[var(--accent3)] ml-2">· {cloudExportStatus.errors} failed</span>}
                </div>
              )}
              {exportError && (
                <div className="text-[length:var(--font-sm)] text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
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
                    <p className="text-[length:var(--font-3xl)] font-semibold text-[var(--text)] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>{value}</p>
                    <p className="text-[length:var(--font-base)] text-[var(--text3)] mt-1.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Per-marketplace settings summary */}
              {selectedMarketplaces.length > 0 && (
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[length:var(--font-base)] font-semibold text-[var(--text3)] uppercase tracking-wide">Export settings</p>
                    <a href="/dashboard/marketplaces" className="text-[length:var(--font-sm)] text-[var(--accent)] hover:opacity-70 transition-opacity flex items-center gap-1">
                      Edit
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 8L8 2M8 2H5M8 2v3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </a>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {selectedMarketplaces.map((m) => {
                      const rule = marketplaceRules[m] ?? MARKETPLACE_RULES[m]
                      return (
                        <div key={m} className="bg-[var(--bg3)] border border-[var(--line)] rounded-sm px-3 py-2.5">
                          <p className="font-medium text-[var(--text)] text-[length:var(--font-base)] mb-1.5">{rule.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {rule.angle_order.map((a, i) => (
                              <span key={a} className="text-[length:var(--font-xs)] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{i + 1}</span> {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* BG removal estimate */}
              {hasBgRemoval && bgRemovalEnabled && canUseBgRemoval && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-sm border border-[var(--line2)] bg-[var(--bg3)] w-fit text-[length:var(--font-sm)] text-[var(--text2)] flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5" strokeLinecap="round"/></svg>
                  Background removal · {bgCount} images · est. <strong className="text-[var(--text)] mx-1">~{estBgMins} min</strong> · <strong className="text-[var(--text)] ml-1">${bgCostAud} AUD</strong>&nbsp;billed on use
                </div>
              )}

              {/* Shopify — show inline when connected */}
              {(() => {
                const shopifyConnected = !!activeBrand?.shopify_store_url
                return (
                <div className="flex-shrink-0 border border-[var(--line)] rounded-sm px-4 py-4" style={shopifyConnected ? undefined : { opacity: 0.7 }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[1rem] font-medium text-[var(--text)]">Shopify draft listings</p>
                    {shopifyConnected
                      ? <span className="text-[length:var(--font-base)] text-[var(--accent2)] bg-[rgba(62,207,142,0.1)] px-2 py-[2px] rounded-[6px]">Connected</span>
                      : <span className="text-[length:var(--font-base)] text-[var(--text3)] bg-[var(--bg3)] px-2 py-[2px] rounded-[6px]">Not connected</span>}
                  </div>
                  <p className="text-[length:var(--font-sm)] text-[var(--text3)] mb-3 leading-relaxed">
                    {shopifyConnected ? (
                      <>
                        Creates a draft product in Shopify for each cluster — images, SKU, colour and AI copy included.
                        {(() => { const n = confirmedClusters.filter(c => clusterCopy[c.id]?.title).length; return n > 0 ? <> <span className="text-[var(--accent2)] font-medium">AI copy ready for {n} listing{n !== 1 ? 's' : ''}.</span></> : null })()}
                      </>
                    ) : (
                      <>Connect a Shopify store in Brand settings to push draft listings — images, SKU, colour and AI copy — straight to your storefront.</>
                    )}
                  </p>
                  {shopifyConnected && shopifyResults && (
                    <div className="bg-[var(--bg3)] rounded-sm p-2.5 mb-3 flex flex-col gap-1 max-h-[100px] overflow-y-auto">
                      {shopifyResults.map((r) => (
                        <div key={r.sku} className="flex items-center justify-between text-[length:var(--font-base)]">
                          <span className="text-[var(--text2)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{r.sku}</span>
                          <span className={r.status === 'created' || r.status === 'updated' ? 'text-[var(--accent2)]' : r.status === 'uploading' ? 'text-[var(--text3)]' : 'text-[#ff3b30]'}>
                            {r.status === 'created' ? '✓ Draft created' : r.status === 'updated' ? '✓ Images added' : r.status === 'uploading' ? '↑ Uploading…' : `✗ ${r.message ?? 'Failed'}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {shopifyConnected ? (
                    <button onClick={handleShopifyUpload} disabled={shopifyUploading || !confirmedClusters.length} className="btn btn-ghost btn-sm w-full justify-center">
                      {shopifyUploading
                        ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Creating drafts…</>
                        : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>Create {confirmedClusters.length} draft{confirmedClusters.length !== 1 ? 's' : ''} in Shopify</>
                      }
                    </button>
                  ) : (
                    <Link href="/dashboard/brands" className="btn btn-ghost btn-sm w-full justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                      Connect Shopify in Brand settings
                    </Link>
                  )}
                </div>
                )
              })()}

              {/* Cin7 — show inline when connected */}
              {activeBrand?.cin7_account_id && activeBrand?.cin7_application_key && (
                <div className="flex-shrink-0 border border-[var(--line)] rounded-sm px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-[4px] flex items-center justify-center flex-shrink-0" style={{ background: '#00b4d8' }}>
                        <span className="text-white font-bold" style={{ fontSize: '8px', fontFamily: 'var(--font-dm-mono)' }}>C7</span>
                      </div>
                      <p className="text-[1rem] font-medium text-[var(--text)]">Cin7 Core</p>
                    </div>
                    <span className="text-[length:var(--font-base)] text-[var(--accent2)] bg-[rgba(62,207,142,0.1)] px-2 py-[2px] rounded-[6px]">Connected</span>
                  </div>
                  <p className="text-[length:var(--font-sm)] text-[var(--text3)] mb-3 leading-relaxed">
                    Creates a new product in Cin7 for each cluster — all metadata, AI copy and images included. New SKUs only; existing SKUs are skipped.
                  </p>
                  {cin7Results && (
                    <div className="bg-[var(--bg3)] rounded-sm p-2.5 mb-3 flex flex-col gap-1 max-h-[100px] overflow-y-auto">
                      {cin7Results.map((r) => (
                        <div key={r.sku} className="flex items-center justify-between text-[length:var(--font-base)]">
                          <span className="text-[var(--text2)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{r.sku}</span>
                          <span className={r.status === 'created' ? 'text-[var(--accent2)]' : r.status === 'skipped' ? 'text-[var(--text3)]' : r.status === 'uploading' ? 'text-[var(--text3)]' : 'text-[#ff3b30]'}>
                            {r.status === 'created' ? '✓ Created' : r.status === 'skipped' ? '— Already exists' : r.status === 'uploading' ? '↑ Uploading…' : `✗ ${r.message ?? 'Failed'}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={handleCin7Upload} disabled={cin7Uploading || !confirmedClusters.length} className="btn btn-ghost btn-sm w-full justify-center">
                    {cin7Uploading
                      ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Pushing to Cin7…</>
                      : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>Push {confirmedClusters.length} product{confirmedClusters.length !== 1 ? 's' : ''} to Cin7</>
                    }
                  </button>
                </div>
              )}

              {/* Output preview — takes remaining vertical space */}
              {confirmedClusters.length > 0 && selectedMarketplaces.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <p className="text-[length:var(--font-base)] font-semibold text-[var(--text3)] uppercase tracking-wide mb-2 flex-shrink-0">Output preview</p>
                  <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--bg3)] border border-[var(--line)] rounded-sm px-4 py-3 text-[length:var(--font-sm)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
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
                                <div key={c.id} className="pl-4" style={{ color: '#c8c8c8' }}>└─ {applyNamingTemplate(template, { brand: brandCode, seq: ci + 1, sku: c.sku, color: c.color, view: c.images[0]?.viewLabel ?? 'front', index: 1, supplierCode: '', season: '', styleNumber: c.styleNumber, colourCode: c.colourCode, isBottomwear: c.isBottomwear }) + '.jpg'}</div>
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
                                const firstFile = applyNamingTemplate(template, { brand: brandCode, seq: ci+1, sku: c.sku, color: c.color, view: c.images[0]?.viewLabel ?? 'front', index: 1, supplierCode: '', season: '', styleNumber: c.styleNumber, colourCode: c.colourCode, isBottomwear: c.isBottomwear }) + '.jpg'
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
                <div className="text-[length:var(--font-sm)] text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex-shrink-0">
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
          <p className="text-[length:var(--font-sm)] text-[var(--text3)]">
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
// Resizes and encodes a single image to the target marketplace dimensions.
// Returns an ArrayBuffer (JPEG bytes) ready to be added to the ZIP.
//
// Key behaviours:
// - Fit-to-contain: scales the full source to fit within the target canvas, centred,
//   with background colour filling any remaining edges — no content is ever cropped.
// - Multi-step downscaling: halves dimensions iteratively until within 2× of target,
//   then does a final draw. This prevents the blurry result you get from a single
//   large-to-small canvas drawImage call.
// - imageSmoothingQuality = 'high' on all canvas contexts for sharpest output
// - Optional file size cap: if maxFileSizeKb > 0, binary-searches JPEG quality
//   downwards (up to 6 iterations) until the output fits within the cap

// Views with plain/white backgrounds where AI removal makes sense.
// Detail, mood, flat-lay, top-down, inside shots are excluded — complex backgrounds.
