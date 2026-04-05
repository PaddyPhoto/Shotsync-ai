import { create } from 'zustand'
import type { ViewLabel } from '@/types'

export interface SessionImage {
  id: string
  file: File
  previewUrl: string
  filename: string
  seqIndex: number
  viewLabel: ViewLabel
  viewConfidence: number
}

export interface SessionCluster {
  id: string
  images: SessionImage[]
  sku: string
  productName: string
  color: string
  label: string
  category: string | null   // accessory category id e.g. 'bags', 'shoes' — null for on-model
  confirmed: boolean
}

export interface StyleListEntry {
  sku: string
  productName: string
  colour: string
}

export type ShootType = 'on-model' | 'still-life'

interface SessionState {
  jobName: string
  clusters: SessionCluster[]
  marketplaces: string[]
  styleList: StyleListEntry[]
  shootType: ShootType
  accessoryCategory: string | null
  isReady: boolean
  setSession: (jobName: string, clusters: SessionCluster[], marketplaces?: string[]) => void
  setStyleList: (entries: StyleListEntry[]) => void
  setShootConfig: (shootType: ShootType, accessoryCategory: string | null) => void
  moveImage: (imageId: string, toClusterId: string) => void
  mergeCluster: (fromId: string, toId: string) => void
  splitImages: (fromClusterId: string, imageIds: string[]) => void
  updateClusterSku: (clusterId: string, sku: string, productName?: string) => void
  updateClusterColor: (clusterId: string, color: string) => void
  setClusterCategory: (clusterId: string, category: string | null) => void
  setImageViewLabel: (imageId: string, clusterId: string, label: ViewLabel) => void
  confirmCluster: (clusterId: string) => void
  setAllConfirmed: (confirmed: boolean) => void
  deleteCluster: (clusterId: string) => void
  deleteImages: (imageIds: string[]) => void
  reorderImages: (clusterId: string, fromIdx: number, toIdx: number, activeAngles: ViewLabel[]) => void
  relabelCluster: (clusterId: string, activeAngles: ViewLabel[]) => void
  reset: () => void
}

let _nextClusterNum = 1

