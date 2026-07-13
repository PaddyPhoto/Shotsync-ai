import Link from 'next/link'
import type { Metadata } from 'next'
import { PricingBlock } from '@/components/landing/PricingBlock'

export const metadata: Metadata = {
  title: 'Pricing — ShotSync',
  description: 'Simple, transparent pricing for ShotSync. Start free, upgrade as you grow, cancel anytime.',
  alternates: {
    canonical: '/pricing',
    languages: {
      'en-AU': 'https://www.shotsync.ai/pricing',
      'en-US': 'https://www.shotsync.ai/us/pricing',
      'x-default': 'https://www.shotsync.ai/pricing',
    },
  },
}

export default function PricingPage() {
  return (
    <>
      <style>{`
        .nav-link { font-size:13px;color:#6e6e73;text-decoration:none;letter-spacing:-.1px;transition:color .15s; }
        .nav-link:hover { color:#1d1d1f; }
        .footer-link { font-size:14px;color:#6e6e73;text-decoration:none;letter-spacing:-.1px;transition:color .15s; }
        .footer-link:hover { color:#1d1d1f; }
        @media (max-width: 767px) {
          .pricing-nav-links { display: none !important; }
          .pricing-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .pricing-footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, background: '#f5f5f7', zIndex: -1, pointerEvents: 'none' }} />

      <div style={{ minHeight: '100vh', color: '#1d1d1f', fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif", WebkitFontSmoothing: 'antialiased' }}>
        {/* Nav */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, padding: '0 40px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245,245,247,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/icon.png" alt="ShotSync" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-.3px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#6e6e73' }}>Sync</span></span>
          </Link>
          <div className="pricing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <a href="/#how-it-works" className="nav-link">How it works</a>
            <a href="/#features" className="nav-link">Features</a>
            <Link href="/pricing" className="nav-link" style={{ color: '#1d1d1f', fontWeight: 500 }}>Pricing</Link>
          </div>
          <Link href="/login" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, letterSpacing: '-.2px', textDecoration: 'none' }}>Sign in</Link>
        </nav>

        {/* Pricing */}
        <main className="pricing-pad" style={{ padding: '72px 40px 100px' }}>
          <PricingBlock />
        </main>

        {/* Footer */}
        <footer className="pricing-pad" style={{ padding: 'clamp(36px,4vw,60px) 40px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <div className="pricing-footer-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1440px', margin: '0 auto' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/icon.png" alt="ShotSync" style={{ width: '28px', height: '28px', borderRadius: '7px' }} />
              <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.3px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#6e6e73' }}>Sync</span></span>
            </Link>
            <div style={{ display: 'flex', gap: 'clamp(20px,2.5vw,36px)', flexWrap: 'wrap' }}>
              <a href="/#how-it-works" className="footer-link">How it works</a>
              <a href="/#features" className="footer-link">Features</a>
              <Link href="/pricing" className="footer-link">Pricing</Link>
              <Link href="/faq" className="footer-link">FAQ</Link>
              <a href="mailto:hello@shotsync.ai" className="footer-link">Contact</a>
              <Link href="/privacy" className="footer-link">Privacy</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
