'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'
import { useMarketplaceRules } from '@/lib/marketplace/useMarketplaceRules'
import { useSession } from '@/store/session'

interface JobRecord {
  id: string
  job_name: string
  image_count: number
  cluster_count: number
  marketplaces: string[]
  status: string
  created_at: string
}

interface LifetimeStats {
  total_jobs: number
  total_images: number
  total_clusters: number
  total_exports: number
}

const STATUS_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  processing: { bg: 'rgba(0,122,255,0.12)',  color: '#4da3ff', label: 'Processing' },
  completed:  { bg: 'rgba(48,209,88,0.12)',  color: '#30d158', label: 'Ready'      },
  failed:     { bg: 'rgba(255,59,48,0.12)',  color: '#ff453a', label: 'Failed'     },
}

const PIPELINE_STEPS = [
  'Store uploaded images',
  'Generate embeddings',
  'Cluster by similarity',
  'Match SKUs from catalogue',
  'Classify shot angles',
  'Detect missing views',
  'Apply naming rules',
]

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [stats, setStats] = useState<LifetimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState<string | null>(null)
  const { activeBrand, brands, isLoading: brandsLoading } = useBrand()
  const { rules } = useMarketplaceRules()
  const { clusters, isReady, jobName: sessionJobName } = useSession((s) => ({ clusters: s.clusters, isReady: s.isReady, jobName: s.jobName }))
  const setSession = useSession((s) => s.setSession)
  const [draftSession, setDraftSession] = useState<{ jobName: string; clusterCount: number; imageCount: number; savedAt: string } | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) => {
      if (!session?.access_token) return
      fetch('/api/orgs/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then((r) => r.json()).then(({ data }) => {
        if (data?.name) setOrgName(data.name)
      }).catch(() => {})
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (brandsLoading) return  // wait for brands to resolve so this only fires once
    setLoading(true)
    const url = activeBrand?.id
      ? `/api/jobs/history?brand_id=${activeBrand.id}`
      : '/api/jobs/history'
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) =>
      fetch(url, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
    ).then((r) => r.json())
      .then(({ data, stats: s }) => {
        setJobs(Array.isArray(data) ? data.slice(0, 4) : [])
        if (s) setStats(s)
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [activeBrand?.id, brandsLoading])

  // Check IDB for a saved draft session (unfinished job from a previous browser session)
  useEffect(() => {
    if (isReady && clusters.length > 0) return // in-memory session takes priority
    import('@/lib/session-store').then(({ listSessions }) =>
      listSessions()
    ).then((sessions) => {
      const draft = sessions.find((s) => s.id === 'draft')
      setDraftSession(draft ? {
        jobName: draft.jobName,
        clusterCount: draft.clusterCount,
        imageCount: draft.imageCount,
        savedAt: draft.savedAt,
      } : null)
    }).catch(() => {})
  }, [isReady, clusters.length])

  const router = useRouter()

  const handleResumeDraft = async () => {
    setDraftLoading(true)
    try {
      const { loadSession } = await import('@/lib/session-store')
      const result = await loadSession('draft')
      if (!result) { setDraftSession(null); return }
      setSession(result.jobName, result.clusters, result.marketplaces)
      router.push('/dashboard/review')
    } catch { /* ignore */ } finally {
      setDraftLoading(false)
    }
  }

  const marketplaceNames = Object.keys(rules)
  const processingJob = jobs.find((j) => j.status === 'processing')
  const unexportedClusters = clusters.filter((c) => !c.exported)
  const warningClusters = clusters.filter((c) => !c.confirmed)
  const previewClusters = unexportedClusters.slice(0, 3)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const noBrands = !brandsLoading && brands.length === 0
  const hasConfirmed = isReady && clusters.some((c) => c.confirmed)

  return (
    <div>
      <Topbar
        breadcrumbs={[{ label: 'ShotSync', href: '/dashboard' }, { label: 'Overview' }]}
        actions={
          <>
            <Link href="/dashboard/upload" className="btn btn-ghost">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
              New job
            </Link>
            {hasConfirmed ? (
              <Link href="/dashboard/review?export=1" className="btn btn-primary">Export</Link>
            ) : (
              <span className="btn btn-primary" style={{ opacity: 0.35, cursor: 'not-allowed' }}>Export</span>
            )}
          </>
        }
      />

      <div style={{ padding: '20px 24px' }}>
        {/* Page title */}
        <h1 style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '-.8px', color: 'var(--text)', marginBottom: '2px' }}>
          {greeting}{orgName ? `, ${orgName}` : ''}.
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text3)', marginBottom: '16px', letterSpacing: '-.1px' }}>
          {loading ? 'Loading…' : `${jobs.length} recent jobs\u00a0·\u00a0${unexportedClusters.filter(c => !c.confirmed).length} clusters need attention`}
        </p>

        {/* Brand setup — full hero when no brands exist */}
        {noBrands && (
          <div style={{
            marginBottom: '28px',
            borderRadius: '22px',
            background: '#1d1d1f',
            padding: '44px 48px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative colour blobs */}
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(48,209,88,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-80px', right: '200px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '20px', left: '380px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,159,10,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.25)', borderRadius: '20px', padding: '4px 12px', marginBottom: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#30d158', letterSpacing: '-.1px' }}>Before you begin</span>
            </div>

            {/* Headline */}
            <h2 style={{ fontSize: '26px', fontWeight: 600, color: '#f5f5f7', letterSpacing: '-.6px', marginBottom: '10px', maxWidth: '520px', lineHeight: 1.2 }}>
              Set up your brand before uploading
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(245,245,247,0.55)', marginBottom: '36px', maxWidth: '480px', lineHeight: 1.5 }}>
              ShotSync needs your brand details to correctly name, organise, and export your images. Complete all four steps below.
            </p>

            {/* Setup steps */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '36px' }}>
              {[
                {
                  n: '01', label: 'Brand name & code',
                  desc: 'Your brand name and short code used in all exported filenames.',
                  color: '#30d158', bg: 'rgba(48,209,88,0.10)',
                },
                {
                  n: '02', label: 'Naming template',
                  desc: 'Define how your exported files are named — SKU, colour, view angle.',
                  color: '#0071e3', bg: 'rgba(0,113,227,0.10)',
                },
                {
                  n: '03', label: 'Images per look',
                  desc: 'Set how many shots make up one complete product and the angle order.',
                  color: '#ff9f0a', bg: 'rgba(255,159,10,0.10)',
                },
                {
                  n: '04', label: 'Shopify connection',
                  desc: 'Optional but recommended — enables SKU matching and direct upload.',
                  color: '#af52de', bg: 'rgba(175,82,222,0.10)',
                },
              ].map(({ n, label, desc, color, bg }) => (
                <div key={n} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color, background: bg, borderRadius: '6px', padding: '2px 7px', display: 'inline-block', marginBottom: '10px', letterSpacing: '.04em' }}>
                    {n}
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7', letterSpacing: '-.2px', marginBottom: '5px', lineHeight: 1.3 }}>{label}</p>
                  <p style={{ fontSize: '14px', color: 'rgba(245,245,247,0.45)', lineHeight: 1.5 }}>{desc}</p>
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Link
                href="/dashboard/brands"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: '#f5f5f7', color: 'var(--text)',
                  fontSize: '16px', fontWeight: 600, letterSpacing: '-.2px',
                  padding: '11px 24px', borderRadius: '10px',
                  textDecoration: 'none', transition: 'background 0.15s',
                }}
              >
                Set up your brand
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <span style={{ fontSize: '14px', color: 'rgba(245,245,247,0.35)' }}>
                Takes about 2 minutes · you can always edit later
              </span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'Images processed', value: stats?.total_images,   delta: 'lifetime total',  accent: '#30d158' },
            { label: 'Active clusters',  value: stats?.total_clusters, delta: 'across all jobs', accent: '#0071e3' },
            { label: 'Exports ready',    value: stats?.total_exports,  delta: 'completed jobs',  accent: '#ff9f0a' },
            { label: 'SKU match rate',   value: null,                  delta: 'last batch',      accent: '#af52de', display: clusters.length ? `${Math.round((clusters.filter(c => c.sku).length / clusters.length) * 100)}%` : '—' },
          ].map(({ label, value, delta, display, accent }) => (
            <div key={label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--line)', borderRadius: '14px', padding: '12px 16px', borderTop: `3px solid ${accent}` }}>
              <div style={{ fontSize: '13px', color: 'var(--text3)', letterSpacing: '-.1px', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '-.8px', color: 'var(--text)', lineHeight: 1, marginBottom: '3px' }}>
                {loading ? '—' : (display ?? (value ?? 0).toLocaleString())}
              </div>
              <div style={{ fontSize: '13px', color: accent, fontWeight: 500 }}>{delta}</div>
            </div>
          ))}
        </div>

        {/* Row 1: Recent jobs + Marketplace coverage */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>

          {/* Recent jobs */}
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-.2px' }}>Recent jobs</span>
              <Link href="/dashboard/jobs" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '14px' }}>View all</Link>
            </div>
            {loading ? (
              <div style={{ padding: '16px 18px', fontSize: '15px', color: 'var(--text3)' }}>Loading…</div>
            ) : jobs.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>No jobs yet</p>
                <p style={{ fontSize: '15px', color: 'var(--text3)', marginBottom: '14px' }}>Upload your first shoot to get started.</p>
                <Link href="/dashboard/upload" className="btn btn-primary" style={{ fontSize: '15px' }}>New upload</Link>
              </div>
            ) : (
              jobs.map((job) => {
                const chip = STATUS_CHIP[job.status] ?? STATUS_CHIP.processing
                return (
                  <Link key={job.id} href={`/dashboard/jobs/${job.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', borderBottom: '0.5px solid var(--line)', textDecoration: 'none', cursor: 'pointer' }}>
                    <div style={{ width: '26px', height: '26px', background: 'var(--bg3)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" width="12" height="12">
                        <rect x="3" y="3" width="7" height="10" rx="1"/><rect x="14" y="3" width="7" height="6" rx="1"/><rect x="14" y="13" width="7" height="8" rx="1"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.job_name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '1px' }}>
                        {job.image_count} images · {job.cluster_count} clusters · {new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '13px', fontWeight: 500, background: chip.bg, color: chip.color, letterSpacing: '-.1px', flexShrink: 0 }}>
                      {chip.label}
                    </span>
                  </Link>
                )
              })
            )}
          </div>

          {/* Marketplace coverage */}
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--line)' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-.2px' }}>Marketplace coverage</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {marketplaceNames.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text3)', marginBottom: '8px' }}>No marketplaces configured yet.</p>
                  <Link href="/dashboard/integrations" className="btn btn-ghost" style={{ fontSize: '14px', padding: '4px 10px' }}>Configure</Link>
                </div>
              ) : (
                marketplaceNames.map((name, i) => {
                  // Derive a rough coverage % from jobs exported to this marketplace
                  const exported = jobs.filter((j) => j.status === 'completed' && j.marketplaces?.includes(name)).length
                  const total = Math.max(jobs.length, 1)
                  const pct = jobs.length ? Math.round((exported / total) * 100) : 0
                  // Show a baseline fill for configured marketplaces so it never looks empty
                  const displayPct = Math.max(pct, jobs.length === 0 ? 0 : 20)
                  return (
                    <div key={name} style={{ marginBottom: i < marketplaceNames.length - 1 ? '10px' : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{name}</span>
                        <span style={{ color: 'var(--text3)', fontSize: '13px' }}>
                          {jobs.length === 0 ? 'No jobs yet' : `${exported} exported · ${displayPct}%`}
                        </span>
                      </div>
                      <div style={{ background: 'var(--bg4)', borderRadius: '999px', height: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${displayPct}%`, height: '100%', borderRadius: '999px', background: '#30d158', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Active pipeline + Cluster review */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

          {/* Active session */}
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-.2px' }}>
                {isReady && unexportedClusters.length > 0 ? `Active session — ${sessionJobName || 'Current shoot'}` : draftSession ? `Unfinished session — ${draftSession.jobName}` : 'Active session'}
              </span>
              {isReady && unexportedClusters.length > 0 && (
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#4da3ff', background: 'rgba(0,122,255,0.12)', padding: '3px 8px', borderRadius: '5px' }}>
                  In progress
                </span>
              )}
            </div>
            <div style={{ padding: '14px 16px' }}>
              {isReady && unexportedClusters.length > 0 ? (
                // In-memory session active
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div>
                      <p style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-.5px' }}>{unexportedClusters.length}</p>
                      <p style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '2px' }}>Pending</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '20px', fontWeight: 600, color: '#30d158', letterSpacing: '-.5px' }}>{unexportedClusters.filter((c) => c.confirmed).length}</p>
                      <p style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '2px' }}>Confirmed</p>
                    </div>
                    {warningClusters.length > 0 && (
                      <div>
                        <p style={{ fontSize: '20px', fontWeight: 600, color: '#ff9f0a', letterSpacing: '-.5px' }}>{warningClusters.length}</p>
                        <p style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '2px' }}>To review</p>
                      </div>
                    )}
                  </div>
                  <Link href="/dashboard/review" className="btn btn-primary" style={{ fontSize: '14px', alignSelf: 'flex-start' }}>
                    Continue review →
                  </Link>
                </div>
              ) : draftSession ? (
                // Draft saved in IDB from a previous session
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div>
                      <p style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-.5px' }}>{draftSession.clusterCount}</p>
                      <p style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '2px' }}>Clusters</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-.5px' }}>{draftSession.imageCount}</p>
                      <p style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '2px' }}>Images</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text3)' }}>
                    Saved {new Date(draftSession.savedAt).toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button onClick={handleResumeDraft} disabled={draftLoading} className="btn btn-primary" style={{ fontSize: '14px', alignSelf: 'flex-start' }}>
                    {draftLoading ? 'Loading…' : 'Resume session →'}
                  </button>
                </div>
              ) : (
                // Nothing active
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ fontSize: '15px', color: 'var(--text3)', marginBottom: '10px' }}>No active session. Upload a new shoot to begin.</p>
                  <Link href="/dashboard/upload" className="btn btn-ghost" style={{ fontSize: '14px', padding: '4px 10px' }}>New upload</Link>
                </div>
              )}
            </div>
          </div>

          {/* Cluster review */}
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-.2px' }}>
                {isReady && unexportedClusters.length > 0 ? `Cluster review — ${jobs[0]?.job_name ?? 'Current session'}` : 'Cluster review'}
              </span>
              {warningClusters.length > 0 && (
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#ff9f0a', background: 'rgba(255,159,10,0.12)', padding: '3px 8px', borderRadius: '5px' }}>
                  {warningClusters.length} unconfirmed
                </span>
              )}
            </div>
            <div style={{ padding: '12px 16px' }}>
              {!isReady || unexportedClusters.length === 0 ? (
                <div style={{ padding: '14px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text3)', marginBottom: '8px' }}>No active session. Upload a shoot to see clusters here.</p>
                  <Link href="/dashboard/upload" className="btn btn-ghost" style={{ fontSize: '14px', padding: '4px 10px' }}>New upload</Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                  {previewClusters.map((cluster) => {
                    const hasWarning = !cluster.confirmed
                    return (
                      <Link key={cluster.id} href="/dashboard/review" style={{ textDecoration: 'none' }}>
                        <div style={{ background: hasWarning ? 'rgba(255,159,10,0.06)' : 'var(--bg3)', border: `0.5px solid ${hasWarning ? 'rgba(255,159,10,0.3)' : 'var(--line)'}`, borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}>
                          {/* Image row */}
                          <div style={{ display: 'flex', gap: '1px' }}>
                            {cluster.images.slice(0, 4).map((img, i) => (
                              <div key={img.id} style={{ flex: 1, aspectRatio: '3/4', position: 'relative', background: 'var(--bg4)', overflow: 'hidden' }}>
                                {img.previewUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={img.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', background: `hsl(${i * 30},0%,${15 + i * 5}%)` }} />
                                )}
                                <div style={{ position: 'absolute', bottom: '3px', left: '3px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontSize: '14px', fontWeight: 500, color: '#fff', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                  {img.viewLabel?.replace('_', ' ') ?? `${i + 1}`}
                                </div>
                              </div>
                            ))}
                            {/* Empty slots if fewer than 4 images */}
                            {Array.from({ length: Math.max(0, 4 - cluster.images.length) }).map((_, i) => (
                              <div key={`empty-${i}`} style={{ flex: 1, aspectRatio: '3/4', background: 'var(--bg3)', opacity: 0.25 }} />
                            ))}
                          </div>
                          {/* Footer */}
                          <div style={{ padding: '8px 10px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>{cluster.sku || 'No SKU'}</div>
                            <div style={{ fontSize: '14px', color: 'var(--text3)' }}>{cluster.productName || cluster.color || '—'}</div>
                            {/* Shot pills */}
                            <div style={{ display: 'flex', gap: '3px', marginTop: '5px', flexWrap: 'wrap' }}>
                              {cluster.images.slice(0, 4).map((img) => {
                                const lbl = img.viewLabel
                                const pillStyles: Record<string, { bg: string; color: string; text: string }> = {
                                  front:       { bg: 'rgba(48,209,88,0.12)',  color: '#30d158', text: 'Fr' },
                                  back:        { bg: 'rgba(0,122,255,0.12)',  color: '#4da3ff', text: 'Bk' },
                                  side:        { bg: 'rgba(255,159,10,0.12)', color: '#ff9f0a', text: 'Sd' },
                                  detail:      { bg: 'rgba(255,59,48,0.12)',  color: '#ff453a', text: 'Dt' },
                                  three_quarter:{ bg: 'rgba(48,209,88,0.10)', color: '#30d158', text: '¾' },
                                }
                                const p = pillStyles[lbl] ?? { bg: 'var(--bg3)', color: 'var(--text3)', text: lbl?.slice(0,2) ?? '?' }
                                return (
                                  <span key={img.id} style={{ fontSize: '14px', fontWeight: 500, padding: '2px 5px', borderRadius: '4px', background: p.bg, color: p.color }}>
                                    {p.text}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
              {isReady && unexportedClusters.length > 3 && (
                <Link href="/dashboard/review" style={{ display: 'block', textAlign: 'center', marginTop: '12px', fontSize: '15px', color: 'var(--text3)', textDecoration: 'none' }}>
                  +{clusters.length - 3} more clusters →
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
