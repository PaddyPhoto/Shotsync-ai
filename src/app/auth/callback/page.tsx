'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const next = params.get('next') ?? '/dashboard'

    // Implicit flow: Supabase puts tokens in the URL hash (#access_token=...&refresh_token=...)
    // Parse them directly — no Supabase client needed, no PKCE verifier required.
    const hash = window.location.hash.substring(1) // strip leading #
    const hashParams = new URLSearchParams(hash)
    const access_token = hashParams.get('access_token')
    const refresh_token = hashParams.get('refresh_token')

    if (access_token && refresh_token) {
      const type = hashParams.get('type')
      const destination = type === 'recovery' ? '/auth/reset-password' : next

      // Persist the session as SSR cookies so API routes and middleware can read it.
      fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token, refresh_token }),
      }).finally(() => router.replace(destination))
      return
    }

    // No hash tokens — redirect to error so the user knows something went wrong.
    router.replace('/auth/error?detail=no_token_in_hash')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <p style={{ fontSize: '0.9rem', color: 'var(--text3)' }}>Signing in…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
