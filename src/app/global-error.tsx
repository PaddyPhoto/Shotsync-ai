'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif", margin: 0 }}>
        <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '12px' }}>Error</p>
        <h1 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-1px', color: '#1d1d1f', marginBottom: '10px' }}>Something went wrong</h1>
        <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '32px' }}>An unexpected error occurred.</p>
        <button
          onClick={reset}
          style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '10px 22px', borderRadius: '9px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
