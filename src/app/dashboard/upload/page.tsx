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
  const defaultImagesPerLook = shootType === 'still-life'
    ? (activeBrand?.still_life_images_per_look ?? 2)
    : (activeBrand?.images_per_look ?? 4)
  const [imagesPerLook, setImagesPerLook] = useState<number>(defaultImagesPerLook)
  const [angleSequence, setAngleSequence] = useState<string[]>(() => {
    const base = activeBrand?.on_model_angle_sequence?.length
      ? activeBrand.on_model_angle_sequence
      : ALL_ON_MODEL_ANGLES
    return base.slice(0, defaultImagesPerLook)
  })

  // Sync when the active brand changes or shoot type changes
  useEffect(() => {
    if (shootType === 'still-life') {
      setImagesPerLook(activeBrand?.still_life_images_per_look ?? 2)
    } else {
      const n = activeBrand?.images_per_look ?? 4
      setImagesPerLook(n)
      const base = activeBrand?.on_model_angle_sequence?.length
        ? activeBrand.on_model_angle_sequence
        : ALL_ON_MODEL_ANGLES
      const seq = [...base]
      while (seq.length < n) seq.push(ALL_ON_MODEL_ANGLES[seq.length] ?? 'front')
      setAngleSequence(seq.slice(0, n))
    }
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
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptFiles = useCallback((newFiles: File[]) => {
    const images = newFiles.filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size))
      const unique = images.filter((f) => !existing.has(f.name + f.size))
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
    setStep('processing')
    setProgress({ phase: 'Starting…', done: 0, total: files.length })

    const name = jobName || `Shoot – ${new Date().toLocaleDateString()}`
    setShootConfig(shootType, stillLifeType)
    const clusters = await processFiles(files, imagesPerLook, setProgress, shootType, stillLifeType ?? undefined, shootType === 'on-model' ? angleSequence : undefined)

    setSession(name, clusters, marketplaces)
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
                Your previous upload is still loaded. Change settings or add images, then reprocess — or go straight to review.
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

        <div className="mb-7">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
            New Upload
          </h1>
          <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">
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
                    { id: 'on-model', label: 'On-Model', desc: 'Clothing worn by a model — front, back, side, full-length, mood', icon: (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="10" cy="5" r="2.5"/>
                        <path d="M6 20v-6l-2-4h12l-2 4v6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 20v-5M12 20v-5" strokeLinecap="round"/>
                      </svg>
                    )},
                    { id: 'still-life', label: 'Still Life', desc: 'Accessories & products shot without a model', icon: (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="7" width="14" height="10" rx="1.5"/>
                        <path d="M7 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round"/>
                        <circle cx="10" cy="12" r="1.5"/>
                      </svg>
                    )},
                  ] as { id: ShootType; label: string; desc: string; icon: React.ReactNode }[]).map(({ id, label, desc, icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setShootType(id); if (id === 'on-model') { setAccessoryCategory(null); setStillLifeType(null) } }}
                      className={`flex flex-col items-start gap-2 p-4 rounded-sm border text-left transition-all ${
                        shootType === id
                          ? 'border-[var(--accent)] bg-[rgba(74,158,255,0.06)] text-[var(--text)]'
                          : 'border-[var(--line2)] bg-[var(--bg3)] text-[var(--text2)] hover:border-[var(--line)] hover:text-[var(--text)]'
                      }`}
                    >
                      <span className={shootType === id ? 'text-[var(--accent)]' : 'text-[var(--text3)]'}>{icon}</span>
                      <span className="text-[0.85rem] font-semibold">{label}</span>
                      <span className="text-[0.72rem] text-[var(--text3)] leading-snug">{desc}</span>
                    </button>
                  ))}
                </div>

                {/* Images per look + angle sequence */}
                <div className="border-t border-[var(--line)] pt-4">
                  <div className="flex items-center justify-between mb-[8px]">
                    <label className="text-[0.78rem] text-[var(--text2)] block">Images per Look</label>
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
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setImagesPerLook(n)
                          if (shootType === 'on-model') {
                            const seq = [...angleSequence]
                            while (seq.length < n) seq.push(ALL_ON_MODEL_ANGLES[seq.length] ?? 'front')
                            setAngleSequence(seq.slice(0, n))
                          }
                        }}
                        className={`w-[40px] h-[40px] rounded-sm border text-[0.85rem] font-medium transition-all ${
                          imagesPerLook === n
                            ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.1)] text-[var(--accent)]'
                            : 'border-[var(--line2)] text-[var(--text2)] hover:border-[var(--line)] hover:text-[var(--text)] bg-[var(--bg3)]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  {/* Angle sequence editor — on-model only */}
                  {shootType === 'on-model' && (
                    <div>
                      <p className="text-[0.72rem] text-[var(--text3)] mb-2">Shoot sequence — set the order your photographer shoots each angle</p>
                      <div className="flex flex-col gap-[6px]">
                        {angleSequence.slice(0, imagesPerLook).map((angle, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-5 text-[0.7rem] text-[var(--text3)] text-right shrink-0">{idx + 1}</span>
                            <select
                              value={angle}
                              onChange={(e) => {
                                const seq = [...angleSequence]
                                seq[idx] = e.target.value
                                setAngleSequence(seq)
                              }}
                              className="flex-1 bg-[var(--bg3)] border border-[var(--line2)] rounded-sm px-2 py-[5px] text-[0.78rem] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                            >
                              {ALL_ON_MODEL_ANGLES.map((a) => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                            </select>
                            <div className="flex flex-col gap-[2px]">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const seq = [...angleSequence]
                                  ;[seq[idx - 1], seq[idx]] = [seq[idx], seq[idx - 1]]
                                  setAngleSequence(seq)
                                }}
                                className="w-5 h-4 flex items-center justify-center text-[0.6rem] text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20"
                              >▲</button>
                              <button
                                type="button"
                                disabled={idx >= imagesPerLook - 1}
                                onClick={() => {
                                  const seq = [...angleSequence]
                                  ;[seq[idx], seq[idx + 1]] = [seq[idx + 1], seq[idx]]
                                  setAngleSequence(seq)
                                }}
                                className="w-5 h-4 flex items-center justify-center text-[0.6rem] text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20"
                              >▼</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {shootType === 'still-life' && (
                  <div className="border-t border-[var(--line)] pt-3">
                    <label className="text-[0.75rem] font-medium text-[var(--text2)] mb-2 block">Still Life Type</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { id: 'ghost-mannequin', label: 'Ghost Mannequin', desc: 'Front & Back', count: 2 },
                        { id: 'accessories',     label: 'Accessories',     desc: 'Front · Side · Detail · Back · Inside', count: 5 },
                        { id: 'jewellery',       label: 'Jewellery',       desc: 'Angle 1 · Angle 2 · Angle 3', count: 3 },
                      ].map(({ id, label, desc, count }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setStillLifeType(id)
                            setImagesPerLook(count)
                          }}
                          className={`flex flex-col items-start px-3 py-2 rounded-sm border text-left transition-all ${
                            stillLifeType === id
                              ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.07)] text-[var(--accent)]'
                              : 'border-[var(--line2)] text-[var(--text2)] hover:border-[var(--line)] bg-[var(--bg3)]'
                          }`}
                        >
                          <span className="text-[0.78rem] font-medium">{label}</span>
                          <span className="text-[0.68rem] text-[var(--text3)] mt-[1px]">{desc}</span>
                        </button>
                      ))}
                    </div>
                    {!stillLifeType && (
                      <p className="text-[0.68rem] text-[var(--text3)] mt-2">Select a type to set the correct angle sequence. You can still change angles per cluster on the review page.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Style List Import */}
            <div className="card mb-6">
              <div className="card-head">
                <span className="card-title">Style List</span>
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
                  className={`border-2 border-dashed rounded-md transition-all duration-150 ${
                    isDraggingOver
                      ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.05)]'
                      : files.length > 0 ? 'border-[var(--line2)] bg-[var(--bg3)]' : 'border-[var(--line2)] hover:border-[var(--line)] bg-[var(--bg3)]'
                  }`}
                >
                  {files.length === 0 ? (
                    <div onClick={() => inputRef.current?.click()} className="py-12 flex flex-col items-center gap-3 cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-[var(--bg4)] border border-[var(--line2)] flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--text3)" strokeWidth="1.5">
                          <path d="M11 16V6M7 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M4 18h14" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-[0.88rem] font-medium text-[var(--text)]">Drop images here</p>
                        <p className="text-[0.78rem] text-[var(--text3)] mt-1">or click to browse · JPG, PNG · 500–1000+ supported</p>
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
                    </div>
                  )}
                  <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => acceptFiles(Array.from(e.target.files ?? []))} />
                </div>
              </div>
            </div>

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
