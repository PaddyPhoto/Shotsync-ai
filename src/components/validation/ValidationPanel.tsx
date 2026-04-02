'use client'

import type { Cluster, MarketplaceName, ViewLabel } from '@/types'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'

interface ValidationPanelProps {
  clusters: Cluster[]
  marketplaces: MarketplaceName[]
}

export function ValidationPanel({ clusters, marketplaces }: ValidationPanelProps) {
  const warnings = clusters.flatMap((cluster) =>
    marketplaces.flatMap((marketplace) => {
      const missing = MARKETPLACE_RULES[marketplace].required_views.filter(
        (v) => !cluster.detected_views.includes(v)
      )
      return missing.map((view) => ({
        clusterId: cluster.id,
        clusterSku: cluster.assigned_sku ?? `CLU-${cluster.id.slice(0, 6)}`,
        marketplace,
        marketplaceName: MARKETPLACE_RULES[marketplace].name,
        missingView: view as ViewLabel,
      }))
    })
  )

  const totalOk = clusters.length - new Set(warnings.map((w) => w.clusterId)).size

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="stat-label">Total Clusters</p>
          <p className="stat-value">{clusters.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Fully Valid</p>
          <p className="stat-value" style={{ color: 'var(--accent2)' }}>{totalOk}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Missing Shots</p>
          <p className="stat-value" style={{ color: warnings.length ? 'var(--accent3)' : 'var(--accent2)' }}>
            {warnings.length}
          </p>
        </div>
      </div>

      {warnings.length === 0 ? (
        <div className="card">
          <div className="card-body flex flex-col items-center py-10 gap-3">
            <div className="w-12 h-12 rounded-full bg-[rgba(109,224,179,0.1)] border border-[rgba(109,224,179,0.3)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--accent2)" strokeWidth="2">
                <polyline points="4 10 8 14 16 6"/>
              </svg>
            </div>
            <p className="text-[0.95rem] font-semibold text-[var(--text)]">All shots present</p>
            <p className="text-[0.82rem] text-[var(--text3)]">
              Every cluster meets the required angles for your selected marketplaces.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 rounded-sm bg-[rgba(232,122,122,0.08)] border border-[rgba(232,122,122,0.2)]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-[2px]" stroke="var(--accent3)" strokeWidth="1.5">
                <path d="M7 1L1 13h12L7 1z" strokeLinejoin="round"/>
                <path d="M7 5.5v3M7 9.5h.01" strokeLinecap="round"/>
              </svg>
              <p className="text-[0.82rem] text-[var(--text)]">
                <span className="font-semibold text-[var(--accent3)]">
                  Missing {w.missingView.toUpperCase()}
                </span>
                {' '}for{' '}
                <span
                  className="text-[var(--text)]"
                  style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '0.78rem' }}
                >
                  {w.clusterSku}
                </span>
                {' '}required by{' '}
                <span className="font-medium">{w.marketplaceName}</span>
              </p>
            </div>
          ))}

          <div className="flex items-start gap-3 px-4 py-3 rounded-sm bg-[rgba(232,217,122,0.06)] border border-[rgba(232,217,122,0.2)] mt-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-[2px]" stroke="var(--accent)" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5.5"/>
              <path d="M7 4.5v3M7 8.5h.01" strokeLinecap="round"/>
            </svg>
            <p className="text-[0.82rem] text-[var(--text)]">
              <span className="font-semibold text-[var(--accent)]">You can still export.</span>
              {' '}Missing shots will be skipped for those marketplaces.
              Consider shooting additional angles for full compliance.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
