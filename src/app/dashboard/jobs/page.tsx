'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'
import { useSession } from '@/store/session'

// ── Jobs cache ────────────────────────────────────────────────────────────────
// Module-level: instant on back-navigation (same session, no JSON parse)
// sessionStorage: survives a full page refresh within the same tab
const JOBS_CACHE_TTL = 60_000
const JOBS_SS_KEY = 'shotsync:jobs-cache'
let _jobsCache: { brandId: string | null; jobs: JobRecord[]; ts: number } | null = null

function readJobsCache(brandId: string | null): JobRecord[] | null {
  if (_jobsCache && _jobsCache.brandId === brandId && Date.now() - _jobsCache.ts < JOBS_CACHE_TTL) return _jobsCache.jobs
  try {
    const raw = sessionStorage.getItem(JOBS_SS_KEY)
    if (!raw) return null
    const { brandId: b, jobs, ts } = JSON.parse(raw) as { brandId: string | null; jobs: JobRecord[]; ts: number }
    if (b === brandId && Date.now() - ts < JOBS_CACHE_TTL) return jobs
  } catch { /* ignore */ }
  return null
}

function writeJobsCache(brandId: string | null, jobs: JobRecord[]) {
  const entry = { brandId, jobs, ts: Date.now() }
  _jobsCache = entry
  try { sessionStorage.setItem(JOBS_SS_KEY, JSON.stringify(entry)) } catch { /* ignore */ }
}
// ─────────────────────────────────────────────────────────────────────────────

interface JobRecord {
  id: string
  job_name: string
  image_count: number
  cluster_count: number
  marketplaces: string[]
  status: string
  created_at: string
  brand_id?: string | null
  brands?: { name: string; brand_code: string; logo_color: string } | null
}

