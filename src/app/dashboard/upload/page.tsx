'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { MarketplaceSelector } from '@/components/export/MarketplaceSelector'
import { useBrand } from '@/context/BrandContext'
import { usePlan } from '@/context/PlanContext'
import { useSession } from '@/store/session'
import type { StyleListEntry, ShootType } from '@/store/session'
import { processFiles } from '@/lib/processor'
import { ACCESSORY_CATEGORIES } from '@/lib/accessories/categories'
import type { MarketplaceName } from '@/types'

interface ProcessProgress {
  phase: string
  done: number
  total: number
}

const ANGLE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  'front':       { bg: 'rgba(48,209,88,0.12)',  color: '#30d158', dot: '#30d158' },
  'back':        { bg: 'rgba(0,122,255,0.12)',   color: '#4da3ff', dot: '#4da3ff' },
  'side':        { bg: 'rgba(255,159,10,0.13)',  color: '#ff9f0a', dot: '#ff9f0a' },
  'full-length': { bg: 'rgba(175,82,222,0.12)',  color: '#bf5af2', dot: '#bf5af2' },
  'detail':      { bg: 'rgba(255,59,48,0.12)',   color: '#ff453a', dot: '#ff453a' },
  'mood':        { bg: 'rgba(255,55,95,0.12)',   color: '#ff375f', dot: '#ff375f' },
  'front-3/4':   { bg: 'rgba(48,209,88,0.09)',   color: '#30d158', dot: '#30d158' },
  'back-3/4':    { bg: 'rgba(0,122,255,0.09)',   color: '#4da3ff', dot: '#4da3ff' },
}

