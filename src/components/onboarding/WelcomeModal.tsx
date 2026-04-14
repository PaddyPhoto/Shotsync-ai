'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'shotsync_welcome_dismissed'

// Allows other components (e.g. Sidebar) to open the modal programmatically
let _openModal: (() => void) | null = null
export function openWelcomeModal() { _openModal?.() }

const STEPS = [
  {
    number: '01',
    title: 'Brand Setup',
    href: '/dashboard/settings?tab=brands',
    description: 'Configure your brand name, naming template, and marketplace rules. This is a one-time setup — done once, used on every job.',
    color: 'var(--accent3)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="2.5"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M11.4 3.2l-1.4 1.4M3.2 11.4l1.4 1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Upload',
    href: '/dashboard/upload',
    description: 'Upload your shoot images and optionally import a style list (XLSX/CSV). Set your shoot type and images-per-look count.',
    color: 'var(--accent)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 11V4M5 7l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 13h12" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Review',
    href: '/dashboard/review',
    description: 'ShotSync.ai groups your images into product clusters. Verify SKUs, colours, and angles. Confirm each cluster when ready.',
    color: 'var(--accent2)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1"/>
        <rect x="9" y="1" width="6" height="6" rx="1"/>
        <rect x="1" y="9" width="6" height="6" rx="1"/>
        <rect x="9" y="9" width="6" height="6" rx="1"/>
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Export',
    href: '/dashboard/review?export=1',
    description: 'Download a ZIP with your images named and organised per marketplace. Or upload directly to Shopify.',
    color: 'var(--accent4)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 11V4M5 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 13h12" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function WelcomeModal() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    _openModal = () => setVisible(true)
    const dismissed = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)
    if (!dismissed) setVisible(true)
    return () => { _openModal = null }
  }, [])

  const dismiss = (permanent: boolean) => {
    if (permanent) localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={() => dismiss(false)}
    >
      <div
        className="relative bg-[var(--bg2)] border border-[var(--line)] rounded-[14px] shadow-2xl max-w-[560px] w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent-deep)', boxShadow: '0 0 16px rgba(26,79,255,0.4)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 7l-7 5 7 5V7z"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
            </div>
            <h2 className="text-[1.1rem] font-bold tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome to Shot<span style={{ color: 'var(--accent)' }}>Sync</span>.ai
            </h2>
          </div>
          <p className="text-[0.8rem] text-[var(--text2)]">
            Your post-production workflow in four steps. Here's how it works.
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 grid grid-cols-2 gap-3">
          {STEPS.map((step) => (
            <Link
              key={step.number}
              href={step.href}
              onClick={() => dismiss(true)}
              className="group flex flex-col gap-2 p-3 rounded-[10px] border border-[var(--line2)] hover:border-[var(--line)] bg-[var(--bg3)] hover:bg-[var(--bg4)] transition-all"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-[28px] h-[28px] rounded-sm flex items-center justify-center flex-shrink-0"
                  style={{ color: step.color, background: `color-mix(in srgb, ${step.color} 12%, transparent)` }}
                >
                  {step.icon}
                </span>
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.1em] uppercase" style={{ color: step.color }}>
                    Step {step.number}
                  </p>
                  <p className="text-[0.8rem] font-semibold text-[var(--text)] leading-tight">{step.title}</p>
                </div>
              </div>
              <p className="text-[0.72rem] text-[var(--text3)] leading-relaxed">{step.description}</p>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between">
          <button
            onClick={() => dismiss(true)}
            className="text-[0.75rem] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
          >
            Don't show this again
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => dismiss(false)}
              className="btn btn-ghost btn-sm"
            >
              Close
            </button>
            <Link
              href="/dashboard/upload"
              onClick={() => dismiss(true)}
              className="btn btn-primary btn-sm"
            >
              Start a New Job →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
