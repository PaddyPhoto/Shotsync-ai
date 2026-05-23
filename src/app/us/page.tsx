'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

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

const US_PLANS = [
  {
    key: 'free',
    name: 'Free',
    badge: 'FREE',
    badgeBg: 'rgba(255,59,48,0.10)',
    badgeColor: '#c9302a',
    monthlyPrice: 0,
    featured: false,
    cta: 'Get started free',
    href: '/signup',
    features: ['Up to 50 SKUs / month', 'Up to 3 exports', 'Shopify export (ZIP only)', '1 brand'],
  },
  {
    key: 'launch',
    name: 'Launch',
    badge: 'LAUNCH',
    badgeBg: 'rgba(0,122,255,0.10)',
    badgeColor: '#0062cc',
    monthlyPrice: 79,
    featured: false,
    cta: 'Start 30-day free trial',
    href: '/signup?plan=launch',
    features: ['Up to 200 SKUs / month', '1 brand', '1 Shopify store connection', 'Shopify-ready folder export', '1 ERP integration'],
  },
  {
    key: 'growth',
    name: 'Growth',
    badge: 'MOST POPULAR',
    badgeBg: 'rgba(48,209,88,0.18)',
    badgeColor: '#30d158',
    monthlyPrice: 179,
    featured: true,
    cta: 'Start 30-day free trial',
    href: '/signup?plan=growth',
    features: ['Up to 1,000 SKUs / month', '2 brands', '2 Shopify store integrations', 'All ERP integrations', 'AI copy trained on brand voice', 'Background removal add-on'],
  },
  {
    key: 'scale',
    name: 'Scale',
    badge: 'SCALE',
    badgeBg: 'rgba(255,159,10,0.12)',
    badgeColor: '#b86e00',
    monthlyPrice: 449,
    featured: false,
    cta: 'Start 30-day free trial',
    href: '/signup?plan=scale',
    features: ['Up to 2,500 SKUs / month', '5 brands', 'Up to 5 Shopify stores', 'All ERP integrations', 'AI copy trained on brand voice', 'Priority processing'],
  },
]

