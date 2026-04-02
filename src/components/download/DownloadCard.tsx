'use client'

import { formatBytes } from '@/lib/utils'
import type { ExportRecord, MarketplaceName } from '@/types'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'

interface DownloadCardProps {
  exportRecord: ExportRecord
}

export function DownloadCard({ exportRecord }: DownloadCardProps) {
  const marketplaceNames = exportRecord.marketplace
    .split(',')
    .map((id) => MARKETPLACE_RULES[id as MarketplaceName]?.name ?? id)
    .join(', ')

  const handleDownload = () => {
    if (exportRecord.download_url) {
      window.open(exportRecord.download_url, '_blank')
    }
  }

  return (
    <div className="bg-[var(--bg2)] border border-[var(--line)] rounded-md p-5 flex items-center gap-4 hover:border-[var(--line2)] transition-colors">
      {/* Icon */}
      <div className="w-11 h-11 rounded-sm bg-[var(--bg3)] border border-[var(--line2)] flex items-center justify-center flex-shrink-0">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--accent)" strokeWidth="1.5">
          <path d="M10 2v10M6 8l4 4 4-4"/>
          <path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[0.9rem] font-medium text-[var(--text)]">
          {marketplaceNames}
        </p>
        <p
          className="text-[0.75rem] text-[var(--text3)] mt-[2px]"
          style={{ fontFamily: 'var(--font-dm-mono)' }}
        >
          {exportRecord.image_count} images · {formatBytes(exportRecord.file_size_bytes)} · ZIP
        </p>
      </div>

      {/* Status + Download */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {exportRecord.status === 'ready' ? (
          <>
            <span className="chip chip-ready text-[0.72rem]">Ready</span>
            <button onClick={handleDownload} className="btn btn-primary btn-sm">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 1v7M3 5l3 3 3-3"/>
                <path d="M1 10h10" strokeLinecap="round"/>
              </svg>
              Download
            </button>
          </>
        ) : exportRecord.status === 'processing' ? (
          <span className="chip chip-processing">Processing…</span>
        ) : (
          <span className="chip chip-error">Error</span>
        )}
      </div>
    </div>
  )
}
