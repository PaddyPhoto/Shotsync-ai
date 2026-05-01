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
  colourCode: string    // numeric colour code e.g. "062" — separate from colour name
  styleNumber: string   // style number e.g. "05324" — may differ from SKU
  label: string
  category: string | null   // accessory category id e.g. 'bags', 'shoes' — null for on-model
  confirmed: boolean
  exported: boolean
}

export interface StyleListEntry {
  sku: string
  productName: string
  colour: string
  colourCode: string
  styleNumber: string
  composition?: string
  care?: string
  fit?: string
  length?: string
  rrp?: string
  season?: string
  occasion?: string
  gender?: string
  category?: string
  subCategory?: string
  origin?: string
  sizeRange?: string
}

export type ShootType = 'on-model' | 'still-life'

interface SessionState {
  jobName: string
  clusters: SessionCluster[]
  marketplaces: string[]
  styleList: StyleListEntry[]
  shootType: ShootType
  accessoryCategory: string | null
  imagesPerLook: number
  angleSequence: ViewLabel[]
  isReady: boolean
  setSession: (jobName: string, clusters: SessionCluster[], marketplaces?: string[], imagesPerLook?: number, angleSequence?: ViewLabel[]) => void
  setStyleList: (entries: StyleListEntry[]) => void
  setShootConfig: (shootType: ShootType, accessoryCategory: string | null) => void
  moveImage: (imageId: string, toClusterId: string) => void
  copyImageToCluster: (imageId: string, toClusterId: string) => void
  mergeCluster: (fromId: string, toId: string) => void
  splitImages: (fromClusterId: string, imageIds: string[]) => void
  splitAndReflow: (clusterId: string, atImageId: string) => void
  updateClusterSku: (clusterId: string, sku: string, productName?: string) => void
  updateClusterColor: (clusterId: string, color: string) => void
  updateClusterColourCode: (clusterId: string, colourCode: string) => void
  updateClusterStyleNumber: (clusterId: string, styleNumber: string) => void
  setClusterCategory: (clusterId: string, category: string | null) => void
  setImageViewLabel: (imageId: string, clusterId: string, label: ViewLabel) => void
  confirmCluster: (clusterId: string) => void
  setAllConfirmed: (confirmed: boolean) => void
  markClustersExported: (ids: string[]) => void
  deleteCluster: (clusterId: string) => void
  deleteConfirmedClusters: () => void
  deleteImages: (imageIds: string[]) => void
  reorderImages: (clusterId: string, fromIdx: number, toIdx: number, activeAngles: ViewLabel[]) => void
  relabelCluster: (clusterId: string, activeAngles: ViewLabel[]) => void
  undoStack: SessionCluster[][]
  undo: () => void
  reset: () => void
}

// Module-level counter for generating unique cluster labels ("Look 3", "Product 5", etc.)
// when new clusters are created by split operations. Initialised to clusters.length + 1
// each time setSession() is called so it always continues from the right number.
let _nextClusterNum = 1

