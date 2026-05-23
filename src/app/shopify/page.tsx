'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ShopifyShell() {
  const searchParams = useSearchParams()
  const shop = searchParams.get('shop') ?? ''

  const appUrl = shop
    ? `https://app.shotsync.ai?shopify_shop=${encodeURIComponent(shop)}`
    : 'https://app.shotsync.ai'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <img
        src="https://www.shotsync.ai/shotsync-logo.svg"
        alt="ShotSync"
        style={{ height: 36, marginBottom: 32 }}
      />

      <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 600, margin: '0 0 12px' }}>
        ShotSync is ready
      </h1>
      <p style={{ color: '#888', fontSize: 15, margin: '0 0 32px', maxWidth: 360 }}>
        Turn your shoot images into live product listings in minutes — AI naming, copy, and direct Shopify push included.
      </p>

      <a
        href={appUrl}
        style={{
          display: 'inline-block',
          background: '#4ade80',
          color: '#0a0a0a',
          fontWeight: 600,
          fontSize: 15,
          padding: '13px 28px',
          borderRadius: 8,
          textDecoration: 'none',
        }}
      >
        Open ShotSync
      </a>

      {shop && (
        <p style={{ color: '#555', fontSize: 12, marginTop: 20 }}>
          Connected store: {shop}
        </p>
      )}
    </div>
  )
}

export default function ShopifyPage() {
  return (
    <Suspense>
      <ShopifyShell />
    </Suspense>
  )
}
