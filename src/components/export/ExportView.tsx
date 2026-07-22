'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from '@/store/session'
import { usePlan } from '@/context/PlanContext'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import type { EditableRules } from '@/lib/marketplace/useMarketplaceRules'
import { applyNamingTemplate } from '@/lib/brands'
import { processImageOnCanvas, preCompressImage, readCutoutBlob, PLAIN_BG_VIEWS } from '@/lib/export/image-processing'
import { buildColorPreservedCutout } from '@/lib/image/composite'
import { MarketplaceSelector } from '@/components/export/MarketplaceSelector'
import type { ViewLabel, MarketplaceName } from '@/types'
import type { SessionCluster } from '@/store/session'
import type { Brand } from '@/lib/brands'

const CSV_ANGLE_COLUMNS = ['front', 'back', 'side', 'detail', 'mood', 'full-length'] as const

// Rich product-data CSV included in every export — SKU, attributes, AI copy, and
// the per-angle image filenames. Reads AI copy from live state when present,
// falling back to the values persisted on the cluster, so it produces the same
// CSV whether the export runs from the live session or a reopened saved job.
function buildProductDataCsv(
  clusters: SessionCluster[],
  clusterCopy: Record<string, { title: string; description: string; bullets: string[] }>,
  brandCode: string,
  template: string,
  useOriginalNames: boolean,
): string {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const headers = [
    'SKU', 'Product Name', 'Colour', 'Colour Code', 'Style Number', 'Category',
    'Description', 'Key Points',
    'Front Image', 'Back Image', 'Side Image', 'Detail Image', 'Mood Image', 'Full Length Image',
  ]
  const rows = clusters.map((cluster, ci) => {
    const copy = clusterCopy[cluster.id]
    const description = copy?.description || cluster.copyDescription || ''
    const bullets = copy?.bullets?.length ? copy.bullets : (cluster.copyBullets ?? [])
    const angleMap: Record<string, string> = {}
    cluster.images.forEach((img, ii) => {
      if (!img.viewLabel || angleMap[img.viewLabel]) return
      const base = useOriginalNames
        ? img.filename.replace(/\.[^.]+$/, '')
        : (applyNamingTemplate(template, {
            brand: brandCode, seq: ci + 1, sku: cluster.sku,
            color: cluster.color, view: img.viewLabel,
            index: ii + 1, isBottomwear: cluster.isBottomwear ?? false,
          }) || `${brandCode}_${String(ci + 1).padStart(3, '0')}_${img.viewLabel}`)
      angleMap[img.viewLabel] = base + '.jpg'
    })
    return [
      cluster.sku, cluster.productName, cluster.color ?? '', cluster.colourCode ?? '',
      cluster.styleNumber ?? '', cluster.category ?? '',
      description, bullets.join('; '),
      ...CSV_ANGLE_COLUMNS.map((a) => angleMap[a] ?? ''),
    ]
  })
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
}