export default function USLandingPage() {
  const [annual, setAnnual] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [activePricingCard, setActivePricingCard] = useState(0)
  const pricingScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.substring(1)
    if (hash && hash.includes('access_token=')) {
      window.location.replace('/auth/callback' + window.location.hash)
    }
  }, [])

  return (
    <>
      <style suppressHydrationWarning>{`
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
        .footer-link { font-size:14px;color:#6e6e73;text-decoration:none;letter-spacing:-.1px;transition:color .15s; }
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
          .who-for-grid { grid-template-columns: 1fr !important; }
          .integrations-row { flex-direction: column !important; gap: 24px !important; }
          .pricing-grid { grid-template-columns: 1fr 1fr !important; overflow-x: auto; }
          .testimonial-pad { padding: 36px 24px !important; }
          .cta-pad { padding: 48px 28px !important; }
          .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
          .footer-links { flex-wrap: wrap !important; gap: 12px !important; }
          .nav-bar { padding: 0 20px !important; }
        }
        @media (max-width: 600px) {
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
          .pricing-card {
            flex: 0 0 82vw !important;
            scroll-snap-align: center !important;
            border-radius: 16px !important;
            border: 0.5px solid rgba(0,0,0,0.10) !important;
          }
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, background: '#f5f5f7', zIndex: -1, pointerEvents: 'none' }} />

      <Orb color="rgba(0,113,227,0.50)"  size="clamp(480px,38vw,900px)"  top="-5vh"  left="-8%"  speed={0.12} />
      <Orb color="rgba(94,50,245,0.42)"  size="clamp(440px,36vw,860px)"  top="5vh"   left="62%"  speed={0.28} />
      <Orb color="rgba(48,209,88,0.40)"  size="clamp(400px,34vw,820px)"  top="40vh"  left="5%"   speed={0.08} />
      <Orb color="rgba(0,190,220,0.38)"  size="clamp(460px,37vw,880px)"  top="50vh"  left="58%"  speed={0.20} />
      <Orb color="rgba(255,149,0,0.36)"  size="clamp(420px,35vw,840px)"  top="75vh"  left="12%"  speed={0.16} />
      <Orb color="rgba(0,113,227,0.42)"  size="clamp(450px,36vw,860px)"  top="70vh"  left="55%"  speed={0.32} />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', color: '#1d1d1f', fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif", WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>

        {/* NAV */}
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

        {/* HERO */}
        <section className="hero-section" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 40px 60px', position: 'relative' }}>
          <div className="hero-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '999px', padding: '5px 14px', fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '-.1px', marginBottom: '22px' }}>
            <span className="eyebrow-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158', flexShrink: 0 }} />
            Now available for US fashion brands
          </div>
          <h1 className="hero-h1" style={{ fontSize: 'clamp(32px,3.2vw,64px)', fontWeight: 500, letterSpacing: '-2px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '900px', marginBottom: '20px' }}>
            From images to{' '}
            <span style={{ fontWeight: 700 }}>fully enriched product listings</span>
            <span style={{ color: '#8e8e93', whiteSpace: 'nowrap' }}> — in minutes</span>
          </h1>
          <p className="hero-sub" style={{ fontSize: 'clamp(16px,1.8vw,22px)', color: '#3a3a3c', maxWidth: '640px', lineHeight: 1.5, letterSpacing: '-.3px', marginBottom: '36px' }}>
            Upload your shoot images and product CSV. ShotSync builds structured SKU clusters, enriches every listing, and pushes directly to Shopify and your ERP — in minutes, not days.
          </p>
          <div className="hero-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Start your free trial
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <a href="#how-it-works" style={{ background: '#fff', color: '#1d1d1f', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', border: '0.5px solid rgba(0,0,0,0.08)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              See how it works
            </a>
          </div>

          {/* Stats bar */}
          <div className="hero-stats" style={{ display: 'flex', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', marginTop: '44px', overflow: 'hidden' }}>
            {[
              { value: '2 – 3 days', label: 'Manual workflow',    color: '#1d1d1f' },
              { value: '25 min',  label: 'With ShotSync',    color: '#30d158' },
              { value: <>500<span style={{fontSize:'0.75em',position:'relative',top:'-0.18em'}}>+</span></>, label: 'Images per job',   color: '#1d1d1f' },
              { value: '1-click', label: 'Platform push',    color: '#1d1d1f' },
            ].map(({ value, label, color }, i) => (
              <div key={i} className="hero-stat-cell" style={{ padding: '24px 36px', textAlign: 'center', borderRight: '0.5px solid rgba(0,0,0,0.08)', flex: 1 }}>
                <div style={{ fontSize: 'clamp(28px,3vw,42px)', fontWeight: 500, letterSpacing: '-1px', color, marginBottom: '4px', lineHeight: 1, whiteSpace: 'nowrap' }}>{value}</div>
                <div style={{ fontSize: 'clamp(12px,1vw,15px)', color: '#4a4a4f', letterSpacing: '-.1px' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* APP MOCKUP */}
        <section className="app-mockup-section" style={{ padding: '0 40px 100px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{ width: '100%', maxWidth: 'clamp(1200px,75vw,1440px)', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)' }}>
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
            <div style={{ display: 'flex', height: '460px' }}>
              <div style={{ width: '180px', minWidth: '180px', background: 'rgba(248,248,250,0.9)', borderRight: '0.5px solid rgba(0,0,0,0.05)', padding: '16px 10px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 8px', marginBottom: '16px' }}>
                  <div style={{ width: '20px', height: '20px', background: '#1d1d1f', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" strokeWidth="2.5" width="10" height="10"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '-.2px', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#aeaeb2' }}>Sync</span></span>
                </div>
                <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: '#aeaeb2', padding: '0 8px', margin: '12px 0 4px' }}>Workspace</div>
                {[
                  { label: 'Overview', active: true },
                  { label: 'All jobs', active: false },
                ].map(({ label, active }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', color: active ? '#1d1d1f' : '#6e6e73', background: active ? 'rgba(0,0,0,0.05)' : 'transparent', fontWeight: active ? 500 : 400, marginBottom: '1px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11" style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    {label}
                  </div>
                ))}
                <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: '#aeaeb2', padding: '0 8px', margin: '12px 0 4px' }}>Pipeline</div>
                {['Upload', 'Processing', 'Clusters', 'Export'].map((label) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', color: '#6e6e73', marginBottom: '1px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11" style={{ flexShrink: 0, opacity: 0.6 }}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>
                    {label}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
                <div style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '-.4px', marginBottom: '2px' }}>Good morning.</div>
                <div style={{ fontSize: '11px', color: '#aeaeb2', marginBottom: '16px', letterSpacing: '-.1px' }}>3 active jobs · 4 clusters need attention · Last sync 2h ago</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: 'Images',    value: '8,412', delta: '↑ 1,204',    deltaColor: '#30d158' },
                    { label: 'Clusters',  value: '247',   delta: '↑ 38 today', deltaColor: '#30d158' },
                    { label: 'Ready',     value: '19',    delta: '3 channels',  deltaColor: '#aeaeb2' },
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
                  <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 500, color: '#1d1d1f' }}>Platform coverage</div>
                    {[
                      { name: 'Shopify',  pct: 94 },
                      { name: 'Cin7 Core', pct: 78 },
                      { name: 'REVOLVE',  pct: 61 },
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

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="section-pad" style={{ padding: '100px 40px', textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>How it works</p>
          <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 500, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '600px', margin: '0 auto 16px' }}>Three steps. Zero manual work.</h2>
          <p style={{ fontSize: '17px', color: '#4a4a4f', maxWidth: '580px', margin: '0 auto 64px', lineHeight: 1.5, letterSpacing: '-.2px' }}>
            Drop your shoot. ShotSync handles everything between the photographer&apos;s delivery and your live product listings.
          </p>
          <div className="how-it-works-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', maxWidth: 'clamp(1050px,75vw,1280px)', margin: '0 auto' }}>
            {[
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
                title: 'Upload your shoot',
                desc: 'Drop up to 1,000 images. ShotSync ingests, reads your product CSV, and starts the pipeline automatically.',
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>,
                title: 'AI enriches every listing',
                desc: 'Images are clustered by SKU, angles detected, colours matched, files renamed, and product copy generated in your brand voice.',
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
                title: 'Push to Shopify and your ERP',
                desc: 'One click pushes enriched listings directly to your Shopify store and ERP — Cin7 Core or AIMS360. No re-entry, no delays.',
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

        {/* FEATURES */}
        <section id="features" className="section-pad" style={{ padding: '0 40px 100px', position: 'relative' }}>
          <div style={{ maxWidth: 'clamp(1200px,75vw,1440px)', margin: '0 auto' }}>
            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden' }}>

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

              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(175,82,222,0.08)', borderRadius: '999px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, color: '#7b2fa0', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#af52de' }} />
                  AI clustering
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Groups images by SKU automatically.</h3>
                <p style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Upload a raw, unsorted shoot. The AI clusters every image by product using visual similarity — no manual sorting by your team.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', marginTop: '28px' }}>
                  {['Front', 'Back', 'Side', 'Detail'].map((label) => (
                    <div key={label} style={{ background: label === 'Front' ? '#1a1a1a' : label === 'Back' ? '#111' : label === 'Side' ? '#222' : '#0d0d0d', borderRadius: '6px', aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontSize: '8px', fontWeight: 500, color: '#fff', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,159,10,0.10)', borderRadius: '999px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, color: '#c27800', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff9f0a' }} />
                  ERP integration
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Shopify. Cin7 Core. AIMS360.</h3>
                <p style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Push enriched product data directly to your ERP and Shopify store in one click. No copy-paste, no re-entry across systems.</p>
                <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { name: 'Shopify',    spec: 'Direct product push' },
                    { name: 'Cin7 Core', spec: 'ERP sync · live' },
                    { name: 'AIMS360',   spec: 'ERP sync · coming soon' },
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

              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(48,209,88,0.10)', borderRadius: '999px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, color: '#1a8a35', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#30d158' }} />
                  CSV catalogue
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Works with any product CSV.</h3>
                <p style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Upload your season&apos;s SKU sheet — any format, any columns. ShotSync maps your data and matches images against it automatically. No API required to get started.</p>
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

            {/* AI Copywriting */}
            <div className="ai-copy-feature" style={{ background: '#f0f0f2', padding: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center', borderRadius: '24px', border: '0.5px solid rgba(0,0,0,0.08)', marginTop: '12px', overflow: 'hidden' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, color: '#6e6e73', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#5e32f5' }} />
                  AI copywriting
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Product listings written in your brand&apos;s voice.</h3>
                <p style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>After clustering, ShotSync uses GPT-4o vision to look at your hero image and write a title, description, and bullet points — in your brand&apos;s tone of voice. Paste in a few examples of copy you love and every description will sound like you wrote it. One click, ready to publish.</p>
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

        {/* US INTEGRATIONS */}
        <section className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '32px' }}>Integrates with the platforms you already run on</p>
          <div style={{ maxWidth: 'clamp(860px,65vw,1100px)', margin: '0 auto', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '20px', overflow: 'hidden' }}>

            {/* Three columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>

              <div style={{ padding: '28px 28px', borderRight: '0.5px solid rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '14px' }}>Ecommerce</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(48,209,88,0.06)', border: '0.5px solid rgba(48,209,88,0.2)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 500, color: '#1d1d1f' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#30d158', flexShrink: 0 }} />
                  Shopify
                </div>
              </div>

              <div style={{ padding: '28px 28px', borderRight: '0.5px solid rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '14px' }}>ERP / Inventory</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(48,209,88,0.06)', border: '0.5px solid rgba(48,209,88,0.2)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 500, color: '#1d1d1f', alignSelf: 'flex-start' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#30d158', flexShrink: 0 }} />
                    Cin7 Core
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 400, color: '#aeaeb2', alignSelf: 'flex-start' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#d1d1d6', flexShrink: 0 }} />
                    AIMS360
                    <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.05)', color: '#8e8e93', padding: '2px 7px', borderRadius: '4px', fontWeight: 500, letterSpacing: '-.1px' }}>Coming soon</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '28px 28px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '14px' }}>Retail / Marketplaces</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {['REVOLVE', 'Shopbop', 'Nordstrom'].map((name) => (
                    <div key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 400, color: '#aeaeb2', alignSelf: 'flex-start' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#d1d1d6', flexShrink: 0 }} />
                      {name}
                      <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.05)', color: '#8e8e93', padding: '2px 7px', borderRadius: '4px', fontWeight: 500, letterSpacing: '-.1px' }}>Coming soon</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Callout row */}
            <div style={{ padding: '20px 28px', background: 'rgba(0,0,0,0.015)', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#6e6e73" strokeWidth="1.8" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <p style={{ fontSize: '13px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px', margin: 0 }}>
                Brands with an ERP — Cin7 or AIMS360 — use ShotSync to enrich product data before it enters their system. Their ERP then handles distribution to retail partners like Nordstrom and Macy&apos;s.
                <br /><br />
                Brands without an ERP use ShotSync to push enriched listings directly to Shopify and marketplace platforms. Your stack, your way.
              </p>
            </div>

          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Who it&apos;s for</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, letterSpacing: '-1.2px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '780px', margin: '0 auto 48px' }}>
            Built for the person who manages what happens after the shoot.
          </h2>
          <div className="who-for-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', maxWidth: 'clamp(860px,65vw,1100px)', margin: '0 auto' }}>
            {[
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                ),
                title: 'eCommerce coordinators',
                body: 'You receive the shoot, match the images, populate the attributes, write the listings, and push everything live. ShotSync automates the part that takes the longest — so you can focus on what actually needs your judgment.',
              },
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                ),
                title: 'Emerging DTC brands',
                body: 'No ERP, no production team — just you, a Shopify store, and a seasonal shoot to turn into live product pages. ShotSync gives you the workflow automation of a much larger team, at a price built for growing brands.',
              },
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                ),
                title: 'Mid-tier wholesale brands',
                body: 'Selling into Nordstrom, REVOLVE, or Macy\'s through AIMS360 or Cin7? ShotSync enriches your product data before it enters the ERP — so what your retail partners receive is already compliant and publish-ready.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '16px', padding: '28px 24px', textAlign: 'left' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '0.5px solid rgba(0,0,0,0.07)' }}>
                  {icon}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-.2px', marginBottom: '10px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: '#4a4a4f', lineHeight: 1.7, letterSpacing: '-.1px' }}>{body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* PRIVACY */}
        <section className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Built for brands with unreleased product imagery</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 500, letterSpacing: '-1.2px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '780px', margin: '0 auto 16px' }}>Your images never leave your device.</h2>
          <p style={{ fontSize: '17px', color: '#4a4a4f', maxWidth: '560px', margin: '0 auto 48px', lineHeight: 1.5, letterSpacing: '-.2px' }}>Everything — clustering, renaming, resizing, export packaging — runs entirely in your browser.</p>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '20px', overflow: 'hidden', maxWidth: 'clamp(860px,65vw,1100px)', margin: '0 auto' }}>
            {[
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                title: 'Processed on-device',
                body: 'Images are handled entirely by your browser using IndexedDB and canvas. Nothing is uploaded to our servers as part of the standard workflow.',
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
                title: 'Never used to train AI',
                body: "Your images and brand assets are never shared with third parties or used to train any AI model. What you upload stays yours.",
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                title: 'Enterprise-grade security',
                body: 'Your account data is stored on encrypted, enterprise-grade cloud infrastructure — secured in transit and at rest.',
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

        {/* PRICING */}
        <section id="pricing" className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Pricing</p>
          <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 500, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '600px', margin: '0 auto 16px' }}>Simple, transparent pricing.</h2>
          <p style={{ fontSize: '17px', color: '#4a4a4f', maxWidth: '560px', margin: '0 auto 36px', lineHeight: 1.5, letterSpacing: '-.2px' }}>Start free. Upgrade as you grow. Cancel anytime.</p>

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

          <div
            ref={pricingScrollRef}
            className="pricing-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', maxWidth: 'clamp(1200px,75vw,1440px)', margin: '0 auto 16px' }}
            onScroll={(e) => {
              const el = e.currentTarget
              const cardWidth = el.scrollWidth / 4
              setActivePricingCard(Math.round(el.scrollLeft / cardWidth))
            }}
          >
            {US_PLANS.map(({ key, name, badge, badgeBg, badgeColor, monthlyPrice, featured, cta, href, features }) => {
              const annualPrice = monthlyPrice === 0 ? 0 : Math.round(monthlyPrice * 0.72)
              const displayPrice = monthlyPrice === 0 ? '$0' : annual ? `$${annualPrice}` : `$${monthlyPrice}`
              const period = monthlyPrice === 0 ? 'forever' : annual ? 'USD / mo, billed annually' : 'USD / mo, billed monthly'
              const saving = monthlyPrice > 0 && annual ? Math.round((1 - annualPrice / monthlyPrice) * 100) : 0
              const cardBg = featured
                ? 'linear-gradient(155deg, #0d1a2e 0%, #151e30 40%, #1d1d1f 100%)'
                : '#fff'
              return (
                <div key={key} className="pricing-card" style={{ background: cardBg, textAlign: 'left', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  {featured && (
                    <div style={{ background: '#1d1d1f', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#fff' }}>
                      Most Popular
                    </div>
                  )}
                  <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'inline-block', background: badgeBg, borderRadius: '999px', padding: '4px 10px', fontSize: '12px', fontWeight: 500, color: badgeColor, marginBottom: '20px', letterSpacing: '-.1px' }}>{featured ? 'Growth' : badge}</div>
                    <div style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '-.4px', color: featured ? '#fff' : '#1d1d1f', marginBottom: '8px' }}>{name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                      <div style={{ fontSize: '36px', fontWeight: 500, letterSpacing: '-1.5px', color: featured ? '#fff' : '#1d1d1f', lineHeight: 1 }}>{displayPrice}</div>
                      {saving > 0 && <span style={{ fontSize: '11px', background: 'rgba(48,209,88,0.18)', color: '#1a8a35', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>-{saving}%</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: featured ? 'rgba(255,255,255,0.75)' : '#3a3a3c', marginBottom: '24px', letterSpacing: '-.1px' }}>{period}</div>
                    <div style={{ height: '0.5px', background: featured ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', marginBottom: '20px' }} />
                    {features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px', fontSize: '13px', color: featured ? 'rgba(255,255,255,0.92)' : '#1d1d1f', letterSpacing: '-.1px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: featured ? 'rgba(48,209,88,0.2)' : 'rgba(48,209,88,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" width="8" height="8"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        {f}
                      </div>
                    ))}
                    <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
                      <Link href={href} className={`price-cta-btn${featured ? ' featured' : ''}`} style={{ width: '100%', display: 'block', textAlign: 'center' }}>
                        {cta}
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

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

          <div style={{ maxWidth: '1200px', margin: '12px auto 0', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', background: '#fff', padding: '11px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Enterprise</span>
                <span style={{ fontSize: '12px', color: '#6e6e73', marginLeft: '8px' }}>Unlimited brands · unlimited SKUs · custom contract · dedicated support</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Unlimited everything', 'SSO + permissions', 'SLA guarantee', 'Invoiced billing'].map((f) => (
                  <span key={f} style={{ fontSize: '11px', color: '#6e6e73', background: 'rgba(0,0,0,0.04)', borderRadius: '5px', padding: '2px 7px' }}>{f}</span>
                ))}
              </div>
            </div>
            <a href="mailto:hello@shotsync.ai" className="price-cta-btn" style={{ whiteSpace: 'nowrap', textDecoration: 'none', flexShrink: 0, fontSize: '13px', padding: '7px 16px', display: 'inline-block', marginTop: 0 }}>
              Contact us
            </a>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <div className="testimonial-pad" style={{ maxWidth: '680px', margin: '0 auto', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', padding: '52px 60px' }}>
            <p style={{ fontSize: 'clamp(18px,2.5vw,24px)', fontWeight: 400, letterSpacing: '-.5px', lineHeight: 1.5, color: '#1d1d1f', marginBottom: '32px' }}>
              &ldquo;I used to spend 2–3 days after every shoot just renaming files and uploading to marketplaces. ShotSync has automated the entire process&mdash;it&apos;s been a complete game changer for my workflow.&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, color: '#6e6e73', flexShrink: 0 }}>KC</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Kat C.</div>
                <div style={{ fontSize: '13px', color: '#6e6e73' }}>eCommerce Coordinator, fashion brand</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-pad" style={{ padding: '0 40px 120px', textAlign: 'center', position: 'relative' }}>
          <div className="cta-pad" style={{ maxWidth: '680px', margin: '0 auto', background: '#1d1d1f', borderRadius: '24px', padding: '72px 60px' }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, letterSpacing: '-1.5px', color: '#f5f5f7', lineHeight: 1.1, marginBottom: '16px' }}>Shoot. Sync. Done.</h2>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.6)', marginBottom: '36px', letterSpacing: '-.2px', lineHeight: 1.5 }}>Start free — no credit card required. Upgrade when you&apos;re ready.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/signup" style={{ background: '#fff', color: '#1d1d1f', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none' }}>
                Start your free trial
              </Link>
              <button onClick={() => setDemoOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '0.5px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Watch demo
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="section-pad" style={{ padding: 'clamp(36px,4vw,60px) 40px', borderTop: '1px solid rgba(0,0,0,0.1)', background: '#f5f5f7', position: 'relative' }}>
          <div className="footer-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1440px', margin: '0 auto' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/icon.png" alt="ShotSync" style={{ width: '28px', height: '28px', borderRadius: '7px' }} />
              <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.3px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#6e6e73' }}>Sync</span></span>
            </Link>
            <div className="footer-links" style={{ display: 'flex', gap: 'clamp(20px,2.5vw,36px)' }}>
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
            <p style={{ fontSize: '14px', color: '#6e6e73', letterSpacing: '-.1px' }}>© 2026 ShotSync.ai</p>
          </div>
        </footer>
      </div>

      {demoOpen && (
        <div onClick={() => setDemoOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '90vw', maxWidth: '1280px', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
            <iframe src="/onboarding.html" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} allow="autoplay" />
            <button onClick={() => setDemoOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '0.5px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '18px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>×</button>
          </div>
        </div>
      )}
    </>
  )
}