export default function UploadPage() {
  const router = useRouter()
  const { activeBrand } = useBrand()
  const { canProcessImages, plan, usage, openUpgrade } = usePlan()
  const setSession = useSession((s) => s.setSession)
  const setStyleList = useSession((s) => s.setStyleList)
  const setShootConfig = useSession((s) => s.setShootConfig)
  const resetSession = useSession((s) => s.reset)
  const existingSession = useSession((s) => ({
    isReady: s.isReady,
    jobName: s.jobName,
    clusters: s.clusters,
    marketplaces: s.marketplaces,
    shootType: s.shootType,
    accessoryCategory: s.accessoryCategory,
    styleList: s.styleList,
  }))

  const [shootType, setShootType] = useState<ShootType>('on-model')
  const [accessoryCategory, setAccessoryCategory] = useState<string | null>(null)
  const [stillLifeType, setStillLifeType] = useState<string | null>(null)

  const [isProcessing, setIsProcessing] = useState(false)

  const [styleList, setStyleListLocal] = useState<StyleListEntry[]>([])
  const [styleListName, setStyleListName] = useState<string | null>(null)
  const styleListRef = useRef<HTMLInputElement>(null)
  const [resumeDismissed, setResumeDismissed] = useState(false)
  const allExported = existingSession.clusters.length > 0 && existingSession.clusters.every((c) => c.exported)
  const hasSession = existingSession.isReady && existingSession.clusters.length > 0 && !resumeDismissed && !allExported && !isProcessing
  const [parkingJob, setParkingJob] = useState(false)

  // Drag state for angle reordering
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  async function handleParkAndStartNew() {
    if (!existingSession.clusters.length) return
    setParkingJob(true)
    try {
      const { parkJob, deleteSession } = await import('@/lib/session-store')
      await parkJob(
        existingSession.jobName || 'Untitled Job',
        existingSession.clusters,
        existingSession.marketplaces,
        activeBrand?.id ?? null,
      )
      await deleteSession('draft').catch(() => {})
    } catch { /* non-critical */ }
    resetSession()
    setResumeDismissed(true)
    setFiles([])
    setJobName('')
    setParkingJob(false)
  }

  const importStyleList = useCallback(async (file: File) => {
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]

      let headerIdx = -1
      let skuCol = -1, nameCol = -1, colourCol = -1, colourCodeCol = -1, styleNumberCol = -1
      let compositionCol = -1, careCol = -1, fitCol = -1, lengthCol = -1, rrpCol = -1, seasonCol = -1
      let occasionCol = -1, genderCol = -1, categoryCol = -1, subCategoryCol = -1, originCol = -1, sizeRangeCol = -1
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i].map((c) => String(c).toUpperCase().trim())
        const skuI = row.findIndex((c) => c.includes('STYLE CODE') || c === 'SKU' || c === 'STYLE')
        if (skuI !== -1) {
          headerIdx = i
          skuCol = skuI
          nameCol = row.findIndex((c) => c.includes('STYLE NAME') || c.includes('PRODUCT NAME') || c.includes('NAME'))
          colourCol = row.findIndex((c) => (c.includes('COLOUR') || c.includes('COLOR')) && !c.includes('CODE'))
          colourCodeCol = row.findIndex((c) => c.includes('COLOUR CODE') || c.includes('COLOR CODE'))
          styleNumberCol = row.findIndex((c) => c.includes('STYLE NUMBER') || c.includes('STYLE NO') || c.includes('STYLE #'))
          compositionCol = row.findIndex((c) => c.includes('COMPOSITION') || c.includes('FABRIC') || c.includes('MATERIAL') || c.includes('FIBRE') || c.includes('FIBER') || c.includes('CONTENT'))
          careCol = row.findIndex((c) => c.includes('CARE') || c.includes('WASH'))
          fitCol = row.findIndex((c) => c === 'FIT' || c.includes('FIT TYPE') || c.includes('SILHOUETTE'))
          lengthCol = row.findIndex((c) => c === 'LENGTH' || c.includes('GARMENT LENGTH') || c.includes('DRESS LENGTH'))
          rrpCol = row.findIndex((c) => c === 'RRP' || c.includes('RETAIL PRICE') || c === 'PRICE')
          seasonCol = row.findIndex((c) => c.includes('SEASON') || c.includes('COLLECTION'))
          occasionCol = row.findIndex((c) => c.includes('OCCASION'))
          genderCol = row.findIndex((c) => c === 'GENDER' || c.includes('DEPARTMENT'))
          categoryCol = row.findIndex((c) => c === 'CATEGORY' || c.includes('PRODUCT TYPE') || c.includes('GARMENT TYPE'))
          subCategoryCol = row.findIndex((c) => c.includes('SUB-CATEGORY') || c.includes('SUBCATEGORY') || c.includes('SUB CATEGORY'))
          originCol = row.findIndex((c) => c.includes('COUNTRY') || c.includes('ORIGIN') || c.includes('MADE IN'))
          sizeRangeCol = row.findIndex((c) => c.includes('SIZE RANGE') || c === 'SIZES' || c.includes('AVAILABLE SIZES'))
          break
        }
      }

      if (headerIdx === -1) {
        alert('Could not find a STYLE CODE column. Please check your spreadsheet.')
        return
      }

      const entries: StyleListEntry[] = []
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i]
        const sku = String(row[skuCol] ?? '').trim().toUpperCase()
        if (!sku) continue
        const productName = nameCol !== -1 ? String(row[nameCol] ?? '').trim() : ''
        const colour = colourCol !== -1 ? String(row[colourCol] ?? '').trim() : ''
        const colourCode = colourCodeCol !== -1 ? String(row[colourCodeCol] ?? '').trim() : ''
        const styleNumber = styleNumberCol !== -1 ? String(row[styleNumberCol] ?? '').trim() : ''
        const composition = compositionCol !== -1 ? String(row[compositionCol] ?? '').trim() : undefined
        const care = careCol !== -1 ? String(row[careCol] ?? '').trim() : undefined
        const fit = fitCol !== -1 ? String(row[fitCol] ?? '').trim() : undefined
        const length = lengthCol !== -1 ? String(row[lengthCol] ?? '').trim() : undefined
        const rrp = rrpCol !== -1 ? String(row[rrpCol] ?? '').trim() : undefined
        const season = seasonCol !== -1 ? String(row[seasonCol] ?? '').trim() : undefined
        const occasion = occasionCol !== -1 ? String(row[occasionCol] ?? '').trim() : undefined
        const gender = genderCol !== -1 ? String(row[genderCol] ?? '').trim() : undefined
        const category = categoryCol !== -1 ? String(row[categoryCol] ?? '').trim() : undefined
        const subCategory = subCategoryCol !== -1 ? String(row[subCategoryCol] ?? '').trim() : undefined
        const origin = originCol !== -1 ? String(row[originCol] ?? '').trim() : undefined
        const sizeRange = sizeRangeCol !== -1 ? String(row[sizeRangeCol] ?? '').trim() : undefined
        const extra = Object.fromEntries(
          Object.entries({ composition, care, fit, length, rrp, season, occasion, gender, category, subCategory, origin, sizeRange })
            .filter(([, v]) => Boolean(v))
        )
        entries.push({ sku, productName, colour, colourCode, styleNumber, ...extra })
      }

      setStyleListLocal(entries)
      setStyleList(entries)
      setStyleListName(file.name)
    } catch {
      alert('Failed to read spreadsheet. Please use .xlsx or .csv format.')
    }
  }, [setStyleList])

  const [jobName, setJobName] = useState('')
  const [marketplaces, setMarketplaces] = useState<MarketplaceName[]>(['the-iconic'])
  const ALL_ON_MODEL_ANGLES = ['full-length', 'front', 'side', 'mood', 'detail', 'back', 'front-3/4', 'back-3/4']
  const defaultImagesPerLook = activeBrand?.images_per_look ?? 4
  const [imagesPerLook, setImagesPerLook] = useState<number>(defaultImagesPerLook)
  const [angleSequence, setAngleSequence] = useState<string[]>(() => {
    const base = activeBrand?.on_model_angle_sequence?.length
      ? activeBrand.on_model_angle_sequence
      : ALL_ON_MODEL_ANGLES
    return base.slice(0, defaultImagesPerLook)
  })

  useEffect(() => {
    const n = activeBrand?.images_per_look ?? 4
    setImagesPerLook(n)
    const base = activeBrand?.on_model_angle_sequence?.length
      ? activeBrand.on_model_angle_sequence
      : ALL_ON_MODEL_ANGLES
    const seq = [...base]
    while (seq.length < n) seq.push(ALL_ON_MODEL_ANGLES[seq.length] ?? 'front')
    setAngleSequence(seq.slice(0, n))
  }, [activeBrand?.id, shootType])

  useEffect(() => {
    if (!existingSession.isReady || !existingSession.clusters.length) return
    if (existingSession.jobName) setJobName(existingSession.jobName)
    if (existingSession.shootType) setShootType(existingSession.shootType)
    if (existingSession.accessoryCategory !== null) {
      setAccessoryCategory(existingSession.accessoryCategory)
      setStillLifeType(existingSession.accessoryCategory)
    }
    if (existingSession.marketplaces.length) setMarketplaces(existingSession.marketplaces as MarketplaceName[])
    if (existingSession.styleList.length) setStyleListLocal(existingSession.styleList)
    const existingFiles = existingSession.clusters.flatMap((c) => c.images.map((img) => img.file)).filter(Boolean)
    if (existingFiles.length) {
      setFiles(existingFiles)
    }
  }, [])

  const [files, setFiles] = useState<File[]>([])
  const imageGridRef = useRef<HTMLDivElement>(null)

  const [progress, setProgress] = useState<ProcessProgress>({ phase: '', done: 0, total: 0 })
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [rejectedFiles, setRejectedFiles] = useState<{ name: string; reason: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const [cloudImporting, setCloudImporting] = useState<'dropbox' | 'google-drive' | 's3' | null>(null)
  const [cloudImportError, setCloudImportError] = useState<string | null>(null)
  const [s3Prefix, setS3Prefix] = useState('')
  const [s3Files, setS3Files] = useState<{ id: string; name: string; downloadUrl: string; size: number }[]>([])
  const [s3Folders, setS3Folders] = useState<{ key: string; name: string }[]>([])
  const [s3BrowserOpen, setS3BrowserOpen] = useState(false)
  const [s3Loading, setS3Loading] = useState(false)
  const [s3Selected, setS3Selected] = useState<Set<string>>(new Set())

  const [gdriveBrowserOpen, setGdriveBrowserOpen] = useState(false)
  const [gdriveFiles, setGdriveFiles] = useState<{ id: string; name: string; downloadUrl: string; size: number; mimeType: string }[]>([])
  const [gdriveFolders, setGdriveFolders] = useState<{ id: string; name: string }[]>([])
  const [gdriveFolderStack, setGdriveFolderStack] = useState<{ id: string; name: string }[]>([])
  const [gdriveLoading, setGdriveLoading] = useState(false)
  const [gdriveSelected, setGdriveSelected] = useState<Set<string>>(new Set())
  const [gdriveToken, setGdriveToken] = useState<string | null>(null)
  const [gdriveDirectToken, setGdriveDirectToken] = useState<string | null>(null)
  const [gdriveError, setGdriveError] = useState<string | null>(null)
  const [gdriveDownloadProgress, setGdriveDownloadProgress] = useState<{ done: number; total: number } | null>(null)

  const importFromDropbox = async () => {
    setCloudImportError(null)
    setCloudImporting('dropbox')
    try {
      const { openDropboxChooser, downloadCloudFile } = await import('@/lib/cloud/dropbox')
      const chosen = await openDropboxChooser()
      if (chosen.length === 0) { setCloudImporting(null); return }
      const downloaded: File[] = []
      for (const cf of chosen) {
        try { downloaded.push(await downloadCloudFile(cf)) } catch { /* skip */ }
      }
      if (downloaded.length > 0) acceptFiles(downloaded)
      else setCloudImportError('Could not download any files. Check that the files are images.')
    } catch (err) {
      setCloudImportError(err instanceof Error ? err.message : 'Dropbox import failed.')
    } finally {
      setCloudImporting(null)
    }
  }

  const importFromGoogleDrive = async () => {
    setCloudImportError(null)
    setCloudImporting('google-drive')
    try {
      const { authorizeGoogle } = await import('@/lib/cloud/google-drive')
      const token = await authorizeGoogle()
      setGdriveDirectToken(token)
      setGdriveToken(token)
      setGdriveFolderStack([])
      setGdriveFiles([])
      setGdriveFolders([])
      setGdriveSelected(new Set())
      setGdriveBrowserOpen(true)
      await loadGdriveFolderDirect(token, 'root', false)
    } catch (err) {
      setCloudImportError(err instanceof Error ? err.message : 'Google Drive sign-in failed.')
    } finally {
      setCloudImporting(null)
    }
  }

  const loadGdriveFolderDirect = async (token: string, folderId: string, pushStack: boolean, folderName = 'My Drive') => {
    setGdriveLoading(true)
    setGdriveError(null)
    try {
      const parent = folderId === 'root' ? 'root' : folderId
      const [foldersRes, filesRes] = await Promise.all([
        fetch(`https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
          q: `'${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id,name)',
          orderBy: 'name',
          pageSize: '200',
        })}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
          q: `'${parent}' in parents and (mimeType contains 'image/') and trashed=false`,
          fields: 'files(id,name,size,mimeType)',
          orderBy: 'name',
          pageSize: '500',
        })}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [foldersJson, filesJson] = await Promise.all([foldersRes.json(), filesRes.json()])
      setGdriveFolders((foldersJson.files ?? []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })))
      setGdriveFiles((filesJson.files ?? []).map((f: { id: string; name: string; size?: string; mimeType: string }) => ({
        id: f.id,
        name: f.name,
        downloadUrl: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
        size: parseInt(f.size ?? '0', 10),
        mimeType: f.mimeType,
      })))
      setGdriveToken(token)
      setGdriveSelected(new Set())
      if (pushStack) setGdriveFolderStack((prev) => [...prev, { id: folderId, name: folderName }])
    } catch (err) {
      setGdriveError(err instanceof Error ? err.message : 'Failed to list Google Drive files.')
    } finally {
      setGdriveLoading(false)
    }
  }

  const loadS3Folder = async (prefix = '') => {
    if (!activeBrand?.id) return
    setS3Loading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const params = new URLSearchParams({ brandId: activeBrand.id, prefix })
      const res = await fetch(`/api/integrations/s3/list?${params}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (!res.ok) throw new Error('S3 list failed')
      const { files: f, folders: d } = await res.json()
      setS3Files(f ?? [])
      setS3Folders(d ?? [])
      setS3Prefix(prefix)
      setS3Selected(new Set())
    } catch (err) {
      setCloudImportError(err instanceof Error ? err.message : 'Failed to list S3 files.')
    } finally {
      setS3Loading(false)
    }
  }

  const importFromS3 = async () => {
    if (s3Selected.size === 0) return
    setCloudImportError(null)
    setCloudImporting('s3')
    try {
      const selectedFiles = s3Files.filter((f) => s3Selected.has(f.id))
      const downloaded: File[] = []
      for (const sf of selectedFiles) {
        try {
          const res = await fetch(sf.downloadUrl)
          if (!res.ok) continue
          const blob = await res.blob()
          downloaded.push(new File([blob], sf.name, { type: blob.type || 'image/jpeg' }))
        } catch { /* skip */ }
      }
      if (downloaded.length > 0) {
        acceptFiles(downloaded)
        setS3BrowserOpen(false)
        setS3Selected(new Set())
      } else {
        setCloudImportError('Could not download any selected files.')
      }
    } catch (err) {
      setCloudImportError(err instanceof Error ? err.message : 'S3 import failed.')
    } finally {
      setCloudImporting(null)
    }
  }

  const loadGdriveFolder = async (folderId = 'root', folderName = 'My Drive', pushStack = false) => {
    if (gdriveDirectToken) {
      return loadGdriveFolderDirect(gdriveDirectToken, folderId, pushStack, folderName)
    }
    if (!activeBrand?.id) return
    setGdriveLoading(true)
    setGdriveError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const params = new URLSearchParams({ brandId: activeBrand.id, folderId })
      const res = await fetch(`/api/integrations/google/list?${params}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Failed to list Google Drive files')
      }
      const { files: f, folders: d, accessToken } = await res.json()
      setGdriveFiles(f ?? [])
      setGdriveFolders(d ?? [])
      setGdriveToken(accessToken)
      setGdriveSelected(new Set())
      if (pushStack) {
        setGdriveFolderStack((prev) => [...prev, { id: folderId, name: folderName }])
      }
    } catch (err) {
      setGdriveError(err instanceof Error ? err.message : 'Failed to list Google Drive files.')
    } finally {
      setGdriveLoading(false)
    }
  }

  const gdriveGoBack = () => {
    const newStack = gdriveFolderStack.slice(0, -1)
    setGdriveFolderStack(newStack)
    const parent = newStack[newStack.length - 1]
    if (gdriveDirectToken) {
      loadGdriveFolderDirect(gdriveDirectToken, parent?.id ?? 'root', false, parent?.name ?? 'My Drive')
    } else {
      loadGdriveFolder(parent?.id ?? 'root', parent?.name ?? 'My Drive', false)
    }
  }

  const importFromGdriveBrowser = async () => {
    if (gdriveSelected.size === 0 || !gdriveToken) return
    setCloudImportError(null)
    setCloudImporting('google-drive')
    const selectedFiles = gdriveFiles.filter((f) => gdriveSelected.has(f.id))
    const total = selectedFiles.length
    setGdriveDownloadProgress({ done: 0, total })

    try {
      const CONCURRENCY = 5
      const downloaded: File[] = []
      let done = 0

      for (let i = 0; i < selectedFiles.length; i += CONCURRENCY) {
        const batch = selectedFiles.slice(i, i + CONCURRENCY)
        const results = await Promise.allSettled(
          batch.map(async (sf) => {
            const res = await fetch(sf.downloadUrl, {
              headers: { Authorization: `Bearer ${gdriveToken}` },
            })
            if (!res.ok) throw new Error(`Failed: ${sf.name}`)
            const blob = await res.blob()
            return new File([blob], sf.name, { type: sf.mimeType || blob.type || 'image/jpeg' })
          })
        )
        for (const result of results) {
          if (result.status === 'fulfilled') downloaded.push(result.value)
        }
        done += batch.length
        setGdriveDownloadProgress({ done, total })
      }

      if (downloaded.length > 0) {
        acceptFiles(downloaded)
        setGdriveBrowserOpen(false)
        setGdriveSelected(new Set())
      } else {
        setGdriveError('Could not download any selected files.')
      }
    } catch (err) {
      setGdriveError(err instanceof Error ? err.message : 'Google Drive import failed.')
    } finally {
      setCloudImporting(null)
      setGdriveDownloadProgress(null)
    }
  }

  const MAX_FILE_SIZE_MB = 25
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const ALLOWED_EXT = /\.(jpe?g|png|webp|heic|heif)$/i

  const acceptFiles = useCallback((newFiles: File[]) => {
    const accepted: File[] = []
    const rejected: { name: string; reason: string }[] = []

    for (const f of newFiles) {
      const isAllowedType = ALLOWED_TYPES.includes(f.type.toLowerCase()) || ALLOWED_EXT.test(f.name)
      const isTooBig = f.size > MAX_FILE_SIZE_MB * 1024 * 1024

      if (!isAllowedType) {
        const ext = f.name.split('.').pop()?.toUpperCase() ?? 'unknown'
        rejected.push({ name: f.name, reason: `Unsupported format (.${ext}) — use JPEG, PNG, WebP or HEIC` })
      } else if (isTooBig) {
        const sizeMb = (f.size / (1024 * 1024)).toFixed(1)
        rejected.push({ name: f.name, reason: `File too large (${sizeMb} MB) — maximum is ${MAX_FILE_SIZE_MB} MB` })
      } else {
        accepted.push(f)
      }
    }

    setRejectedFiles(rejected)
    if (!accepted.length) return
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size))
      const unique = accepted.filter((f) => !existing.has(f.name + f.size))
      return [...prev, ...unique]
    })
    setTimeout(() => imageGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    acceptFiles(dropped)
  }, [acceptFiles])

  const handleProcess = async () => {
    if (!files.length) return
    if (!canProcessImages(files.length)) {
      openUpgrade(`Your ${plan.name} plan allows ${plan.limits.imagesPerMonth.toLocaleString()} images per month. You've used ${usage.imagesThisMonth.toLocaleString()} so far this month.`)
      return
    }

    if (existingSession.isReady && existingSession.clusters.length > 0 && !resumeDismissed) {
      void import('@/lib/session-store').then(({ parkJob }) =>
        parkJob(
          existingSession.jobName || 'Untitled Job',
          existingSession.clusters,
          existingSession.marketplaces,
          activeBrand?.id ?? null,
        )
      )
    }

    setIsProcessing(true)
    setProgress({ phase: 'Starting…', done: 0, total: files.length })

    const name = jobName || `Shoot – ${new Date().toLocaleDateString()}`
    setShootConfig(shootType, stillLifeType)
    const brandStillLifeSeq = stillLifeType
      ? activeBrand?.still_life_angle_sequences?.[stillLifeType]
      : undefined
    const effectiveAngleSeq = shootType === 'on-model'
      ? angleSequence
      : (brandStillLifeSeq?.length ? brandStillLifeSeq : undefined)

    const clusters = await processFiles(files, imagesPerLook, setProgress, shootType, stillLifeType ?? undefined, effectiveAngleSeq)

    // Record image usage server-side (fire and forget — non-blocking)
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) =>
      fetch('/api/billing/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ images: files.length }),
      })
    ).catch(() => { /* non-critical */ })

    setSession(name, clusters, marketplaces, imagesPerLook, (effectiveAngleSeq ?? []) as import('@/types').ViewLabel[])

    import('@/lib/session-store').then(({ saveSession }) =>
      saveSession('draft', name, clusters, marketplaces, activeBrand?.id ?? null)
    ).catch(() => { /* non-critical */ })

    router.push('/dashboard/review')
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Topbar breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'New Upload' }]} />

      <div style={{ padding: '28px', paddingBottom: files.length > 0 && !isProcessing ? '100px' : '28px', flex: 1 }}>

        {/* Active session banner */}
        {hasSession && (
          <div style={{ marginBottom: '20px', borderRadius: '14px', border: '0.5px solid var(--line)', background: 'var(--bg2)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(0,122,255,0.12)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#4da3ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="12" height="10" rx="1.5"/>
                  <path d="M10 3V2a2 2 0 0 0-4 0v1"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                  {existingSession.jobName || 'Untitled Job'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                  {existingSession.clusters.length} clusters · {existingSession.clusters.reduce((s, c) => s + c.images.length, 0)} images · currently active
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', borderTop: '0.5px solid var(--line)' }}>
              <button
                onClick={() => router.push('/dashboard/review')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '12px', fontWeight: 500, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', borderRight: '0.5px solid var(--line)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-glow)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7h8M7 3l4 4-4 4"/>
                </svg>
                Continue this job
              </button>
              <button
                onClick={handleParkAndStartNew}
                disabled={parkingJob}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '12px', fontWeight: 500, color: 'var(--text2)', background: 'transparent', border: 'none', cursor: 'pointer', borderRight: '0.5px solid var(--line)' }}
                onMouseEnter={e => { if (!parkingJob) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                {parkingJob ? 'Saving…' : 'Park & start new'}
              </button>
              <button
                onClick={() => {
                  resetSession()
                  import('@/lib/session-store').then(({ deleteSession }) => deleteSession('draft').catch(() => {}))
                  setResumeDismissed(true); setFiles([]); setJobName('')
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: 'var(--accent3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,59,48,0.07)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {isProcessing ? (
          /* Processing state */
          <div style={{ maxWidth: '520px', margin: '48px auto 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,122,255,0.10)', border: '1px solid rgba(0,122,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--accent)" strokeWidth="1.5" className="animate-spin" style={{ animationDuration: '2s' }}>
                  <circle cx="14" cy="14" r="11" strokeDasharray="50 20" />
                </svg>
              </div>
              <div style={{ textAlign: 'center', width: '100%' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{progress.phase}</p>
                <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' }}>
                  {progress.done > 0 && progress.total > 0 && `${progress.done} / ${progress.total} images`}
                </p>
                <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '99px', transition: 'width 0.3s', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), #30d158)' }} />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>{pct}%</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', width: '100%' }}>
                {[
                  { label: 'Loading', active: progress.phase.startsWith('Loading') || progress.phase.startsWith('Start') },
                  { label: 'Grouping', active: progress.phase.startsWith('Group') },
                  { label: 'Done', active: progress.phase.startsWith('Done') },
                ].map((s) => (
                  <div key={s.label} style={{ padding: '10px', borderRadius: '10px', border: `0.5px solid ${s.active ? 'var(--accent)' : 'var(--line)'}`, background: s.active ? 'var(--accent-glow)' : 'transparent', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: s.active ? 'var(--accent)' : 'var(--text3)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>

            {/* Job name */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text3)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Shoot name</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  className="input"
                  placeholder="e.g. SS25 Studio Shoot"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  style={{ flex: 1 }}
                />
                {activeBrand && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '0 12px', background: 'var(--bg2)', border: '0.5px solid var(--line)', borderRadius: 'var(--r)', flexShrink: 0 }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700, color: '#000', background: activeBrand.logo_color, fontFamily: 'var(--font-dm-mono)', flexShrink: 0 }}>{activeBrand.brand_code}</div>
                    <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{activeBrand.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shoot type */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text3)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Shoot type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {([
                  {
                    id: 'on-model', label: 'On-Model',
                    desc: 'Clothing worn by a model',
                    pills: ['Front', 'Back', 'Side', 'Full-length', 'Mood'],
                    pillDots: ['#30d158', '#4da3ff', '#ff9f0a', '#bf5af2', '#ff375f'],
                    accent: '#30d158', accentBg: 'rgba(48,209,88,0.10)',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="10" cy="5" r="2.5"/>
                        <path d="M6 20v-6l-2-4h12l-2 4v6M8 20v-5M12 20v-5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ),
                  },
                  {
                    id: 'still-life', label: 'Still Life',
                    desc: 'Accessories & products',
                    pills: ['Front', 'Back', 'Side', 'Detail'],
                    pillDots: ['#30d158', '#4da3ff', '#ff9f0a', '#ff453a'],
                    accent: '#4da3ff', accentBg: 'rgba(0,122,255,0.10)',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="7" width="14" height="10" rx="1.5"/>
                        <path d="M7 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round"/>
                        <circle cx="10" cy="12" r="1.5"/>
                      </svg>
                    ),
                  },
                ] as { id: ShootType; label: string; desc: string; pills: string[]; pillDots: string[]; accent: string; accentBg: string; icon: React.ReactNode }[]).map(({ id, label, desc, pills, pillDots, accent, accentBg, icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setShootType(id); if (id === 'on-model') { setAccessoryCategory(null); setStillLifeType(null) } }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px',
                      padding: '14px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
                      border: shootType === id ? `1.5px solid ${accent}` : '0.5px solid var(--line2)',
                      background: shootType === id ? accentBg : 'var(--bg2)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: shootType === id ? accentBg : 'var(--bg3)', color: shootType === id ? accent : 'var(--text3)', transition: 'all 0.15s' }}>
                      {icon}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.2px', marginBottom: '2px' }}>{label}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text3)', lineHeight: 1.4 }}>{desc}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {pills.map((pill, i) => (
                        <span key={pill} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, padding: '2px 7px', borderRadius: '20px', background: 'var(--bg3)', color: 'var(--text3)' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: pillDots[i], flexShrink: 0 }} />
                          {pill}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Still life category — inline below cards */}
              {shootType === 'still-life' && (
                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {ACCESSORY_CATEGORIES.filter((cat) => cat.id === 'ghost-mannequin' || cat.id === 'accessories').map((cat) => {
                    const brandSeq = activeBrand?.still_life_angle_sequences?.[cat.id]
                    const effectiveSeq: string[] = brandSeq && brandSeq.length > 0 ? brandSeq : (cat.angles as string[])
                    const count = effectiveSeq.length
                    const isSelected = stillLifeType === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setStillLifeType(cat.id); setImagesPerLook(count) }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                          border: isSelected ? '1.5px solid var(--accent)' : '0.5px solid var(--line2)',
                          background: isSelected ? 'var(--accent-glow)' : 'var(--bg2)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: isSelected ? 'var(--accent)' : 'var(--text)' }}>{cat.label}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 6px', borderRadius: '99px' }}>{count} shots</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{effectiveSeq.join(' · ')}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Upload zone */}
            <div style={{ marginBottom: '16px' }}>
              {/* Style list — featured card */}
              <div style={{
                marginBottom: '12px',
                borderRadius: '12px',
                border: styleList.length > 0 ? '1px solid rgba(48,209,88,0.4)' : '1px solid rgba(48,209,88,0.22)',
                background: styleList.length > 0 ? 'rgba(48,209,88,0.06)' : 'rgba(48,209,88,0.03)',
                padding: '14px 16px',
                transition: 'all 0.15s',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#30d158" strokeWidth="1.5">
                    <rect x="2" y="2" width="12" height="12" rx="1.5"/>
                    <path d="M5 6h6M5 9h4" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Style List</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#1a8a35', background: 'rgba(48,209,88,0.18)', padding: '2px 7px', borderRadius: '20px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Recommended</span>
                </div>
                {/* Benefit line */}
                <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>
                  SKU-named images? <strong style={{ color: 'var(--text)' }}>All clusters fill automatically</strong> — zero typing. Otherwise auto-suggests SKU, name &amp; colour as you confirm each cluster.
                </p>
                {/* Action row */}
                {styleList.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                    <button
                      onClick={() => styleListRef.current?.click()}
                      style={{ padding: '8px 16px', background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M8 11V3M5 6l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 13h12" strokeLinecap="round"/>
                      </svg>
                      Upload sheet
                    </button>
                    <a
                      href="/shotsync-range-list-template.csv"
                      download="shotsync-range-list-template.csv"
                      style={{ padding: '7px 13px', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', background: 'var(--bg3)', flexShrink: 0 }}
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 10v2.5A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5V10" strokeLinecap="round"/><path d="M8 2v7M5 9l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Download template
                    </a>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#30d158" strokeWidth="2"><path d="M3 8l4 4 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{styleListName}</p>
                      <p style={{ fontSize: '12px', color: '#30d158', marginTop: '1px' }}>
                        {styleList.length} styles · {[...new Set(styleList.map(e => e.colour).filter(Boolean))].length} colours
                      </p>
                    </div>
                    <button onClick={() => { setStyleListLocal([]); setStyleList([]); setStyleListName(null) }} style={{ fontSize: '12px', color: 'var(--text3)', background: 'none', border: '1px solid var(--line)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                )}
                <input ref={styleListRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importStyleList(f) }} />
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true) }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={onDrop}
                style={{
                  borderRadius: '12px',
                  border: isDraggingOver ? '2px dashed #30d158' : '2px dashed var(--line2)',
                  background: isDraggingOver ? 'rgba(48,209,88,0.04)' : 'var(--bg2)',
                  transition: 'all 0.15s',
                }}
              >
                {files.length === 0 ? (
                  <div onClick={() => inputRef.current?.click()} style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(48,209,88,0.15), rgba(0,122,255,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="1.5">
                          <path d="M12 17V7M8 11l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 20h14" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div style={{ position: 'absolute', top: '-5px', right: '-9px', width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.3)' }} />
                      <div style={{ position: 'absolute', bottom: '-4px', left: '-9px', width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(0,122,255,0.12)', border: '1px solid rgba(0,122,255,0.2)' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', marginBottom: '3px' }}>Drop images here</p>
                      <p style={{ fontSize: '13px', color: 'var(--text3)' }}>or click to browse · JPG, PNG, HEIC · 500–1000+ images supported</p>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {['JPG', 'PNG', 'WebP', 'HEIC'].map((fmt) => (
                        <span key={fmt} style={{ fontSize: '12px', fontWeight: 500, padding: '2px 7px', borderRadius: '20px', background: 'var(--bg3)', color: 'var(--text3)' }}>{fmt}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px' }} ref={imageGridRef}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text2)' }}>{files.length} images queued</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => inputRef.current?.click()} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add more</button>
                        <button onClick={() => setFiles([])} style={{ fontSize: '13px', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: '3px' }}>
                      {files.slice(0, 80).map((f, i) => (
                        <div key={i} style={{ aspectRatio: '1', borderRadius: '3px', overflow: 'hidden', background: 'var(--bg4)' }}>
                          <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
                        </div>
                      ))}
                      {files.length > 80 && (
                        <div style={{ aspectRatio: '1', borderRadius: '3px', background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text3)' }}>+{files.length - 80}</span>
                        </div>
                      )}
                    </div>
                    {plan.limits.imagesPerMonth !== -1 && (usage.imagesThisMonth + files.length) > plan.limits.imagesPerMonth && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,59,48,0.08)', border: '0.5px solid rgba(255,59,48,0.2)' }}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--accent3)" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                          <path d="M7 1L1 13h12L7 1z" strokeLinejoin="round"/>
                          <path d="M7 5.5v3M7 9.5h.01" strokeLinecap="round"/>
                        </svg>
                        <p style={{ fontSize: '12px', color: 'var(--accent3)' }}>
                          {files.length} selected — {Math.max(0, plan.limits.imagesPerMonth - usage.imagesThisMonth).toLocaleString()} remaining this month.{' '}
                          <button onClick={() => openUpgrade('Upgrade to process more images per month')} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit' }}>Upgrade</button>
                        </p>
                      </div>
                    )}
                    {rejectedFiles.length > 0 && (
                      <div style={{ marginTop: '8px', borderRadius: '8px', border: '0.5px solid rgba(255,159,10,0.25)', background: 'rgba(255,159,10,0.06)', padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--accent4)" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: '1px' }}>
                            <path d="M7 1L1 13h12L7 1z" strokeLinejoin="round"/>
                            <path d="M7 5.5v3M7 9.5h.01" strokeLinecap="round"/>
                          </svg>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent4)' }}>{rejectedFiles.length} file{rejectedFiles.length > 1 ? 's' : ''} skipped</p>
                            <ul style={{ marginTop: '4px' }}>
                              {rejectedFiles.slice(0, 5).map((r, i) => (
                                <li key={i} style={{ fontSize: '12px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontWeight: 500, color: 'var(--text2)' }}>{r.name}</span> — {r.reason}
                                </li>
                              ))}
                              {rejectedFiles.length > 5 && <li style={{ fontSize: '12px', color: 'var(--text3)' }}>…and {rejectedFiles.length - 5} more</li>}
                            </ul>
                          </div>
                          <button onClick={() => setRejectedFiles([])} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.heic,.heif" className="hidden" onChange={(e) => acceptFiles(Array.from(e.target.files ?? []))} />
              </div>

              {/* Cloud import */}
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid var(--line)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '8px' }}>Or import from cloud</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={importFromDropbox}
                    disabled={!!cloudImporting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: cloudImporting ? 'wait' : 'pointer',
                      background: cloudImporting === 'dropbox' ? '#0061ff' : 'rgba(0,97,255,0.10)',
                      color: cloudImporting === 'dropbox' ? '#fff' : '#4da3ff',
                      fontSize: '13px', fontWeight: 500, transition: 'all 0.15s',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 40 40" fill="currentColor">
                      <path d="M20 8.3L10 15l10 6.7 10-6.7zm-10 13.4L0 15l10-6.7 10 6.7zm10-6.7L20 21.7 30 28.4l10-6.7zm-10 13.4L0 21.7l10-6.7 10 6.7zM20 30.1l10-6.7 10 6.7-10 6.7z"/>
                    </svg>
                    {cloudImporting === 'dropbox' ? 'Importing…' : 'Dropbox'}
                  </button>

                  {activeBrand?.cloud_connections?.google_drive ? (
                    <button
                      onClick={() => { setGdriveBrowserOpen(true); loadGdriveFolder('root', 'My Drive', false) }}
                      disabled={!!cloudImporting}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: cloudImporting ? 'wait' : 'pointer', background: 'rgba(66,133,244,0.10)', color: '#4285f4', fontSize: '13px', fontWeight: 500 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 87.3 78" fill="currentColor">
                        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.1c0 1.55.4 3.1 1.2 4.5z"/>
                        <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 49.5c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/>
                        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.87 11.2z"/>
                        <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"/>
                        <path d="M59.85 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z"/>
                        <path d="M73.4 26.5l-13.1-22.7c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.2 28h27.45c0-1.55-.4-3.1-1.2-4.5z"/>
                      </svg>
                      Google Drive · {(activeBrand.cloud_connections.google_drive as { email?: string }).email?.split('@')[0]}
                    </button>
                  ) : (
                    <button
                      onClick={importFromGoogleDrive}
                      disabled={!!cloudImporting}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: cloudImporting ? 'wait' : 'pointer', background: cloudImporting === 'google-drive' ? '#4285f4' : 'rgba(66,133,244,0.10)', color: cloudImporting === 'google-drive' ? '#fff' : '#4285f4', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 87.3 78" fill="currentColor">
                        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.1c0 1.55.4 3.1 1.2 4.5z"/>
                        <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 49.5c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/>
                        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.87 11.2z"/>
                        <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"/>
                        <path d="M59.85 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z"/>
                        <path d="M73.4 26.5l-13.1-22.7c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.2 28h27.45c0-1.55-.4-3.1-1.2-4.5z"/>
                      </svg>
                      {cloudImporting === 'google-drive' ? 'Importing…' : 'Google Drive'}
                    </button>
                  )}

                  {activeBrand?.cloud_connections?.s3?.bucket && (
                    <button
                      onClick={() => { setS3BrowserOpen(true); loadS3Folder(s3Prefix) }}
                      disabled={!!cloudImporting}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: cloudImporting ? 'wait' : 'pointer', background: 'rgba(255,153,0,0.10)', color: '#ff9f0a', fontSize: '13px', fontWeight: 500 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                      </svg>
                      AWS S3 · {activeBrand.cloud_connections.s3.bucket}
                    </button>
                  )}
                </div>
                {cloudImportError && (
                  <p style={{ fontSize: '13px', color: 'var(--accent3)', marginTop: '6px' }}>{cloudImportError}</p>
                )}
              </div>
            </div>

            {/* Shoot settings */}
            <div style={{ marginTop: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text3)', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Shoot settings</label>

              <div style={{ padding: '14px', background: 'var(--bg2)', border: '0.5px solid var(--line)', borderRadius: '12px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text3)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Marketplaces</label>
                    <MarketplaceSelector selected={marketplaces} onChange={(mps) => setMarketplaces(mps as MarketplaceName[])} />
                  </div>

                  {shootType === 'on-model' && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text3)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Images per look</label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              setImagesPerLook(n)
                              const base = activeBrand?.on_model_angle_sequence?.length
                                ? activeBrand.on_model_angle_sequence
                                : ALL_ON_MODEL_ANGLES
                              setAngleSequence(base.slice(0, n))
                            }}
                            style={{
                              width: '36px', height: '36px', borderRadius: '9px',
                              border: imagesPerLook === n ? '1.5px solid var(--accent)' : '0.5px solid var(--line2)',
                              background: imagesPerLook === n ? 'var(--accent-glow)' : 'var(--bg3)',
                              color: imagesPerLook === n ? 'var(--accent)' : 'var(--text3)',
                              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {shootType === 'on-model' && (
                    <div>
                      <label style={{ fontSize: '13px', color: 'var(--text3)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Angle sequence</label>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {angleSequence.map((angle, idx) => {
                          const st = ANGLE_STYLE[angle] ?? { bg: 'var(--bg3)', color: 'var(--text3)', dot: 'var(--text3)' }
                          return (
                            <div
                              key={idx}
                              draggable
                              onDragStart={() => setDragIdx(idx)}
                              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx) }}
                              onDrop={() => {
                                if (dragIdx === null || dragIdx === idx) return
                                const next = [...angleSequence]
                                const [moved] = next.splice(dragIdx, 1)
                                next.splice(idx, 0, moved)
                                setAngleSequence(next)
                                setDragIdx(null)
                                setDragOverIdx(null)
                              }}
                              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '20px',
                                background: st.bg, color: st.color, fontSize: '12px', fontWeight: 500,
                                cursor: 'grab', border: dragOverIdx === idx ? `1.5px dashed ${st.dot}` : '1px solid transparent',
                                opacity: dragIdx === idx ? 0.4 : 1,
                              }}
                            >
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                              {idx + 1}. {angle}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* S3 Browser Modal */}
            {s3BrowserOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--line)', borderRadius: '16px', width: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>S3 Browser</p>
                      <p style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>
                        {activeBrand?.cloud_connections?.s3?.bucket}{s3Prefix ? ` / ${s3Prefix}` : ''}
                      </p>
                    </div>
                    <button onClick={() => setS3BrowserOpen(false)} style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                    {s3Loading ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>Loading…</div>
                    ) : (
                      <>
                        {s3Prefix && (
                          <button onClick={() => loadS3Folder(s3Prefix.split('/').slice(0, -2).join('/') + (s3Prefix.includes('/') ? '/' : ''))} style={{ width: '100%', textAlign: 'left', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Back
                          </button>
                        )}
                        {s3Folders.map((folder) => (
                          <button key={folder.key} onClick={() => loadS3Folder(folder.key)} style={{ width: '100%', textAlign: 'left', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M1 3.5h12v9H1zM1 3.5l2-2h5l1 1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {folder.name}/
                          </button>
                        ))}
                        {s3Files.map((file) => (
                          <label key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 20px', cursor: 'pointer', background: s3Selected.has(file.id) ? 'var(--accent-glow)' : 'transparent' }}>
                            <input type="checkbox" checked={s3Selected.has(file.id)} onChange={(e) => setS3Selected((prev) => { const next = new Set(prev); e.target.checked ? next.add(file.id) : next.delete(file.id); return next })} style={{ width: '14px', height: '14px', accentColor: 'var(--accent)', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text3)', flexShrink: 0 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                          </label>
                        ))}
                        {s3Files.length === 0 && s3Folders.length === 0 && !s3Loading && (
                          <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No image files found in this location.</p>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ padding: '12px 20px', borderTop: '0.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text3)' }}>{s3Selected.size > 0 ? `${s3Selected.size} selected` : `${s3Files.length} files`}</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {s3Files.length > 0 && (
                        <button onClick={() => setS3Selected(s3Selected.size === s3Files.length ? new Set() : new Set(s3Files.map((f) => f.id)))} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          {s3Selected.size === s3Files.length ? 'Deselect all' : 'Select all'}
                        </button>
                      )}
                      <button onClick={importFromS3} disabled={s3Selected.size === 0 || cloudImporting === 's3'} className="btn btn-primary btn-sm">
                        {cloudImporting === 's3' ? 'Importing…' : `Import ${s3Selected.size > 0 ? s3Selected.size : ''} file${s3Selected.size !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Google Drive Browser Modal */}
            {gdriveBrowserOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--line)', borderRadius: '16px', width: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>Google Drive</p>
                      <p style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>
                        {gdriveFolderStack.length === 0 ? 'My Drive' : gdriveFolderStack.map((f) => f.name).join(' / ')}
                      </p>
                    </div>
                    <button onClick={() => { setGdriveBrowserOpen(false); setGdriveDirectToken(null) }} style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                    {gdriveLoading ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>Loading…</div>
                    ) : gdriveError ? (
                      <div style={{ padding: '32px', textAlign: 'center' }}>
                        <p style={{ fontSize: '13px', color: 'var(--accent3)', marginBottom: '8px' }}>{gdriveError}</p>
                        {gdriveError.includes('reconnect') && (
                          <a href="/dashboard/integrations" style={{ fontSize: '13px', color: 'var(--accent)' }}>Go to Settings → Integrations</a>
                        )}
                      </div>
                    ) : (
                      <>
                        {gdriveFolderStack.length > 0 && (
                          <button onClick={gdriveGoBack} style={{ width: '100%', textAlign: 'left', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Back
                          </button>
                        )}
                        {gdriveFolders.map((folder) => (
                          <button key={folder.id} onClick={() => gdriveDirectToken ? loadGdriveFolderDirect(gdriveDirectToken, folder.id, true, folder.name) : loadGdriveFolder(folder.id, folder.name, true)} style={{ width: '100%', textAlign: 'left', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M1 3.5h12v9H1zM1 3.5l2-2h5l1 1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {folder.name}/
                          </button>
                        ))}
                        {gdriveFiles.map((file) => {
                          const tooLarge = file.size > 3 * 1024 * 1024
                          return (
                            <label key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 20px', cursor: tooLarge ? 'not-allowed' : 'pointer', background: gdriveSelected.has(file.id) ? 'var(--accent-glow)' : 'transparent', opacity: tooLarge ? 0.45 : 1 }}>
                              <input type="checkbox" checked={gdriveSelected.has(file.id)} disabled={tooLarge} onChange={(e) => setGdriveSelected((prev) => { const next = new Set(prev); e.target.checked ? next.add(file.id) : next.delete(file.id); return next })} style={{ width: '14px', height: '14px', accentColor: 'var(--accent)', flexShrink: 0 }} />
                              <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                              {tooLarge
                                ? <span style={{ fontSize: '12px', color: 'var(--accent3)', flexShrink: 0 }}>{(file.size / 1024 / 1024).toFixed(1)} MB · too large</span>
                                : <span style={{ fontSize: '12px', color: 'var(--text3)', flexShrink: 0 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                              }
                            </label>
                          )
                        })}
                        {gdriveFiles.length === 0 && gdriveFolders.length === 0 && !gdriveLoading && (
                          <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No image files found in this location.</p>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ padding: '12px 20px', borderTop: '0.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text3)' }}>{gdriveSelected.size > 0 ? `${gdriveSelected.size} selected` : `${gdriveFiles.length} files`}</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {gdriveFiles.length > 0 && (
                        <button onClick={() => { const eligible = gdriveFiles.filter((f) => f.size <= 3 * 1024 * 1024).map((f) => f.id); setGdriveSelected(gdriveSelected.size === eligible.length ? new Set() : new Set(eligible)) }} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          {gdriveSelected.size === gdriveFiles.filter((f) => f.size <= 3 * 1024 * 1024).length ? 'Deselect all' : 'Select all'}
                        </button>
                      )}
                      <button onClick={importFromGdriveBrowser} disabled={gdriveSelected.size === 0 || cloudImporting === 'google-drive'} className="btn btn-primary btn-sm">
                        {gdriveDownloadProgress
                          ? `Downloading ${gdriveDownloadProgress.done} of ${gdriveDownloadProgress.total}…`
                          : `Import ${gdriveSelected.size > 0 ? gdriveSelected.size : ''} file${gdriveSelected.size !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      {files.length > 0 && !isProcessing && (
        <div style={{
          position: 'fixed', bottom: 0, left: '200px', right: 0, zIndex: 20,
          padding: '12px 28px',
          background: 'var(--bg2)',
          borderTop: '0.5px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(0,122,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.6">
                <rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{files.length} images selected</p>
              <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
                {jobName || 'Untitled shoot'} · {shootType === 'on-model' ? 'On-model' : 'Still life'} · {imagesPerLook} per look
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setFiles([])} className="btn btn-ghost btn-sm">
              Clear
            </button>
            <button onClick={handleProcess} className="btn btn-primary">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 1l4 4-4 4M3 5h8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Process {files.length} Images
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
