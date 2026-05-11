'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import { useSession } from '@/store/session'
import { useBrand } from '@/context/BrandContext'
import { applyNamingTemplate } from '@/lib/brands'
import type { MarketplaceName, Job } from '@/types'

declare global {
  interface Window {
    showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
    showSaveFilePicker?: (opts?: { suggestedName?: string; types?: { description?: string; accept?: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle>
  }
  interface FileSystemDirectoryHandle {
    getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
    getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemFileHandle>
  }
  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>
    getFile(): Promise<File>
  }
  interface FileSystemWritableFileStream {
    write(data: BufferSource | Blob | string): Promise<void>
    close(): Promise<void>
  }
}

// ── Dark theme tokens ────────────────────────────────────────────────────────
const BG      = '#252525'
const CARD    = '#2f2f2f'
const CARD2   = '#363636'
const BORDER  = 'rgba(255,255,255,0.08)'
const T1      = '#ffffff'
const T2      = 'rgba(255,255,255,0.55)'
const T3      = 'rgba(255,255,255,0.3)'

// ── Marketplace palette (dark theme) ─────────────────────────────────────────
const PALETTE: Record<MarketplaceName, { dot: string; text: string; selBg: string; selBorder: string }> = {
  'the-iconic':  { dot: '#ff9f0a', text: '#ff9f0a', selBg: 'rgba(255,159,10,0.18)',  selBorder: '#ff9f0a' },
  myer:          { dot: '#ff3b30', text: '#ff5c52', selBg: 'rgba(255,59,48,0.18)',   selBorder: '#ff3b30' },
  'david-jones': { dot: '#0a84ff', text: '#4da3ff', selBg: 'rgba(10,132,255,0.18)',  selBorder: '#0a84ff' },
  shopify:       { dot: '#30d158', text: '#30d158', selBg: 'rgba(48,209,88,0.15)',   selBorder: '#30d158' },
  joor:          { dot: '#5856d6', text: '#7b79e8', selBg: 'rgba(88,86,214,0.15)',   selBorder: '#5856d6' },
}

const DESCRIPTIONS: Record<MarketplaceName, string> = {
  'the-iconic':  'AU & NZ fashion',
  myer:          'Department store',
  'david-jones': 'Luxury retail',
  shopify:       'Your storefront',
  joor:          'Wholesale B2B',
}

// ── Shopify draft state ───────────────────────────────────────────────────────
type DraftStatus = 'queued' | 'creating' | 'created' | 'error'
interface DraftItem { id: string; label: string; sku: string; status: DraftStatus; adminUrl?: string; message?: string }

// ── Image processing (canvas resize + crop to fit) ───────────────────────────
async function processImage(file: File, w: number, h: number, bg = '#ffffff'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
      const sa = img.width / img.height; const da = w / h
      let sx = 0, sy = 0, sw = img.width, sh = img.height
      if (sa > da) { sw = img.height * da; sx = (img.width - sw) / 2 }
      else { sh = img.width / da; sy = (img.height - sh) / 2 }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('toBlob failed')); return }
        resolve(blob)
      }, 'image/jpeg', 0.92)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