export const useSession = create<SessionState>((set, get) => ({
  jobName: '',
  clusters: [],
  marketplaces: ['the-iconic'],
  styleList: [],
  shootType: 'on-model',
  accessoryCategory: null,
  isReady: false,

  setStyleList: (entries) => set({ styleList: entries }),
  setShootConfig: (shootType, accessoryCategory) => set({ shootType, accessoryCategory }),

  setSession: (jobName, clusters, marketplaces) => {
    _nextClusterNum = clusters.length + 1
    const mps = marketplaces ?? ['the-iconic']
    set({ jobName, clusters, marketplaces: mps, isReady: true })
    // Persist to sessionStorage so back-navigation can restore it
    // File objects can't be serialised — we store metadata + previewUrl only
    try {
      const serialisable = {
        jobName,
        marketplaces: mps,
        clusters: clusters.map((c) => ({
          id: c.id,
          sku: c.sku,
          productName: c.productName,
          color: c.color,
          label: c.label,
          confirmed: c.confirmed,
          images: c.images.map((img) => ({
            id: img.id,
            filename: img.filename,
            previewUrl: img.previewUrl,
            seqIndex: img.seqIndex,
            viewLabel: img.viewLabel,
            viewConfidence: img.viewConfidence,
          })),
        })),
      }
      sessionStorage.setItem('shotsync:session', JSON.stringify(serialisable))
    } catch { /* ignore serialisation errors */ }
  },

  moveImage: (imageId, toClusterId) => set((state) => {
    let movedImage: SessionImage | undefined
    const clusters = state.clusters.map((c) => {
      const found = c.images.find((img) => img.id === imageId)
      if (found) {
        movedImage = found
        return { ...c, images: c.images.filter((img) => img.id !== imageId) }
      }
      return c
    })
    if (!movedImage) return state
    const withMoved = clusters.map((c) =>
      c.id === toClusterId ? { ...c, images: [...c.images, movedImage!] } : c
    )
    // Remove empty clusters
    return { clusters: withMoved.filter((c) => c.images.length > 0) }
  }),

  mergeCluster: (fromId, toId) => set((state) => {
    const from = state.clusters.find((c) => c.id === fromId)
    if (!from) return state
    const clusters = state.clusters
      .filter((c) => c.id !== fromId)
      .map((c) => c.id === toId ? { ...c, images: [...c.images, ...from.images] } : c)
    return { clusters }
  }),

  splitImages: (fromClusterId, imageIds) => set((state) => {
    const from = state.clusters.find((c) => c.id === fromClusterId)
    if (!from || imageIds.length === 0) return state
    const toMove = from.images.filter((img) => imageIds.includes(img.id))
    const remaining = from.images.filter((img) => !imageIds.includes(img.id))
    if (toMove.length === 0) return state
    const newCluster: SessionCluster = {
      id: `local-${Date.now()}`,
      images: toMove,
      sku: '',
      productName: '',
      color: '',
      label: `Cluster ${_nextClusterNum++}`,
      category: from.category,
      confirmed: false,
    }
    const clusters = state.clusters.map((c) =>
      c.id === fromClusterId ? { ...c, images: remaining } : c
    ).filter((c) => c.images.length > 0)
    return { clusters: [...clusters, newCluster] }
  }),

  updateClusterSku: (clusterId, sku, productName) => set((state) => ({
    clusters: state.clusters.map((c) =>
      c.id === clusterId
        ? { ...c, sku, productName: productName ?? sku }
        : c
    ),
  })),

  updateClusterColor: (clusterId, color) => set((state) => ({
    clusters: state.clusters.map((c) =>
      c.id === clusterId ? { ...c, color } : c
    ),
  })),

  setClusterCategory: (clusterId, category) => set((state) => ({
    clusters: state.clusters.map((c) =>
      c.id === clusterId ? { ...c, category } : c
    ),
  })),

  setImageViewLabel: (imageId, clusterId, label) => set((state) => ({
    clusters: state.clusters.map((c) =>
      c.id === clusterId
        ? { ...c, images: c.images.map((img) => img.id === imageId ? { ...img, viewLabel: label } : img) }
        : c
    ),
  })),

  confirmCluster: (clusterId) => set((state) => ({
    clusters: state.clusters.map((c) =>
      c.id === clusterId ? { ...c, confirmed: true } : c
    ),
  })),

  setAllConfirmed: (confirmed) => set((state) => ({
    clusters: state.clusters.map((c) => ({ ...c, confirmed })),
  })),

  deleteCluster: (clusterId) => set((state) => ({
    clusters: state.clusters.filter((c) => c.id !== clusterId),
  })),

  deleteImages: (imageIds) => set((state) => {
    const idSet = new Set(imageIds)
    const clusters = state.clusters
      .map((c) => ({ ...c, images: c.images.filter((img) => !idSet.has(img.id)) }))
      .filter((c) => c.images.length > 0)
    return { clusters }
  }),

  reorderImages: (clusterId, fromIdx, toIdx, activeAngles) => set((state) => ({
    clusters: state.clusters.map((c) => {
      if (c.id !== clusterId) return c
      const imgs = [...c.images]
      const [moved] = imgs.splice(fromIdx, 1)
      imgs.splice(toIdx, 0, moved)
      return {
        ...c,
        images: imgs.map((img, i) => ({
          ...img,
          viewLabel: activeAngles[i] ?? 'unknown' as ViewLabel,
          viewConfidence: 0.7,
        })),
      }
    }),
  })),

  relabelCluster: (clusterId, activeAngles) => set((state) => ({
    clusters: state.clusters.map((c) => {
      if (c.id !== clusterId) return c
      return {
        ...c,
        images: c.images.map((img, i) => ({
          ...img,
          viewLabel: activeAngles[i] ?? 'unknown' as ViewLabel,
          viewConfidence: 0.7,
        })),
      }
    }),
  })),

  reset: () => {
    try { sessionStorage.removeItem('shotsync:session') } catch { /* ignore */ }
    set({ jobName: '', clusters: [], marketplaces: ['the-iconic'], styleList: [], shootType: 'on-model', accessoryCategory: null, isReady: false })
  },
}))
