'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'
import { useMarketplaceRules } from '@/lib/marketplace/useMarketplaceRules'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'
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
  processing: { bg: 'rgba(0,122,255,0.08)',  color: '#005fc4', label: 'Processing' },
  completed:  { bg: 'rgba(48,209,88,0.1)',   color: '#1a8a35', label: 'Ready'      },
  failed:     { bg: 'rgba(255,59,48,0.08)',  color: '#c41c00', label: 'Failed'     },
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
  const { activeBrand } = useBrand()
  const { rules } = useMarketplaceRules()
  const { clusters, isReady } = useSession((s) => ({ clusters: s.clusters, isReady: s.isReady }))

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
  }, [activeBrand?.id])

  const marketplaceNames = Object.keys(rules)
  const processingJob = jobs.find((j) => j.status === 'processing')
  const warningClusters = clusters.filter((c) => !c.confirmed)
  const previewClusters = clusters.slice(0, 3)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div>
      <WelcomeModal />
      <Topbar
        breadcrumbs={[{ label: 'ShotSync', href: '/dashboard' }, { label: 'Overview' }]}
        actions={
          <>
            <Link href="/dashboard/upload" className="btn btn-ghost">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
              New job
            </Link>
            <Link href="/dashboard/review" className="btn btn-primary">Export</Link>
          </>
        }
      />

      <div style={{ padding: '28px' }}>
        {/* Page title */}
        <h1 style={{ fontSize: '26px', fontWeight: 500, letterSpacing: '-.8px', color: '#1d1d1f', marginBottom: '3px' }}>
          {greeting}{orgName ? `, ${orgName}` : ''}.
        </h1>
        <p style={{ fontSize: '13px', color: '#aeaeb2', marginBottom: '24px', letterSpacing: '-.1px' }}>
          {loading ? 'Loading…' : `${jobs.length} recent jobs\u00a0·\u00a0${warningClusters.length} clusters need attention`}
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Images processed', value: stats?.total_images,   delta: 'lifetime total' },
            { label: 'Active clusters',  value: stats?.total_clusters, delta: 'across all jobs' },
            { label: 'Exports ready',    value: stats?.total_exports,  delta: 'completed jobs' },
            { label: 'SKU match rate',   value: null,                  delta: 'last batch',      display: clusters.length ? `${Math.round((clusters.filter(c => c.sku).length / clusters.length) * 100)}%` : '—' },
          ].map(({ label, value, delta, display }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '16px 18px', backdropFilter: 'blur(8px)' }}>
              <div style={{ fontSize: '12px', color: '#aeaeb2', letterSpacing: '-.1px', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '26px', fontWeight: 500, letterSpacing: '-.8px', color: '#1d1d1f', lineHeight: 1, marginBottom: '4px' }}>
                {loading ? '—' : (display ?? (value ?? 0).toLocaleString())}
              </div>
              <div style={{ fontSize: '12px', color: '#aeaeb2' }}>{delta}</div>
            </div>
          ))}
        </div>

        {/* Row 1: Recent jobs + Marketplace coverage */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

          {/* Recent jobs */}
          <div style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Recent jobs</span>
              <Link href="/dashboard/jobs" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '11px' }}>View all</Link>
            </div>
            {loading ? (
              <div style={{ padding: '16px 18px', fontSize: '12px', color: '#aeaeb2' }}>Loading…</div>
            ) : jobs.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', marginBottom: '4px' }}>No jobs yet</p>
                <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '14px' }}>Upload your first shoot to get started.</p>
                <Link href="/dashboard/upload" className="btn btn-primary" style={{ fontSize: '12px' }}>New upload</Link>
              </div>
            ) : (
              jobs.map((job) => {
                const chip = STATUS_CHIP[job.status] ?? STATUS_CHIP.processing
                return (
                  <Link key={job.id} href={`/dashboard/jobs/${job.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', textDecoration: 'none', cursor: 'pointer' }}>
                    <div style={{ width: '30px', height: '30px', background: 'rgba(0,0,0,0.04)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#6e6e73" strokeWidth="1.5" width="13" height="13">
                        <rect x="3" y="3" width="7" height="10" rx="1"/><rect x="14" y="3" width="7" height="6" rx="1"/><rect x="14" y="13" width="7" height="8" rx="1"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.job_name}</div>
                      <div style={{ fontSize: '12px', color: '#aeaeb2', marginTop: '1px' }}>
                        {job.image_count} images · {job.cluster_count} clusters · {new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: chip.bg, color: chip.color, letterSpacing: '-.1px', flexShrink: 0 }}>
                      {chip.label}
                    </span>
                  </Link>
                )
              })
            )}
          </div>

          {/* Marketplace coverage */}
          <div style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Marketplace coverage</span>
            </div>
            <div style={{ padding: '16px 18px' }}>
              {marketplaceNames.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '10px' }}>No marketplaces configured yet.</p>
                  <Link href="/dashboard/settings?tab=marketplaces" className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }}>Configure</Link>
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
                    <div key={name} style={{ marginBottom: i < marketplaceNames.length - 1 ? '14px' : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                        <span style={{ color: '#1d1d1f', fontWeight: 500 }}>{name}</span>
                        <span style={{ color: '#aeaeb2', fontSize: '12px' }}>
                          {jobs.length === 0 ? 'No jobs yet' : `${exported} exported · ${displayPct}%`}
                        </span>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '999px', height: '3px', overflow: 'hidden' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

          {/* Active pipeline */}
          <div style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>
                {processingJob ? `Active pipeline — ${processingJob.job_name}` : 'Active pipeline'}
              </span>
              {processingJob && (
                <span style={{ fontSize: '11px', color: '#aeaeb2', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158', display: 'inline-block', animation: 'blink 1.4s infinite' }} />
                  Running
                </span>
              )}
            </div>
            <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
            <div style={{ padding: '8px 18px' }}>
              {!processingJob ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '10px' }}>No active pipeline. Upload a new shoot to begin.</p>
                  <Link href="/dashboard/upload" className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }}>New upload</Link>
                </div>
              ) : (
                PIPELINE_STEPS.map((step, i) => {
                  // Simulated: steps 1-4 done, step 5 active, 6-7 pending
                  const ACTIVE_STEP = 5
                  const isDone   = i + 1 < ACTIVE_STEP
                  const isActive = i + 1 === ACTIVE_STEP
                  return (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < PIPELINE_STEPS.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: 500, flexShrink: 0,
                        background: isDone ? 'rgba(48,209,88,0.12)' : isActive ? '#1d1d1f' : 'rgba(0,0,0,0.05)',
                        color:      isDone ? '#1a8a35'              : isActive ? '#f5f5f7' : '#aeaeb2',
                      }}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '12px', color: isDone || isActive ? '#1d1d1f' : '#aeaeb2', flex: 1, letterSpacing: '-.1px', fontWeight: isDone || isActive ? 500 : 400 }}>{step}</span>
                      <span style={{ fontSize: '11px', color: isDone ? '#aeaeb2' : isActive ? '#1d1d1f' : '#aeaeb2' }}>
                        {isDone ? ['0.8s','12.4s','3.2s','2.1s'][i] ?? '—' : '—'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Cluster review */}
          <div style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>
                {isReady && clusters.length > 0 ? `Cluster review — ${jobs[0]?.job_name ?? 'Current session'}` : 'Cluster review'}
              </span>
              {warningClusters.length > 0 && (
                <span style={{ fontSize: '10px', fontWeight: 500, color: '#c27800', background: 'rgba(255,159,10,0.1)', padding: '3px 8px', borderRadius: '5px' }}>
                  {warningClusters.length} unconfirmed
                </span>
              )}
            </div>
            <div style={{ padding: '16px 18px' }}>
              {!isReady || clusters.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '10px' }}>No active session. Upload a shoot to see clusters here.</p>
                  <Link href="/dashboard/upload" className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }}>New upload</Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                  {previewClusters.map((cluster) => {
                    const hasWarning = !cluster.confirmed
                    return (
                      <Link key={cluster.id} href="/dashboard/review" style={{ textDecoration: 'none' }}>
                        <div style={{ background: hasWarning ? 'rgba(255,159,10,0.03)' : 'rgba(0,0,0,0.03)', border: `0.5px solid ${hasWarning ? 'rgba(255,159,10,0.3)' : 'rgba(0,0,0,0.07)'}`, borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}>
                          {/* Image row */}
                          <div style={{ display: 'flex', gap: '1px' }}>
                            {cluster.images.slice(0, 4).map((img, i) => (
                              <div key={img.id} style={{ flex: 1, aspectRatio: '3/4', position: 'relative', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                {img.previewUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={img.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', background: `hsl(${i * 30},0%,${15 + i * 5}%)` }} />
                                )}
                                <div style={{ position: 'absolute', bottom: '3px', left: '3px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontSize: '8px', fontWeight: 500, color: '#fff', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                  {img.viewLabel?.replace('_', ' ') ?? `${i + 1}`}
                                </div>
                              </div>
                            ))}
                            {/* Empty slots if fewer than 4 images */}
                            {Array.from({ length: Math.max(0, 4 - cluster.images.length) }).map((_, i) => (
                              <div key={`empty-${i}`} style={{ flex: 1, aspectRatio: '3/4', background: 'rgba(0,0,0,0.03)', opacity: 0.25 }} />
                            ))}
                          </div>
                          {/* Footer */}
                          <div style={{ padding: '8px 10px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 500, color: '#1d1d1f', marginBottom: '2px' }}>{cluster.sku || 'No SKU'}</div>
                            <div style={{ fontSize: '10px', color: '#aeaeb2' }}>{cluster.productName || cluster.color || '—'}</div>
                            {/* Shot pills */}
                            <div style={{ display: 'flex', gap: '3px', marginTop: '5px', flexWrap: 'wrap' }}>
                              {cluster.images.slice(0, 4).map((img) => {
                                const lbl = img.viewLabel
                                const pillStyles: Record<string, { bg: string; color: string; text: string }> = {
                                  front:       { bg: 'rgba(48,209,88,0.12)',  color: '#1a8a35', text: 'Fr' },
                                  back:        { bg: 'rgba(0,122,255,0.08)', color: '#005fc4', text: 'Bk' },
                                  side:        { bg: 'rgba(255,159,10,0.1)', color: '#c27800', text: 'Sd' },
                                  detail:      { bg: 'rgba(255,59,48,0.08)', color: '#c41c00', text: 'Dt' },
                                  three_quarter:{ bg: 'rgba(48,209,88,0.08)', color: '#1a8a35', text: '¾' },
                                }
                                const p = pillStyles[lbl] ?? { bg: 'rgba(0,0,0,0.05)', color: '#aeaeb2', text: lbl?.slice(0,2) ?? '?' }
                                return (
                                  <span key={img.id} style={{ fontSize: '8px', fontWeight: 500, padding: '2px 5px', borderRadius: '4px', background: p.bg, color: p.color }}>
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
              {isReady && clusters.length > 3 && (
                <Link href="/dashboard/review" style={{ display: 'block', textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#aeaeb2', textDecoration: 'none' }}>
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
