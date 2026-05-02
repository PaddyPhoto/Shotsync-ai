'use client'

import { useEffect, useState } from 'react'

export function MobileGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isMobile) return <>{children}</>

  const handleSignOut = async () => {
    setSigningOut(true)
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#f5f5f7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 32px',
      textAlign: 'center',
    }}>
      <img src="/icon.png" alt="ShotSync" style={{ width: '64px', height: '64px', borderRadius: '16px', marginBottom: '28px' }} />
      <h1 style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '-.5px', color: '#1d1d1f', marginBottom: '12px' }}>
        ShotSync is built for desktop
      </h1>
      <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6, letterSpacing: '-.1px', maxWidth: '280px', marginBottom: '36px' }}>
        The workspace is designed for a larger screen. Open ShotSync on your Mac or PC to get started.
      </p>
      <a
        href="mailto:?subject=ShotSync&body=Open%20this%20on%20your%20computer%3A%20https%3A%2F%2Fshotsync.ai"
        style={{
          background: '#1d1d1f',
          color: '#f5f5f7',
          padding: '12px 24px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 500,
          letterSpacing: '-.2px',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '16px',
        }}
      >
        Send link to my computer
      </a>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        style={{
          background: 'none',
          border: 'none',
          color: '#aeaeb2',
          fontSize: '13px',
          cursor: 'pointer',
          letterSpacing: '-.1px',
          padding: '8px',
        }}
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  )
}
