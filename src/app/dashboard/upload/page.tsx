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
import { HelpTooltip } from '@/components/ui/HelpTooltip'

type Step = 'config' | 'files' | 'processing'

interface ProcessProgress {
  phase: string
  done: number
  total: number
}

export default function UploadPage() {
  const router = useRouter()
  const { activeBrand } = useBrand()
  const { canProcessImages, plan, openUpgrade } = usePlan()
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

  const [step, setStep] = useState<Step>('config')
  const [styleList, setStyleListLocal] = useState<StyleListEntry[]>([])
  const [styleListName, setStyleListName] = useState<string | null>(null)
  const styleListRef = useRef<HTMLInputElement>(null)
  // Whether the user has dismissed the "resume session" banner
  const [resumeDismissed, setResumeDismissed] = useState(false)
  const hasSession = existingSession.isReady && existingSession.clusters.length > 0 && !resumeDismissed

  const importStyleList = useCallback(async (file: File) => {
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]

      // Auto-detect header row — find the row containing STYLE CODE or SKU
      let headerIdx = -1
      let skuCol = -1, nameCol = -1, colourCol = -1, colourCodeCol = -1, styleNumberCol = -1
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
        entries.push({ sku, productName, colour, colourCode, styleNumber })
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

  // Sync when the active brand changes or shoot type changes
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

  // Pre-populate form fields and file list from existing session on mount
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
    // Reconstruct file list from in-memory cluster images (available as long as page wasn't refreshed)
    const existingFiles = existingSession.clusters.flatMap((c) => c.images.map((img) => img.file)).filter(Boolean)
    if (existingFiles.length) {
      setFiles(existingFiles)
      setStep('files')
    }
  }, []) // only on mount
  const [files, setFiles] = useState<File[]>([])
  const imageGridRef = useRef<HTMLDivElement>(null)

  const [progress, setProgress] = useState<ProcessProgress>({ phase: '', done: 0, total: 0 })
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [rejectedFiles, setRejectedFiles] = useState<{ name: string; reason: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Cloud import state
  const [cloudImporting, setCloudImporting] = useState<'dropbox' | 'google-drive' | 's3' | null>(null)
  const [cloudImportError, setCloudImportError] = useState<string | null>(null)
  const [s3Prefix, setS3Prefix] = useState('')
  const [s3Files, setS3Files] = useState<{ id: string; name: string; downloadUrl: string; size: number }[]>([])
  const [s3Folders, setS3Folders] = useState<{ key: string; name: string }[]>([])
  const [s3BrowserOpen, setS3BrowserOpen] = useState(false)
  const [s3Loading, setS3Loading] = useState(false)
  const [s3Selected, setS3Selected] = useState<Set<string>>(new Set())

  // Google Drive browser state
  const [gdriveBrowserOpen, setGdriveBrowserOpen] = useState(false)
  const [gdriveFiles, setGdriveFiles] = useState<{ id: string; name: string; downloadUrl: string; size: number; mimeType: string }[]>([])
  const [gdriveFolders, setGdriveFolders] = useState<{ id: string; name: string }[]>([])
  const [gdriveFolderStack, setGdriveFolderStack] = useState<{ id: string; name: string }[]>([])
  const [gdriveLoading, setGdriveLoading] = useState(false)
  const [gdriveSelected, setGdriveSelected] = useState<Set<string>>(new Set())
  const [gdriveToken, setGdriveToken] = useState<string | null>(null)
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
      const { openGoogleDrivePicker, downloadGoogleDriveFile } = await import('@/lib/cloud/google-drive')
      const chosen = await openGoogleDrivePicker()
      if (chosen.length === 0) { setCloudImporting(null); return }
      const downloaded: File[] = []
      for (const cf of chosen) {
        try { downloaded.push(await downloadGoogleDriveFile(cf)) } catch { /* skip */ }
      }
      if (downloaded.length > 0) acceptFiles(downloaded)
      else setCloudImportError('Could not download any files.')
    } catch (err) {
      setCloudImportError(err instanceof Error ? err.message : 'Google Drive import failed.')
    } finally {
      setCloudImporting(null)
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
    loadGdriveFolder(parent?.id ?? 'root', parent?.name ?? 'My Drive', false)
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

      // Process in parallel batches of 5
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

  const MAX_FILE_SIZE_MB = 20
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
    setStep('files')
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
      openUpgrade(`Your plan supports up to ${plan.limits.imagesPerJob} images per job. You selected ${files.length}.`)
      return
    }

    // Auto-park the current session so it can be resumed from the sidebar
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

    setStep('processing')
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

    setSession(name, clusters, marketplaces)

    // Save draft to IDB so the session survives browser close
    import('@/lib/session-store').then(({ saveSession }) =>
      saveSession('draft', name, clusters, marketplaces, activeBrand?.id ?? null)
    ).catch(() => { /* non-critical */ })

    router.push('/dashboard/review')
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div>
      <Topbar
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'New Upload' }]}
        actions={
          step === 'files' ? (
            <button onClick={handleProcess} className="btn btn-primary">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 1l4 4-4 4M3 5h8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Process {files.length} Images
            </button>
          ) : null
        }
      />

      <div className="p-7">

        {/* Resume session banner */}
        {hasSession && (
          <div className="mb-6 flex items-center gap-4 px-4 py-3 rounded-md border border-[var(--accent)] bg-[rgba(232,217,122,0.06)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <circle cx="8" cy="8" r="7"/><path d="M8 5v3l2 2"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[0.82rem] font-semibold text-[var(--text)]">
                Session restored — {existingSession.clusters.length} clusters · {existingSession.clusters.reduce((s, c) => s + c.images.length, 0)} images
              </p>
              <p className="text-[0.75rem] text-[var(--text3)] mt-[2px]">
                Your previous upload is still loaded. Starting a new upload will save this job automatically so you can resume it from the sidebar.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => router.push('/dashboard/review')}
                className="btn btn-primary btn-sm"
              >
                Back to Review
              </button>
              <button
                onClick={() => { resetSession(); setResumeDismissed(true); setFiles([]); setStep('config'); setJobName('') }}
                className="btn btn-ghost btn-sm text-[var(--text3)]"
              >
                Start fresh
              </button>
            </div>
          </div>
        )}

        {/* Page header with decorative angle pills */}
        <div style={{ marginBottom: '28px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(48,209,88,0.05) 50%, rgba(0,113,227,0.05) 100%)', border: '0.5px solid rgba(0,0,0,0.07)', padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative floating pills */}
          <div style={{ position: 'absolute', top: '16px', right: '24px', display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '340px', justifyContent: 'flex-end', pointerEvents: 'none' }}>
            {[
              { label: 'Front',       bg: 'rgba(48,209,88,0.12)',  color: '#1a8a35'  },
              { label: 'Back',        bg: 'rgba(0,122,255,0.10)',  color: '#005fc4'  },
              { label: 'Side',        bg: 'rgba(255,159,10,0.12)', color: '#c27800'  },
              { label: 'Full-length', bg: 'rgba(175,82,222,0.10)', color: '#7b2fa8'  },
              { label: 'Detail',      bg: 'rgba(255,59,48,0.10)',  color: '#c41c00'  },
              { label: 'Mood',        bg: 'rgba(255,55,95,0.10)',  color: '#b8003c'  },
              { label: 'Front 3/4',   bg: 'rgba(48,209,88,0.08)',  color: '#1a8a35'  },
              { label: 'Back 3/4',    bg: 'rgba(0,122,255,0.08)',  color: '#005fc4'  },
            ].map(({ label, bg, color }) => (
              <span key={label} style={{ fontSize: '11px', fontWeight: 500, padding: '3px 9px', borderRadius: '20px', background: bg, color, letterSpacing: '-.1px', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            ))}
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 500, letterSpacing: '-.8px', color: '#1d1d1f', marginBottom: '5px' }}>
            New Upload
          </h1>
          <p style={{ fontSize: '14px', color: '#6e6e73', maxWidth: '420px', lineHeight: 1.5 }}>
            Upload your shoot batch — images are clustered and organised automatically in your browser.
          </p>
        </div>

        {step !== 'processing' && (
          <>
            {/* Config */}
            <div className="card mb-6">
              <div className="card-head"><span className="card-title">Job Details</span></div>
              <div className="card-body flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">Shoot Name</label>
                    <input className="input" placeholder="e.g. SS25 Studio Shoot" value={jobName} onChange={(e) => setJobName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">Brand</label>
                    <div className="flex items-center gap-2 h-[35px] px-3 bg-[var(--bg3)] border border-[var(--line2)] rounded-sm">
                      {activeBrand ? (
                        <>
                          <div className="w-[18px] h-[18px] rounded-[3px] flex items-center justify-center text-[0.55rem] font-bold text-black flex-shrink-0" style={{ background: activeBrand.logo_color, fontFamily: 'var(--font-dm-mono)' }}>{activeBrand.brand_code}</div>
                          <span className="text-[0.82rem] text-[var(--text)]">{activeBrand.name}</span>
                        </>
                      ) : (
                        <span className="text-[0.82rem] text-[var(--text3)]">No brand selected</span>
                      )}
                    </div>
                    <p className="text-[0.7rem] text-[var(--text3)] mt-[5px]">Switch brands from the sidebar</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Shoot Type */}
            <div className="card mb-6">
              <div className="card-head"><span className="card-title">Shoot Type</span></div>
              <div className="card-body flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  {([
                    {
                      id: 'on-model', label: 'On-Model',
                      desc: 'Clothing worn by a model — front, back, side, full-length, mood',
                      pills: ['Front', 'Back', 'Side', 'Full-length', 'Mood'],
                      pillColors: [
                        { bg: 'rgba(48,209,88,0.12)', color: '#1a8a35' },
                        { bg: 'rgba(0,122,255,0.10)', color: '#005fc4' },
                        { bg: 'rgba(255,159,10,0.12)', color: '#c27800' },
                        { bg: 'rgba(175,82,222,0.10)', color: '#7b2fa8' },
                        { bg: 'rgba(255,55,95,0.10)', color: '#b8003c' },
                      ],
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="10" cy="5" r="2.5"/>
                          <path d="M6 20v-6l-2-4h12l-2 4v6" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 20v-5M12 20v-5" strokeLinecap="round"/>
                        </svg>
                      ),
                      accent: '#30d158', accentBg: 'rgba(48,209,88,0.10)',
                    },
                    {
                      id: 'still-life', label: 'Still Life',
                      desc: 'Accessories & products shot without a model',
                      pills: ['Front', 'Back', 'Side', 'Detail'],
                      pillColors: [
                        { bg: 'rgba(48,209,88,0.12)', color: '#1a8a35' },
                        { bg: 'rgba(0,122,255,0.10)', color: '#005fc4' },
                        { bg: 'rgba(255,159,10,0.12)', color: '#c27800' },
                        { bg: 'rgba(255,59,48,0.10)', color: '#c41c00' },
                      ],
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="7" width="14" height="10" rx="1.5"/>
                          <path d="M7 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round"/>
                          <circle cx="10" cy="12" r="1.5"/>
                        </svg>
                      ),
                      accent: '#0071e3', accentBg: 'rgba(0,113,227,0.10)',
                    },
                  ] as { id: ShootType; label: string; desc: string; pills: string[]; pillColors: {bg:string;color:string}[]; icon: React.ReactNode; accent: string; accentBg: string }[]).map(({ id, label, desc, pills, pillColors, icon, accent, accentBg }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setShootType(id); if (id === 'on-model') { setAccessoryCategory(null); setStillLifeType(null) } }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px',
                        padding: '16px', borderRadius: '12px', textAlign: 'left',
                        border: shootType === id ? `1.5px solid ${accent}` : '1px solid rgba(0,0,0,0.08)',
                        background: shootType === id ? accentBg : 'rgba(0,0,0,0.02)',
                        transition: 'all 0.15s', cursor: 'pointer',
                      }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: shootType === id ? accentBg : 'rgba(0,0,0,0.05)', color: shootType === id ? accent : '#aeaeb2', transition: 'all 0.15s' }}>
                        {icon}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-.2px', marginBottom: '3px' }}>{label}</p>
                        <p style={{ fontSize: '12px', color: '#6e6e73', lineHeight: 1.4 }}>{desc}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {pills.map((pill, i) => (
                          <span key={pill} style={{ fontSize: '11px', fontWeight: 500, padding: '2px 7px', borderRadius: '20px', background: pillColors[i]?.bg, color: pillColors[i]?.color }}>
                            {pill}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Images per look + angle sequence — on-model only */}
                {shootType === 'on-model' && (
                <div className="border-t border-[var(--line)] pt-4">
                  <div className="flex items-center justify-between mb-[8px]">
                    <label className="text-[0.78rem] text-[var(--text2)] flex items-center gap-1">
                      Images per Look
                      <HelpTooltip
                        position="right"
                        width={220}
                        content={
                          <span>
                            How many images make up <strong>one complete product</strong>. ShotSync.ai splits your uploaded files into groups of this size — in the same order your camera roll produces them.<br /><br />
                            <strong>Example:</strong> If every product has a Front, Back, Side, Detail and Mood shot, set this to 5.
                          </span>
                        }
                      />
                    </label>
                    {activeBrand && defaultImagesPerLook !== imagesPerLook && (
                      <button
                        onClick={() => {
                          const n = defaultImagesPerLook
                          setImagesPerLook(n)
                          const base = activeBrand?.on_model_angle_sequence?.length ? activeBrand.on_model_angle_sequence : ALL_ON_MODEL_ANGLES
                          const seq = [...base]
                          while (seq.length < n) seq.push(ALL_ON_MODEL_ANGLES[seq.length] ?? 'front')
                          setAngleSequence(seq.slice(0, n))
                        }}
                        className="text-[0.72rem] text-[var(--accent)] hover:underline flex-shrink-0"
                      >
                        Reset to brand default ({defaultImagesPerLook})
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setImagesPerLook(n)
                          const seq = [...angleSequence]
                          while (seq.length < n) seq.push(ALL_ON_MODEL_ANGLES[seq.length] ?? 'front')
                          setAngleSequence(seq.slice(0, n))
                        }}
                        style={{
                          width: '40px', height: '40px', borderRadius: '10px', border: 'none',
                          fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                          background: imagesPerLook === n ? '#1d1d1f' : 'rgba(0,0,0,0.05)',
                          color: imagesPerLook === n ? '#f5f5f7' : '#6e6e73',
                          boxShadow: imagesPerLook === n ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  {/* Angle sequence editor */}
                  <div>
                      <p className="text-[0.72rem] text-[var(--text3)] mb-3">Shoot sequence — set the order your photographer shoots each angle</p>
                      <div className="flex flex-col gap-[5px]">
                        {angleSequence.slice(0, imagesPerLook).map((angle, idx) => {
                          const ANGLE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
                            'front':       { bg: 'rgba(48,209,88,0.10)',  color: '#1a8a35', dot: '#30d158' },
                            'back':        { bg: 'rgba(0,122,255,0.09)',  color: '#005fc4', dot: '#0071e3' },
                            'side':        { bg: 'rgba(255,159,10,0.10)', color: '#c27800', dot: '#ff9f0a' },
                            'full-length': { bg: 'rgba(175,82,222,0.10)', color: '#7b2fa8', dot: '#af52de' },
                            'detail':      { bg: 'rgba(255,59,48,0.09)',  color: '#c41c00', dot: '#ff3b30' },
                            'mood':        { bg: 'rgba(255,55,95,0.09)',  color: '#b8003c', dot: '#ff375f' },
                            'front-3/4':   { bg: 'rgba(48,209,88,0.07)',  color: '#1a8a35', dot: '#30d158' },
                            'back-3/4':    { bg: 'rgba(0,122,255,0.07)',  color: '#005fc4', dot: '#0071e3' },
                          }
                          const style = ANGLE_STYLE[angle] ?? { bg: 'rgba(0,0,0,0.05)', color: '#6e6e73', dot: '#aeaeb2' }
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '18px', fontSize: '11px', color: '#aeaeb2', textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</span>
                              {/* Colored dot showing current angle */}
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: style.dot, flexShrink: 0 }} />
                              <select
                                value={angle}
                                onChange={(e) => {
                                  const seq = [...angleSequence]
                                  seq[idx] = e.target.value
                                  setAngleSequence(seq)
                                }}
                                style={{
                                  flex: 1, background: style.bg, border: `1px solid ${style.color}30`,
                                  borderRadius: '8px', padding: '5px 10px',
                                  fontSize: '13px', fontWeight: 500, color: style.color,
                                  outline: 'none', cursor: 'pointer', appearance: 'auto',
                                }}
                              >
                                {ALL_ON_MODEL_ANGLES.map((a) => (
                                  <option key={a} value={a}>{a}</option>
                                ))}
                              </select>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const seq = [...angleSequence]
                                    ;[seq[idx - 1], seq[idx]] = [seq[idx], seq[idx - 1]]
                                    setAngleSequence(seq)
                                  }}
                                  style={{ width: '20px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#aeaeb2', background: 'transparent', border: 'none', cursor: 'pointer', opacity: idx === 0 ? 0.2 : 1 }}
                                >▲</button>
                                <button
                                  type="button"
                                  disabled={idx >= imagesPerLook - 1}
                                  onClick={() => {
                                    const seq = [...angleSequence]
                                    ;[seq[idx], seq[idx + 1]] = [seq[idx + 1], seq[idx]]
                                    setAngleSequence(seq)
                                  }}
                                  style={{ width: '20px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#aeaeb2', background: 'transparent', border: 'none', cursor: 'pointer', opacity: idx >= imagesPerLook - 1 ? 0.2 : 1 }}
                                >▼</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Still life category picker */}
                {shootType === 'still-life' && (
                  <div className="border-t border-[var(--line)] pt-4">
                    <p className="text-[0.75rem] font-medium text-[var(--text2)] mb-1">Category</p>
                    <p className="text-[0.7rem] text-[var(--text3)] mb-3">Select what you&apos;re shooting — each category uses its own angle sequence and image count.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ACCESSORY_CATEGORIES.map((cat) => {
                        const brandSeq = activeBrand?.still_life_angle_sequences?.[cat.id]
                        const effectiveSeq: string[] = brandSeq && brandSeq.length > 0 ? brandSeq : (cat.angles as string[])
                        const count = effectiveSeq.length
                        const isSelected = stillLifeType === cat.id
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setStillLifeType(cat.id)
                              setImagesPerLook(count)
                            }}
                            className={`flex flex-col items-start px-3 py-2 rounded-sm border text-left transition-all ${
                              isSelected
                                ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.07)]'
                                : 'border-[var(--line2)] text-[var(--text2)] hover:border-[var(--line)] bg-[var(--bg3)]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-[3px]">
                              <span className={`text-[0.78rem] font-medium ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>{cat.label}</span>
                              <span className="text-[0.65rem] font-medium text-[var(--text3)] bg-[var(--bg4)] px-[6px] py-[1px] rounded-full">{count} shots</span>
                            </div>
                            <span className="text-[0.67rem] text-[var(--text3)]">{effectiveSeq.join(' · ')}</span>
                          </button>
                        )
                      })}
                    </div>
                    {!stillLifeType && (
                      <p className="text-[0.68rem] text-[var(--text3)] mt-2">Select a category to set the correct angle sequence and image count.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Style List Import */}
            <div className="card mb-6">
              <div className="card-head">
                <span className="card-title flex items-center gap-1">
                  Style List
                  <HelpTooltip
                    position="bottom"
                    width={260}
                    content={
                      <span>
                        Upload your brand's range sheet (.xlsx or .csv) to <strong>auto-fill SKU, colour, and product name</strong> on every cluster.<br /><br />
                        Matching works by finding the SKU from your spreadsheet inside the image filename — so include the SKU when naming your shoot files (e.g. <code style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>NS27502_BLACK_FRONT.jpg</code>).
                      </span>
                    }
                  />
                </span>
                {styleList.length > 0 && (
                  <span className="text-[0.78rem] text-[var(--accent2)]">{styleList.length} styles imported</span>
                )}
              </div>
              <div className="card-body">
                {styleList.length === 0 ? (
                  <div
                    onClick={() => styleListRef.current?.click()}
                    className="border border-dashed border-[var(--line2)] rounded-sm px-4 py-5 flex items-center gap-3 cursor-pointer hover:border-[var(--accent)] hover:bg-[rgba(74,158,255,0.03)] transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" strokeWidth="1.5">
                      <path d="M14 10v2.5A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5V10" strokeLinecap="round"/>
                      <path d="M8 2v7M5 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <p className="text-[0.82rem] text-[var(--text2)]">Import style list <span className="text-[var(--text3)]">· optional</span></p>
                      <p className="text-[0.72rem] text-[var(--text3)] mt-[2px]">Upload your brand's range list (.xlsx or .csv) to auto-populate SKUs on clusters</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-3 py-2 bg-[var(--bg3)] border border-[var(--line2)] rounded-sm">
                      <p className="text-[0.78rem] text-[var(--text)]">{styleListName}</p>
                      <p className="text-[0.7rem] text-[var(--text3)] mt-[2px]">
                        {styleList.length} styles · {[...new Set(styleList.map(e => e.colour).filter(Boolean))].length} colours
                      </p>
                    </div>
                    <button
                      onClick={() => { setStyleListLocal([]); setStyleList([]); setStyleListName(null) }}
                      className="text-[0.75rem] text-[var(--text3)] hover:text-[var(--accent3)] transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <input
                  ref={styleListRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importStyleList(f) }}
                />
              </div>
            </div>

            {/* Marketplace */}
            <div className="card mb-6">
              <div className="card-head">
                <span className="card-title">Target Marketplaces</span>
                <span className="text-[0.78rem] text-[var(--text3)]">{marketplaces.length} selected</span>
              </div>
              <div className="card-body">
                <MarketplaceSelector selected={marketplaces} onChange={setMarketplaces} />
              </div>
            </div>

            {/* Drop zone */}
            <div className="card mb-6">
              <div className="card-head">
                <span className="card-title">Images</span>
                {files.length > 0 && <span className="text-[0.78rem] text-[var(--text2)]">{files.length} selected</span>}
              </div>
              <div className="card-body">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true) }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={onDrop}
                  style={{
                    borderRadius: '14px',
                    border: isDraggingOver ? '2px dashed #30d158' : '2px dashed rgba(0,0,0,0.10)',
                    background: isDraggingOver ? 'rgba(48,209,88,0.04)' : 'rgba(0,0,0,0.02)',
                    transition: 'all 0.15s',
                  }}
                >
                  {files.length === 0 ? (
                    <div onClick={() => inputRef.current?.click()} className="py-12 flex flex-col items-center gap-4 cursor-pointer">
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(48,209,88,0.15), rgba(0,113,227,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.5">
                            <path d="M12 17V7M8 11l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 20h14" strokeLinecap="round"/>
                          </svg>
                        </div>
                        {/* Small decorative image squares */}
                        <div style={{ position: 'absolute', top: '-6px', right: '-10px', width: '20px', height: '20px', borderRadius: '5px', background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.3)' }} />
                        <div style={{ position: 'absolute', bottom: '-4px', left: '-10px', width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(0,113,227,0.12)', border: '1px solid rgba(0,113,227,0.2)' }} />
                      </div>
                      <div className="text-center">
                        <p style={{ fontSize: '15px', fontWeight: 500, color: '#1d1d1f', marginBottom: '4px' }}>Drop images here</p>
                        <p style={{ fontSize: '13px', color: '#aeaeb2' }}>or click to browse · JPG, PNG, HEIC · 500–1000+ images supported</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {['JPG', 'PNG', 'WebP', 'HEIC'].map((fmt) => (
                          <span key={fmt} style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: 'rgba(0,0,0,0.05)', color: '#6e6e73' }}>{fmt}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3" ref={imageGridRef}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[0.78rem] font-medium text-[var(--text2)]">{files.length} images queued</p>
                        <div className="flex items-center gap-3">
                          <button onClick={() => inputRef.current?.click()} className="text-[0.75rem] text-[var(--accent)] hover:underline">+ Add more</button>
                          <button onClick={() => { setFiles([]); setStep('config') }} className="text-[0.75rem] text-[var(--text3)] hover:text-[var(--accent3)] transition-colors">Clear all</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-[3px]">
                        {files.slice(0, 80).map((f, i) => (
                          <div key={i} className="aspect-square rounded-[3px] overflow-hidden bg-[var(--bg4)]">
                            <img
                              src={URL.createObjectURL(f)}
                              alt={f.name}
                              className="w-full h-full object-cover"
                              onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                            />
                          </div>
                        ))}
                        {files.length > 80 && (
                          <div className="aspect-square rounded-[3px] bg-[var(--bg4)] flex items-center justify-center">
                            <span className="text-[0.65rem] text-[var(--text3)]">+{files.length - 80}</span>
                          </div>
                        )}
                      </div>
                      {plan.limits.imagesPerJob !== -1 && files.length > plan.limits.imagesPerJob && (
                        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-sm bg-[rgba(232,122,122,0.08)] border border-[rgba(232,122,122,0.2)]">
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--accent3)" strokeWidth="1.5" className="flex-shrink-0">
                            <path d="M7 1L1 13h12L7 1z" strokeLinejoin="round"/>
                            <path d="M7 5.5v3M7 9.5h.01" strokeLinecap="round"/>
                          </svg>
                          <p className="text-[0.78rem] text-[var(--accent3)]">
                            {files.length} images selected — your plan allows {plan.limits.imagesPerJob}.{' '}
                            <button onClick={() => openUpgrade(`Upgrade to process more than ${plan.limits.imagesPerJob} images`)} className="underline hover:no-underline">Upgrade</button>
                          </p>
                        </div>
                      )}
                      {rejectedFiles.length > 0 && (
                        <div className="mt-2 rounded-sm border border-[rgba(255,159,10,0.25)] bg-[rgba(255,159,10,0.06)] px-3 py-2">
                          <div className="flex items-start gap-2">
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--accent4)" strokeWidth="1.5" className="flex-shrink-0 mt-[1px]">
                              <path d="M7 1L1 13h12L7 1z" strokeLinejoin="round"/>
                              <path d="M7 5.5v3M7 9.5h.01" strokeLinecap="round"/>
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-[0.78rem] font-medium text-[var(--accent4)]">
                                {rejectedFiles.length} file{rejectedFiles.length > 1 ? 's' : ''} skipped
                              </p>
                              <p className="text-[0.73rem] text-[var(--text3)] mt-[2px]">
                                Accepted formats: JPEG, PNG, WebP, HEIC · Max size: 20 MB per image
                              </p>
                              <ul className="mt-1 space-y-[2px]">
                                {rejectedFiles.slice(0, 5).map((r, i) => (
                                  <li key={i} className="text-[0.72rem] text-[var(--text3)] truncate">
                                    <span className="font-medium text-[var(--text2)]">{r.name}</span> — {r.reason}
                                  </li>
                                ))}
                                {rejectedFiles.length > 5 && (
                                  <li className="text-[0.72rem] text-[var(--text3)]">…and {rejectedFiles.length - 5} more</li>
                                )}
                              </ul>
                            </div>
                            <button onClick={() => setRejectedFiles([])} className="flex-shrink-0 text-[var(--text3)] hover:text-[var(--text)] transition-colors">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '8px' }}>Or import from cloud</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Dropbox */}
                    <button
                      onClick={importFromDropbox}
                      disabled={!!cloudImporting}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: '8px',
                        background: cloudImporting === 'dropbox' ? '#0061ff' : 'rgba(0,97,255,0.08)',
                        color: cloudImporting === 'dropbox' ? '#fff' : '#0061ff',
                        border: 'none', fontSize: '12px', fontWeight: 500, cursor: cloudImporting ? 'wait' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 40 40" fill="currentColor">
                        <path d="M20 8.3L10 15l10 6.7 10-6.7zm-10 13.4L0 15l10-6.7 10 6.7zm10-6.7L20 21.7 30 28.4l10-6.7zm-10 13.4L0 21.7l10-6.7 10 6.7zM20 30.1l10-6.7 10 6.7-10 6.7z"/>
                      </svg>
                      {cloudImporting === 'dropbox' ? 'Importing…' : 'Dropbox'}
                    </button>

                    {/* Google Drive */}
                    {activeBrand?.cloud_connections?.google_drive ? (
                      <button
                        onClick={() => { setGdriveBrowserOpen(true); loadGdriveFolder('root', 'My Drive', false) }}
                        disabled={!!cloudImporting}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 12px', borderRadius: '8px',
                          background: 'rgba(66,133,244,0.08)', color: '#4285f4',
                          border: 'none', fontSize: '12px', fontWeight: 500, cursor: cloudImporting ? 'wait' : 'pointer',
                        }}
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
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 12px', borderRadius: '8px',
                          background: cloudImporting === 'google-drive' ? '#4285f4' : 'rgba(66,133,244,0.08)',
                          color: cloudImporting === 'google-drive' ? '#fff' : '#4285f4',
                          border: 'none', fontSize: '12px', fontWeight: 500, cursor: cloudImporting ? 'wait' : 'pointer',
                          transition: 'all 0.15s',
                        }}
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

                    {/* S3 */}
                    {activeBrand?.cloud_connections?.s3?.bucket && (
                      <button
                        onClick={() => { setS3BrowserOpen(true); loadS3Folder(s3Prefix) }}
                        disabled={!!cloudImporting}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 12px', borderRadius: '8px',
                          background: 'rgba(255,153,0,0.08)', color: '#b36b00',
                          border: 'none', fontSize: '12px', fontWeight: 500, cursor: cloudImporting ? 'wait' : 'pointer',
                        }}
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
                    <p style={{ fontSize: '12px', color: '#ff3b30', marginTop: '6px' }}>{cloudImportError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* S3 Browser Modal */}
            {s3BrowserOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                <div style={{ background: 'var(--bg)', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: '16px', width: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f' }}>S3 Browser</p>
                      <p style={{ fontSize: '12px', color: '#aeaeb2', marginTop: '2px' }}>
                        {activeBrand?.cloud_connections?.s3?.bucket}{s3Prefix ? ` / ${s3Prefix}` : ''}
                      </p>
                    </div>
                    <button onClick={() => setS3BrowserOpen(false)} style={{ color: '#aeaeb2', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
                  </div>

                  <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                    {s3Loading ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#aeaeb2', fontSize: '13px' }}>Loading…</div>
                    ) : (
                      <>
                        {s3Prefix && (
                          <button
                            onClick={() => loadS3Folder(s3Prefix.split('/').slice(0, -2).join('/') + (s3Prefix.includes('/') ? '/' : ''))}
                            style={{ width: '100%', textAlign: 'left', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#005fc4', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Back
                          </button>
                        )}
                        {s3Folders.map((folder) => (
                          <button
                            key={folder.key}
                            onClick={() => loadS3Folder(folder.key)}
                            style={{ width: '100%', textAlign: 'left', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#aeaeb2" strokeWidth="1.5"><path d="M1 3.5h12v9H1zM1 3.5l2-2h5l1 1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {folder.name}/
                          </button>
                        ))}
                        {s3Files.map((file) => (
                          <label
                            key={file.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 20px', cursor: 'pointer', background: s3Selected.has(file.id) ? 'rgba(0,113,227,0.06)' : 'transparent' }}
                          >
                            <input
                              type="checkbox"
                              checked={s3Selected.has(file.id)}
                              onChange={(e) => setS3Selected((prev) => {
                                const next = new Set(prev)
                                e.target.checked ? next.add(file.id) : next.delete(file.id)
                                return next
                              })}
                              style={{ width: '14px', height: '14px', accentColor: '#0071e3', flexShrink: 0 }}
                            />
                            <span style={{ fontSize: '13px', color: '#1d1d1f', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                            <span style={{ fontSize: '11px', color: '#aeaeb2', flexShrink: 0 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                          </label>
                        ))}
                        {s3Files.length === 0 && s3Folders.length === 0 && !s3Loading && (
                          <p style={{ padding: '32px', textAlign: 'center', color: '#aeaeb2', fontSize: '13px' }}>No image files found in this location.</p>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '12px', color: '#aeaeb2' }}>
                      {s3Selected.size > 0 ? `${s3Selected.size} selected` : `${s3Files.length} files`}
                      {s3Files.length === 0 && s3Folders.length > 0 ? '' : ''}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {s3Files.length > 0 && (
                        <button
                          onClick={() => setS3Selected(s3Selected.size === s3Files.length ? new Set() : new Set(s3Files.map((f) => f.id)))}
                          style={{ fontSize: '12px', color: '#005fc4', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {s3Selected.size === s3Files.length ? 'Deselect all' : 'Select all'}
                        </button>
                      )}
                      <button
                        onClick={importFromS3}
                        disabled={s3Selected.size === 0 || cloudImporting === 's3'}
                        style={{
                          padding: '6px 14px', borderRadius: '8px',
                          background: s3Selected.size > 0 ? '#1d1d1f' : 'rgba(0,0,0,0.08)',
                          color: s3Selected.size > 0 ? '#f5f5f7' : '#aeaeb2',
                          border: 'none', fontSize: '13px', fontWeight: 500,
                          cursor: s3Selected.size > 0 ? 'pointer' : 'default',
                        }}
                      >
                        {cloudImporting === 's3' ? 'Importing…' : `Import ${s3Selected.size > 0 ? s3Selected.size : ''} file${s3Selected.size !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Google Drive Browser Modal */}
            {gdriveBrowserOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                <div style={{ background: 'var(--bg)', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: '16px', width: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f' }}>Google Drive</p>
                      <p style={{ fontSize: '12px', color: '#aeaeb2', marginTop: '2px' }}>
                        {gdriveFolderStack.length === 0 ? 'My Drive' : gdriveFolderStack.map((f) => f.name).join(' / ')}
                      </p>
                    </div>
                    <button onClick={() => setGdriveBrowserOpen(false)} style={{ color: '#aeaeb2', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
                  </div>

                  <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                    {gdriveLoading ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#aeaeb2', fontSize: '13px' }}>Loading…</div>
                    ) : gdriveError ? (
                      <div style={{ padding: '32px', textAlign: 'center' }}>
                        <p style={{ fontSize: '13px', color: '#ff3b30', marginBottom: '8px' }}>{gdriveError}</p>
                        {gdriveError.includes('reconnect') && (
                          <a href="/dashboard/settings?tab=integrations" style={{ fontSize: '12px', color: '#005fc4' }}>Go to Settings → Integrations</a>
                        )}
                      </div>
                    ) : (
                      <>
                        {gdriveFolderStack.length > 0 && (
                          <button
                            onClick={gdriveGoBack}
                            style={{ width: '100%', textAlign: 'left', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#005fc4', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Back
                          </button>
                        )}
                        {gdriveFolders.map((folder) => (
                          <button
                            key={folder.id}
                            onClick={() => loadGdriveFolder(folder.id, folder.name, true)}
                            style={{ width: '100%', textAlign: 'left', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#aeaeb2" strokeWidth="1.5"><path d="M1 3.5h12v9H1zM1 3.5l2-2h5l1 1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {folder.name}/
                          </button>
                        ))}
                        {gdriveFiles.map((file) => {
                          const tooLarge = file.size > 3 * 1024 * 1024
                          return (
                            <label
                              key={file.id}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 20px', cursor: tooLarge ? 'not-allowed' : 'pointer', background: gdriveSelected.has(file.id) ? 'rgba(66,133,244,0.06)' : 'transparent', opacity: tooLarge ? 0.45 : 1 }}
                            >
                              <input
                                type="checkbox"
                                checked={gdriveSelected.has(file.id)}
                                disabled={tooLarge}
                                onChange={(e) => setGdriveSelected((prev) => {
                                  const next = new Set(prev)
                                  e.target.checked ? next.add(file.id) : next.delete(file.id)
                                  return next
                                })}
                                style={{ width: '14px', height: '14px', accentColor: '#4285f4', flexShrink: 0 }}
                              />
                              <span style={{ fontSize: '13px', color: '#1d1d1f', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                              {tooLarge
                                ? <span style={{ fontSize: '11px', color: '#ff3b30', flexShrink: 0 }}>{(file.size / 1024 / 1024).toFixed(1)} MB · too large</span>
                                : <span style={{ fontSize: '11px', color: '#aeaeb2', flexShrink: 0 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                              }
                            </label>
                          )
                        })}
                        {gdriveFiles.length === 0 && gdriveFolders.length === 0 && !gdriveLoading && (
                          <p style={{ padding: '32px', textAlign: 'center', color: '#aeaeb2', fontSize: '13px' }}>No image files found in this location.</p>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '12px', color: '#aeaeb2' }}>
                      {gdriveSelected.size > 0 ? `${gdriveSelected.size} selected` : `${gdriveFiles.length} files`}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {gdriveFiles.length > 0 && (
                        <button
                          onClick={() => {
                            const eligible = gdriveFiles.filter((f) => f.size <= 3 * 1024 * 1024).map((f) => f.id)
                            setGdriveSelected(gdriveSelected.size === eligible.length ? new Set() : new Set(eligible))
                          }}
                          style={{ fontSize: '12px', color: '#005fc4', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {gdriveSelected.size === gdriveFiles.filter((f) => f.size <= 3 * 1024 * 1024).length ? 'Deselect all' : 'Select all'}
                        </button>
                      )}
                      <button
                        onClick={importFromGdriveBrowser}
                        disabled={gdriveSelected.size === 0 || cloudImporting === 'google-drive'}
                        style={{
                          padding: '6px 14px', borderRadius: '8px',
                          background: gdriveSelected.size > 0 ? '#1d1d1f' : 'rgba(0,0,0,0.08)',
                          color: gdriveSelected.size > 0 ? '#f5f5f7' : '#aeaeb2',
                          border: 'none', fontSize: '13px', fontWeight: 500,
                          cursor: gdriveSelected.size > 0 ? 'pointer' : 'default',
                        }}
                      >
                        {gdriveDownloadProgress
                          ? `Downloading ${gdriveDownloadProgress.done} of ${gdriveDownloadProgress.total}…`
                          : `Import ${gdriveSelected.size > 0 ? gdriveSelected.size : ''} file${gdriveSelected.size !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="flex justify-end gap-3">
                <button onClick={() => { setFiles([]); setStep('config') }} className="btn btn-ghost">Clear</button>
                <button onClick={handleProcess} className="btn btn-primary">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 1l4 4-4 4M3 5h8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Process {files.length} Images
                </button>
              </div>
            )}
          </>
        )}

        {/* Processing state */}
        {step === 'processing' && (
          <div className="max-w-[520px] mx-auto mt-12">
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-[rgba(232,217,122,0.1)] border border-[rgba(232,217,122,0.3)] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--accent)" strokeWidth="1.5" className="animate-spin" style={{ animationDuration: '2s' }}>
                  <circle cx="14" cy="14" r="11" strokeDasharray="50 20" />
                </svg>
              </div>
              <div className="text-center w-full">
                <p className="text-[1rem] font-semibold text-[var(--text)] mb-1">{progress.phase}</p>
                <p className="text-[0.82rem] text-[var(--text3)] mb-4">
                  {progress.done > 0 && progress.total > 0 && `${progress.done} / ${progress.total} images`}
                </p>
                <div className="h-[6px] bg-[var(--bg3)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }}
                  />
                </div>
                <p className="text-[0.78rem] text-[var(--accent)] mt-2" style={{ fontFamily: 'var(--font-dm-mono)' }}>{pct}%</p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full mt-2 text-center">
                {[
                  { label: 'Loading', active: progress.phase.startsWith('Loading') || progress.phase.startsWith('Start') },
                  { label: 'Grouping', active: progress.phase.startsWith('Group') },
                  { label: 'Done', active: progress.phase.startsWith('Done') },
                ].map((s) => (
                  <div key={s.label} className={`px-3 py-2 rounded-sm border transition-all ${s.active ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.05)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--text3)]'}`}>
                    <p className="text-[0.75rem] font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