export default function ExportPage({ params }: { params: { jobId: string } }) {
  const router = useRouter()
  const { clusters: sessionClusters, jobName, isReady, markClustersExported, reset } = useSession()
  const { activeBrand, brands } = useBrand()

  const [job, setJob] = useState<Job | null>(null)
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<MarketplaceName[]>(['shopify'])
  const [downloadZip, setDownloadZip] = useState(false)
  const [flatExport, setFlatExport] = useState(false)
  const [keepOriginalFilenames, setKeepOriginalFilenames] = useState(false)
  const [namingTemplate, setNamingTemplate] = useState('{BRAND}_{SEQ}_{VIEW}')

  // Shopify push state
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [isPushing, setIsPushing] = useState(false)
  const [pushDone, setPushDone] = useState(false)
  const [pushCancelled, setPushCancelled] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const cancelPushRef = useRef(false)
  const draftListRef = useRef<HTMLDivElement>(null)

  // Download ZIP state
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadDone, setDownloadDone] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState('')

  // Folder save state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folderHandleRef = useRef<any>(null)
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [fsaSupported, setFsaSupported] = useState(false)
  const [isSavingToFolder, setIsSavingToFolder] = useState(false)
  const [folderProgress, setFolderProgress] = useState(0)
  const [folderStatus, setFolderStatus] = useState('')
  const [folderDone, setFolderDone] = useState(false)
  const [writtenFiles, setWrittenFiles] = useState<{ marketplace: string; count: number }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFsaSupported(typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function')
    if (params.jobId === 'session') return
    fetch(`/api/jobs/${params.jobId}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setJob(data)
          if (data.selected_marketplaces?.length) setSelectedMarketplaces(data.selected_marketplaces)
        }
      }).catch(() => {})
  }, [params.jobId])

  useEffect(() => {
    const b = activeBrand ?? brands[0]
    if (b) {
      setNamingTemplate(b.naming_template || '{BRAND}_{SEQ}_{VIEW}')
      setSelectedBrandId(b.id)
    }
  }, [activeBrand, brands])

  const confirmedClusters = sessionClusters
    .filter((c) => c.confirmed)
    .sort((a, b) => parseInt(a.label?.match(/\d+/)?.[0] ?? '0', 10) - parseInt(b.label?.match(/\d+/)?.[0] ?? '0', 10))
  const shopifyBrands = brands.filter((b) => b.shopify_store_url && b.shopify_authenticated)
  const shopifyBrand = shopifyBrands.find((b) => b.id === selectedBrandId) ?? shopifyBrands[0] ?? null

  // ── Filename resolver ────────────────────────────────────────────────────────
  const resolveFilename = (
    originalFilename: string,
    templateVars: Parameters<typeof applyNamingTemplate>[1]
  ): string => {
    if (keepOriginalFilenames) {
      return originalFilename.replace(/\.[^.]+$/, '')
    }
    const tpl = namingTemplate || '{BRAND}_{SEQ}_{VIEW}'
    return applyNamingTemplate(tpl, templateVars) || `${templateVars.brand}_${String(templateVars.seq).padStart(3, '0')}_${templateVars.view}`
  }

  // ── Live naming preview ──────────────────────────────────────────────────────
  const exampleFilename = (() => {
    const b = shopifyBrand ?? activeBrand ?? brands[0]
    if (!b) return 'FC_001_FRONT.jpg'
    const views = b.on_model_angle_sequence ?? ['front']
    return applyNamingTemplate(namingTemplate, {
      brand: b.brand_code, seq: 1, sku: `${b.brand_code}-001`, color: 'BLACK',
      view: views[0] ?? 'front', index: 1,
    }) + '.jpg'
  })()

  // ── Shopify push ─────────────────────────────────────────────────────────────
  const handleShopifyPush = useCallback(async () => {
    if (!shopifyBrand || confirmedClusters.length === 0) return
    cancelPushRef.current = false
    setIsPushing(true)
    setPushDone(false)
    setPushCancelled(false)
    setPushError(null)

    // Seed the draft list
    const initial: DraftItem[] = confirmedClusters.map((c, i) => ({
      id: c.id,
      label: c.label ?? `Look ${i + 1}`,
      sku: c.sku ?? `${shopifyBrand.brand_code}-${String(i + 1).padStart(3, '0')}`,
      status: 'queued',
    }))
    setDrafts(initial)

    const rule = MARKETPLACE_RULES['shopify']
    const { createClient } = await import('@/lib/supabase/client')
    const { data: { session } } = await createClient().auth.getSession()
    const authHeader: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}

    for (let ci = 0; ci < confirmedClusters.length; ci++) {
      if (cancelPushRef.current) break
      const cluster = confirmedClusters[ci]
      const draftSku = cluster.sku ?? `${shopifyBrand.brand_code}-${String(ci + 1).padStart(3, '0')}`

      setDrafts((prev) => prev.map((d) => d.id === cluster.id ? { ...d, status: 'creating' } : d))

      try {
        const images: { filename: string; src: string }[] = []
        const tempPaths: string[] = []

        for (let ii = 0; ii < cluster.images.length; ii++) {
          const img = cluster.images[ii]
          if (!img.file) continue
          const blob = await processImage(img.file, rule.image_dimensions.width, rule.image_dimensions.height, rule.background_color)
          const filename = resolveFilename(img.filename, {
            brand: shopifyBrand.brand_code, seq: ci + 1, sku: cluster.sku, color: cluster.color ?? undefined,
            view: img.viewLabel, index: ii + 1, isBottomwear: cluster.isBottomwear,
          }) + '.jpg'
          const storagePath = `temp/${shopifyBrand.id}/${Date.now()}_${ci}_${ii}_${filename}`
          const stageForm = new FormData()
          stageForm.append('file', blob, filename)
          stageForm.append('path', storagePath)
          const stageRes = await fetch('/api/shopify/stage-image', {
            method: 'POST',
            headers: authHeader,
            body: stageForm,
          })
          const stageJson = await stageRes.json()
          if (!stageRes.ok) throw new Error(stageJson.error ?? 'Image staging failed')
          images.push({ filename, src: stageJson.url })
          tempPaths.push(storagePath)
        }

        const res = await fetch('/api/shopify/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({
            brand_id: shopifyBrand.id,
            clusters: [{
              sku: draftSku,
              productName: cluster.label ?? draftSku,
              color: cluster.color ?? '',
              images,
            }],
            tempPaths,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`)
        const result = json.data?.results?.[0]
        setDrafts((prev) => prev.map((d) =>
          d.id === cluster.id
            ? { ...d, status: result?.status === 'created' ? 'created' : 'error', adminUrl: result?.adminUrl, message: result?.message ?? 'Unknown error' }
            : d
        ))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setDrafts((prev) => prev.map((d) => d.id === cluster.id ? { ...d, status: 'error', message } : d))
      }
    }

    setIsPushing(false)
    if (cancelPushRef.current) {
      setPushCancelled(true)
    } else {
      setPushDone(true)
      saveJobToHistory(authHeader)
      markClustersExported(confirmedClusters.map((c) => c.id))
    }
  }, [shopifyBrand, confirmedClusters, namingTemplate, markClustersExported]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Folder save ──────────────────────────────────────────────────────────────
  const pickFolder = async () => {
    if (!window.showDirectoryPicker) return
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      folderHandleRef.current = handle
      setFolderPath(handle.name)
      setFolderDone(false); setWrittenFiles([])
    } catch { /* cancelled */ }
  }

  const getAuthHeader = async (): Promise<Record<string, string>> => {
    const { createClient } = await import('@/lib/supabase/client')
    const { data: { session } } = await createClient().auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  const saveJobToHistory = async (authHeader: Record<string, string>) => {
    const name = job?.name ?? jobName ?? 'Untitled Shoot'
    const imageCount = confirmedClusters.reduce((s, c) => s + c.images.length, 0)
    try {
      const res = await fetch('/api/jobs/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          job_name: name,
          image_count: imageCount,
          cluster_count: confirmedClusters.length,
          marketplaces: selectedMarketplaces,
          brand_id: activeBrand?.id ?? null,
        }),
      })
      if (!res.ok) return
      const { data: historyRecord } = await res.json()
      if (!historyRecord?.id) return
      const histId = historyRecord.id

      // Save session to IDB under the history ID (same-device reopen)
      const { saveSession, deleteSession } = await import('@/lib/session-store')
      await Promise.all([
        saveSession(histId, name, confirmedClusters, selectedMarketplaces, activeBrand?.id ?? null),
        deleteSession('draft'),
      ])

      // Save cluster metadata to Supabase (cross-device reopen for team members)
      fetch(`/api/jobs/${histId}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          clusters: confirmedClusters.map((c, i) => ({
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
      }).catch(() => { /* non-critical */ })
    } catch { /* non-critical */ }
  }

  const handleDownloadZip = async () => {
    setError(null)
    setIsDownloading(true)
    setDownloadDone(false)
    setDownloadProgress(0)
    const filename = `${(job?.name ?? jobName ?? 'export').replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.zip`

    // showSaveFilePicker MUST be the first await — browser requires it to still
    // be within the original user gesture. If called after other awaits it throws.
    let fileHandle: FileSystemFileHandle | null = null
    if (window.showSaveFilePicker) {
      try {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }],
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') { setIsDownloading(false); return }
        // Picker not available or failed — fall through to anchor download
      }
    }

    const saveBlob = async (blob: Blob) => {
      if (fileHandle) {
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = filename; a.click()
        URL.revokeObjectURL(url)
      }
    }

    try {
      if (params.jobId === 'session') {
        setDownloadStatus('Processing images…')
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        const total = confirmedClusters.reduce((s, c) => s + c.images.filter(i => i.file).length, 0) * selectedMarketplaces.length
        let done = 0
        for (const marketId of selectedMarketplaces) {
          const rule = MARKETPLACE_RULES[marketId]
          const folder = zip.folder(rule.name.replace(/\s+/g, '_'))!
          for (let ci = 0; ci < confirmedClusters.length; ci++) {
            const cluster = confirmedClusters[ci]
            for (let ii = 0; ii < cluster.images.length; ii++) {
              const img = cluster.images[ii]
              if (!img.file) continue
              const imgBlob = await processImage(img.file, rule.image_dimensions.width, rule.image_dimensions.height, rule.background_color)
              const fname = resolveFilename(img.filename, {
                brand: shopifyBrand?.brand_code ?? activeBrand?.brand_code ?? 'BRAND',
                seq: ci + 1, sku: cluster.sku, color: cluster.color ?? undefined,
                view: img.viewLabel, index: ii + 1, isBottomwear: cluster.isBottomwear,
              }) + '.jpg'
              folder.file(fname, await imgBlob.arrayBuffer())
              done++; setDownloadProgress(Math.round((done / total) * 80))
            }
          }
        }
        setDownloadStatus('Compressing…')
        setDownloadProgress(85)
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
        setDownloadStatus('Saving…')
        setDownloadProgress(95)
        await saveBlob(blob)
      } else {
        setDownloadStatus('Building ZIP…')
        setDownloadProgress(20)
        const authHeader = await getAuthHeader()
        const res = await fetch('/api/export/zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({ job_id: params.jobId, marketplaces: selectedMarketplaces, job_name: job?.name }),
        })
        if (!res.ok) throw new Error(await res.text() || 'Export failed')
        setDownloadProgress(80)
        setDownloadStatus('Saving…')
        await saveBlob(await res.blob())
      }
      setDownloadProgress(100)
      setDownloadStatus('Done')
      setDownloadDone(true)
      const dlAuthHeader = await getAuthHeader()
      saveJobToHistory(dlAuthHeader)
      markClustersExported(confirmedClusters.map((c) => c.id))
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') { setIsDownloading(false); return }
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSaveToFolder = async () => {
    if (!folderHandleRef.current || !selectedMarketplaces.length) return
    setIsSavingToFolder(true); setFolderProgress(0); setFolderStatus('Processing images…')
    setFolderDone(false); setWrittenFiles([]); setError(null)
    try {
      if (params.jobId === 'session') {
        // Write directly to disk one file at a time — avoids buffering all images in memory
        const brandCode = shopifyBrand?.brand_code ?? activeBrand?.brand_code ?? 'BRAND'
        // If File references are missing (e.g. after a page refresh), try to restore from IDB
        let clustersToExport = confirmedClusters
        const filesAvailable = () => clustersToExport.reduce((s, c) => s + c.images.filter((i) => i.file).length, 0)

        if (clustersToExport.length > 0 && filesAvailable() === 0) {
          setFolderStatus('Restoring session…')
          try {
            const { loadSession } = await import('@/lib/session-store')
            const restored = await loadSession('draft')
            if (restored && restored.clusters.length > 0) {
              const restoredConfirmed = restored.clusters
                .filter((c) => c.confirmed)
                .sort((a, b) => parseInt(a.label?.match(/\d+/)?.[0] ?? '0', 10) - parseInt(b.label?.match(/\d+/)?.[0] ?? '0', 10))
              if (restoredConfirmed.reduce((s, c) => s + c.images.filter((i) => i.file).length, 0) > 0) {
                clustersToExport = restoredConfirmed
                useSession.getState().setSession(restored.jobName, restored.clusters, restored.marketplaces)
              }
            }
          } catch { /* ignore — will throw below if still missing */ }
          setFolderStatus('Processing images…')
        }

        const totalImages = clustersToExport.reduce((s, c) => s + c.images.length, 0)

        if (clustersToExport.length === 0) {
          throw new Error('No confirmed clusters to export. Return to review and confirm at least one look.')
        }
        if (filesAvailable() === 0) {
          throw new Error(`Image files are not available (${totalImages} images found, 0 with file data). Return to review and navigate to export without refreshing the page.`)
        }

        const total = filesAvailable() * selectedMarketplaces.length
        let done = 0
        const results: { marketplace: string; count: number }[] = []
        for (const marketId of selectedMarketplaces) {
          const rule = MARKETPLACE_RULES[marketId]
          const mpFolderName = rule.name.replace(/\s+/g, '_')
          const mpHandle = await folderHandleRef.current.getDirectoryHandle(mpFolderName, { create: true })
          let mpCount = 0
          for (let ci = 0; ci < clustersToExport.length; ci++) {
            const cluster = clustersToExport[ci]
            const skuFolder = String(ci + 1).padStart(3, '0')
            let dirHandle = mpHandle
            if (!flatExport) {
              dirHandle = await mpHandle.getDirectoryHandle(skuFolder, { create: true })
            }
            for (let ii = 0; ii < cluster.images.length; ii++) {
              const img = cluster.images[ii]
              if (!img.file) continue
              setFolderStatus(`${mpFolderName} · ${done + 1}/${total}`)
              const imgBlob = await processImage(img.file, rule.image_dimensions.width, rule.image_dimensions.height, rule.background_color)
              const fname = resolveFilename(img.filename, {
                brand: brandCode, seq: ci + 1, sku: cluster.sku, color: cluster.color ?? undefined,
                view: img.viewLabel, index: ii + 1, isBottomwear: cluster.isBottomwear,
              }) + '.jpg'
              const fh = await dirHandle.getFileHandle(fname, { create: true })
              const w = await fh.createWritable()
              await w.write(imgBlob)
              await w.close()
              const written = await fh.getFile()
              if (written.size === 0) throw new Error(`File written but is 0 bytes: ${fname}. Check folder write permissions.`)
              done++; mpCount++
              setFolderProgress(Math.round((done / total) * 100))
            }
          }
          results.push({ marketplace: mpFolderName, count: mpCount })
        }
        setFolderProgress(100); setFolderStatus('Done')
        setWrittenFiles(results)
        if (done === 0) {
          throw new Error('No images were written. Image file data may be missing — return to review and navigate to export without refreshing the page.')
        }
        setFolderDone(true)
      } else {
        // Historical job: fetch ZIP from server then extract to folder
        setFolderStatus('Fetching images…')
        const authHeader = await getAuthHeader()
        const res = await fetch('/api/export/zip', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({ job_id: params.jobId, marketplaces: selectedMarketplaces, job_name: job?.name }),
        })
        if (!res.ok) throw new Error(await res.text() || 'Export failed')
        setFolderProgress(40); setFolderStatus('Parsing package…')
        const JSZip = (await import('jszip')).default
        const zip = await JSZip.loadAsync(await res.blob())
        const entries = Object.entries(zip.files).filter(([, f]) => !f.dir)
        const results: { marketplace: string; count: number }[] = []
        const mpCounts: Record<string, number> = {}
        let written = 0
        setFolderStatus(`Writing ${entries.length} files…`)
        for (const [path, file] of entries) {
          const parts = path.split('/')
          const mpName = parts[0]
          const fileName = parts[parts.length - 1]
          const data = await file.async('arraybuffer')
          const mpHandle = await folderHandleRef.current.getDirectoryHandle(mpName, { create: true })
          let dirHandle = mpHandle
          if (!flatExport && parts.length > 2) {
            // preserve SKU subfolder from ZIP structure
            for (let pi = 1; pi < parts.length - 1; pi++) {
              dirHandle = await dirHandle.getDirectoryHandle(parts[pi], { create: true })
            }
          }
          const fh = await dirHandle.getFileHandle(fileName, { create: true })
          const w = await fh.createWritable()
          await w.write(new Blob([data], { type: 'image/jpeg' }))
          await w.close()
          mpCounts[mpName] = (mpCounts[mpName] ?? 0) + 1
          written++
          setFolderProgress(70 + Math.round((written / entries.length) * 30))
        }
        for (const [mp, count] of Object.entries(mpCounts)) results.push({ marketplace: mp, count })
        setFolderProgress(100); setFolderStatus('Done')
        setWrittenFiles(results); setFolderDone(true)
      }
      const folderAuthHeader = await getAuthHeader()
      saveJobToHistory(folderAuthHeader)
      markClustersExported(confirmedClusters.map((c) => c.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save files')
    } finally { setIsSavingToFolder(false) }
  }

  const isRunning = isPushing || isSavingToFolder || isDownloading
  const isFolderBusy = isSavingToFolder
  const isZipBusy = isDownloading
  const draftsCreated = drafts.filter((d) => d.status === 'created').length
  const pct = isPushing && drafts.length > 0 ? Math.round((draftsCreated / drafts.length) * 100) : (pushDone ? 100 : 0)
  const canPush = selectedMarketplaces.includes('shopify') && shopifyBrand && confirmedClusters.length > 0

  // Output preview data
  const previewClusters = confirmedClusters.slice(0, 3)

  // ── Toggle button ─────────────────────────────────────────────────────────────
  const Toggle = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      style={{
        width: '40px', height: '24px', borderRadius: '12px', border: 'none',
        background: on ? '#30d158' : 'rgba(255,255,255,0.15)',
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: on ? '19px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: 'white',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )

  return (
    <div style={{ background: BG, minHeight: '100vh', color: T1 }}>

      {/* ── Custom top bar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '0 20px', height: '56px',
        borderBottom: `1px solid ${BORDER}`,
        background: '#111111',
      }}>
        <Link
          href={params.jobId === 'session' ? '/dashboard/review' : `/dashboard/jobs/${params.jobId}/validation`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: T2, textDecoration: 'none', flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 11L5 7l4-4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to review
        </Link>

        <div style={{ width: '1px', height: '20px', background: BORDER }} />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '14px', fontWeight: 600, color: T1 }}>
            Export{(job?.name || jobName) ? ` · ${job?.name ?? jobName}` : ''}
          </h1>
          {(job?.cluster_count ?? confirmedClusters.length > 0) && (
            <span style={{ fontSize: '13px', color: T3 }}>
              {job?.cluster_count ?? confirmedClusters.length} clusters · {job?.total_images ?? confirmedClusters.reduce((s, c) => s + c.images.length, 0)} images
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => router.back()}
            style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: `1px solid ${BORDER}`, background: 'transparent', color: T1, cursor: 'pointer' }}
          >
            Cancel
          </button>
          {folderPath && (
            <button
              onClick={handleSaveToFolder}
              disabled={isFolderBusy || selectedMarketplaces.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                border: 'none', background: T1, color: '#000', cursor: 'pointer',
                opacity: (isFolderBusy || selectedMarketplaces.length === 0) ? 0.4 : 1,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6.5 9V1M4 6.5l2.5 2.5 2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1.5 11.5h10" strokeLinecap="round"/>
              </svg>
              {isFolderBusy ? 'Saving…' : 'Save to folder'}
            </button>
          )}
          {downloadZip && (
            <button
              onClick={handleDownloadZip}
              disabled={isZipBusy || selectedMarketplaces.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                border: 'none', background: T1, color: '#000', cursor: 'pointer',
                opacity: (isZipBusy || selectedMarketplaces.length === 0) ? 0.4 : 1,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6.5 9V1M4 6.5l2.5 2.5 2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1.5 11.5h10" strokeLinecap="round"/>
              </svg>
              {isZipBusy ? 'Downloading…' : 'Download ZIP'}
            </button>
          )}
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

        {/* ── LEFT panel ───────────────────────────────────────────────────── */}
        <div style={{ borderRight: `1px solid ${BORDER}`, overflowY: 'auto', padding: '20px' }}>

          {/* Marketplaces */}
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: T3, textTransform: 'uppercase', marginBottom: '10px' }}>
            Marketplaces
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
            {(Object.keys(MARKETPLACE_RULES) as MarketplaceName[]).map((id) => {
              const rule = MARKETPLACE_RULES[id]
              const isSelected = selectedMarketplaces.includes(id)
              const p = PALETTE[id]
              return (
                <button
                  key={id}
                  onClick={() => setSelectedMarketplaces((prev) =>
                    prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
                  )}
                  style={{
                    position: 'relative',
                    background: isSelected ? p.selBg : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? p.selBorder : BORDER}`,
                    borderRadius: '10px', padding: '12px',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                    opacity: isSelected ? 1 : 0.45,
                  }}
                >
                  {isSelected && (
                    <span style={{
                      position: 'absolute', top: '10px', right: '10px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: p.dot,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <polyline points="1 4 3 6.5 7 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: p.dot }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? p.text : T2 }}>
                      {rule.name}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: T3, fontFamily: 'var(--font-dm-mono)' }}>
                    {rule.image_dimensions.width}×{rule.image_dimensions.height}px · {rule.file_format.toUpperCase()} Q{rule.quality}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Output */}
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: T3, textTransform: 'uppercase', marginBottom: '10px' }}>
            Output
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: T2 }}>Download ZIP</span>
              <Toggle on={downloadZip} onChange={() => setDownloadZip((v) => !v)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: T2 }}>Save to folder</span>
              <Toggle on={!!folderPath} onChange={!folderPath ? pickFolder : () => { folderHandleRef.current = null; setFolderPath(null) }} />
            </div>
            {folderPath && (
              <p style={{ fontSize: '11px', color: '#30d158', fontFamily: 'var(--font-dm-mono)' }}>
                ✓ {folderPath}/
              </p>
            )}
            {!fsaSupported && (
              <p style={{ fontSize: '11px', color: '#ff9f0a' }}>Save to folder requires Chrome or Edge.</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '13px', color: T2 }}>Flat export</span>
                <p style={{ fontSize: '11px', color: T3, marginTop: '1px' }}>All files in one folder per marketplace</p>
              </div>
              <Toggle on={flatExport} onChange={() => setFlatExport((v) => !v)} />
            </div>
          </div>

          {/* Shopify brand (if multiple) */}
          {shopifyBrands.length > 1 && selectedMarketplaces.includes('shopify') && (
            <>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: T3, textTransform: 'uppercase', marginBottom: '10px' }}>
                Shopify Brand
              </p>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                style={{ width: '100%', background: CARD2, border: `1px solid ${BORDER}`, borderRadius: '8px', color: T1, padding: '8px 10px', fontSize: '13px', marginBottom: '24px' }}
              >
                {shopifyBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </>
          )}

          {/* File naming */}
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: T3, textTransform: 'uppercase', marginBottom: '10px' }}>
            File Naming
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <span style={{ fontSize: '13px', color: T2 }}>Keep original filenames</span>
              <p style={{ fontSize: '11px', color: T3, marginTop: '1px' }}>Only apply marketplace crop &amp; resize</p>
            </div>
            <Toggle on={keepOriginalFilenames} onChange={() => setKeepOriginalFilenames((v) => !v)} />
          </div>
          {!keepOriginalFilenames && (
            <input
              value={namingTemplate}
              onChange={(e) => setNamingTemplate(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: CARD2, border: `1px solid ${BORDER}`,
                borderRadius: '8px', color: T1, padding: '9px 10px',
                fontSize: '13px', fontFamily: 'var(--font-dm-mono)',
                marginBottom: '10px',
              }}
            />
          )}

          {/* Output preview — inline under naming */}
          {(confirmedClusters.length > 0 || selectedMarketplaces.length > 0) && (
            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '10px', lineHeight: 1.7, color: T3 }}>
              {selectedMarketplaces.map((marketId) => {
                const rule = MARKETPLACE_RULES[marketId]
                const folderName = rule.name.replace(/\s+/g, '_')
                return (
                  <div key={marketId} style={{ marginBottom: '4px' }}>
                    <span style={{ color: T2 }}>{folderName}/</span>
                    {previewClusters.map((c, ci) => {
                      const seq = String(ci + 1).padStart(3, '0')
                      const firstImg = c.images[0]
                      const filename = firstImg
                        ? (keepOriginalFilenames
                            ? firstImg.filename
                            : resolveFilename(firstImg.filename, {
                                brand: shopifyBrand?.brand_code ?? activeBrand?.brand_code ?? 'BRAND', seq: ci + 1,
                                sku: c.sku ?? seq, color: c.color ?? undefined,
                                view: firstImg.viewLabel, index: 1, isBottomwear: c.isBottomwear,
                              }) + '.jpg')
                        : null
                      const isLast = ci === previewClusters.length - 1 && confirmedClusters.length <= 3
                      return (
                        <div key={c.id} style={{ paddingLeft: '12px' }}>
                          <span>{isLast ? '└─' : '├─'} </span>
                          <span style={{ color: T2 }}>{seq}/</span>
                          {filename && (
                            <div style={{ paddingLeft: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <span>└─ </span><span>{filename}</span>
                              {c.images.length > 1 && <span style={{ color: 'rgba(255,255,255,0.2)' }}> +{c.images.length - 1}</span>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {confirmedClusters.length > 3 && (
                      <div style={{ paddingLeft: '12px', color: 'rgba(255,255,255,0.2)' }}>
                        └─ ({confirmedClusters.length - 3} more…)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT panel ──────────────────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {[
              { value: job?.cluster_count ?? '—', label: 'Clusters', green: false },
              { value: job?.total_images ?? '—', label: 'Images', green: false },
              { value: pushDone || isPushing ? draftsCreated : (confirmedClusters.length > 0 ? confirmedClusters.length : (job?.cluster_count ?? '—')), label: 'Shopify drafts created', green: true },
            ].map(({ value, label, green }) => (
              <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '16px 18px' }}>
                <p style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-1.5px', color: green ? '#30d158' : T1, lineHeight: 1, marginBottom: '4px' }}>
                  {String(value)}
                </p>
                <p style={{ fontSize: '12px', color: T3 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Shopify hero panel */}
          {selectedMarketplaces.includes('shopify') && (isPushing || pushDone || drafts.length > 0) && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 18px', borderBottom: `1px solid ${BORDER}` }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: T1, letterSpacing: '-0.2px', marginBottom: '3px' }}>
                    {pushCancelled ? 'Push stopped' : 'Creating Shopify draft listings'}
                  </p>
                  <p style={{ fontSize: '12px', color: T3 }}>
                    {pushCancelled
                      ? `${draftsCreated} of ${drafts.length} drafts created before stopping`
                      : 'Images · SKU · colour · AI copy — all included'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {isPushing && (
                    <button
                      onClick={() => { cancelPushRef.current = true }}
                      style={{
                        padding: '4px 12px', borderRadius: '20px', border: `1px solid rgba(255,69,58,0.4)`,
                        background: 'rgba(255,69,58,0.1)', color: '#ff453a',
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Stop push
                    </button>
                  )}
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px',
                    background: pushCancelled ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.15)',
                    color: pushCancelled ? '#ff9f0a' : '#30d158',
                    fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-dm-mono)',
                  }}>
                    {draftsCreated} / {drafts.length}
                  </span>
                </div>
              </div>

              {/* Progress bar + status */}
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{
                    height: '100%', borderRadius: '3px',
                    background: 'linear-gradient(90deg, #30d158, #34c759)',
                    width: `${pct}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <p style={{ fontSize: '12px', color: T3 }}>
                  {draftsCreated} of {drafts.length} drafts created
                  {isPushing && drafts.length > 0 && draftsCreated < drafts.length && ' · working…'}
                  {pushDone && ' · complete'}
                  {pushCancelled && ' · stopped'}
                </p>
              </div>

              {/* Per-cluster list */}
              <div
                ref={draftListRef}
                style={{ maxHeight: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
              >
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 18px',
                      background: d.status === 'created' ? 'rgba(48,209,88,0.07)' : d.status === 'creating' ? 'rgba(255,255,255,0.03)' : 'transparent',
                      borderBottom: `1px solid ${BORDER}`,
                      transition: 'background 0.3s',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: d.status === 'created' ? T2 : T3, fontFamily: 'var(--font-dm-mono)' }}>
                      {d.label}
                    </span>
                    {d.status === 'created' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#30d158' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="7" fill="rgba(48,209,88,0.2)"/>
                          <polyline points="3.5 7 5.5 9.5 10.5 4" stroke="#30d158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Draft created
                      </span>
                    )}
                    {d.status === 'creating' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: T2 }}>
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: `1.5px solid rgba(255,255,255,0.3)`, borderTopColor: T1, animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                        Creating…
                      </span>
                    )}
                    {d.status === 'queued' && (
                      <span style={{ fontSize: '13px', color: T3 }}>Queued</span>
                    )}
                    {d.status === 'error' && (
                      <span style={{ fontSize: '12px', color: '#ff453a', maxWidth: '220px', textAlign: 'right' }}>
                        {d.message ? d.message.slice(0, 80) : 'Failed'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shopify ready-state (before push) */}
          {selectedMarketplaces.includes('shopify') && !isPushing && !pushDone && drafts.length === 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#30d158', animation: 'pulse 2s ease-in-out infinite' }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: T1 }}>Ready to push to Shopify</p>
              </div>
              <p style={{ fontSize: '13px', color: T3, lineHeight: 1.5, marginBottom: canPush ? '14px' : '0' }}>
                {!shopifyBrand
                  ? 'No brand has Shopify authorisation. Go to Brands, edit your brand, and click Connect with Shopify.'
                  : confirmedClusters.length === 0
                  ? 'No confirmed clusters in this session. Return to review and confirm at least one look.'
                  : `${confirmedClusters.length} confirmed cluster${confirmedClusters.length !== 1 ? 's' : ''} · ${confirmedClusters.reduce((s, c) => s + c.images.length, 0)} images will be pushed to ${shopifyBrand.shopify_store_url}.`
                }
              </p>
              {!shopifyBrand && (
                <Link href="/dashboard/brands" style={{ fontSize: '13px', color: '#0a84ff', textDecoration: 'none' }}>
                  Configure Shopify credentials →
                </Link>
              )}
              {canPush && (
                <button
                  onClick={handleShopifyPush}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '10px',
                    background: '#30d158', border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 600, color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12c0-2 1.5-4 5-4s5 2 5 4" strokeLinecap="round"/>
                    <circle cx="7" cy="4" r="2.5"/>
                  </svg>
                  Create {confirmedClusters.length} Shopify draft{confirmedClusters.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}

          {/* Coming-soon push panels — The Iconic, Myer, David Jones, JOOR */}
          {(['the-iconic', 'myer', 'david-jones', 'joor'] as const).map((marketId) => {
            if (!selectedMarketplaces.includes(marketId)) return null
            const p = PALETTE[marketId]
            const rule = MARKETPLACE_RULES[marketId]
            const subtitles: Record<string, string> = {
              'the-iconic': 'Create SellerCenter listings with images directly from ShotSync',
              'myer':        'Push product listings directly to Myer\'s supplier portal',
              'david-jones': 'Push product listings directly to David Jones\' supplier portal',
              'joor':        'Push wholesale product listings and lookbook images to JOOR',
            }
            return (
              <div key={marketId} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden', opacity: 0.75 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 18px', borderBottom: `1px solid ${BORDER}` }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: T1, letterSpacing: '-0.2px' }}>
                        {rule.name} — Direct Push
                      </p>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: '20px',
                        background: 'rgba(10,132,255,0.15)', color: '#4da3ff',
                      }}>Coming soon</span>
                    </div>
                    <p style={{ fontSize: '12px', color: T3 }}>{subtitles[marketId]}</p>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px',
                    background: `${p.selBg}`, color: p.text,
                    fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-dm-mono)',
                    flexShrink: 0, opacity: 0.5,
                  }}>0 / {confirmedClusters.length}</span>
                </div>

                {/* Progress bar */}
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ height: '100%', width: '0%', borderRadius: '3px', background: p.dot }} />
                  </div>
                  <p style={{ fontSize: '12px', color: T3 }}>0 of {confirmedClusters.length} listings ready · integration coming soon</p>
                </div>

                {/* Cluster list — greyed out preview */}
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {confirmedClusters.map((d) => (
                    <div key={d.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 18px', borderBottom: `1px solid ${BORDER}`,
                    }}>
                      <span style={{ fontSize: '13px', color: T3, fontFamily: 'var(--font-dm-mono)' }}>{d.label}</span>
                      <span style={{ fontSize: '12px', color: T3 }}>Queued</span>
                    </div>
                  ))}
                </div>

                {/* Disabled push button */}
                <div style={{ padding: '14px 18px' }}>
                  <button disabled style={{
                    width: '100%', padding: '11px', borderRadius: '10px',
                    background: p.selBg, border: `1px solid ${p.selBorder}`,
                    cursor: 'not-allowed', fontSize: '13px', fontWeight: 600, color: p.text,
                    opacity: 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                    Push to {rule.name} — Coming Soon
                  </button>
                </div>
              </div>
            )
          })}

          {/* Post-push actions */}
          {pushCancelled && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setPushCancelled(false); setDrafts([]); setPushError(null) }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#30d158', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#000' }}
              >
                Resume push
              </button>
              <button
                onClick={() => { setPushCancelled(false); setDrafts([]); setPushError(null) }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: CARD2, border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: T1 }}
              >
                Dismiss
              </button>
            </div>
          )}
          {pushDone && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link
                href="/dashboard/jobs"
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: CARD, border: `1px solid ${BORDER}`, textAlign: 'center', fontSize: '13px', fontWeight: 500, color: T2, textDecoration: 'none' }}
              >
                All Jobs
              </Link>
              <button
                onClick={() => { setPushDone(false); setDrafts([]); setPushError(null) }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: CARD2, border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: T1 }}
              >
                Push again
              </button>
            </div>
          )}


          {/* Download ZIP progress/done */}
          {(isDownloading || downloadDone) && (
            <div style={{ background: CARD, border: `1px solid ${downloadDone ? 'rgba(48,209,88,0.3)' : BORDER}`, borderRadius: '14px', padding: '18px' }}>
              {isDownloading ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: T2 }}>{downloadStatus}</span>
                    <span style={{ color: '#30d158', fontFamily: 'var(--font-dm-mono)' }}>{downloadProgress}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${downloadProgress}%`, background: '#30d158', transition: 'width 0.3s' }} />
                  </div>
                </>
              ) : downloadDone ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="rgba(48,209,88,0.2)"/><polyline points="4 8 6.5 10.5 12 4" stroke="#30d158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#30d158' }}>ZIP downloaded</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      href="/dashboard/jobs"
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', background: CARD2, border: `1px solid ${BORDER}`, textAlign: 'center', fontSize: '13px', fontWeight: 500, color: T2, textDecoration: 'none' }}
                    >
                      All Jobs
                    </Link>
                    <button
                      onClick={() => { reset(); router.push('/dashboard/upload') }}
                      style={{ flex: 2, padding: '10px', borderRadius: '8px', background: T1, border: 'none', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      New Upload
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h8M7 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Folder save progress/done */}
          {(isSavingToFolder || folderDone) && (
            <div style={{ background: CARD, border: `1px solid ${folderDone ? 'rgba(48,209,88,0.3)' : BORDER}`, borderRadius: '14px', padding: '18px' }}>
              {isSavingToFolder ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: T2 }}>{folderStatus}</span>
                    <span style={{ color: '#30d158', fontFamily: 'var(--font-dm-mono)' }}>{folderProgress}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${folderProgress}%`, background: '#30d158', transition: 'width 0.3s' }} />
                  </div>
                </>
              ) : folderDone ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="rgba(48,209,88,0.2)"/><polyline points="4 8 6.5 10.5 12 4" stroke="#30d158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#30d158' }}>Saved to {folderPath}/</span>
                  </div>
                  {writtenFiles.map((r) => (
                    <div key={r.marketplace} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: T3, padding: '3px 0', fontFamily: 'var(--font-dm-mono)' }}>
                      <span>{r.marketplace}/</span>
                      <span>{r.count} files</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <Link
                      href="/dashboard/jobs"
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', background: CARD2, border: `1px solid ${BORDER}`, textAlign: 'center', fontSize: '13px', fontWeight: 500, color: T2, textDecoration: 'none' }}
                    >
                      All Jobs
                    </Link>
                    <button
                      onClick={() => { reset(); router.push('/dashboard/upload') }}
                      style={{ flex: 2, padding: '10px', borderRadius: '8px', background: T1, border: 'none', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      New Upload
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h8M7 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Error */}
          {(error || pushError) && (
            <div style={{ padding: '12px 16px', background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.3)', borderRadius: '10px', fontSize: '13px', color: '#ff453a' }}>
              {error || pushError}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
      `}</style>
    </div>
  )
}