export const useSession = create<SessionState>((set, get) => ({
  jobName: '',
  clusters: [],
  marketplaces: ['the-iconic'],
  styleList: [],
  shootType: 'on-model',
  accessoryCategory: null,
  imagesPerLook: 6,
  angleSequence: [],
  isReady: false,
  undoStack: [],

  setStyleList: (entries) => set({ styleList: entries }),
  setShootConfig: (shootType, accessoryCategory) => set({ shootType, accessoryCategory }),

  setSession: (jobName, clusters, marketplaces, imagesPerLook, angleSequence) => {
    _nextClusterNum = clusters.length + 1
    const mps = marketplaces ?? ['the-iconic']
    set({ jobName, clusters, marketplaces: mps, imagesPerLook: imagesPerLook ?? 6, angleSequence: angleSequence ?? [], isReady: true })
    // Persist a serialisable snapshot to sessionStorage so the review page can detect
    // whether a session exists when the user navigates back. File objects cannot be
    // serialised (they're binary + not cloneable via JSON), so only metadata and
    // previewUrls are stored. The review page uses this to show a "re-upload" prompt
    // if the user refreshes or navigates away and back.
    try {
      const serialisable = {
        jobName,
        marketplaces: mps,
        clusters: clusters.map((c) => ({
          id: c.id,
          sku: c.sku,
          productName: c.productName,
          color: c.color,
          colourCode: c.colourCode,
          styleNumber: c.styleNumber,
          label: c.label,
          confirmed: c.confirmed,
          exported: c.exported,
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

  copyImageToCluster: (imageId, toClusterId) => set((state) => {
    const source = state.clusters.flatMap((c) => c.images).find((img) => img.id === imageId)
    if (!source) return state
    const copy: SessionImage = {
      ...source,
      id: `${source.id}-copy-${Date.now()}`,
    }
    return {
      clusters: state.clusters.map((c) =>
        c.id === toClusterId ? { ...c, images: [...c.images, copy] } : c
      ),
    }
  }),

  mergeCluster: (fromId, toId) => set((state) => {
    const from = state.clusters.find((c) => c.id === fromId)
    if (!from) return state
    const clusters = state.clusters
      .filter((c) => c.id !== fromId)
      .map((c) => c.id === toId ? { ...c, images: [...c.images, ...from.images] } : c)
    return { clusters }
  }),

  // splitImages: moves a subset of images from one cluster into a brand-new cluster.
  // The new cluster inherits the parent's category (still-life accessory type) so the
  // user doesn't have to re-select it. SKU and colour start blank — user must confirm.
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
      colourCode: '',
      styleNumber: '',
      label: `Cluster ${_nextClusterNum++}`,
      category: from.category, // inherit parent category — avoids re-selecting for accessories
      confirmed: false,
      exported: false,
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

  updateClusterColourCode: (clusterId, colourCode) => set((state) => ({
    clusters: state.clusters.map((c) =>
      c.id === clusterId ? { ...c, colourCode } : c
    ),
  })),

  updateClusterStyleNumber: (clusterId, styleNumber) => set((state) => ({
    clusters: state.clusters.map((c) =>
      c.id === clusterId ? { ...c, styleNumber } : c
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

  markClustersExported: (ids) => set((state) => {
    const idSet = new Set(ids)
    return { clusters: state.clusters.map((c) => idSet.has(c.id) ? { ...c, exported: true } : c) }
  }),

  deleteCluster: (clusterId) => set((state) => ({
    undoStack: [...state.undoStack.slice(-19), state.clusters],
    clusters: state.clusters.filter((c) => c.id !== clusterId),
  })),

  deleteConfirmedClusters: () => set((state) => ({
    undoStack: [...state.undoStack.slice(-19), state.clusters],
    clusters: state.clusters.filter((c) => !c.confirmed),
  })),

  deleteImages: (imageIds) => set((state) => {
    const idSet = new Set(imageIds)
    const clusters = state.clusters
      .map((c) => ({ ...c, images: c.images.filter((img) => !idSet.has(img.id)) }))
      .filter((c) => c.images.length > 0)
    return { undoStack: [...state.undoStack.slice(-19), state.clusters], clusters }
  }),

  undo: () => set((state) => {
    if (state.undoStack.length === 0) return state
    const previous = state.undoStack[state.undoStack.length - 1]
    return { clusters: previous, undoStack: state.undoStack.slice(0, -1) }
  }),

  // reorderImages: moves one image to a new position within a cluster (drag-and-drop).
  // After reordering, all images are relabelled by position using activeAngles —
  // so the angle assignment always reflects the image's new slot in the sequence.
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

  // relabelCluster: reassigns view labels to all images in a cluster by position.
  // Called when an angle is toggled on/off — the active angle list shrinks or grows
  // and all images are re-mapped to their new positional label.
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

  // splitAndReflow: splits cluster at atImageId, then re-chunks ALL images from that
  // point across every subsequent cluster using the stored imagesPerLook setting.
  // One call fixes every cluster that was misaligned due to a missing shot upstream.
  splitAndReflow: (clusterId, atImageId) => set((state) => {
    const clusterIdx = state.clusters.findIndex((c) => c.id === clusterId)
    if (clusterIdx === -1) return state
    const cluster = state.clusters[clusterIdx]
    const imageIdx = cluster.images.findIndex((img) => img.id === atImageId)
    if (imageIdx <= 0) return state

    const undoStack = [...state.undoStack.slice(-19), state.clusters]

    // Images staying in the split cluster (keep in-order, re-label positionally)
    const keepImages = cluster.images.slice(0, imageIdx)

    // All images to reflow: overflow from split + every subsequent cluster in sequence order
    const overflow = cluster.images.slice(imageIdx)
    const trailing = state.clusters.slice(clusterIdx + 1).flatMap((c) => c.images)
    const toReflow = [...overflow, ...trailing]

    // Re-chunk by stored imagesPerLook
    const ipl = state.imagesPerLook
    const chunks: SessionImage[][] = []
    for (let i = 0; i < toReflow.length; i += ipl) {
      chunks.push(toReflow.slice(i, i + ipl))
    }

    // Positional angle order for relabelling
    const angleOrder: ViewLabel[] = (state.angleSequence.length > 0 ? state.angleSequence : [
      'front', 'back', 'side', 'detail', 'mood', 'full-length',
    ]) as ViewLabel[]

    const relabel = (imgs: SessionImage[]): SessionImage[] =>
      imgs.map((img, i) => ({ ...img, viewLabel: angleOrder[i % angleOrder.length] ?? 'front' as ViewLabel, viewConfidence: 0.7 }))

    // Build updated cluster for the split point
    const updatedSplitCluster: SessionCluster = {
      ...cluster,
      images: relabel(keepImages),
      confirmed: false,
    }

    // Build new clusters for reflowed chunks, reusing existing cluster metadata where available
    const reflowedClusters: SessionCluster[] = chunks.map((chunk, i) => {
      const existing = state.clusters[clusterIdx + 1 + i]
      return existing
        ? { ...existing, images: relabel(chunk), confirmed: false }
        : {
            id: `cluster-reflow-${Date.now()}-${i}`,
            images: relabel(chunk),
            sku: '', productName: '', color: '', colourCode: '', styleNumber: '',
            label: `Look ${_nextClusterNum++}`,
            category: null, confirmed: false, exported: false,
          }
    })

    return {
      undoStack,
      clusters: [
        ...state.clusters.slice(0, clusterIdx),
        updatedSplitCluster,
        ...reflowedClusters,
      ],
    }
  }),

  reset: () => {
    try { sessionStorage.removeItem('shotsync:session') } catch { /* ignore */ }
    set({ jobName: '', clusters: [], marketplaces: ['the-iconic'], styleList: [], shootType: 'on-model', accessoryCategory: null, imagesPerLook: 6, angleSequence: [], isReady: false, undoStack: [] })
  },
}))