// IDB session IDs are loaded lazily — only after jobs are fetched
function useStoredSessions(jobIds: string[]): Set<string> {
  const [stored, setStored] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (jobIds.length === 0) return
    import('@/lib/session-store').then(async ({ hasSession }) => {
      const checks = await Promise.all(jobIds.map(async (id) => ({ id, has: await hasSession(id) })))
      setStored(new Set(checks.filter((c) => c.has).map((c) => c.id)))
    }).catch(() => { /* IDB unavailable */ })
  }, [jobIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  return stored
}

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  completed:  { bg: 'rgba(48,209,88,0.12)',  color: '#30d158', label: 'Completed'  },
  complete:   { bg: 'rgba(48,209,88,0.12)',  color: '#30d158', label: 'Completed'  },
  processing: { bg: 'rgba(0,122,255,0.12)',  color: '#4da3ff', label: 'Processing' },
  review:     { bg: 'rgba(255,159,10,0.12)', color: '#ff9f0a', label: 'Needs Review' },
  failed:     { bg: 'rgba(255,59,48,0.12)',  color: '#ff453a', label: 'Failed'     },
  error:      { bg: 'rgba(255,59,48,0.12)',  color: '#ff453a', label: 'Error'      },
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [reopeningId, setReopeningId] = useState<string | null>(null)
  const { activeBrand, isLoading: brandsLoading } = useBrand()
  const { setSession } = useSession()
  const router = useRouter()
  const storedSessions = useStoredSessions(jobs.map((j) => j.id))

  const handleReopen = async (jobId: string) => {
    setReopeningId(jobId)
    try {
      // 1. Try local IDB session first (same device — instant, no network)
      const { loadSession } = await import('@/lib/session-store')
      const result = await loadSession(jobId)
      if (result) {
        setSession(result.jobName, result.clusters, result.marketplaces)
        router.push('/dashboard/review')
        return
      }

      // 2. No local session — fetch cluster metadata from Supabase (cross-device)
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session: authSession } } = await createClient().auth.getSession()
      const token = authSession?.access_token
      const res = await fetch(`/api/jobs/${jobId}/session`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) return
      const json = await res.json()
      if (!json.clusters?.length) return

      // 3. Try to auto-load images from a previously remembered folder
      const { findFileAcrossHandles } = await import('@/lib/folder-store')
      const allFilenames: string[] = json.clusters.flatMap(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => (c.job_cluster_images ?? []).map((img: any) => img.filename as string)
      )
      const unique = [...new Set(allFilenames)]

      // Check a sample to see if the folder is accessible
      const sampleSize = Math.min(5, unique.length)
      const samples = await Promise.all(unique.slice(0, sampleSize).map((fn) => findFileAcrossHandles(fn)))
      const foundCount = samples.filter(Boolean).length

      if (unique.length > 0 && foundCount >= Math.ceil(sampleSize * 0.6)) {
        // Folder accessible — find all images and restore session directly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fileMap = new Map<string, File>()
        await Promise.all(unique.map(async (fn) => {
          const f = await findFileAcrossHandles(fn)
          if (f) fileMap.set(fn, f)
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clusters = json.clusters.map((c: any) => ({
          id: c.cluster_id,
          sku: c.sku,
          productName: c.product_name,
          color: c.color,
          colourCode: c.colour_code,
          styleNumber: c.style_number,
          label: c.label,
          category: c.category,
          isBottomwear: c.is_bottomwear ?? false,
          confirmed: c.confirmed ?? true,
          exported: false,
          images: (c.job_cluster_images ?? [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => a.image_order - b.image_order)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((img: any) => {
              const file = fileMap.get(img.filename)
              return {
                id: img.image_id,
                file: file ?? null,
                previewUrl: file ? URL.createObjectURL(file) : '',
                filename: img.filename,
                seqIndex: img.seq_index,
                viewLabel: img.view_label,
                viewConfidence: img.view_confidence,
              }
            }),
        }))
        setSession(json.jobName, clusters, json.marketplaces ?? [])
        router.push('/dashboard/review')
        return
      }

      // 4. Folder not accessible — go to upload page with reimport banner
      // Kat selects the folder once; from then on it's automatic
      sessionStorage.setItem('shotsync:reimport', JSON.stringify({
        clusters: json.clusters,
        jobName: json.jobName,
        marketplaces: json.marketplaces ?? [],
      }))
      router.push('/dashboard/upload')
    } catch (err) {
      console.error('Failed to reopen session:', err)
    } finally {
      setReopeningId(null)
    }
  }

  const fetchJobs = (token?: string) => {
    const brandId = activeBrand?.id ?? null
    const url = brandId ? `/api/jobs/history?brand_id=${brandId}` : '/api/jobs/history'
    return fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => r.json()).then((json) => {
      if (json.error || !Array.isArray(json.data)) {
        const errMsg = json.error ?? 'Unexpected response from server'
        console.error('[fetchJobs] API error:', errMsg)
        setFetchError(errMsg)
        return // don't wipe existing jobs on a server error
      }
      setFetchError(null)
      setJobs(json.data)
      writeJobsCache(brandId, json.data)
    })
  }

  useEffect(() => {
    if (brandsLoading) return
    const brandId = activeBrand?.id ?? null

    const doFetch = (background = false) =>
      import('@/lib/supabase/client').then(({ createClient }) =>
        createClient().auth.getSession()
      ).then(({ data: { session } }) =>
        fetchJobs(session?.access_token)
      ).then(() => {
        // fetchJobs already calls setJobs — update the cache with whatever was set
      }).catch(() => { if (!background) setJobs([]) })
        .finally(() => { if (!background) setLoading(false) })

    const cached = readJobsCache(brandId)
    if (cached) {
      setJobs(cached)
      setLoading(false)
      doFetch(true) // revalidate silently
    } else {
      setLoading(true)
      doFetch(false)
    }
  }, [activeBrand?.id, brandsLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (jobId: string) => {
    setDeletingId(jobId)
    setConfirmDeleteId(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      await fetch(`/api/jobs/history/${jobId}`, {
        method: 'DELETE',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      setJobs((prev) => {
        const next = prev.filter((j) => j.id !== jobId)
        writeJobsCache(activeBrand?.id ?? null, next)
        return next
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'All Jobs' },
        ]}
        actions={
          <Link href="/dashboard/upload" className="btn btn-primary">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7-7 7 7"/>
            </svg>
            New Upload
          </Link>
        }
      />

      <div className="p-7">
        <div className="mb-6">
          <h1 style={{ fontSize: '24px', fontWeight: 500, letterSpacing: '-.8px', color: 'var(--text)', marginBottom: '3px' }}>
            All Jobs
          </h1>
          {!loading && (
            <p style={{ fontSize: '15px', color: 'var(--text3)' }}>
              {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} — click any row to open
            </p>
          )}
        </div>

        {loading ? (
          <div style={{ fontSize: '15px', color: 'var(--text3)' }}>Loading…</div>
        ) : fetchError ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontSize: '15px', color: '#ff453a', marginBottom: '8px' }}>Failed to load jobs</p>
            <p style={{ fontSize: '13px', color: 'var(--text3)', fontFamily: 'monospace' }}>{fetchError}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--bg3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text3)" strokeWidth="1.5">
                <rect x="2" y="2" width="7" height="9" rx="1.5"/>
                <rect x="11" y="2" width="7" height="7" rx="1.5"/>
                <rect x="11" y="11" width="7" height="7" rx="1.5"/>
                <rect x="2" y="13" width="7" height="5" rx="1.5"/>
              </svg>
            </div>
            <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>No jobs yet</p>
            <p style={{ fontSize: '15px', color: 'var(--text3)', marginBottom: '16px' }}>Completed jobs will appear here.</p>
            <Link href="/dashboard/upload" className="btn btn-primary">Start a shoot</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {jobs.map((job) => {
              const chip = STATUS_MAP[job.status] ?? STATUS_MAP.completed
              const isDeleting = deletingId === job.id
              const isConfirming = confirmDeleteId === job.id

              const hasSession = storedSessions.has(job.id)
              const isReopening = reopeningId === job.id

              return (
                <div
                  key={job.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    background: 'var(--bg2)',
                    border: '0.5px solid var(--line)',
                    borderRadius: '14px',
                    padding: '0',
                    overflow: 'hidden',
                  }}
                >
                  {/* Clickable main area — opens directly in review/clusters */}
                  <button
                    onClick={() => handleReopen(job.id)}
                    disabled={isReopening}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 18px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      minWidth: 0,
                      opacity: isReopening ? 0.7 : 1,
                    }}
                  >
                    {/* Brand colour icon */}
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,255,255,0.04)',
                    }}>
                      {isReopening ? (
                        <div style={{ width: '16px', height: '16px', border: '1.5px solid var(--text3)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="var(--text3)" strokeWidth="1.5">
                          <rect x="2" y="2" width="6" height="8" rx="1"/>
                          <rect x="10" y="2" width="6" height="6" rx="1"/>
                          <rect x="10" y="10" width="6" height="6" rx="1"/>
                          <rect x="2" y="12" width="6" height="4" rx="1"/>
                        </svg>
                      )}
                    </div>

                    {/* Name + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.job_name}
                      </p>
                      <p style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '2px' }}>
                        {job.image_count} images · {job.cluster_count} clusters
                        {job.marketplaces?.length > 0 && <> · {job.marketplaces.length} marketplace{job.marketplaces.length !== 1 ? 's' : ''}</>}
                      </p>
                    </div>

                    {/* Date */}
                    <p style={{ fontSize: '14px', color: 'var(--text3)', flexShrink: 0 }}>
                      {new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>

                    {/* Status chip */}
                    <span style={{
                      flexShrink: 0,
                      fontSize: '14px', fontWeight: 500,
                      padding: '3px 9px', borderRadius: '6px',
                      background: chip.bg, color: chip.color,
                      letterSpacing: '-.1px',
                    }}>
                      {isReopening ? 'Opening…' : chip.label}
                    </span>
                  </button>

                  {/* Delete zone — separated so it doesn't navigate */}
                  <div style={{ padding: '0 14px 0 0', flexShrink: 0 }}>
                    {isConfirming ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', color: '#ff3b30' }}>Delete?</span>
                        <button
                          onClick={() => handleDelete(job.id)}
                          style={{ fontSize: '14px', fontWeight: 500, color: '#fff', background: '#ff3b30', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ fontSize: '14px', color: 'var(--text3)', background: 'transparent', border: 'none', padding: '3px 4px', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(job.id)}
                        disabled={isDeleting}
                        title="Delete job"
                        style={{ padding: '6px', borderRadius: '6px', color: 'var(--text3)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: isDeleting ? 0.4 : 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,59,48,0.08)'; (e.currentTarget as HTMLElement).style.color = '#ff3b30' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#4e4e53' }}
                      >
                        {isDeleting ? (
                          <div style={{ width: '14px', height: '14px', border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5 3.5l.5 8M9 3.5l-.5 8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
