'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBrand } from '@/context/BrandContext'
import { cn } from '@/lib/utils'

export function BrandSwitcher() {
  const { brands, activeBrand, setActiveBrand, isLoading } = useBrand()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (isLoading) {
    return (
      <div className="mx-3 mt-3 mb-1 h-[46px] rounded-sm bg-[var(--bg3)] shimmer" />
    )
  }

  const initials = activeBrand?.brand_code ?? '??'
  const color = activeBrand?.logo_color ?? '#e8d97a'

  return (
    <div ref={ref} className="relative mx-3 mt-3 mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-[10px] px-[10px] py-[9px] rounded-sm border transition-all duration-150 text-left',
          open
            ? 'bg-[var(--bg3)] border-[var(--line2)]'
            : 'bg-[var(--bg3)] border-[var(--line)] hover:border-[var(--line2)]'
        )}
      >
        {/* Brand avatar */}
        <div
          className="w-7 h-7 rounded-[5px] flex items-center justify-center font-bold text-[0.83rem] text-black flex-shrink-0"
          style={{ background: color, fontFamily: 'var(--font-dm-mono)' }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[0.8rem] font-medium text-[var(--text)] truncate leading-tight">
            {activeBrand?.name ?? 'No brand'}
          </p>
          <p className="text-[0.83rem] text-[var(--text3)] leading-tight mt-[1px]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
            {activeBrand?.brand_code ?? '—'}
          </p>
        </div>

        {/* Chevron */}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          stroke="var(--text3)" strokeWidth="1.5"
          className={cn('flex-shrink-0 transition-transform duration-150', open && 'rotate-180')}
        >
          <path d="M2.5 4.5l3.5 3.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-[var(--bg2)] border border-[var(--line2)] rounded-sm shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-50 overflow-hidden">
          <div className="px-3 pt-2 pb-1">
            <p className="text-[0.83rem] text-[var(--text3)] uppercase tracking-[0.1em] font-medium">Switch brand</p>
          </div>

          <div className="flex flex-col gap-[2px] px-[6px] pb-[6px]">
            {brands.map((brand) => {
              const isActive = brand.id === activeBrand?.id
              return (
                <button
                  key={brand.id}
                  onClick={() => { setActiveBrand(brand.id); setOpen(false); router.push('/dashboard') }}
                  className={cn(
                    'w-full flex items-center gap-[10px] px-[8px] py-[8px] rounded-[4px] text-left transition-all duration-100',
                    isActive
                      ? 'bg-[rgba(232,217,122,0.08)]'
                      : 'hover:bg-[var(--bg3)]'
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center font-bold text-[0.6rem] text-black flex-shrink-0"
                    style={{ background: brand.logo_color, fontFamily: 'var(--font-dm-mono)' }}
                  >
                    {brand.brand_code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-[0.8rem] truncate', isActive ? 'text-[var(--accent)] font-medium' : 'text-[var(--text2)]')}>
                      {brand.name}
                    </p>
                  </div>
                  {isActive && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--accent)" strokeWidth="2">
                      <polyline points="2 5 4 7.5 8 2.5"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>

          <div className="border-t border-[var(--line)] px-[6px] py-[6px]">
            <button
              onClick={() => { setOpen(false); router.push('/dashboard/brands') }}
              className="w-full flex items-center gap-2 px-[8px] py-[7px] rounded-[4px] text-[0.8rem] text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5.5 1v9M1 5.5h9" strokeLinecap="round"/>
              </svg>
              Manage brands
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
