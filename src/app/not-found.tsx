import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: 'antialiased' as const }}>
      <img src="/icon.png" alt="ShotSync" style={{ width: '48px', height: '48px', borderRadius: '12px', marginBottom: '24px' }} />
      <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#aeaeb2', marginBottom: '12px' }}>404</p>
      <h1 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-1px', color: '#1d1d1f', marginBottom: '10px' }}>Page not found</h1>
      <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '32px' }}>The page you're looking for doesn't exist or has been moved.</p>
      <Link href="/" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '10px 22px', borderRadius: '9px', fontSize: '14px', fontWeight: 500, letterSpacing: '-0.2px', textDecoration: 'none' }}>
        Back to ShotSync
      </Link>
    </div>
  )
}
