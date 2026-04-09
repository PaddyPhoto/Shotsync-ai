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

  const [shootType, setShootType] = useState<ShootType>('on-model')
  const [accessoryCategory, setAccessoryCategory] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('config')
  const [styleList, setStyleListLocal] = useState<StyleListEntry[]>([])
  const [styleListName, setStyleListName] = useState<string | null>(null)
  const styleListRef = useRef<HTMLInputElement>(null)

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
  const [imagesPerLook, setImagesPerLook] = useState<number>(activeBrand?.images_per_look ?? 4)
  // Sync when the active brand changes (e.g. user switches brand in sidebar)
  useEffect(() => {
    if (activeBrand?.images_per_look) setImagesPerLook(activeBrand.images_per_look)
  }, [activeBrand?.id])
  const [files, setFiles] = useState<File[]>([])

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
    setShootConfig(shootType, null)
    const clusters = await processFiles(files, imagesPerLook, setProgress, shootType)

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

                {/* Images per look */}
                <div className="border-t border-[var(--line)] pt-4">
                  <div className="flex items-center justify-between mb-[8px]">
                    <div>
                      <label className="text-[0.78rem] text-[var(--text2)] block">Images per Look</label>
                      <p className="text-[0.72rem] text-[var(--text3)] mt-[3px]">
                        Every {imagesPerLook} image{imagesPerLook !== 1 ? 's' : ''} = one product look ·{' '}
                        <span style={{ fontFamily: 'var(--font-dm-mono)' }}>
                          {['Full Length', 'Front', 'Side', 'Mood', 'Detail', 'Back'].slice(0, imagesPerLook).join(' → ')}
                          {imagesPerLook > 6 ? ' → …' : ''}
                        </span>
                      </p>
                    </div>
                    {activeBrand && activeBrand.images_per_look !== imagesPerLook && (
                      <button
                        onClick={() => setImagesPerLook(activeBrand.images_per_look ?? 4)}
                        className="text-[0.72rem] text-[var(--accent)] hover:underline flex-shrink-0"
                      >
                        Reset to brand default ({activeBrand.images_per_look ?? 4})
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setImagesPerLook(n)}
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
                      onClick={() => { setShootType(id); if (id === 'on-model') setAccessoryCategory(null) }}
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

                {shootType === 'still-life' && (
                  <div className="border-t border-[var(--line)] pt-3">
                    <p className="text-[0.75rem] text-[var(--text3)]">
                      Product category (bags, shoes, jewellery etc.) is detected automatically per cluster by AI when enabled, or can be set manually on the clusters page.
                    </p>
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
                  onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-md py-12 flex flex-col items-center gap-3 cursor-pointer transition-all duration-150 ${
                    isDraggingOver
                      ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.05)]'
                      : 'border-[var(--line2)] hover:border-[var(--line)] bg-[var(--bg3)]'
                  }`}
                >
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
                  <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => acceptFiles(Array.from(e.target.files ?? []))} />
                </div>

                {files.length > 0 && plan.limits.imagesPerJob !== -1 && files.length > plan.limits.imagesPerJob && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-sm bg-[rgba(232,122,122,0.08)] border border-[rgba(232,122,122,0.2)]">
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

                {files.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[0.8rem] font-medium text-[var(--text2)]">{files.length} images queued</p>
                      <button onClick={() => { setFiles([]); setStep('config') }} className="text-[0.75rem] text-[var(--text3)] hover:text-[var(--accent3)] transition-colors">Clear all</button>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-[3px]">
                      {files.slice(0, 40).map((f, i) => (
                        <div key={i} className="aspect-square rounded-[3px] overflow-hidden bg-[var(--bg4)]">
                          <img
                            src={URL.createObjectURL(f)}
                            alt={f.name}
                            className="w-full h-full object-cover"
                            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                          />
                        </div>
                      ))}
                      {files.length > 40 && (
                        <div className="aspect-square rounded-[3px] bg-[var(--bg4)] flex items-center justify-center">
                          <span className="text-[0.65rem] text-[var(--text3)]">+{files.length - 40}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
