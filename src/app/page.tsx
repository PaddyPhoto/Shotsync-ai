'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PLANS } from '@/lib/plans'

// Fixed-position orb — stays in viewport, drifts upward at `speed` rate as you scroll.
// This creates true parallax: content scrolls at 1× while each orb drifts at a different speed.
function Orb({ color, size, top, left, speed }: {
  color: string; size: string; top: string; left: string; speed: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fn = () => { el.style.transform = `translateY(${window.scrollY * speed}px)` }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [speed])
  return (
    <div ref={ref} style={{
      position: 'fixed', top, left,
      width: size, height: size,
      background: color,
      borderRadius: '50%',
      filter: 'blur(120px)',
      pointerEvents: 'none',
      willChange: 'transform',
      zIndex: 0,
    }} />
  )
}

export default function LandingPage() {
  const [annual, setAnnual] = useState(true)
  const [demoOpen, setDemoOpen] = useState(false)
  const [activePricingCard, setActivePricingCard] = useState(0)
  const pricingScrollRef = useRef<HTMLDivElement>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  // Supabase may send #access_token=... to the site root when the callback
  // URL isn't matched. Detect and forward to the proper callback handler.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.substring(1)
    if (hash && hash.includes('access_token=')) {
      window.location.replace('/auth/callback' + window.location.hash)
    }
  }, [])

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) => {
      if (session) setIsLoggedIn(true)
    }).catch(() => {})
  }, [])

  const handlePlanCta = async (planKey: string, signupHref: string) => {
    if (!isLoggedIn) {
      window.location.href = signupHref
      return
    }
    if (planKey === 'free') {
      window.location.href = '/dashboard'
      return
    }
    setCheckoutLoading(planKey)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ planId: planKey, annual }),
      })
      const { url, error } = await res.json()
      if (url) window.location.href = url
      else alert(error ?? 'Could not start checkout.')
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes eyebrowPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .hero-eyebrow { animation: fadeUp .7s ease both .1s; }
        .hero-h1      { animation: fadeUp .7s ease both .2s; }
        .hero-sub     { animation: fadeUp .7s ease both .3s; }
        .hero-actions { animation: fadeUp .7s ease both .4s; }
        .hero-stats   { animation: fadeUp .7s ease both .55s; }
        .eyebrow-dot  { animation: eyebrowPulse 2s infinite; }
        .nav-link { font-size:13px;color:#6e6e73;text-decoration:none;letter-spacing:-.1px;transition:color .15s; }
        .nav-link:hover { color:#1d1d1f; }
        .footer-link { font-size:13px;color:#aeaeb2;text-decoration:none;letter-spacing:-.1px;transition:color .15s; }
        .footer-link:hover { color:#1d1d1f; }
        .price-cta-btn { display:block;text-align:center;margin-top:24px;padding:10px;border-radius:8px;font-size:13px;font-weight:500;letter-spacing:-.2px;text-decoration:none;transition:opacity .15s;background:rgba(0,0,0,0.06);color:#1d1d1f; }
        .price-cta-btn:hover { opacity:.8; }
        .price-cta-btn.featured { background:#fff;color:#1d1d1f; }
        .mp-logo-cell:last-child { border-right: none !important; }
        .hero-stat-cell:last-child { border-right: none !important; }

        @media (max-width: 767px) {
          .nav-links-desktop { display: none !important; }
          .nav-cta-desktop { display: none !important; }
          .nav-mobile-signin { display: flex !important; }
          .hero-section { padding: 100px 20px 60px !important; }
          .hero-stats { flex-wrap: wrap !important; width: 100% !important; }
          .hero-stat-cell { flex: 1 1 45% !important; padding: 18px 16px !important; border-right: none !important; border-bottom: 0.5px solid rgba(0,0,0,0.08) !important; }
          .app-mockup-section { display: none !important; }
          .section-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .how-it-works-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .ai-copy-feature { grid-template-columns: 1fr !important; }
          .mp-logos-row { flex-direction: column !important; }
          .mp-logo-cell { border-right: none !important; border-bottom: 0.5px solid rgba(0,0,0,0.08) !important; }
          .mp-logo-cell:last-child { border-bottom: none !important; }
          .pricing-grid { grid-template-columns: 1fr 1fr !important; }
.testimonial-pad { padding: 36px 24px !important; }
          .cta-pad { padding: 48px 28px !important; }
          .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
          .footer-links { flex-wrap: wrap !important; gap: 12px !important; }
          .nav-bar { padding: 0 20px !important; }
        }
        @media (max-width: 480px) {
          .hero-stat-cell { flex: 1 1 100% !important; }
          .pricing-grid {
            display: flex !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 4px 20px 12px !important;
            gap: 12px !important;
            background: transparent !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 -20px 8px !important;
            scrollbar-width: none !important;
          }
          .pricing-grid::-webkit-scrollbar { display: none !important; }
          .pricing-dots { display: flex !important; }
          .pricing-grid > div {
            flex: 0 0 82vw !important;
            scroll-snap-align: center !important;
            border-radius: 16px !important;
            border: 0.5px solid rgba(0,0,0,0.10) !important;
          }
        }
      `}</style>

      {/* ── FIXED BACKGROUND ── */}
      <div style={{ position: 'fixed', inset: 0, background: '#f5f5f7', zIndex: -1, pointerEvents: 'none' }} />

      {/* ── PARALLAX ORBS (fixed, drift upward at different speeds) ── */}
      <Orb color="rgba(0,113,227,0.50)"  size="clamp(480px,38vw,900px)"  top="-5vh"  left="-8%"  speed={0.12} />
      <Orb color="rgba(94,50,245,0.42)"  size="clamp(440px,36vw,860px)"  top="5vh"   left="62%"  speed={0.28} />
      <Orb color="rgba(48,209,88,0.40)"  size="clamp(400px,34vw,820px)"  top="40vh"  left="5%"   speed={0.08} />
      <Orb color="rgba(0,190,220,0.38)"  size="clamp(460px,37vw,880px)"  top="50vh"  left="58%"  speed={0.20} />
      <Orb color="rgba(255,149,0,0.36)"  size="clamp(420px,35vw,840px)"  top="75vh"  left="12%"  speed={0.16} />
      <Orb color="rgba(0,113,227,0.42)"  size="clamp(450px,36vw,860px)"  top="70vh"  left="55%"  speed={0.32} />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', color: '#1d1d1f', fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif", WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>

        {/* ── NAV ── */}
        <nav className="nav-bar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 40px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245,245,247,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/icon.png" alt="ShotSync" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-.3px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#6e6e73' }}>Sync</span></span>
          </Link>
          <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing" className="nav-link">Pricing</a>
          </div>
          <div className="nav-cta-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link href="/login" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, letterSpacing: '-.2px', textDecoration: 'none' }}>Sign in</Link>
          </div>
          <div className="nav-mobile-signin" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
            <Link href="/login" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, letterSpacing: '-.2px', textDecoration: 'none' }}>Sign in</Link>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="hero-section" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 40px 60px', position: 'relative' }}>
          <div className="hero-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '999px', padding: '5px 14px', fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '-.1px', marginBottom: '22px' }}>
            <span className="eyebrow-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158', flexShrink: 0 }} />
            Now in early access — ANZ fashion brands
          </div>
          <h1 className="hero-h1" style={{ fontSize: 'clamp(36px,5.2vw,62px)', fontWeight: 500, letterSpacing: '-2px', lineHeight: 1.08, color: '#1d1d1f', maxWidth: '780px', marginBottom: '20px' }}>
            From Shoot to Live Product Listings<span style={{ color: '#8e8e93' }}> – In Minutes</span>
          </h1>
          <p className="hero-sub" style={{ fontSize: 'clamp(16px,1.9vw,19px)', color: '#3a3a3c', maxWidth: '540px', lineHeight: 1.5, letterSpacing: '-.3px', marginBottom: '36px' }}>
            Automatically rename images, generate product copy, and publish to Shopify and marketplaces—without days of manual work.
          </p>
          <div className="hero-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Get started free
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <button onClick={() => setDemoOpen(true)} style={{ background: '#fff', color: '#1d1d1f', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', border: '0.5px solid rgba(0,0,0,0.08)', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style={{ color: '#1d1d1f' }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Watch demo
            </button>
          </div>

          {/* Stats bar */}
          <div className="hero-stats" style={{ display: 'flex', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', marginTop: '44px', overflow: 'hidden' }}>
            {[
              { value: '2–3 days', label: 'Manual post-production', color: '#1d1d1f' },
              { value: '25 min',   label: 'With ShotSync',          color: '#30d158' },
              { value: '500+',     label: 'Images per job',         color: '#1d1d1f' },
              { value: '3',        label: 'ANZ marketplaces',       color: '#1d1d1f' },
            ].map(({ value, label, color }, i) => (
              <div key={i} className="hero-stat-cell" style={{ padding: '24px 36px', textAlign: 'center', borderRight: '0.5px solid rgba(0,0,0,0.08)', flex: 1 }}>
                <div style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-1px', color, marginBottom: '4px', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '13px', color: '#4a4a4f', letterSpacing: '-.1px' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── APP MOCKUP ── */}
        <section className="app-mockup-section" style={{ padding: '0 40px 100px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{ width: '100%', maxWidth: '1200px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)' }}>
            {/* Browser bar */}
            <div style={{ padding: '12px 16px', background: 'rgba(245,245,247,0.8)', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.06)'].map((bg, i) => (
                  <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: bg }} />
                ))}
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.04)', borderRadius: '5px', padding: '4px 12px', fontSize: '11px', color: '#aeaeb2', maxWidth: '260px' }}>app.shotsync.ai</div>
              </div>
            </div>
            {/* App inner */}
            <div style={{ display: 'flex', height: '460px' }}>
              {/* Sidebar */}
              <div style={{ width: '180px', minWidth: '180px', background: 'rgba(248,248,250,0.9)', borderRight: '0.5px solid rgba(0,0,0,0.05)', padding: '16px 10px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 8px', marginBottom: '16px' }}>
                  <div style={{ width: '20px', height: '20px', background: '#1d1d1f', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" strokeWidth="2.5" width="10" height="10"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '-.2px', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#aeaeb2' }}>Sync</span></span>
                </div>
                <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: '#aeaeb2', padding: '0 8px', margin: '12px 0 4px' }}>Workspace</div>
                {[
                  { label: 'Overview', active: true, dot: null },
                  { label: 'All jobs', active: false, dot: 'green' },
                ].map(({ label, active, dot }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', color: active ? '#1d1d1f' : '#6e6e73', background: active ? 'rgba(0,0,0,0.05)' : 'transparent', fontWeight: active ? 500 : 400, marginBottom: '1px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11" style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    <span style={{ flex: 1 }}>{label}</span>
                    {dot === 'green' && <span style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: '#30d158' }} />}
                  </div>
                ))}
                <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: '#aeaeb2', padding: '0 8px', margin: '12px 0 4px' }}>Pipeline</div>
                {[
                  { label: 'Upload', dot: null },
                  { label: 'Processing', dot: 'green' },
                  { label: 'Clusters', dot: 'amber' },
                  { label: 'Export', dot: null },
                ].map(({ label, dot }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', color: '#6e6e73', marginBottom: '1px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11" style={{ flexShrink: 0, opacity: 0.6 }}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>
                    <span style={{ flex: 1 }}>{label}</span>
                    {dot === 'green' && <span style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: '#30d158' }} />}
                    {dot === 'amber' && <span style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: '#ff9f0a' }} />}
                  </div>
                ))}
              </div>
              {/* Main */}
              <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
                <div style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '-.4px', marginBottom: '2px' }}>Good morning.</div>
                <div style={{ fontSize: '11px', color: '#aeaeb2', marginBottom: '16px', letterSpacing: '-.1px' }}>3 active jobs · 4 clusters need attention · Last sync 2h ago</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: 'Images',    value: '8,412', delta: '↑ 1,204',    deltaColor: '#30d158' },
                    { label: 'Clusters',  value: '247',   delta: '↑ 38 today', deltaColor: '#30d158' },
                    { label: 'Ready',     value: '19',    delta: '3 markets',  deltaColor: '#aeaeb2' },
                    { label: 'SKU match', value: '94%',   delta: '↑ 3%',       deltaColor: '#30d158' },
                  ].map(({ label, value, delta, deltaColor }) => (
                    <div key={label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '9px', color: '#aeaeb2', marginBottom: '4px', letterSpacing: '-.1px' }}>{label}</div>
                      <div style={{ fontSize: '17px', fontWeight: 500, letterSpacing: '-.5px', color: '#1d1d1f' }}>{value}</div>
                      <div style={{ fontSize: '9px', color: deltaColor, marginTop: '2px' }}>{delta}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Recent jobs */}
                  <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 500, color: '#1d1d1f' }}>Recent jobs</div>
                    {[
                      { name: 'SS25 Campaign',  meta: '384 images', chip: 'Review',     chipBg: 'rgba(255,159,10,.1)',  chipColor: '#c27800' },
                      { name: 'Winter Basics',  meta: '128 images', chip: 'Ready',      chipBg: 'rgba(48,209,88,.1)',   chipColor: '#1a8a35' },
                      { name: 'Accessories 04', meta: '67 images',  chip: 'Processing', chipBg: 'rgba(0,113,227,.08)', chipColor: '#005fc4' },
                    ].map(({ name, meta, chip, chipBg, chipColor }) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '22px', height: '22px', background: 'rgba(0,0,0,0.04)', borderRadius: '5px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.1px' }}>{name}</div>
                          <div style={{ fontSize: '10px', color: '#aeaeb2' }}>{meta}</div>
                        </div>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 500, background: chipBg, color: chipColor }}>{chip}</span>
                      </div>
                    ))}
                  </div>
                  {/* Marketplace coverage */}
                  <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 500, color: '#1d1d1f' }}>Marketplace coverage</div>
                    {[
                      { name: 'THE ICONIC',  pct: 82 },
                      { name: 'Myer',        pct: 64 },
                      { name: 'David Jones', pct: 71 },
                    ].map(({ name, pct }) => (
                      <div key={name} style={{ padding: '8px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 500, color: '#1d1d1f' }}>{name}</span>
                          <span style={{ color: '#aeaeb2' }}>{pct}%</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '999px', height: '2.5px' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: '#1d1d1f' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="section-pad" style={{ padding: '100px 40px', textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>How it works</p>
          <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 500, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '600px', margin: '0 auto 16px' }}>Three steps. Zero manual work.</h2>
          <p style={{ fontSize: '17px', color: '#4a4a4f', maxWidth: '480px', margin: '0 auto 64px', lineHeight: 1.5, letterSpacing: '-.2px' }}>
            Drop your shoot. ShotSync handles everything between the photographer&apos;s delivery and your marketplace upload.
          </p>
          <div className="how-it-works-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', maxWidth: '1050px', margin: '0 auto' }}>
            {[
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
                title: 'Upload your shoot',
                desc: 'Drop up to 1,000 images. ShotSync ingests, reads your CSV catalogue, and starts the pipeline.',
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>,
                title: 'AI does the work',
                desc: 'Images are clustered by SKU, angles detected, colours matched, and files renamed.',
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
                title: 'Download and upload',
                desc: 'Export a ZIP per marketplace — THE ICONIC, Myer, David Jones — cropped and sized to their exact specs. Ready to upload.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: '#fff', padding: '40px 36px', textAlign: 'left' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                  {icon}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '-.3px', marginBottom: '8px', color: '#1d1d1f' }}>{title}</h3>
                <p style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="section-pad" style={{ padding: '0 40px 100px', position: 'relative' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden' }}>

              {/* Feature 1: Auto-rename */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,122,255,0.08)', borderRadius: '999px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, color: '#005fc4', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#007aff' }} />
                  Auto-rename
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Files named right. Every time.</h3>
                <p style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Configure your naming convention once. ShotSync applies it to every image, every job — no manual renaming, no typos, no rejections.</p>
                <div style={{ marginTop: '28px', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '16px' }}>
                  {[
                    { old: 'IMG_4821.jpg',  neo: 'PR05324.062_FRONT.jpg' },
                    { old: 'IMG_4822.jpg',  neo: 'PR05324.062_BACK.jpg' },
                    { old: 'DSC_0019.jpg',  neo: 'PR06001.034_FRONT.jpg' },
                    { old: 'DSC_0020.jpg',  neo: 'PR06001.034_SIDE.jpg' },
                  ].map(({ old, neo }) => (
                    <div key={old} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: '12px', color: '#aeaeb2', fontFamily: "'SF Mono','Fira Code',monospace", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{old}</span>
                      <span style={{ fontSize: '12px', color: '#aeaeb2', flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: '12px', color: '#1d1d1f', fontFamily: "'SF Mono','Fira Code',monospace", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{neo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature 2: AI clustering */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(175,82,222,0.08)', borderRadius: '999px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, color: '#7b2fa0', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#af52de' }} />
                  AI clustering
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Groups images by SKU automatically.</h3>
                <p style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Upload a raw, unsorted shoot. The AI clusters every image by product using visual similarity — no manual sorting by your senior staff.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', marginTop: '28px' }}>
                  {[
                    { bg: '#1a1a1a', label: 'Front' },
                    { bg: '#111111', label: 'Back' },
                    { bg: '#222222', label: 'Side' },
                    { bg: '#0d0d0d', label: 'Detail' },
                  ].map(({ bg, label }) => (
                    <div key={label} style={{ background: bg, borderRadius: '6px', aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontSize: '8px', fontWeight: 500, color: '#fff', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature 3: Marketplace rules */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,159,10,0.10)', borderRadius: '999px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, color: '#c27800', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff9f0a' }} />
                  Marketplace rules
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>THE ICONIC. Myer. David Jones.</h3>
                <p style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Every marketplace has different dimensions, view requirements, and naming rules. ShotSync knows them all and packages output to spec.</p>
                <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { name: 'THE ICONIC',     spec: '2000×2667 · 4 views' },
                    { name: 'Myer PIM',       spec: '1200×1600 · 2 views' },
                    { name: 'David Jones PIM',spec: '1500×2000 · 3 views' },
                  ].map(({ name, spec }) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(48,209,88,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#1d1d1f', flex: 1 }}>{name}</span>
                      <span style={{ fontSize: '12px', color: '#aeaeb2', background: 'rgba(0,0,0,0.04)', padding: '2px 7px', borderRadius: '4px' }}>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature 4: CSV catalogue */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(48,209,88,0.10)', borderRadius: '999px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, color: '#1a8a35', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#30d158' }} />
                  CSV catalogue
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Works without Shopify.</h3>
                <p style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Upload your season&apos;s SKU sheet — any format, any columns. ShotSync maps your data and matches images against it automatically. No API required.</p>
                <div style={{ marginTop: '28px', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '16px' }}>
                  {[
                    { style: 'Style', colour: 'Colour', code: 'Code', name: 'Name', isHeader: true },
                    { style: '05324', colour: 'Burgundy', code: '062', name: 'Midi Dress', isHeader: false },
                    { style: '05324', colour: 'Black',    code: '010', name: 'Midi Dress', isHeader: false },
                    { style: '06001', colour: 'Navy',     code: '034', name: 'Wide Leg',   isHeader: false },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '6px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                      {[row.style, row.colour, row.code, row.name].map((cell, j) => (
                        <span key={j} style={{ fontSize: '12px', fontFamily: "'SF Mono','Fira Code',monospace", flex: 1, color: row.isHeader ? '#aeaeb2' : '#1d1d1f', fontWeight: row.isHeader ? 400 : 500 }}>{cell}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Feature 5: AI Copywriting — full width */}
            <div className="ai-copy-feature" style={{ background: '#f0f0f2', padding: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center', borderRadius: '24px', border: '0.5px solid rgba(0,0,0,0.08)', marginTop: '12px', overflow: 'hidden' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, color: '#6e6e73', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#5e32f5' }} />
                  AI copywriting
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Product listings written by AI.</h3>
                <p style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>After clustering, ShotSync uses GPT-4o vision to look at your hero image and write a title, description, and bullet points — tailored for ANZ fashion eCommerce. One click, ready to publish.</p>
              </div>
              <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: '#aeaeb2', letterSpacing: '.06em', textTransform: 'uppercase' }}>Generated copy</div>
                <div>
                  <div style={{ fontSize: '11px', color: '#aeaeb2', marginBottom: '4px' }}>Title</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Relaxed Linen Blazer — Tailored, Breathable</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#aeaeb2', marginBottom: '4px' }}>Description</div>
                  <div style={{ fontSize: '12px', color: '#6e6e73', lineHeight: 1.6 }}>A relaxed-fit blazer in lightweight linen. Clean lapels, a slightly oversized silhouette, and a single-button closure make this a season-spanning layer.</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#aeaeb2', marginBottom: '6px' }}>Bullets</div>
                  {['Relaxed linen blazer with clean lapels', 'Slightly oversized, single-button closure', 'Lightweight woven linen — breathable', 'Wear over a slip dress or with tailored trousers'].map((b) => (
                    <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginBottom: '5px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(48,209,88,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" width="8" height="8"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6e6e73' }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── MARKETPLACE LOGOS ── */}
        <section className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '32px' }}>Built for ANZ&apos;s top fashion marketplaces</p>
          <div className="mp-logos-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '860px', margin: '0 auto', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', overflow: 'hidden' }}>
            {[
              { name: 'THE ICONIC', sub: "Australia's largest fashion retailer" },
              { name: 'Myer',       sub: 'PIM direct upload ready' },
              { name: 'David Jones',sub: 'PIM asset management ready' },
            ].map(({ name, sub }, i) => (
              <div key={name} className="mp-logo-cell" style={{ flex: 1, padding: '28px 20px', borderRight: '0.5px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-.2px', color: '#1d1d1f' }}>{name}</div>
                <div style={{ fontSize: '13px', color: '#6e6e73', marginTop: '4px' }}>{sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRIVACY TRUST ── */}
        <section className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Built for brands with unreleased product imagery</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 500, letterSpacing: '-1.2px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '560px', margin: '0 auto 16px' }}>Your images never leave your device.</h2>
          <p style={{ fontSize: '17px', color: '#4a4a4f', maxWidth: '460px', margin: '0 auto 48px', lineHeight: 1.5, letterSpacing: '-.2px' }}>Everything — clustering, renaming, resizing, export packaging — runs entirely in your browser.</p>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '20px', overflow: 'hidden', maxWidth: '860px', margin: '0 auto' }}>
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                ),
                title: 'Processed on-device',
                body: 'Images are handled entirely by your browser using IndexedDB and canvas. Nothing is uploaded to our servers as part of the standard workflow.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                  </svg>
                ),
                title: 'Never used to train AI',
                body: "Your images and brand assets are never shared with third parties or used to train any AI model. What you upload stays yours.",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                ),
                title: 'Account data in Australia',
                body: 'Your account information is stored on cloud infrastructure hosted in Australia, encrypted in transit and at rest.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background: '#fff', padding: '36px 32px', textAlign: 'left' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  {icon}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', color: '#1d1d1f', marginBottom: '8px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>{body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Pricing</p>
          <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 500, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '600px', margin: '0 auto 16px' }}>Simple, transparent pricing.</h2>
          <p style={{ fontSize: '17px', color: '#4a4a4f', maxWidth: '480px', margin: '0 auto 36px', lineHeight: 1.5, letterSpacing: '-.2px' }}>Start free. Upgrade as you grow. Cancel anytime.</p>

          {/* Monthly / Annual toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '52px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-.1px', color: annual ? '#aeaeb2' : '#1d1d1f', transition: 'color .2s' }}>Monthly</span>
            <button
              onClick={() => setAnnual(a => !a)}
              style={{ width: '44px', height: '26px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: annual ? '#1d1d1f' : 'rgba(0,0,0,0.14)', position: 'relative', transition: 'background .2s', flexShrink: 0, padding: 0 }}
            >
              <div style={{ position: 'absolute', top: '3px', left: annual ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-.1px', color: annual ? '#1d1d1f' : '#aeaeb2', transition: 'color .2s', display: 'flex', alignItems: 'center', gap: '7px' }}>
              Annual
              <span style={{ background: 'rgba(48,209,88,0.12)', color: '#1a8a35', fontSize: '12px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px' }}>Save up to 28%</span>
            </span>
          </div>

          {/* Plan cards */}
          <div
            ref={pricingScrollRef}
            className="pricing-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', maxWidth: '1200px', margin: '0 auto 16px' }}
            onScroll={(e) => {
              const el = e.currentTarget
              const cardWidth = el.scrollWidth / 4
              setActivePricingCard(Math.round(el.scrollLeft / cardWidth))
            }}
          >
            {([
              { planKey: 'free'    as const, badge: 'Free',         featured: false, cta: 'Get started free',    href: '/signup' },
              { planKey: 'starter' as const, badge: 'Starter',      featured: false, cta: 'Start with Starter',  href: '/signup?plan=starter' },
              { planKey: 'brand'   as const, badge: 'Most popular', featured: true,  cta: 'Start with Brand',    href: '/signup?plan=brand' },
              { planKey: 'scale'   as const, badge: 'Scale',        featured: false, cta: 'Start with Scale',    href: '/signup?plan=scale' },
            ]).map(({ planKey, badge, featured, cta, href }) => {
              const isLoading = checkoutLoading === planKey
              const p = PLANS[planKey]
              const price = planKey === 'free' ? '$0' : `$${annual ? p.priceAudAnnual : p.priceAud}`
              const period = planKey === 'free' ? 'forever' : annual ? 'AUD / mo, billed annually' : 'AUD / month'
              const saving = planKey !== 'free' && annual ? Math.round((1 - p.priceAudAnnual / p.priceAud) * 100) : 0
              return (
                <div key={planKey} style={{ background: featured ? '#1d1d1f' : '#fff', padding: '32px 28px', textAlign: 'left', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'inline-block', background: featured ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', fontWeight: 500, color: featured ? 'rgba(255,255,255,0.7)' : '#6e6e73', marginBottom: '20px', letterSpacing: '-.1px' }}>{badge}</div>
                  <div style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '-.4px', color: featured ? '#fff' : '#1d1d1f', marginBottom: '8px' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '36px', fontWeight: 500, letterSpacing: '-1.5px', color: featured ? '#fff' : '#1d1d1f', lineHeight: 1 }}>{price}</div>
                    {saving > 0 && <span style={{ fontSize: '11px', background: 'rgba(48,209,88,0.18)', color: '#1a8a35', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>-{saving}%</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: featured ? 'rgba(255,255,255,0.5)' : '#6e6e73', marginBottom: '24px', letterSpacing: '-.1px' }}>{period}</div>
                  <div style={{ height: '0.5px', background: featured ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', marginBottom: '20px' }} />
                  {p.highlights.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px', fontSize: '13px', color: featured ? 'rgba(255,255,255,0.7)' : '#4a4a4f', letterSpacing: '-.1px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: featured ? 'rgba(48,209,88,.2)' : 'rgba(48,209,88,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" width="8" height="8"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      {f}
                    </div>
                  ))}
                  <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
                    <button onClick={() => handlePlanCta(planKey, href)} disabled={!!checkoutLoading} className={`price-cta-btn${featured ? ' featured' : ''}`} style={{ width: '100%', cursor: checkoutLoading ? 'wait' : 'pointer' }}>
                      {isLoading ? 'Loading…' : cta}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile scroll dots */}
          <div className="pricing-dots" style={{ display: 'none', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
            {[0,1,2,3].map((i) => (
              <button
                key={i}
                onClick={() => {
                  const el = pricingScrollRef.current
                  if (!el) return
                  const cardWidth = el.scrollWidth / 4
                  el.scrollTo({ left: cardWidth * i, behavior: 'smooth' })
                }}
                style={{ width: activePricingCard === i ? '18px' : '6px', height: '6px', borderRadius: '999px', border: 'none', padding: 0, cursor: 'pointer', background: activePricingCard === i ? '#1d1d1f' : 'rgba(0,0,0,0.18)', transition: 'all 0.2s' }}
              />
            ))}
          </div>

        </section>

        {/* ── TESTIMONIAL ── */}
        <section className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <div className="testimonial-pad" style={{ maxWidth: '680px', margin: '0 auto', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', padding: '52px 60px' }}>
            <p style={{ fontSize: 'clamp(18px,2.5vw,24px)', fontWeight: 400, letterSpacing: '-.5px', lineHeight: 1.5, color: '#1d1d1f', marginBottom: '32px' }}>
              &ldquo;I used to spend 2–3 days after every shoot just renaming files and uploading to marketplaces. ShotSync has automated the entire process&mdash;it&apos;s been a complete game changer for my workflow.&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, color: '#6e6e73', flexShrink: 0 }}>KC</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Kat C.</div>
                <div style={{ fontSize: '13px', color: '#6e6e73' }}>eCommerce Coordinator, ANZ fashion brand</div>
              </div>
            </div>
          </div>
        </section>


        {/* ── CTA ── */}
        <section className="section-pad" style={{ padding: '0 40px 120px', textAlign: 'center', position: 'relative' }}>
          <div className="cta-pad" style={{ maxWidth: '680px', margin: '0 auto', background: '#1d1d1f', borderRadius: '24px', padding: '72px 60px' }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, letterSpacing: '-1.5px', color: '#f5f5f7', lineHeight: 1.1, marginBottom: '16px' }}>Shoot. Sync. Done.</h2>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.6)', marginBottom: '36px', letterSpacing: '-.2px', lineHeight: 1.5 }}>Start free — no credit card required. Upgrade when you&apos;re ready.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/signup" style={{ background: '#fff', color: '#1d1d1f', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none' }}>
                Get started free
              </Link>
              <button onClick={() => setDemoOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '0.5px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Watch demo
              </button>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="section-pad" style={{ padding: '40px', borderTop: '0.5px solid rgba(0,0,0,0.08)', position: 'relative' }}>
          <div className="footer-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/icon.png" alt="ShotSync" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
              <span style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '-.2px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#aeaeb2' }}>Sync</span></span>
            </Link>
            <div className="footer-links" style={{ display: 'flex', gap: '24px' }}>
              {[
                { label: 'How it works', href: '#how-it-works' },
                { label: 'Features',     href: '#features' },
                { label: 'Pricing',      href: '#pricing' },
                { label: 'FAQ',          href: '/faq' },
                { label: 'Contact',      href: 'mailto:hello@shotsync.ai' },
                { label: 'Privacy',      href: '/privacy' },
              ].map(({ label, href }) => (
                <a key={label} href={href} className="footer-link">{label}</a>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: '#aeaeb2' }}>© 2026 ShotSync.ai</p>
          </div>
        </footer>

      </div>

      {/* ── DEMO MODAL ── */}
      {demoOpen && (
        <div
          onClick={() => setDemoOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '90vw', maxWidth: '1280px',
              aspectRatio: '16/9',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}
          >
            <iframe
              src="/onboarding.html"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="autoplay"
            />
            <button
              onClick={() => setDemoOpen(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', border: '0.5px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: '18px', lineHeight: 1,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}
