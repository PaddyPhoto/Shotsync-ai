'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!email) { setStatus('error'); return }
    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((r) => r.ok ? setStatus('done') : setStatus('error'))
      .catch(() => setStatus('error'))
  }, [email])

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

            {status === 'loading' && (
              <>
                <div className="flex items-center justify-center mx-auto mb-6" style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'var(--bg3)', border: '0.5px solid var(--line)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                    </path>
                  </svg>
                </div>
                <p className="text-[0.9rem] text-[var(--text2)]">Unsubscribing…</p>
              </>
            )}

            {status === 'done' && (
              <>
                <div className="flex items-center justify-center mx-auto mb-6" style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h1 className="text-[1.2rem] font-[700] text-[var(--text)] mb-2 tracking-[-0.4px]">You're unsubscribed</h1>
                <p className="text-[0.88rem] text-[var(--text2)] leading-relaxed mb-1">
                  {email && <><span className="font-[500] text-[var(--text)]">{email}</span><br/></>}
                  has been removed from our mailing list. You won't receive any more marketing emails from ShotSync.
                </p>
                <p className="text-[0.82rem] text-[var(--text3)] mt-3 mb-6">
                  Transactional emails (billing receipts, account notices) are not affected.
                </p>
                <Link href="/" className="btn w-full justify-center">
                  Back to ShotSync.ai
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex items-center justify-center mx-auto mb-6" style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h1 className="text-[1.2rem] font-[700] text-[var(--text)] mb-2 tracking-[-0.4px]">Something went wrong</h1>
                <p className="text-[0.88rem] text-[var(--text2)] leading-relaxed mb-6">
                  We couldn't process your unsubscribe request. Please email{' '}
                  <a href="mailto:hello@shotsync.ai" className="text-[var(--accent)] hover:underline">hello@shotsync.ai</a>
                  {' '}and we'll remove you manually.
                </p>
                <Link href="/" className="btn w-full justify-center">
                  Back to ShotSync.ai
                </Link>
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  )
}
