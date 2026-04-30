'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import type { MarketplaceName, Job } from '@/types'

declare global {
  interface Window {
    showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
  }
  interface FileSystemDirectoryHandle {
    getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
    getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemFileHandle>
  }
  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>
  }
  interface FileSystemWritableFileStream {
    write(data: BufferSource | Blob | string): Promise<void>
    close(): Promise<void>
  }
}

type ExportMode = 'zip' | 'folder'

const PALETTE: Record<MarketplaceName, { bgSel: string; border: string; dot: string; text: string }> = {
  'the-iconic': { bgSel: 'rgba(255,159,10,0.14)', border: '#ff9f0a', dot: '#ff9f0a', text: '#7a4a00' },
  myer:         { bgSel: 'rgba(255,59,48,0.13)',  border: '#ff3b30', dot: '#ff3b30', text: '#8a1a14' },
  'david-jones':{ bgSel: 'rgba(0,122,255,0.12)',  border: '#0071e3', dot: '#0071e3', text: '#003d80' },
  shopify:      { bgSel: 'rgba(48,209,88,0.14)',  border: '#30d158', dot: '#1a8a35', text: '#1a5c2a' },
}

const DESCRIPTIONS: Record<MarketplaceName, string> = {
  'the-iconic':  'AU & NZ fashion',
  myer:          'Department store',
  'david-jones': 'Luxury retail',
  shopify:       'Your storefront',
}

