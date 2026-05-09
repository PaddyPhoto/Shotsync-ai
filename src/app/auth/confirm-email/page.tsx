'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ConfirmEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[400px] text-center">

        {/* Logo */}
        <div className="flex items-center gap-[10px] justify-center mb-8">
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-deep)', boxShadow: '0 0 16px rgba(26,79,255,0.4)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </div>
          <span className="text-[1.1rem] font-bold tracking-[-0.5px]" style={{ fontFamily: 'var(--font-syne)' }}>
            Shot<span style={{ color: 'var(--accent)' }}>Sync</span><span style={{ color: 'var(--text3)', fontWeight: 300 }}>.ai</span>
          </span>
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: '40px 32px' }}>

            {/* Envelope icon */}
            <div className="flex items-center justify-center mx-auto mb-6" style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.14)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>

            <h1 className="text-[1.3rem] font-[700] text-[var(--text)] mb-2 tracking-[-0.4px]">Check your inbox</h1>
            <p className="text-[0.88rem] text-[var(--text2)] leading-relaxed mb-1">
              We sent a confirmation link to
            </p>
            {email && (
              <p className="text-[0.9rem] font-[600] text-[var(--text)] mb-4 tracking-[-0.2px]">{email}</p>
            )}
            <p className="text-[0.85rem] text-[var(--text3)] leading-relaxed mb-6">
              Click the link in the email to activate your account and get started. It may take a minute or two to arrive.
            </p>

            {/* Tips */}
            <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px 16px', border: '0.5px solid var(--line)', textAlign: 'left', marginBottom: '24px' }}>
              <p className="text-[0.8rem] font-[600] text-[var(--text2)] mb-2">Can't find it?</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li className="text-[0.8rem] text-[var(--text3)] flex items-start gap-2">
                  <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>1.</span>
                  Check your spam or junk folder
                </li>
                <li className="text-[0.8rem] text-[var(--text3)] flex items-start gap-2">
                  <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>2.</span>
                  Search for an email from <span className="font-mono text-[var(--text2)]">hello@shotsync.ai</span>
                </li>
                <li className="text-[0.8rem] text-[var(--text3)] flex items-start gap-2">
                  <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>3.</span>
                  The link expires in 24 hours
                </li>
              </ul>
            </div>

            <Link
              href="/login"
              className="btn btn-primary w-full justify-center"
            >
              Back to sign in
            </Link>

            <p className="text-[0.8rem] text-[var(--text3)] mt-4">
              Wrong email?{' '}
              <Link href={`/signup`} className="text-[var(--accent)] hover:underline">
                Sign up again
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense>
      <ConfirmEmailContent />
    </Suspense>
  )
}
