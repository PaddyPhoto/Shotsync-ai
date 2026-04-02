import { create } from 'zustand'
import type { FileItem } from '@/components/upload/FileList'
import type { MarketplaceName } from '@/types'

interface UploadStore {
  jobId: string | null
  jobName: string
  brandName: string
  selectedMarketplaces: MarketplaceName[]
  files: FileItem[]
  isUploading: boolean
  uploadProgress: number

  setJobId: (id: string) => void
  setJobName: (name: string) => void
  setBrandName: (name: string) => void
  setMarketplaces: (markets: MarketplaceName[]) => void
  addFiles: (files: File[]) => void
  updateFileStatus: (id: string, status: FileItem['status'], progress?: number) => void
  setIsUploading: (v: boolean) => void
  setUploadProgress: (p: number) => void
  reset: () => void
}

export const useUploadStore = create<UploadStore>((set) => ({
  jobId: null,
  jobName: '',
  brandName: '',
  selectedMarketplaces: [],
  files: [],
  isUploading: false,
  uploadProgress: 0,

  setJobId: (id) => set({ jobId: id }),
  setJobName: (name) => set({ jobName: name }),
  setBrandName: (name) => set({ brandName: name }),
  setMarketplaces: (markets) => set({ selectedMarketplaces: markets }),

  addFiles: (newFiles) => set((state) => ({
    files: [
      ...state.files,
      ...newFiles.map((f) => ({
        id: `${f.name}-${Date.now()}`,
        file: f,
        status: 'pending' as const,
        progress: 0,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      })),
    ],
  })),

  updateFileStatus: (id, status, progress) => set((state) => ({
    files: state.files.map((f) =>
      f.id === id ? { ...f, status, progress: progress ?? f.progress } : f
    ),
  })),

  setIsUploading: (v) => set({ isUploading: v }),
  setUploadProgress: (p) => set({ uploadProgress: p }),

  reset: () => set({
    jobId: null,
    files: [],
    isUploading: false,
    uploadProgress: 0,
  }),
}))