export default function ExportPage({ params }: { params: { jobId: string } }) {
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<MarketplaceName[]>(['the-iconic'])
  const [exportMode, setExportMode] = useState<ExportMode>('zip')

  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folderHandleRef = useRef<any>(null)
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [fsaSupported, setFsaSupported] = useState(false)
  const [isSavingToFolder, setIsSavingToFolder] = useState(false)
  const [folderProgress, setFolderProgress] = useState(0)
  const [folderStatus, setFolderStatus] = useState('')
  const [folderDone, setFolderDone] = useState(false)
  const [writtenFiles, setWrittenFiles] = useState<{ marketplace: string; count: number }[]>([])

  useEffect(() => {
    setFsaSupported(typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function')
    fetch(`/api/jobs/${params.jobId}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setJob(data)
          if (data.selected_marketplaces?.length) {
            setSelectedMarketplaces(data.selected_marketplaces)
          }
        }
      })
      .catch(() => {})
  }, [params.jobId])

  const handleZipExport = async () => {
    if (!selectedMarketplaces.length) return
    setIsExporting(true)
    setExportProgress(10)
    setError(null)
    try {
      const progressInterval = setInterval(() => {
        setExportProgress((p) => Math.min(p + 8, 90))
      }, 600)
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: params.jobId, marketplaces: selectedMarketplaces }),
      })
      clearInterval(progressInterval)
      setExportProgress(100)
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg)
      }
      setTimeout(() => { router.push(`/dashboard/jobs/${params.jobId}/download`) }, 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const pickFolder = async () => {
    if (!window.showDirectoryPicker) return
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      folderHandleRef.current = handle
      setFolderPath(handle.name)
      setFolderDone(false)
      setWrittenFiles([])
    } catch { /* user cancelled */ }
  }

  const handleSaveToFolder = async () => {
    if (!folderHandleRef.current || !selectedMarketplaces.length) return
    setIsSavingToFolder(true)
    setFolderProgress(0)
    setFolderStatus('Fetching processed images…')
    setFolderDone(false)
    setWrittenFiles([])
    setError(null)
    try {
      setFolderProgress(5)
      const res = await fetch('/api/export/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: params.jobId, marketplaces: selectedMarketplaces, job_name: job?.name }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Export failed')
      }
      setFolderProgress(40)
      setFolderStatus('Parsing export package…')
      const zipBlob = await res.blob()
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(zipBlob)
      const byFolder: Record<string, { name: string; data: ArrayBuffer }[]> = {}
      const entries = Object.entries(zip.files).filter(([, f]) => !f.dir)
      let done = 0
      setFolderStatus(`Writing ${entries.length} files to disk…`)
      for (const [path, file] of entries) {
        const slash = path.indexOf('/')
        const folderName = slash >= 0 ? path.slice(0, slash) : 'Export'
        const filename = slash >= 0 ? path.slice(slash + 1) : path
        const data = await file.async('arraybuffer')
        if (!byFolder[folderName]) byFolder[folderName] = []
        byFolder[folderName].push({ name: filename, data })
        done++
        setFolderProgress(40 + Math.round((done / entries.length) * 40))
      }
      setFolderProgress(80)
      const rootHandle = folderHandleRef.current
      const results: { marketplace: string; count: number }[] = []
      for (const [folderName, files] of Object.entries(byFolder)) {
        setFolderStatus(`Writing to ${folderName}/…`)
        const subDir = await rootHandle.getDirectoryHandle(folderName, { create: true })
        for (const { name, data } of files) {
          const fh = await subDir.getFileHandle(name, { create: true })
          const writable = await fh.createWritable()
          await writable.write(data)
          await writable.close()
        }
        results.push({ marketplace: folderName, count: files.length })
      }
      setFolderProgress(100)
      setFolderStatus('Done')
      setWrittenFiles(results)
      setFolderDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save files')
    } finally {
      setIsSavingToFolder(false)
    }
  }

  const exportRows = selectedMarketplaces.map((id) => ({ id, rule: MARKETPLACE_RULES[id] }))
  const canExport = selectedMarketplaces.length > 0
  const isRunning = isExporting || isSavingToFolder
  const activeProgress = isExporting ? exportProgress : folderProgress
  const activeStatus = isExporting
    ? (exportProgress < 100 ? 'Building export package…' : 'Finalizing…')
    : folderStatus

  const toggleMarketplace = (id: MarketplaceName) => {
    setSelectedMarketplaces((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  return (
    <div>
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Jobs', href: '/dashboard/jobs' },
          { label: job?.name ?? 'Job', href: `/dashboard/jobs/${params.jobId}` },
          { label: 'Export' },
        ]}
      />

      <div style={{ padding: '28px' }}>

        {/* ── Hero stats bar ──────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.9)', border: '0.5px solid rgba(0,0,0,0.08)',
          borderRadius: '16px', padding: '20px 24px', marginBottom: '20px',
          backdropFilter: 'blur(8px)',
        }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px' }}>
              Export
            </p>
            <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', color: '#1d1d1f', marginBottom: '5px' }}>
              {job?.name ?? 'Loading…'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4e4e53' }}>
              <span style={{ fontWeight: 500 }}>{job?.cluster_count ?? '—'} clusters</span>
              <span style={{ color: '#d1d1d6' }}>·</span>
              <span>{job?.total_images ?? '—'} images</span>
              <span style={{ color: '#d1d1d6' }}>·</span>
              <span>{selectedMarketplaces.length} marketplace{selectedMarketplaces.length !== 1 ? 's' : ''} selected</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', background: 'rgba(48,209,88,0.08)', borderRadius: '10px', flexShrink: 0 }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#30d158', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a8a35' }}>Ready</span>
          </div>
        </div>

        {/* ── Two-column layout ─────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.45fr', gap: '14px', alignItems: 'start' }}>

          {/* ── LEFT: Config ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Marketplace selector */}
            <div style={{ background: 'rgba(255,255,255,0.9)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.1px' }}>Marketplaces</span>
                <span style={{ fontSize: '12px', color: '#aeaeb2' }}>{selectedMarketplaces.length} selected</span>
              </div>
              <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(Object.keys(MARKETPLACE_RULES) as MarketplaceName[]).map((id) => {
                  const rule = MARKETPLACE_RULES[id]
                  const isSelected = selectedMarketplaces.includes(id)
                  const p = PALETTE[id]
                  return (
                    <button
                      key={id}
                      onClick={() => toggleMarketplace(id)}
                      style={{
                        position: 'relative',
                        background: isSelected ? p.bgSel : 'rgba(0,0,0,0.02)',
                        border: isSelected ? `1.5px solid ${p.border}` : '1px solid rgba(0,0,0,0.07)',
                        borderRadius: '10px', padding: '13px',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s',
                        opacity: isSelected ? 1 : 0.35,
                      }}
                    >
                      {isSelected && (
                        <span style={{
                          position: 'absolute', top: '10px', right: '10px',
                          width: '17px', height: '17px', borderRadius: '50%',
                          background: p.border,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <polyline points="1.5 4.5 3.5 6.5 7.5 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      )}
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: p.dot, marginBottom: '9px' }} />
                      <p style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? p.text : '#1d1d1f', letterSpacing: '-0.1px', marginBottom: '2px' }}>
                        {rule.name}
                      </p>
                      <p style={{ fontSize: '11px', color: '#aeaeb2', marginBottom: '6px' }}>
                        {DESCRIPTIONS[id]}
                      </p>
                      <p style={{ fontSize: '11px', color: '#aeaeb2', fontFamily: 'var(--font-dm-mono)' }}>
                        {rule.image_dimensions.width}×{rule.image_dimensions.height} · {rule.file_format.toUpperCase()}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Output format */}
            <div style={{ background: 'rgba(255,255,255,0.9)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.1px' }}>Output Format</span>
              </div>
              <div style={{ padding: '14px 18px' }}>
                <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.04)', padding: '3px', borderRadius: '8px', gap: '2px', marginBottom: exportMode === 'folder' ? '14px' : '0' }}>
                  {([
                    { id: 'zip' as ExportMode, label: 'Download ZIP' },
                    { id: 'folder' as ExportMode, label: 'Save to Folder' },
                  ] as const).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setExportMode(m.id); setError(null); setFolderDone(false) }}
                      style={{
                        padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        background: exportMode === m.id ? 'white' : 'transparent',
                        color: exportMode === m.id ? '#1d1d1f' : '#6e6e73',
                        boxShadow: exportMode === m.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {exportMode === 'folder' && (
                  <div>
                    {!fsaSupported && (
                      <p style={{ fontSize: '12px', color: '#c27800', padding: '8px 12px', background: 'rgba(255,159,10,0.08)', borderRadius: '7px', marginBottom: '12px' }}>
                        Requires Chrome or Edge. Use ZIP in other browsers.
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={pickFolder}
                        disabled={!fsaSupported || isSavingToFolder}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '7px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                          background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', color: '#1d1d1f',
                          opacity: !fsaSupported ? 0.4 : 1,
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M2 4h4l1.5 1.5H12a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" strokeLinejoin="round"/>
                        </svg>
                        Choose folder
                      </button>
                      {folderPath ? (
                        <span style={{ fontSize: '13px', color: '#1a8a35', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-dm-mono)' }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <polyline points="1.5 5 4 7.5 8.5 2.5"/>
                          </svg>
                          {folderPath}/
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#aeaeb2' }}>No folder selected</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Processing rules summary */}
            <div style={{ background: 'rgba(255,255,255,0.9)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.1px' }}>Processing Rules</span>
                <Link href="/dashboard/integrations" style={{ fontSize: '12px', color: '#aeaeb2', textDecoration: 'none' }}>
                  Edit →
                </Link>
              </div>
              <div>
                {exportRows.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#aeaeb2', padding: '12px 18px' }}>No marketplaces selected.</p>
                ) : (
                  exportRows.map(({ id, rule }, i) => (
                    <div key={id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 18px',
                      borderBottom: i < exportRows.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PALETTE[id].dot, flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f' }}>{rule.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#aeaeb2', fontFamily: 'var(--font-dm-mono)' }}>
                        <span>{rule.image_dimensions.width}×{rule.image_dimensions.height}</span>
                        <span>{rule.file_format.toUpperCase()}</span>
                        <span>Q{rule.quality}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Output / Progress ──────────────────────────────── */}
          <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Progress hero (during export) */}
            {isRunning && (
              <div style={{
                background: '#1d1d1f', borderRadius: '16px', padding: '36px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Exporting
                </p>
                <div style={{ fontSize: '80px', fontWeight: 700, color: 'white', letterSpacing: '-4px', lineHeight: 1, marginBottom: '4px', fontFamily: 'var(--font-dm-mono)' }}>
                  {activeProgress}
                  <span style={{ fontSize: '40px', color: 'rgba(255,255,255,0.35)' }}>%</span>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px', minHeight: '20px' }}>
                  {activeStatus}
                </p>
                <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%', borderRadius: '3px',
                      background: 'linear-gradient(90deg, #30d158, #34c759)',
                      width: `${activeProgress}%`,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '18px' }}>
                  {job?.total_images ?? 0} images · {selectedMarketplaces.length} marketplace{selectedMarketplaces.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Success panel (folder export done) */}
            {!isRunning && folderDone && (
              <div style={{
                background: 'rgba(48,209,88,0.07)', border: '1px solid rgba(48,209,88,0.25)',
                borderRadius: '16px', padding: '24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#30d158', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <polyline points="2.5 7.5 6 11 12.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a5c2a', letterSpacing: '-0.2px' }}>Export complete</p>
                    <p style={{ fontSize: '12px', color: '#1a8a35', fontFamily: 'var(--font-dm-mono)' }}>{folderPath}/</p>
                  </div>
                </div>
                {writtenFiles.map((r, i) => (
                  <div key={r.marketplace} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 0',
                    borderTop: i === 0 ? '0.5px solid rgba(48,209,88,0.2)' : 'none',
                    borderBottom: '0.5px solid rgba(48,209,88,0.12)',
                    fontSize: '13px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="rgba(48,209,88,0.7)" strokeWidth="1.5">
                        <path d="M2 4h4l1.5 1.5H12a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#1d1d1f' }}>{r.marketplace}/</span>
                    </div>
                    <span style={{ color: '#4e4e53' }}>{r.count} file{r.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Preview panel (before export) */}
            {!isRunning && !folderDone && (
              <div style={{ background: 'rgba(255,255,255,0.9)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.1px' }}>Output Preview</span>
                </div>
                <div style={{ padding: '16px 18px' }}>
                  {exportMode === 'zip' ? (
                    <div>
                      <p style={{ fontSize: '13px', color: '#4e4e53', lineHeight: 1.55, marginBottom: selectedMarketplaces.includes('shopify') ? '14px' : '0' }}>
                        A single ZIP will be downloaded containing {selectedMarketplaces.length > 0 ? `${selectedMarketplaces.length} folder${selectedMarketplaces.length !== 1 ? 's' : ''}` : 'folders'} — one per marketplace, each with images resized and renamed per your rules.
                      </p>
                      {selectedMarketplaces.length > 0 && (
                        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {selectedMarketplaces.map((id) => {
                            const rule = MARKETPLACE_RULES[id]
                            const p = PALETTE[id]
                            return (
                              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                                <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#1d1d1f' }}>
                                  {rule.name.replace(/\s+/g, '_')}/
                                </span>
                                <span style={{ color: '#aeaeb2', fontSize: '12px' }}>
                                  {rule.image_dimensions.width}×{rule.image_dimensions.height} {rule.file_format.toUpperCase()}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : folderPath ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontFamily: 'var(--font-dm-mono)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', marginBottom: '4px' }}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#f0a500" strokeWidth="1.5">
                          <path d="M2 4h4l1.5 1.5H12a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{folderPath}/</span>
                      </div>
                      {selectedMarketplaces.map((id, i) => {
                        const rule = MARKETPLACE_RULES[id]
                        const p = PALETTE[id]
                        const isLast = i === selectedMarketplaces.length - 1
                        return (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', paddingLeft: '8px' }}>
                            <span style={{ color: '#d1d1d6', userSelect: 'none', width: '16px', flexShrink: 0 }}>{isLast ? '└─' : '├─'}</span>
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={p.dot} strokeWidth="1.5">
                              <path d="M2 4h4l1.5 1.5H12a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" strokeLinejoin="round"/>
                            </svg>
                            <span style={{ color: '#4e4e53' }}>{rule.name.replace(/\s+/g, '_')}/</span>
                            <span style={{ color: '#aeaeb2' }}>({rule.image_dimensions.width}×{rule.image_dimensions.height})</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#aeaeb2' }}>Choose a folder to preview the output structure.</p>
                  )}
                </div>

                {/* Shopify callout */}
                {selectedMarketplaces.includes('shopify') && (
                  <div style={{
                    margin: '0 18px 16px', padding: '12px 14px',
                    background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.18)',
                    borderRadius: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158' }} />
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#1a5c2a' }}>Shopify-ready files included</p>
                    </div>
                    <p style={{ fontSize: '12px', color: '#4e4e53', marginBottom: '8px', lineHeight: 1.4 }}>
                      Files will be sized and named for Shopify product listings. Push directly to your store after export.
                    </p>
                    <Link href="/dashboard/integrations" style={{ fontSize: '12px', fontWeight: 500, color: '#1a8a35', textDecoration: 'none' }}>
                      Push to Shopify →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.18)', borderRadius: '10px', fontSize: '13px', color: '#c41c00' }}>
                {error}
              </div>
            )}

            {/* Primary CTA */}
            {!isRunning && !folderDone && (
              <div>
                <button
                  onClick={exportMode === 'zip' ? handleZipExport : handleSaveToFolder}
                  disabled={!canExport || (exportMode === 'folder' && (!folderHandleRef.current || !fsaSupported))}
                  style={{
                    width: '100%', padding: '17px', borderRadius: '12px',
                    background: '#1d1d1f', color: 'white', border: 'none', cursor: 'pointer',
                    fontSize: '15px', fontWeight: 600, letterSpacing: '-0.2px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                    transition: 'opacity 0.15s',
                    opacity: (!canExport || (exportMode === 'folder' && (!folderHandleRef.current || !fsaSupported))) ? 0.35 : 1,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7.5 10.5V2M4.5 7.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 13.5h11" strokeLinecap="round"/>
                  </svg>
                  {exportMode === 'zip'
                    ? `Export ZIP${selectedMarketplaces.length > 0 ? ` · ${selectedMarketplaces.length} marketplace${selectedMarketplaces.length !== 1 ? 's' : ''}` : ''}`
                    : `Save to ${folderPath ?? 'Folder'}`}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                  <Link
                    href={`/dashboard/jobs/${params.jobId}/validation`}
                    style={{ fontSize: '13px', color: '#aeaeb2', textDecoration: 'none' }}
                  >
                    ← Back
                  </Link>
                  <p style={{ fontSize: '12px', color: '#aeaeb2' }}>
                    {job?.total_images ?? 0} images · {job?.cluster_count ?? 0} clusters
                  </p>
                </div>
              </div>
            )}

            {/* Post-export actions (folder done) */}
            {folderDone && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link
                  href="/dashboard/jobs"
                  style={{
                    flex: 1, padding: '13px', borderRadius: '10px',
                    background: 'rgba(0,0,0,0.05)', textAlign: 'center',
                    fontSize: '13px', fontWeight: 500, color: '#1d1d1f', textDecoration: 'none',
                  }}
                >
                  All Jobs
                </Link>
                <button
                  onClick={() => { setFolderDone(false); setWrittenFiles([]); setError(null) }}
                  style={{
                    flex: 1, padding: '13px', borderRadius: '10px',
                    background: '#1d1d1f', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 500, color: 'white',
                  }}
                >
                  Export again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>
    </div>
  )
}
