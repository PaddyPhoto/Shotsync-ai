'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { MarketplaceSelector } from '@/components/export/MarketplaceSelector'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'
import type { MarketplaceName, Job } from '@/types'

// File System Access API types
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

export default function ExportPage({ params }: { params: { jobId: string } }) {
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<MarketplaceName[]>(['the-iconic'])
  const [exportMode, setExportMode] = useState<ExportMode>('zip')

  // ZIP download state
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

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

  // ── ZIP download export ──────────────────────────────────────────────────
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

      setTimeout(() => {
        router.push(`/dashboard/jobs/${params.jobId}/download`)
      }, 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  // ── Folder picker ────────────────────────────────────────────────────────
  const pickFolder = async () => {
    if (!window.showDirectoryPicker) return
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      folderHandleRef.current = handle
      setFolderPath(handle.name)
      setFolderDone(false)
      setWrittenFiles([])
    } catch {
      // user cancelled
    }
  }

  // ── Save to folder ───────────────────────────────────────────────────────
  const handleSaveToFolder = async () => {
    if (!folderHandleRef.current || !selectedMarketplaces.length) return
    setIsSavingToFolder(true)
    setFolderProgress(0)
    setFolderStatus('Fetching processed images…')
    setFolderDone(false)
    setWrittenFiles([])
    setError(null)

    try {
      // 1. Fetch ZIP from server
      setFolderProgress(5)
      const res = await fetch('/api/export/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: params.jobId,
          marketplaces: selectedMarketplaces,
          job_name: job?.name,
        }),
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

      // 2. Collect all files grouped by top-level folder (marketplace)
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

      // 3. Write to selected directory
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

  return (
    <div>
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Jobs', href: '/dashboard/jobs' },
          { label: job?.name ?? 'Job', href: `/dashboard/jobs/${params.jobId}` },
          { label: 'Export' },
        ]}
        actions={
          !isRunning ? (
            <button
              onClick={exportMode === 'zip' ? handleZipExport : handleSaveToFolder}
              disabled={!canExport || (exportMode === 'folder' && !folderHandleRef.current)}
              className="btn btn-primary"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 10V2M4 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12h10" strokeLinecap="round"/>
              </svg>
              {exportMode === 'zip' ? 'Export ZIP' : 'Save to Folder'}
            </button>
          ) : null
        }
      />

      <div className="p-7">
        <div className="mb-7">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
            Export Images
          </h1>
          <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">
            Process and export marketplace-ready image sets using your configured rules.
          </p>
        </div>

        {/* Marketplace selector */}
        <div className="card mb-6">
          <div className="card-head">
            <span className="card-title">Target Marketplaces</span>
            <span className="text-[0.78rem] text-[var(--text3)]">{selectedMarketplaces.length} selected</span>
          </div>
          <div className="card-body">
            <MarketplaceSelector selected={selectedMarketplaces} onChange={setSelectedMarketplaces} />
          </div>
        </div>

        {/* Export summary table */}
        {exportRows.length > 0 && (
          <div className="card mb-6">
            <div className="card-head">
              <span className="card-title">Processing Rules</span>
              <Link href="/dashboard/settings?tab=marketplaces" className="text-[0.75rem] text-[var(--text3)] hover:text-[var(--text2)] transition-colors">
                Edit rules
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Marketplace', 'Dimensions', 'Format', 'Quality', 'Required Shots', 'Folder'].map((h) => (
                      <th key={h} className="text-left text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[var(--text3)] px-3 py-2 border-b border-[var(--line)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exportRows.map(({ id, rule }) => (
                    <tr key={id} className="hover:bg-[var(--bg3)] transition-colors">
                      <td className="px-3 py-[10px] text-[0.82rem] text-[var(--text)] border-b border-[var(--line)] font-medium">
                        {rule.name}
                      </td>
                      <td className="px-3 py-[10px] text-[0.82rem] border-b border-[var(--line)]" style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text2)' }}>
                        {rule.image_dimensions.width}×{rule.image_dimensions.height}
                      </td>
                      <td className="px-3 py-[10px] text-[0.82rem] border-b border-[var(--line)]" style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text2)' }}>
                        {rule.file_format.toUpperCase()}
                      </td>
                      <td className="px-3 py-[10px] text-[0.82rem] border-b border-[var(--line)]" style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text2)' }}>
                        {rule.quality}%
                      </td>
                      <td className="px-3 py-[10px] text-[0.82rem] border-b border-[var(--line)] text-[var(--text2)]">
                        {rule.required_views.join(', ')}
                      </td>
                      <td className="px-3 py-[10px] text-[0.75rem] border-b border-[var(--line)]" style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text3)' }}>
                        {rule.name.replace(/\s+/g, '_')}/
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Output mode */}
        <div className="card mb-6">
          <div className="card-head">
            <span className="card-title">Output</span>
          </div>
          <div className="card-body flex flex-col gap-4">

            {/* Mode toggle */}
            <div className="inline-flex bg-[var(--bg3)] p-[3px] rounded-sm gap-[2px]">
              {([
                { id: 'zip', label: 'Download ZIP', icon: (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M6.5 9V1M4 6.5l2.5 2.5 2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1.5 11h10" strokeLinecap="round"/>
                  </svg>
                )},
                { id: 'folder', label: 'Save to Folder', icon: (
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M2 4h4l1.5 1.5H12a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" strokeLinejoin="round"/>
                  </svg>
                )},
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setExportMode(m.id); setError(null); setFolderDone(false) }}
                  className={`flex items-center gap-[6px] px-[14px] py-[6px] rounded-[5px] text-[0.8rem] font-medium transition-all duration-150 ${
                    exportMode === m.id
                      ? 'bg-[var(--bg)] text-[var(--text)]'
                      : 'text-[var(--text2)] hover:text-[var(--text)]'
                  }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>

            {/* ZIP mode content */}
            {exportMode === 'zip' && (
              <div>
                {isExporting ? (
                  <div>
                    <div className="flex items-center justify-between mb-2 text-[0.82rem]">
                      <span className="text-[var(--text2)]">
                        {exportProgress < 100 ? 'Building ZIP archives…' : 'Done!'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--accent)' }}>
                        {exportProgress}%
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--bg3)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${exportProgress}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }}
                      />
                    </div>
                    <p className="text-[0.75rem] text-[var(--text3)] mt-2">
                      Processing {job?.total_images ?? 0} images × {selectedMarketplaces.length} marketplace{selectedMarketplaces.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-[0.82rem] text-[var(--text3)]">
                    A single ZIP will be downloaded containing one folder per marketplace, each with images resized and renamed per your rules.
                  </p>
                )}
              </div>
            )}

            {/* Folder mode content */}
            {exportMode === 'folder' && (
              <div className="flex flex-col gap-4">
                {!fsaSupported && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-sm bg-[rgba(232,217,122,0.06)] border border-[rgba(232,217,122,0.18)] text-[0.78rem] text-[var(--accent)]">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0 mt-[1px]">
                      <path d="M7 1L1 13h12L7 1z" strokeLinejoin="round"/>
                      <path d="M7 5.5v3M7 9.5h.01" strokeLinecap="round"/>
                    </svg>
                    Folder saving requires Chrome or Edge. Use "Download ZIP" in other browsers.
                  </div>
                )}

                {/* Folder picker row */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={pickFolder}
                    disabled={!fsaSupported || isSavingToFolder}
                    className="btn btn-ghost btn-sm flex-shrink-0"
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M2 4h4l1.5 1.5H12a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" strokeLinejoin="round"/>
                    </svg>
                    Choose folder
                  </button>
                  {folderPath ? (
                    <span className="text-[0.8rem] text-[var(--text2)] truncate flex items-center gap-1" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--accent2)" strokeWidth="1.5">
                        <polyline points="2 5 4.5 7.5 8 2.5"/>
                      </svg>
                      {folderPath}/
                    </span>
                  ) : (
                    <span className="text-[0.78rem] text-[var(--text3)]">No folder selected</span>
                  )}
                </div>

                {/* Folder structure preview */}
                {folderPath && !isSavingToFolder && !folderDone && (
                  <div className="bg-[var(--bg3)] border border-[var(--line)] rounded-sm px-4 py-3">
                    <p className="text-[0.72rem] text-[var(--text3)] mb-2 uppercase tracking-[0.08em]">Output structure</p>
                    <div className="flex flex-col gap-[3px]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                      <span className="text-[0.78rem] text-[var(--accent)]">{folderPath}/</span>
                      {selectedMarketplaces.map((id) => {
                        const rule = MARKETPLACE_RULES[id]
                        const folderName = rule.name.replace(/\s+/g, '_')
                        return (
                          <span key={id} className="text-[0.75rem] text-[var(--text2)] pl-4">
                            ├─ {folderName}/
                            <span className="text-[var(--text3)]"> ({rule.image_dimensions.width}×{rule.image_dimensions.height} {rule.file_format.toUpperCase()})</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Progress */}
                {isSavingToFolder && (
                  <div>
                    <div className="flex items-center justify-between mb-2 text-[0.82rem]">
                      <span className="text-[var(--text2)]">{folderStatus}</span>
                      <span style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--accent)' }}>
                        {folderProgress}%
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--bg3)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${folderProgress}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }}
                      />
                    </div>
                  </div>
                )}

                {/* Done state */}
                {folderDone && writtenFiles.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[0.82rem] text-[var(--accent2)]">
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <polyline points="2 7 5.5 10.5 11 3"/>
                      </svg>
                      Files saved to <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{folderPath}/</span>
                    </div>
                    <div className="bg-[var(--bg3)] border border-[var(--line)] rounded-sm px-4 py-3 flex flex-col gap-1">
                      {writtenFiles.map((r) => (
                        <div key={r.marketplace} className="flex items-center justify-between text-[0.78rem]">
                          <span className="text-[var(--text2)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                            {r.marketplace}/
                          </span>
                          <span className="text-[var(--text3)]">{r.count} file{r.count !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-sm bg-[rgba(232,122,122,0.08)] border border-[rgba(232,122,122,0.2)] mb-4">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-[2px]" stroke="var(--accent3)" strokeWidth="1.5">
              <path d="M7 1L1 13h12L7 1z" strokeLinejoin="round"/>
              <path d="M7 5.5v3M7 9.5h.01" strokeLinecap="round"/>
            </svg>
            <p className="text-[0.82rem] text-[var(--accent3)]">{error}</p>
          </div>
        )}

        {/* Actions */}
        {!isRunning && (
          <div className="flex items-center gap-3 justify-between">
            <Link href={`/dashboard/jobs/${params.jobId}/validation`} className="btn btn-ghost">
              Back
            </Link>
            <button
              onClick={exportMode === 'zip' ? handleZipExport : handleSaveToFolder}
              disabled={!canExport || (exportMode === 'folder' && (!folderHandleRef.current || !fsaSupported))}
              className="btn btn-primary"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 10V2M4 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12h10" strokeLinecap="round"/>
              </svg>
              {exportMode === 'zip' ? `Generate ZIP (${selectedMarketplaces.length})` : 'Save to Folder'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
