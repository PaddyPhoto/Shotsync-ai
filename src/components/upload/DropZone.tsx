'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
  maxFiles?: number
}

export function DropZone({ onFiles, disabled = false, maxFiles = 1000 }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFiles(acceptedFiles)
    setIsDragOver(false)
  }, [onFiles])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles,
    disabled,
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative border-2 border-dashed rounded-lg p-16 text-center cursor-pointer transition-all duration-200 overflow-hidden',
        isDragOver
          ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.03)] scale-[1.01]'
          : 'border-[var(--line2)] bg-[var(--bg2)] hover:border-[var(--accent)] hover:bg-[rgba(232,217,122,0.03)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,217,122,0.04) 0%, transparent 70%)' }}
      />

      <input {...getInputProps()} />

      <div className="relative z-10">
        {/* Upload icon */}
        <div className="w-14 h-14 mx-auto mb-[18px] bg-[var(--bg3)] rounded-full border border-[var(--line2)] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>

        <h3
          className="text-[1.1rem] font-[700] text-[var(--text)] mb-2"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {isDragOver ? 'Drop images here' : 'Drop product images here'}
        </h3>
        <p className="text-[0.85rem] text-[var(--text2)] mb-5">
          or <span className="text-[var(--accent)]">click to browse</span> your files
        </p>

        <div className="flex justify-center gap-2 flex-wrap">
          {['JPG', 'JPEG', 'PNG'].map((fmt) => (
            <span
              key={fmt}
              className="bg-[var(--bg4)] border border-[var(--line2)] rounded-[20px] px-[10px] py-1 text-[0.79rem] text-[var(--text2)]"
              style={{ fontFamily: 'var(--font-dm-mono)' }}
            >
              {fmt}
            </span>
          ))}
          <span
            className="bg-[var(--bg4)] border border-[var(--line2)] rounded-[20px] px-[10px] py-1 text-[0.79rem] text-[var(--text2)]"
            style={{ fontFamily: 'var(--font-dm-mono)' }}
          >
            Up to {maxFiles} files
          </span>
        </div>
      </div>
    </div>
  )
}
