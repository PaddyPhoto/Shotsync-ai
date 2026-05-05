'use client'

import { cn, formatBytes } from '@/lib/utils'

export type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

export interface FileItem {
  id: string
  file: File
  status: FileStatus
  progress: number
  preview?: string
  error?: string
}

interface FileListProps {
  files: FileItem[]
}

const STATUS_DOTS: Record<FileStatus, string> = {
  pending: 'bg-[var(--text3)]',
  uploading: 'bg-[var(--accent)] animate-pulse',
  done: 'bg-[var(--accent2)]',
  error: 'bg-[var(--accent3)]',
}

export function FileList({ files }: FileListProps) {
  if (!files.length) return null

  return (
    <div className="flex flex-col gap-[6px] mt-5">
      {files.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 bg-[var(--bg3)] border border-[var(--line)] rounded-sm px-[14px] py-[10px] text-[0.82rem]"
        >
          {/* Thumbnail */}
          <div className="w-9 h-9 rounded-[4px] bg-[var(--bg4)] flex-shrink-0 overflow-hidden flex items-center justify-center">
            {item.preview ? (
              <img src={item.preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span
                className="text-[0.72rem] text-[var(--text3)]"
                style={{ fontFamily: 'var(--font-dm-mono)' }}
              >
                {item.file.name.split('.').pop()?.toUpperCase()}
              </span>
            )}
          </div>

          {/* Name + progress */}
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text)] truncate">{item.file.name}</p>
            {item.status === 'uploading' && (
              <div className="mt-1 h-[3px] bg-[var(--bg4)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${item.progress}%`,
                    background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                  }}
                />
              </div>
            )}
            {item.status === 'error' && (
              <p className="text-[0.79rem] text-[var(--accent3)] mt-0.5">{item.error}</p>
            )}
          </div>

          {/* Size */}
          <span
            className="text-[var(--text3)] text-[0.82rem] flex-shrink-0"
            style={{ fontFamily: 'var(--font-dm-mono)' }}
          >
            {formatBytes(item.file.size)}
          </span>

          {/* Status dot */}
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOTS[item.status])} />
        </div>
      ))}
    </div>
  )
}
