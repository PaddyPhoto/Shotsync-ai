'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const next = params.get('next') ?? '/dashboard'

    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()

      // Implicit flow: browser client detects the #access_token hash automatically.
      // Listen for SIGNED_IN, then redirect.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          router.replace(next)
        }
      })

      // In case session is already established by the time we subscribe
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          subscription.unsubscribe()
          router.replace(next)
        }
      })

      // Timeout: if nothing happens in 8s, show an error
      const timeout = setTimeout(() => {
        subscription.unsubscribe()
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            router.replace(next)
          } else {
            router.replace('/auth/error?detail=timeout')
          }
        })
      }, 8000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(timeout)
      }
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
