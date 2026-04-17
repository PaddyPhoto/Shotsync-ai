'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthErrorContent() {
  const params = useSearchParams()
  const detail = params.get('detail') ?? 'unknown'
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Auth Error</h1>
      <p>detail: <strong>{detail}</strong></p>
      <a href="/login">Back to login</a>
    </div>
  )
}

export default function AuthErrorPage() {
  return <Suspense><AuthErrorContent /></Suspense>
}
