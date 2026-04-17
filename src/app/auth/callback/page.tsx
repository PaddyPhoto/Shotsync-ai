'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const code = params.get('code')
    const next = params.get('next') ?? '/dashboard'

    if (!code) {
      router.replace('/auth/error?detail=no_code')
      return
    }

    // Exchange the code client-side so the browser Supabase client can access
    // its own code verifier storage directly — no cross-boundary cookie issues.
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          router.replace(`/auth/error?detail=${encodeURIComponent(error.message)}`)
        } else {
          router.replace(next)
        }
      })
    })
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
