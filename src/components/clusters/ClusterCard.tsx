'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Cluster, ViewLabel, SKUSuggestion } from '@/types'

const VIEW_LABELS: ViewLabel[] = ['front', 'back', 'side', 'detail']

interface ClusterCardProps {
  cluster: Cluster
  onSkuChange: (clusterId: string, sku: string, productName: string) => void
  onConfirm: (clusterId: string) => void
  onViewLabelChange?: (imageId: string, view: ViewLabel) => void
}

function ShotPill({ view, missing = false }: { view: ViewLabel; missing?: boolean }) {
  const cls: Record<ViewLabel, string> = {
    front:             'shot-front',
    back:              'shot-back',
    side:              'shot-side',
    detail:            'shot-detail',
    mood:              'shot-mood',
    'full-length':     'shot-full-length',
    'ghost-mannequin': 'shot-gm',
    'flat-lay':        'shot-flat',
    'top-down':        'shot-topdown',
    'inside':          'shot-inside',
    'front-3/4':       'shot-threequarter',
    'back-3/4':        'shot-threequarter',
    unknown:           'shot-unknown',
  }
  return (
    <span className={cn('shot-pill', missing ? 'shot-missing' : cls[view])}>
      {missing ? `+ ${view}` : view}
    </span>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const cls = value >= 0.7 ? 'bg-[var(--accent2)]' : value >= 0.4 ? 'bg-[var(--accent)]' : 'bg-[var(--accent3)]'
  return (
    <div className="flex items-center gap-2 text-[0.79rem] text-[var(--text3)]">
      <div className="flex-1 h-[3px] bg-[var(--bg4)] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', cls)} style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{pct}%</span>
    </div>
  )
}

export function ClusterCard({ cluster, onSkuChange, onConfirm }: ClusterCardProps) {
  const [selectedSku, setSelectedSku] = useState(
    cluster.assigned_sku ?? cluster.suggested_skus[0]?.sku ?? ''
  )
  const isConfirmed = cluster.status === 'confirmed'
  const hasWarning = cluster.missing_views.length > 0

  const handleSkuSelect = (sku: SKUSuggestion) => {
    setSelectedSku(sku.sku)
    onSkuChange(cluster.id, sku.sku, sku.product_name)
  }

  return (
    <div className={cn(
      'bg-[var(--bg2)] border rounded-md overflow-hidden transition-all duration-150 hover:translate-y-[-1px]',
      isConfirmed ? 'border-[var(--accent)]' : hasWarning ? 'border-[rgba(232,122,122,0.4)]' : 'border-[var(--line)] hover:border-[var(--line2)]',
    )}>
      {/* Header */}
      <div className="px-[14px] py-3 bg-[var(--bg3)] border-b border-[var(--line)] flex items-center justify-between">
        <span
          className="text-[0.79rem] text-[var(--text3)] bg-[var(--bg4)] px-2 py-[3px] rounded-[4px] border border-[var(--line)]"
          style={{ fontFamily: 'var(--font-dm-mono)' }}
        >
          CLU-{cluster.id.slice(0, 6).toUpperCase()}
        </span>
        <div className="flex gap-[3px]">
          {cluster.detected_views.map((v) => <ShotPill key={v} view={v as ViewLabel} />)}
          {cluster.missing_views.map((v) => <ShotPill key={`m-${v}`} view={v as ViewLabel} missing />)}
        </div>
      </div>

      {/* Image strip */}
      <div className="flex gap-[2px] p-[10px]">
        {cluster.images.slice(0, 4).map((img) => (
          <div
            key={img.id}
            className="flex-1 aspect-[3/4] bg-[var(--bg3)] rounded-[4px] overflow-hidden relative min-w-0"
          >
            {img.storage_url ? (
              <img src={img.storage_url} alt={img.original_filename} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full shimmer" />
            )}
            <span className="absolute bottom-1 left-1 bg-[rgba(0,0,0,0.7)] backdrop-blur-[4px] text-[0.67rem] font-semibold uppercase text-[var(--text)] px-[5px] py-[2px] rounded-[3px]">
              {img.view_label}
            </span>
          </div>
        ))}
        {cluster.image_count > 4 && (
          <div className="flex-1 aspect-[3/4] bg-[var(--bg3)] rounded-[4px] flex items-center justify-center border border-dashed border-[var(--line2)] min-w-0">
            <span className="text-[0.79rem] text-[var(--text3)] text-center">
              +{cluster.image_count - 4}
            </span>
          </div>
        )}
        {cluster.images.length < 3 && Array.from({ length: 3 - cluster.images.length }).map((_, i) => (
          <div key={`empty-${i}`} className="flex-1 aspect-[3/4] bg-[var(--bg3)] rounded-[4px] border border-dashed border-[var(--line2)] flex items-center justify-center min-w-0">
            <span className="text-[0.72rem] text-[var(--text3)] text-center">missing</span>
          </div>
        ))}
      </div>

      {/* SKU Suggestions */}
      <div className="px-[14px] pb-3">
        <p className="text-[0.79rem] text-[var(--text3)] mb-[6px] uppercase tracking-[0.08em]">
          SKU Match
        </p>
        {cluster.suggested_skus.length > 0 ? (
          <div className="flex flex-col gap-1">
            {cluster.suggested_skus.slice(0, 3).map((sug) => (
              <button
                key={sug.sku}
                onClick={() => handleSkuSelect(sug)}
                className={cn(
                  'flex items-center gap-[10px] px-[10px] py-2 rounded-sm bg-[var(--bg3)] border transition-all duration-150 text-left',
                  selectedSku === sug.sku
                    ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.05)]'
                    : 'border-transparent hover:border-[var(--line2)]'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8rem] text-[var(--text)] truncate">{sug.product_name}</p>
                  <p className="text-[0.79rem] text-[var(--text3)]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                    {sug.sku}
                    {sug.colour && <span className="ml-1 text-[var(--text2)]">· {sug.colour}</span>}
                  </p>
                </div>
                <ConfidenceBar value={sug.confidence} />
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg3)] rounded-sm px-3 py-2 text-[0.85rem] text-[var(--text3)]">
            No Shopify products matched — enter SKU manually
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-[14px] py-3 border-t border-[var(--line)] flex items-center gap-2">
        <span className="text-[0.79rem] text-[var(--text3)]">
          {cluster.image_count} image{cluster.image_count !== 1 ? 's' : ''}
        </span>
        <div className="flex-1" />
        {isConfirmed ? (
          <span className="text-[0.79rem] font-semibold text-[var(--accent2)] flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="2 5 4.5 7.5 8 2.5"/>
            </svg>
            Confirmed
          </span>
        ) : (
          <button
            onClick={() => onConfirm(cluster.id)}
            disabled={!selectedSku}
            className="btn btn-primary btn-sm"
          >
            Confirm SKU
          </button>
        )}
      </div>
    </div>
  )
}
