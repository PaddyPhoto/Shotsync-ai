'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/store/session'
import { useBrand } from '@/context/BrandContext'
import { useMarketplaceRules } from '@/lib/marketplace/useMarketplaceRules'
import { ExportView } from '@/components/export/ExportView'
import type { MarketplaceName } from '@/types'

declare global {
  interface Window {
    showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
    showSaveFilePicker?: (opts?: { suggestedName?: string; types?: { description?: string; accept?: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle>
  }
  interface FileSystemDirectoryHandle {
    getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
    getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemFileHandle>
  }
  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>
    getFile(): Promise<File>
  }
  interface FileSystemWritableFileStream {
    write(data: BufferSource | Blob | string): Promise<void>
    close(): Promise<void>
  }
}

// Saved-job / session export route. The job is already loaded into the session
// store by the time this renders; this is a thin wrapper around the shared
// <ExportView> so the saved-job and live-session export flows are identical.
export default function ExportPage(props: { params: Promise<{ jobId: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const { clusters, jobName, shootType, marketplaces: sessionMarketplaces, reset } = useSession()
  const { activeBrand } = useBrand()
  const { rules: marketplaceRules } = useMarketplaceRules(activeBrand?.id)

  const [marketplaces, setMarketplaces] = useState<MarketplaceName[]>(
    (sessionMarketplaces as MarketplaceName[])?.length ? (sessionMarketplaces as MarketplaceName[]) : ['shopify'],
  )

  // Seed the marketplace selection from the saved job record (skip the live session).
  useEffect(() => {
    if (params.jobId === 'session') return
    fetch(`/api/jobs/${params.jobId}`)
      .then((r) => r.json())
      .then(({ data }) => { if (data?.selected_marketplaces?.length) setMarketplaces(data.selected_marketplaces) })
      .catch(() => {})
  }, [params.jobId])

  return (
    <ExportView
      jobName={jobName}
      clusters={clusters}
      activeBrand={activeBrand}
      marketplaces={marketplaces}
      marketplaceRules={marketplaceRules}
      namingTemplate="{SKU}_{VIEW}"
      clusterCopy={{}}
      shootType={shootType}
      onClose={() => router.back()}
      onStartNewJob={() => { reset(); router.push('/dashboard/upload') }}
      onBackToDashboard={() => { reset(); router.push('/dashboard') }}
    />
  )
}