export function ExportView({
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
  const [isCancelling, setIsCancelling] = useState(false)
  // Cooperative cancel flag, read at every export loop boundary. A ref (not state)
  // so the running async loops see the change immediately without a re-render.
  const cancelRef = useRef(false)
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
  // "Remove background" export toggle → drives the pre-pass below, which removes
  // every image's background server-side (Replicate 851-labs) and caches a
  // colour-preserved cutout. No @imgly fallback: it fails loudly if the server
  // remover is unavailable (e.g. a bad REPLICATE_API_TOKEN).
  const [removeBgOnExport, setRemoveBgOnExport] = useState(false)
  // How the source aspect is reconciled with the marketplace crop:
  //  'fill'   → cover-crop into the frame (clean edges, may clip tight subjects)
  //  'extend' → fit whole image + pad the gap (edge-extension / bar; keeps subject)
  // Default 'fill' — clean edges suit most shoots; switch to 'extend' when a shoot
  // is framed tight to head/feet and cropping would clip.
  const [cropMode, setCropMode] = useState<'fill' | 'extend'>('fill')
  const [showBgSkipped, setShowBgSkipped] = useState(false)
  const [cloudExportStatus, setCloudExportStatus] = useState<{ done: number; total: number; errors: number } | null>(null)

  const { canExportThisMonth, recordExport, openUpgrade, plan, region } = usePlan()
  const markClustersExported = useSession((s) => s.markClustersExported)
  const dimensionOverrides = useSession((s) => s.dimensionOverrides)
  // Resolve a marketplace's rule, applying any per-job output-size override.
  // Images are fitted into image_dimensions per cropMode: 'fill' cover-crops,
  // 'extend' fits-to-contain and pads the gap.
  const resolveRule = (m: MarketplaceName): EditableRules[MarketplaceName] => {
    const base = marketplaceRules[m] ?? MARKETPLACE_RULES[m]
    const ov = dimensionOverrides[m]
    return ov ? { ...base, image_dimensions: { width: ov.width, height: ov.height } } : base
  }
  const confirmedClusters = clusters
    .filter((c) => c.confirmed)
    .sort((a, b) => parseInt(a.label?.match(/\d+/)?.[0] ?? '0', 10) - parseInt(b.label?.match(/\d+/)?.[0] ?? '0', 10))

  // Calibrate a real bytes-per-pixel by encoding the first shot once at the first
  // marketplace's dims/quality (no bg removal → no Replicate cost). Scaled by pixel
  // count, it gives grounded per-file size estimates instead of a blind formula.
  const [calibBpp, setCalibBpp] = useState<{ bpp: number; quality: number } | null>(null)
  const firstImgId = confirmedClusters[0]?.images[0]?.id
  const firstMp = selectedMarketplaces[0]
  useEffect(() => {
    const img = confirmedClusters[0]?.images[0]
    if (!img?.file || !firstMp) { setCalibBpp(null); return }
    const rule = resolveRule(firstMp)
    const { width, height } = rule.image_dimensions
    const quality = rule.quality ?? 100
    let cancelled = false
    processImageOnCanvas(img.file, width, height, rule.background_color, quality / 100, rule.max_file_size_kb ?? 0, false, undefined, img.edit, img.viewLabel, cropMode === 'fill')
      .then((buf) => { if (!cancelled) setCalibBpp({ bpp: buf.byteLength / (width * height), quality }) })
      .catch(() => { if (!cancelled) setCalibBpp(null) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstImgId, firstMp, cropMode])

  // After a completed export, changing any export setting (marketplace, options,
  // naming, folder) re-arms the page to export the SAME products again — no need
  // to round-trip back to Review. The done screen only persists until you touch a
  // control. (Runs on mount too, but no-ops while not done.)
  useEffect(() => {
    if (!done) return
    setDone(false)
    setProgress({ done: 0, total: 0, phase: '' })
    setHistorySaved(false)
    setHistorySaveError(null)
    setExportError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarketplaces, exportMode, flatExport, useOriginalNames, removeBgOnExport, cropMode, localTemplate, folderName])

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
            buffer = await processImageOnCanvas(img.file, width, height, bgColor, quality, 0, shootType === 'still-life' && (firstRule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? ''), undefined, img.edit, img.viewLabel, cropMode === 'fill')
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
            buffer = await processImageOnCanvas(img.file, width, height, bgColor, quality, 0, shootType === 'still-life' && (firstRule.remove_background ?? false) && PLAIN_BG_VIEWS.has(img.viewLabel ?? ''), undefined, img.edit, img.viewLabel, cropMode === 'fill')
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
        // Cin7 is an ERP → prefer the concise "feed" channel variant; fall back to
        // the master copy (or the persisted session copy) when no variant exists.
        const feedCopy = cluster.copyVariants?.feed
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
              ...((feedCopy || copy?.title || cluster.productName) ? { copy: {
                title: feedCopy?.title || copy?.title || cluster.productName || '',
                description: feedCopy?.description || copy?.description || cluster.copyDescription || '',
                bullets: feedCopy?.bullets?.length ? feedCopy.bullets : (copy?.bullets?.length ? copy.bullets : (cluster.copyBullets ?? [])),
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
    cancelRef.current = false
    setIsCancelling(false)
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
      setIsCancelling(false)
    }
  }

  // Cooperative cancel: flip the ref so the in-flight export loops break at their
  // next boundary. In-flight canvas/API calls already dispatched finish, then the
  // export bails before finalizing (no history, no billing, no download).
  const handleCancelExport = () => {
    cancelRef.current = true
    setIsCancelling(true)
    setProgress((p) => ({ ...p, phase: 'Cancelling…' }))
  }

  const handleExportInner = async () => {

    const sourceImageCount = confirmedClusters.reduce((s, c) => s + c.images.length, 0)
    const totalImages = sourceImageCount * selectedMarketplaces.length

    // Only remove backgrounds on views that actually have a plain, removable
    // backdrop (front/back/side/full-length/etc). Detail & flat-lay macros fill
    // the whole frame with fabric — the salient-object model has no subject to
    // isolate and eats into the garment — so they're skipped automatically.
    const bgEligible = (img: { viewLabel?: string | null }) =>
      PLAIN_BG_VIEWS.has(img.viewLabel ?? '')
    const bgEligibleCount = removeBgOnExport
      ? confirmedClusters.reduce((s, c) => s + c.images.filter(bgEligible).length, 0)
      : 0
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
    if (removeBgOnExport) {
      // Auth is required — without it the route 401s and export falls back to the
      // slow client-side @imgly remover.
      const { createClient: bgClient } = await import('@/lib/supabase/client')
      const { data: { session: bgSession } } = await bgClient().auth.getSession()
      const bgAuth: Record<string, string> = bgSession?.access_token
        ? { Authorization: `Bearer ${bgSession.access_token}` } : {}
      const bgTasks = confirmedClusters.flatMap((c) => c.images).filter(bgEligible)
      if (bgTasks.length > 0) {
        // Tuned for throughput on large sessions (100-500 imgs). Above $5 credit
        // Replicate lifts its low-credit throttle to the standard ~600/min; with
        // Prefer:wait each call holds a few seconds, so ~10 in flight saturates the
        // pipeline without exceeding that rate or Vercel's function concurrency.
        // The server's replicateFetch retries 429/503 with backoff as a safety net.
        // NOTE: requires >$5 Replicate credit; under $5 the limit is 6/min burst 1.
        const BG_CONCURRENCY = 10
        let bgDone = 0
        let bgPlanBlocked = false
        let bgFail: string | null = null
        setProgress({ done: 0, total: bgTasks.length, phase: `Removing backgrounds 0/${bgTasks.length}…` })
        for (let i = 0; i < bgTasks.length; i += BG_CONCURRENCY) {
          if (bgPlanBlocked || bgFail || cancelRef.current) break
          await Promise.all(bgTasks.slice(i, i + BG_CONCURRENCY).map(async (img) => {
            if (bgPlanBlocked || bgFail || cancelRef.current) return
            try {
              const compressed = await preCompressImage(img.file)
              const fd = new FormData()
              fd.append('image', compressed, 'image.jpg')
              const res = await fetch('/api/remove-background', { method: 'POST', headers: bgAuth, body: fd })
              if (res.status === 403) { bgPlanBlocked = true; return }
              // No @imgly fallback — fail loudly so a bad Replicate token is obvious.
              if (!res.ok) {
                // A JSON body carries our specific reason; a bodyless/HTML 502 is a
                // Vercel function-level failure (timeout / payload size), not our code.
                const detail = await res.json().catch(() => null)
                bgFail = detail?.error
                  ? `Background removal failed (${res.status}) · ${detail.error}`
                  : `Background removal failed (${res.status}) · server error (no detail — likely a function timeout or size limit).`
                return
              }
              // Keep the subject's colours: apply the mask to the ORIGINAL pixels.
              bgRemovalCache.set(img.id, await buildColorPreservedCutout(img.file, await readCutoutBlob(res)))
            } catch (e) { bgFail = e instanceof Error ? `Background removal failed: ${e.message}` : 'Background removal request failed.' }
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
        if (bgFail) {
          setIsExporting(false)
          setProgress({ done: 0, total: 0, phase: '' })
          setExportError(bgFail)
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
        if (cancelRef.current) break
        const rule = resolveRule(marketplace)
        const template = rule.naming_template || localTemplate || '{BRAND}_{SEQ}_{VIEW}'
        // Always create the marketplace folder — flatExport only skips SKU subfolders
        const mpHandle = await rootHandle.getDirectoryHandle(rule.name.replace(/\s+/g, '_'), { create: true })
        const tasks = buildTasks(template, rule)

        // Sequential writes — FSA API holds swap files open until close(), so concurrent
        // writes stack up in memory. One-at-a-time lets each file flush to disk before the next.
        for (const { cluster, seq, img, imgIdx, folderName, viewNum } of tasks) {
            if (cancelRef.current) break
            if (!img.file) {
              console.warn(`[export] skipping ${img.filename} — file reference missing`)
              setExportError(`${img.filename}: file not available (try re-uploading)`)
              doneCount++
              setProgress({ done: doneCount, total: totalImages, phase: `${rule.name} · ${doneCount}/${totalImages}` })
              continue
            }
            const useBgRemoval = removeBgOnExport && bgEligible(img)
            const preRemovedBlob = useBgRemoval ? bgRemovalCache.get(img.id) : undefined
            let buffer: ArrayBuffer | undefined
            try {
              buffer = await processImageOnCanvas(
                img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0,
                useBgRemoval && !preRemovedBlob, preRemovedBlob, img.edit, img.viewLabel, cropMode === 'fill',
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
                    rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0, false, undefined, img.edit, img.viewLabel, cropMode === 'fill',
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

      // Write the rich product data CSV to the folder root (skip if cancelled —
      // a stray CSV would make a half-written folder look complete).
      if (confirmedClusters.length > 0 && !cancelRef.current) {
        setProgress((p) => ({ ...p, phase: 'Writing CSV…' }))
        const csv = buildProductDataCsv(confirmedClusters, clusterCopy, brandCode, localTemplate || '{BRAND}_{SEQ}_{VIEW}', useOriginalNames)
        const csvFh = await rootHandle.getFileHandle('product_data.csv', { create: true })
        const csvWritable = await csvFh.createWritable()
        await csvWritable.write(csv)
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
        if (cancelRef.current) break
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()

        for (const marketplace of batches[batchIdx]) {
          if (cancelRef.current) break
          const rule = resolveRule(marketplace)
          const template = rule.naming_template || localTemplate || '{BRAND}_{SEQ}_{VIEW}'
          const marketplaceFolder = zip.folder(rule.name.replace(/\s+/g, '_'))!
          const tasks = buildTasks(template, rule)

          for (let i = 0; i < tasks.length; i += CONCURRENCY) {
            if (cancelRef.current) break
            await Promise.all(tasks.slice(i, i + CONCURRENCY).map(async ({ cluster, seq, img, imgIdx, folderName, viewNum }) => {
              try {
                const useBgRemoval = removeBgOnExport && bgEligible(img)
                const preRemovedBlob = useBgRemoval ? bgRemovalCache.get(img.id) : undefined
                const buffer = await processImageOnCanvas(
                  img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                  rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0,
                  useBgRemoval && !preRemovedBlob, preRemovedBlob, img.edit, img.viewLabel, cropMode === 'fill',
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

        // Rich product data CSV goes in the first batch only
        if (batchIdx === 0 && confirmedClusters.length > 0) {
          zip.file('product_data.csv', buildProductDataCsv(confirmedClusters, clusterCopy, brandCode, localTemplate || '{BRAND}_{SEQ}_{VIEW}', useOriginalNames))
        }

        // Don't build/download a partial ZIP if the user cancelled mid-collection.
        if (cancelRef.current) break
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
          const rule = resolveRule(marketplace)
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
        if (cancelRef.current) break
        const rule = resolveRule(marketplace)
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
          if (cancelRef.current) break
          await Promise.all(tasks.slice(i, i + CONCURRENCY).map(async ({ cluster, seq, img, imgIdx, viewNum }) => {
            try {
              const useBgRemoval = removeBgOnExport && bgEligible(img)
              const preRemovedBlob = useBgRemoval ? bgRemovalCache.get(img.id) : undefined
              const buffer = await processImageOnCanvas(
                img.file, rule.image_dimensions.width, rule.image_dimensions.height,
                rule.background_color, (rule.quality ?? 100) / 100, rule.max_file_size_kb ?? 0,
                useBgRemoval && !preRemovedBlob, preRemovedBlob, img.edit, img.viewLabel, cropMode === 'fill',
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

    // Cancelled mid-run: bail before finalizing. Don't count the export against the
    // monthly limit, bill BG removal, save history, or mark clusters exported — the
    // job wasn't completed. Any files already written to a picked folder remain.
    if (cancelRef.current) {
      setProgress({ done: 0, total: 0, phase: '' })
      setCloudExportStatus(null)
      setExportError(exportMode === 'folder'
        ? 'Export cancelled. Any files already written to the folder were kept.'
        : 'Export cancelled. No file was downloaded.')
      return
    }

    recordExport()

    // Bill for background removal — $0.16 AUD per source image the user removed
    // the background on (once per image, regardless of how many marketplaces it
    // was exported to). Fire-and-forget.
    const bgRemovedCount = bgEligibleCount
    if (bgRemovedCount > 0) {
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
          body: JSON.stringify({ count: bgRemovedCount, jobName }),
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
                  copy_title: clusterCopy[c.id]?.title ?? c.productName ?? '',
                  copy_description: c.copyDescription ?? '',
                  copy_bullets: c.copyBullets ?? [],
                  copy_variants: c.copyVariants ?? null,
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
  // AU-only upsell: lock the ANZ marketplaces behind Launch+. US orgs don't see
  // these destinations at all, so there's nothing to lock.
  const ANZ_MARKETPLACES: MarketplaceName[] = region === 'au' ? ['the-iconic', 'myer', 'david-jones'] : []
  const lockedMarketplaces: MarketplaceName[] = plan.limits.marketplaces < 2 ? ANZ_MARKETPLACES : []
  const hasBgRemoval = shootType === 'still-life' && selectedMarketplaces.some((m) => (resolveRule(m)).remove_background)
  const bgCount = confirmedClusters.reduce((n, c) => n + c.images.filter((img) => PLAIN_BG_VIEWS.has(img.viewLabel ?? '')).length, 0)
  // Images the bg-removal pre-pass will SKIP (detail/flat-lay/top-down/inside/unknown) —
  // shown under the toggle as a pre-export sanity check so a mislabelled crop is caught
  // before any file is written. Reads the exact same PLAIN_BG_VIEWS gate as the export.
  const bgSkippedImages = confirmedClusters.flatMap((c) => c.images).filter((img) => !PLAIN_BG_VIEWS.has(img.viewLabel ?? ''))
  // ~4s/image at 10 concurrent (see BG_CONCURRENCY). Shown as a rough ETA.
  const bgEtaSec = Math.ceil(bgCount / 10) * 4
  const bgEtaLabel = bgEtaSec < 60 ? `~${Math.max(5, Math.ceil(bgEtaSec / 5) * 5)}s` : `~${Math.ceil(bgEtaSec / 60)} min`
  const bgCostAud = (bgCount * 0.16).toFixed(2)

  // Estimated export file size. Uses the calibrated bytes-per-pixel (measured from
  // a real encode of the first shot) when available, scaled to each row by pixels
  // and quality; falls back to a rough per-quality curve until calibration lands.
  const fallbackBpp = (q: number) => q >= 100 ? 0.42 : q >= 95 ? 0.26 : q >= 90 ? 0.17 : q >= 85 ? 0.12 : 0.09
  const estFileKb = (w: number, h: number, quality: number, capKb: number) => {
    const bpp = calibBpp
      ? calibBpp.bpp * (fallbackBpp(quality) / fallbackBpp(calibBpp.quality)) // scale for quality diffs
      : fallbackBpp(quality)
    const kb = (w * h * bpp) / 1024
    return capKb > 0 ? Math.min(kb, capKb) : kb
  }
  const fmtSize = (kb: number) => kb >= 1024 ? `~${(kb / 1024).toFixed(1)} MB` : `~${Math.round(kb)} KB`
  // Background-removed exports composite the subject on flat #FFFFFF (+ white
  // fit-to-contain padding) → large uniform areas JPEG crushes to almost nothing,
  // so files land ~0.4× the non-removed size. Measured: 1.6 MB → 0.59 MB. Tunable.
  const BG_REMOVED_SIZE_FACTOR = 0.4
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
            {confirmedClusters.length} product{confirmedClusters.length !== 1 ? 's' : ''} · {totalSourceImages} image{totalSourceImages !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Body: 3-column grid, no scroll ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-[400px_300px_1fr] divide-x divide-[var(--line)] overflow-hidden">

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
            dimensionOverrides={dimensionOverrides}
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
              {/* Fit-to-crop mode — how the source aspect meets the marketplace crop. */}
              <div>
                <p className="text-[length:var(--font-base)] text-[var(--text)] font-medium mb-1.5">Fit to crop</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'fill', label: 'Crop to fill', sub: 'Fills the frame, crops overflow' },
                    { id: 'extend', label: 'Extend background', sub: 'Fits whole shot, pads the edges' },
                  ] as const).map(({ id, label, sub }) => {
                    const active = cropMode === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCropMode(id)}
                        className="rounded-[6px] border px-3 py-2 text-left transition-colors"
                        style={{
                          borderColor: active ? 'var(--accent)' : 'var(--line)',
                          background: active ? 'rgba(0,122,255,0.1)' : 'transparent',
                        }}
                      >
                        <span className="block text-[length:var(--font-sm)] font-semibold" style={{ color: active ? 'var(--text)' : '#c8c8c8' }}>{label}</span>
                        <span className="block text-[length:var(--font-xs)] mt-0.5" style={{ color: '#8a8a8a' }}>{sub}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[length:var(--font-xs)] mt-1.5" style={{ color: '#8a8a8a' }}>
                  {cropMode === 'fill'
                    ? 'Clean edges. May clip shots framed tight to head/feet — switch to Extend for those.'
                    : 'Keeps the whole shot. Full-length/front/side extend the backdrop; mood & detail get a plain bar.'}
                </p>
              </div>
              <Toggle on={flatExport} onToggle={() => setFlatExport(v => !v)}
                label="Flat export" sub="All images in one folder per marketplace" />
              <Toggle on={useOriginalNames} onToggle={() => setUseOriginalNames(v => !v)}
                label="Keep original filenames" sub="Skip renaming — export crops only" />
              <Toggle
                on={removeBgOnExport}
                onToggle={() => {
                  if (!removeBgOnExport && !plan.limits.bgRemoval) { openUpgrade('Background removal is available on the Growth plan and above.'); return }
                  setRemoveBgOnExport(v => !v)
                }}
                label="Remove background"
                sub="Every exported image on a clean background · $0.16/image"
              />

              {/* Pre-export sanity check: which images get bg removed vs skipped. */}
              {removeBgOnExport && (
                <div className="rounded-[6px] border border-[var(--line)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => bgSkippedImages.length > 0 && setShowBgSkipped(v => !v)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[length:var(--font-sm)] transition-colors"
                    style={{ cursor: bgSkippedImages.length > 0 ? 'pointer' : 'default' }}
                  >
                    <span className="text-left" style={{ color: '#c8c8c8' }}>
                      <span className="block">
                        <span className="text-[var(--text)] font-semibold">{bgCount}</span> of {totalSourceImages} images
                        {bgSkippedImages.length > 0
                          ? <> · <span className="text-[var(--accent3)]">{bgSkippedImages.length} skipped</span></>
                          : <> · all included</>}
                      </span>
                      {bgCount > 0 && (
                        <span className="block text-[length:var(--font-xs)] mt-0.5" style={{ color: '#8a8a8a' }}>
                          ≈ <span className="text-[var(--text2)]">${bgCostAud}</span> · {bgEtaLabel}
                        </span>
                      )}
                    </span>
                    {bgSkippedImages.length > 0 && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" className="flex-shrink-0"
                        style={{ color: '#c8c8c8', transform: showBgSkipped ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                        <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  {showBgSkipped && bgSkippedImages.length > 0 && (
                    <div className="px-3 pb-3 pt-2 border-t border-[var(--line)]">
                      <p className="text-[length:var(--font-2xs)] uppercase tracking-wide mb-2" style={{ color: '#c8c8c8' }}>
                        Skipped — background kept as-is
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-[168px] overflow-y-auto">
                        {bgSkippedImages.map((img) => (
                          <div key={img.id}
                            className="relative w-[48px] h-[48px] rounded-[3px] overflow-hidden flex-shrink-0 border border-[var(--line)]"
                            title={`${img.filename} · ${img.viewLabel}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                            <span className="absolute inset-x-0 bottom-0 bg-black/75 text-white text-center uppercase font-semibold"
                              style={{ fontSize: '8px', lineHeight: '12px' }}>
                              {img.viewLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[length:var(--font-2xs)] mt-2" style={{ color: '#8a8a8a' }}>
                        Wrong one here? Go back to review and change its angle.
                      </p>
                    </div>
                  )}
                </div>
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
              <div>
                <button
                  onClick={handleCancelExport}
                  disabled={isCancelling}
                  className="btn btn-ghost"
                >
                  {isCancelling ? 'Cancelling…' : 'Cancel export'}
                </button>
                <p className="text-[length:var(--font-xs)] text-[var(--text3)] mt-2">
                  Images already being processed will finish first.
                </p>
              </div>
            </div>

          /* ── IDLE STATE ────────────────────────────────────────────── */
          ) : (
            <div className="flex flex-col gap-5 h-full min-h-0">

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                {[
                  { singular: 'Product', plural: 'Products', value: confirmedClusters.length },
                  { singular: 'Image', plural: 'Images', value: totalSourceImages },
                  { singular: 'Marketplace', plural: 'Marketplaces', value: selectedMarketplaces.length },
                ].map(({ singular, plural, value }) => (
                  <div key={plural} className="bg-[var(--bg3)] border border-[var(--line)] rounded-sm px-4 py-4">
                    <p className="text-[length:var(--font-3xl)] font-semibold text-[var(--text)] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>{value}</p>
                    <p className="text-[length:var(--font-base)] text-[var(--text3)] mt-1.5">{value === 1 ? singular : plural}</p>
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
                      const rule = resolveRule(m)
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
                        Creates a Shopify draft listing for each product — images, SKU, colour and AI copy included.
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
                    Creates a Cin7 product record for each product — all metadata, AI copy and images included. New SKUs only; existing SKUs are skipped.
                  </p>
                  {cin7Results && (
                    <div className="bg-[var(--bg3)] rounded-sm p-2.5 mb-3 flex flex-col gap-1 max-h-[100px] overflow-y-auto">
                      {cin7Results.map((r) => (
                        <div key={r.sku} className="flex items-center justify-between text-[length:var(--font-base)]">
                          <span className="text-[var(--text2)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{r.sku}</span>
                          <span className={r.status === 'created' || r.status === 'updated' ? 'text-[var(--accent2)]' : r.status === 'skipped' ? 'text-[var(--text3)]' : r.status === 'uploading' ? 'text-[var(--text3)]' : 'text-[#ff3b30]'}>
                            {r.status === 'created' ? '✓ Created' : r.status === 'updated' ? '✓ Enriched' : r.status === 'skipped' ? '— Already exists' : r.status === 'uploading' ? '↑ Uploading…' : `✗ ${r.message ?? 'Failed'}`}
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

              {/* Output preview — a scrollable list of every export-ready file
                  (thumbnail · filename · view · dimensions · bg status), à la
                  Capture One. Fills the space with something actually useful. */}
              {confirmedClusters.length > 0 && selectedMarketplaces.length > 0 && (() => {
                const MAX_ROWS = 250
                type Row = { key: string; mp: string; filename: string; view: string; dims: string; size: string; src: string; removed: boolean }
                const rows: Row[] = []
                let totalKb = 0
                for (const m of selectedMarketplaces) {
                  const rule = resolveRule(m)
                  const template = rule.naming_template || localTemplate || '{BRAND}_{SEQ}_{VIEW}'
                  const { width, height } = rule.image_dimensions
                  const dims = `${width}×${height}`
                  const baseKb = estFileKb(width, height, rule.quality ?? 100, rule.max_file_size_kb ?? 0)
                  confirmedClusters.forEach((c, ci) => {
                    c.images.forEach((img, ii) => {
                      const filename = useOriginalNames
                        ? img.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.jpg')
                        : applyNamingTemplate(template, {
                            brand: brandCode, seq: ci + 1, sku: c.sku, color: c.color,
                            view: img.viewLabel, index: ii + 1, supplierCode: '', season: '',
                            styleNumber: c.styleNumber, colourCode: c.colourCode, isBottomwear: c.isBottomwear ?? false,
                          }) + '.jpg'
                      const removed = removeBgOnExport && PLAIN_BG_VIEWS.has(img.viewLabel ?? '')
                      const kb = removed ? baseKb * BG_REMOVED_SIZE_FACTOR : baseKb
                      totalKb += kb
                      rows.push({ key: `${m}-${c.id}-${img.id}`, mp: rule.name, filename, view: img.viewLabel ?? 'unknown', dims, size: fmtSize(kb), src: img.previewUrl, removed })
                    })
                  })
                }
                const shown = rows.slice(0, MAX_ROWS)
                const totalSize = totalKb >= 1024 ? `~${(totalKb / 1024).toFixed(totalKb >= 10240 ? 0 : 1)} MB` : `~${Math.round(totalKb)} KB`
                const multiMp = selectedMarketplaces.length > 1
                let lastMp = ''
                return (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <p className="text-[length:var(--font-base)] font-semibold text-[var(--text3)] uppercase tracking-wide">Output preview</p>
                      <span className="text-[length:var(--font-xs)] text-[var(--text3)]">{rows.length} file{rows.length !== 1 ? 's' : ''} · {totalSize}</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--bg3)] border border-[var(--line)] rounded-sm">
                      {/* Column header */}
                      <div className="sticky top-0 z-20 flex items-center gap-3 px-3 py-1.5 bg-[var(--bg3)] border-b border-[var(--line)] text-[length:var(--font-2xs)] uppercase tracking-wide" style={{ color: '#8a8a8a' }}>
                        <span className="w-9 flex-shrink-0" />
                        <span className="flex-1 min-w-0">File name</span>
                        <span className="w-32 flex-shrink-0 hidden 2xl:block">View</span>
                        <span className="w-24 flex-shrink-0">Dimensions</span>
                        <span className="w-20 flex-shrink-0 text-right">Est. size</span>
                        {removeBgOnExport && <span className="w-24 flex-shrink-0 text-right">Background</span>}
                      </div>
                      {shown.map((r) => {
                        const showHeader = multiMp && r.mp !== lastMp
                        lastMp = r.mp
                        return (
                          <div key={r.key}>
                            {showHeader && (
                              <div className="px-3 py-1.5 bg-[var(--bg4)] border-b border-[var(--line)] text-[length:var(--font-2xs)] uppercase tracking-wide font-semibold" style={{ color: 'var(--accent)' }}>{r.mp}</div>
                            )}
                            <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg4)] transition-colors">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={r.src} alt="" className="w-9 h-9 rounded-[3px] object-cover border border-[var(--line)] flex-shrink-0 bg-white" />
                              <div title={r.filename} className="scroll-x-visible flex-1 min-w-0 overflow-x-auto whitespace-nowrap text-[var(--text2)] text-[length:var(--font-sm)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{r.filename}</div>
                              <div className="w-32 flex-shrink-0 hidden 2xl:block truncate text-[length:var(--font-2xs)] uppercase tracking-wide text-[var(--text3)]">{r.view}</div>
                              <div className="w-24 flex-shrink-0 text-[length:var(--font-2xs)] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{r.dims}</div>
                              <div className="w-20 flex-shrink-0 text-right text-[length:var(--font-2xs)] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{r.size}</div>
                              {removeBgOnExport && (
                                <div className="w-24 flex-shrink-0 text-right">
                                  <span className="text-[length:var(--font-2xs)] px-1.5 py-[2px] rounded-[4px] whitespace-nowrap"
                                    style={r.removed ? { color: 'var(--accent2)', background: 'rgba(62,207,142,0.1)' } : { color: '#8a8a8a', background: 'var(--bg4)' }}>
                                    {r.removed ? 'bg removed' : 'bg kept'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {rows.length > MAX_ROWS && (
                        <div className="px-3 py-2 text-[length:var(--font-xs)] text-[var(--text3)] text-center">+ {rows.length - MAX_ROWS} more files…</div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {exportError && (() => {
                const cancelled = exportError.startsWith('Export cancelled')
                return (
                  <div className={`text-[length:var(--font-sm)] rounded-lg px-4 py-3 flex-shrink-0 ${cancelled ? 'text-[var(--text2)] bg-[var(--bg3)] border border-[var(--line)]' : 'text-red-600 bg-red-50 border border-red-200'}`}>
                    <span className="font-medium">{cancelled ? 'Cancelled:' : 'Export error:'}</span> {cancelled ? exportError.replace(/^Export cancelled\.\s*/, '') : exportError}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer CTA ─────────────────────────────────────────────────────── */}
      {!done && (
        <div className="border-t border-[var(--line)] px-6 h-[60px] flex items-center justify-between flex-shrink-0">
          <p className="text-[length:var(--font-sm)] text-[var(--text3)]">
            {confirmedClusters.length === 0
              ? 'Confirm at least one product to export'
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
