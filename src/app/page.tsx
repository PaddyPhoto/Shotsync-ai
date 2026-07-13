'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PaymentLogos } from '@/components/billing/PaymentLogos'
import { AnimatedHeading, Reveal, RevealItem, ScrollTilt, WorkflowGraph } from '@/components/landing/LandingMotion'

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
  const [demoOpen, setDemoOpen] = useState(false)

  // Supabase may send #access_token=... to the site root when the callback
  // URL isn't matched. Detect and forward to the proper callback handler.
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
        /* Hero entrance now handled by framer-motion (see LandingMotion). */
        .eyebrow-dot  { animation: eyebrowPulse 2s infinite; }
        @keyframes scrollNudge {
          0%, 100% { transform: translateY(0); opacity: .5; }
          50%      { transform: translateY(6px); opacity: 1; }
        }
        .scroll-cue { position:absolute; bottom:22px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:5px; background:none; border:none; cursor:pointer; color:#6e6e73; padding:8px; transition:color .15s; }
        .scroll-cue:hover { color:#1d1d1f; }
        .scroll-cue span { font-size:10px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; }
        .scroll-cue svg { animation: scrollNudge 1.8s ease-in-out infinite; }
        @media (max-width: 767px) { .scroll-cue { display:none; } }
        .nav-link { font-size:13px;color:#6e6e73;text-decoration:none;letter-spacing:-.1px;transition:color .15s; }
        .nav-link:hover { color:#1d1d1f; }
        .footer-link { font-size:14px;color:#6e6e73;text-decoration:none;letter-spacing:-.1px;transition:color .15s;white-space:nowrap; }
        .footer-link:hover { color:#1d1d1f; }
        .footer-links { flex-wrap:wrap; }
        .price-cta-btn { display:block;text-align:center;margin-top:24px;padding:10px;border-radius:8px;font-size:13px;font-weight:500;letter-spacing:-.2px;text-decoration:none;transition:opacity .15s;background:rgba(0,0,0,0.06);color:#1d1d1f; }
        .price-cta-btn:hover { opacity:.8; }
        .price-cta-btn.featured { background:#fff;color:#1d1d1f; }
        .mp-logo-cell:last-child { border-right: none !important; }
        .hero-stat-cell:last-child { border-right: none !important; }

        /* Footer: 8 links + payment logos need room — stack before they collide. */
        @media (max-width: 1200px) {
          .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 24px !important; }
          .footer-links { flex-wrap: wrap !important; gap: 12px 22px !important; }
        }

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
          .features-grid { grid-template-columns: minmax(0,1fr) !important; }
          .features-grid > div { padding: 22px !important; }
          .ai-copy-feature { grid-template-columns: 1fr !important; }
          .mp-logos-row { flex-direction: column !important; }
          .mp-logo-cell { border-right: none !important; border-bottom: 0.5px solid rgba(0,0,0,0.08) !important; }
          .mp-logo-cell:last-child { border-bottom: none !important; }
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
            <Link href="/pricing" className="nav-link">Pricing</Link>
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
          <Reveal immediate delay={0.05} y={12}>
          <div className="hero-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '999px', padding: '5px 14px', fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '-.1px', marginBottom: '22px' }}>
            <span className="eyebrow-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158', flexShrink: 0 }} />
            The listing platform for fashion brands
          </div>
          </Reveal>
          <AnimatedHeading
            as="h1"
            immediate
            className="hero-h1"
            style={{ fontSize: 'clamp(36px,3.8vw,76px)', fontWeight: 500, letterSpacing: '-2px', lineHeight: 1.08, color: '#1d1d1f', maxWidth: '1200px', marginBottom: '20px' }}
            segments={[
              { text: 'From shoot to live product listings,', breakAfter: true },
              { text: 'in minutes.', color: '#8e8e93' },
            ]}
          />
          <Reveal immediate delay={0.55} className="hero-sub" style={{ maxWidth: '640px', marginBottom: '36px' }}>
            <p style={{ fontSize: 'clamp(16px,1.8vw,22px)', color: '#3a3a3c', lineHeight: 1.5, letterSpacing: '-.3px' }}>
              ShotSync builds your complete listing — images, metadata, copy — and delivers it to every marketplace and retailer in their exact required format. No reformatting. No repetition. No delays.
            </p>
          </Reveal>
          <Reveal immediate delay={0.7} className="hero-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Get started free
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <button onClick={() => setDemoOpen(true)} style={{ background: '#fff', color: '#1d1d1f', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', border: '0.5px solid rgba(0,0,0,0.08)', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style={{ color: '#1d1d1f' }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Watch demo
            </button>
          </Reveal>

          {/* Stats bar */}
          <Reveal immediate delay={0.85}>
          <div className="hero-stats" style={{ display: 'flex', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', marginTop: '44px', overflow: 'hidden' }}>
            {[
              { value: '1 listing', label: 'Created once',            color: '#1d1d1f' },
              { value: '5+',       label: 'Channels, one workflow',  color: '#30d158' },
              { value: '25 min',   label: 'From listing to live',    color: '#1d1d1f' },
              { value: 'Zero',     label: 'Manual reformatting',     color: '#1d1d1f' },
            ].map(({ value, label, color }, i) => (
              <div key={i} className="hero-stat-cell" style={{ padding: '24px 36px', textAlign: 'center', borderRight: '0.5px solid rgba(0,0,0,0.08)', flex: 1 }}>
                <div style={{ fontSize: 'clamp(28px,3vw,42px)', fontWeight: 500, letterSpacing: '-1px', color, marginBottom: '4px', lineHeight: 1, whiteSpace: 'nowrap' }}>{value}</div>
                <div style={{ fontSize: 'clamp(14px,1vw,17px)', color: '#4a4a4f', letterSpacing: '-.1px' }}>{label}</div>
              </div>
            ))}
          </div>
          </Reveal>

          <button
            className="scroll-cue"
            onClick={() => window.scrollTo({ top: window.innerHeight * 0.92, behavior: 'smooth' })}
            aria-label="Scroll down to see more"
          >
            <span>Scroll</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </section>

        {/* ── APP MOCKUP ── */}
        <section className="app-mockup-section" style={{ padding: '0 28px 100px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <ScrollTilt style={{ width: '100%' }}>
          <div style={{ width: '100%', maxWidth: 'clamp(1200px,93vw,2160px)', margin: '0 auto', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)' }}>
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
            {/* App inner — light-theme recreation of the live dashboard */}
            <div style={{ display: 'flex', height: 'clamp(520px,32vw,600px)', fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
              {/* Sidebar */}
              <div style={{ width: '232px', minWidth: '232px', background: '#fafafb', borderRight: '0.5px solid rgba(0,0,0,0.06)', padding: '18px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '4px 8px', marginBottom: '14px' }}>
                  <img src="/icon.png" alt="" style={{ width: '26px', height: '26px', borderRadius: '7px' }} />
                  <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.3px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#aeaeb2' }}>Sync</span></span>
                </div>
                {/* Brand switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg,#0071e3,#5e32f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: '#fff' }}>FC</div>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Fashion Co</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" width="13" height="13"><path d="M8 9l4 4 4-4"/></svg>
                </div>
                {/* Dashboard (active) */}
                {[{ label: 'Dashboard', active: true, icon: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" /> }].map((it) => (
                  <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', fontSize: '13.5px', color: '#1d1d1f', background: 'rgba(0,0,0,0.06)', fontWeight: 500, marginBottom: '2px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15" strokeLinejoin="round">{it.icon}</svg>
                    {it.label}
                  </div>
                ))}
                <div style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: '#aeaeb2', padding: '0 10px', margin: '14px 0 5px' }}>Shoots</div>
                {[
                  { label: 'New Shoot', icon: <><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h2l1-2h5l1 2h2A1.5 1.5 0 0 1 17 7.5v8A1.5 1.5 0 0 1 15.5 17h-11A1.5 1.5 0 0 1 3 15.5v-8z" strokeLinejoin="round"/><circle cx="10" cy="11" r="2.6"/></>, dot: null },
                  { label: 'All Jobs', icon: <><rect x="3" y="4" width="14" height="12" rx="1.5"/><path d="M12 4V3a2 2 0 0 0-4 0v1" strokeLinecap="round"/><path d="M6 9h7M6 12h5" strokeLinecap="round"/></>, dot: 'green' },
                  { label: 'Review', icon: <><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></>, dot: null, badge: '12' },
                ].map(({ label, icon, dot, badge }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', fontSize: '13.5px', color: '#6e6e73', marginBottom: '2px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15" style={{ opacity: 0.7 }}>{icon}</svg>
                    <span style={{ flex: 1 }}>{label}</span>
                    {dot === 'green' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158' }} />}
                    {badge && <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', background: '#30d158', borderRadius: '8px', padding: '1px 6px' }}>{badge}</span>}
                  </div>
                ))}
                <div style={{ marginTop: '10px' }}>
                  {[{ label: 'Products', icon: <><rect x="3" y="3" width="6" height="8" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="13" width="6" height="4" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></> }].map((it) => (
                    <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', fontSize: '13.5px', color: '#6e6e73' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15" style={{ opacity: 0.7 }}>{it.icon}</svg>
                      {it.label}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: '#aeaeb2', padding: '0 10px', margin: '14px 0 5px' }}>Settings</div>
                {[
                  { label: 'Brand', icon: <><rect x="3" y="5" width="14" height="11" rx="1.5"/><path d="M7 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" strokeLinecap="round"/></> },
                  { label: 'Channels', icon: <><circle cx="4.5" cy="10" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="M6.5 10h3l3.5-5M6.5 10h3l3.5 5" strokeLinecap="round" strokeLinejoin="round"/></> },
                  { label: 'Settings', icon: <><circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M14.4 5.6l1.4-1.4M4.2 15.8l1.4-1.4" strokeLinecap="round"/></> },
                ].map(({ label, icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', fontSize: '13.5px', color: '#6e6e73', marginBottom: '2px' }}>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15" style={{ opacity: 0.7 }}>{icon}</svg>
                    {label}
                  </div>
                ))}
                {/* Org / plan footer */}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#1d1d1f' }}>F</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Fashion Co</div>
                    <div style={{ fontSize: '11px', color: '#aeaeb2' }}>Scale plan</div>
                  </div>
                </div>
              </div>

              {/* Main */}
              <div style={{ flex: 1, padding: '26px 28px', overflow: 'hidden', background: '#fff' }}>
                <div style={{ fontSize: '11.5px', color: '#aeaeb2', letterSpacing: '-.1px', marginBottom: '10px' }}>ShotSync&nbsp; ›&nbsp; Overview</div>
                <div style={{ fontSize: '27px', fontWeight: 500, letterSpacing: '-.8px', color: '#1d1d1f', marginBottom: '3px' }}>Good morning.</div>
                <div style={{ fontSize: '13.5px', color: '#8e8e93', marginBottom: '22px', letterSpacing: '-.1px' }}>3 active jobs · 12 clusters in review · Last sync 2h ago</div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '14px' }}>
                  {[
                    { label: 'SKUs exported',        value: '1,840 / 2,500', sub: 'June',     accent: '#30d158', bar: 74 },
                    { label: 'Exports run',          value: '126',           sub: 'June',     accent: '#0071e3' },
                    { label: 'Total SKUs processed', value: '8,412',         sub: 'all time', accent: '#ff9f0a' },
                    { label: 'Plan',                 value: 'Scale',         sub: '660 SKUs remaining', accent: '#af52de' },
                  ].map(({ label, value, sub, accent, bar }) => (
                    <div key={label} style={{ background: '#fafafb', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '14px', borderTop: `3px solid ${accent}`, padding: '14px 16px' }}>
                      <div style={{ fontSize: '12.5px', color: '#8e8e93', letterSpacing: '-.1px', marginBottom: '6px' }}>{label}</div>
                      <div style={{ fontSize: '26px', fontWeight: 500, letterSpacing: '-1px', color: '#1d1d1f', lineHeight: 1, marginBottom: '6px' }}>{value}</div>
                      {bar !== undefined && (
                        <div style={{ height: '3px', background: 'rgba(0,0,0,0.07)', borderRadius: '2px', marginBottom: '5px' }}>
                          <div style={{ height: '100%', width: `${bar}%`, background: accent, borderRadius: '2px' }} />
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: accent, fontWeight: 500 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Recent jobs + Marketplace coverage */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#fafafb', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ padding: '13px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Recent jobs</span>
                      <span style={{ fontSize: '12.5px', color: '#0071e3', fontWeight: 500 }}>View all</span>
                    </div>
                    {[
                      { name: 'SS26 October Drop',  meta: '300 images', chip: 'Ready',      chipBg: 'rgba(48,209,88,.12)',  chipColor: '#1a8a35' },
                      { name: 'Knitwear Capsule',   meta: '168 images', chip: 'Processing', chipBg: 'rgba(0,113,227,.10)',  chipColor: '#005fc4' },
                      { name: 'Accessories AW26',   meta: '92 images',  chip: 'Review',     chipBg: 'rgba(255,159,10,.12)', chipColor: '#b86e00' },
                      { name: 'Denim Refresh',      meta: '214 images', chip: 'Ready',      chipBg: 'rgba(48,209,88,.12)',  chipColor: '#1a8a35' },
                      { name: 'Footwear SS26',      meta: '76 images',  chip: 'Ready',      chipBg: 'rgba(48,209,88,.12)',  chipColor: '#1a8a35' },
                    ].map(({ name, meta, chip, chipBg, chipColor }) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '30px', height: '30px', background: 'rgba(0,0,0,0.05)', borderRadius: '7px', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.1px' }}>{name}</div>
                          <div style={{ fontSize: '12px', color: '#aeaeb2' }}>{meta}</div>
                        </div>
                        <span style={{ padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: chipBg, color: chipColor }}>{chip}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#fafafb', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ padding: '13px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', fontSize: '14px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Channel coverage</div>
                    {[
                      { name: 'Shopify',     pct: 96, color: '#30d158' },
                      { name: 'THE ICONIC',  pct: 88, color: '#1d1d1f' },
                      { name: 'David Jones', pct: 81, color: '#1d1d1f' },
                      { name: 'Myer',        pct: 72, color: '#1d1d1f' },
                      { name: 'JOOR',        pct: 64, color: '#1d1d1f' },
                    ].map(({ name, pct, color }) => (
                      <div key={name} style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '7px' }}>
                          <span style={{ fontWeight: 500, color: '#1d1d1f' }}>{name}</span>
                          <span style={{ color: '#aeaeb2' }}>{pct}%</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '999px', height: '4px' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </ScrollTilt>
        </section>

        {/* ── HOW IT WORKS — animated workflow graph ── */}
        <section id="how-it-works" className="section-pad" style={{ padding: '100px 40px', textAlign: 'center', position: 'relative' }}>
          <Reveal y={14}><p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>How it works</p></Reveal>
          <AnimatedHeading
            as="h2"
            style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 500, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '640px', margin: '0 auto 16px' }}
            segments={[{ text: 'From shoot to', breakAfter: false }, { text: ' every channel.', color: '#8e8e93' }]}
          />
          <Reveal>
            <p style={{ fontSize: '17px', color: '#4a4a4f', maxWidth: '580px', margin: '0 auto 56px', lineHeight: 1.5, letterSpacing: '-.2px' }}>
              Drop your shoot folder. ShotSync clusters, labels, writes, formats, and delivers — to every marketplace, automatically.
            </p>
          </Reveal>
          <WorkflowGraph />
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="section-pad" style={{ padding: '0 40px 100px', position: 'relative' }}>
          <div style={{ maxWidth: 'clamp(1200px,75vw,1440px)', margin: '0 auto' }}>
            <Reveal>
            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden' }}>

              {/* Feature 1: Auto-rename */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,122,255,0.08)', borderRadius: '999px', padding: '4px 10px', fontSize: '15px', fontWeight: 500, color: '#005fc4', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#007aff' }} />
                  Auto-rename
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Files named right. Every time.</h3>
                <p style={{ fontSize: '17px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Configure your naming convention once. ShotSync applies it to every image, every job — no manual renaming, no typos, no rejections.</p>
                <div style={{ marginTop: '28px', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '16px' }}>
                  {[
                    { old: 'IMG_4821.jpg',  neo: 'PR05324.062_FRONT.jpg' },
                    { old: 'IMG_4822.jpg',  neo: 'PR05324.062_BACK.jpg' },
                    { old: 'DSC_0019.jpg',  neo: 'PR06001.034_FRONT.jpg' },
                    { old: 'DSC_0020.jpg',  neo: 'PR06001.034_SIDE.jpg' },
                  ].map(({ old, neo }) => (
                    <div key={old} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: '14px', color: '#aeaeb2', fontFamily: "'SF Mono','Fira Code',monospace", flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{old}</span>
                      <span style={{ fontSize: '14px', color: '#aeaeb2', flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: '14px', color: '#1d1d1f', fontFamily: "'SF Mono','Fira Code',monospace", flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{neo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature 2: AI clustering */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(175,82,222,0.08)', borderRadius: '999px', padding: '4px 10px', fontSize: '15px', fontWeight: 500, color: '#7b2fa0', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#af52de' }} />
                  AI clustering
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Groups images by SKU automatically.</h3>
                <p style={{ fontSize: '17px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Upload a raw, unsorted shoot. The AI clusters every image by product using visual similarity — no manual sorting by your senior staff.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', marginTop: '28px' }}>
                  {([
                    { bg: '#1a1a1a', label: 'Front', figure: null },
                    { bg: '#111111', label: 'Back', figure: null },
                    { bg: '#222222', label: 'Side', figure: null },
                    { bg: '#0d0d0d', label: 'Detail', figure: null },
                  ] as { bg: string; label: string; figure: React.ReactNode }[]).map(({ bg, label, figure }) => (
                    <div key={label} style={{ background: bg, borderRadius: '6px', aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
                      {figure}
                      <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontSize: '8px', fontWeight: 500, color: '#fff', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature 3: Marketplace rules */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,159,10,0.10)', borderRadius: '999px', padding: '4px 10px', fontSize: '15px', fontWeight: 500, color: '#c27800', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff9f0a' }} />
                  Marketplace rules
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>THE ICONIC. Myer. David Jones.</h3>
                <p style={{ fontSize: '17px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Every marketplace has different dimensions, view requirements, and naming rules. ShotSync knows them all and packages output to spec.</p>
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
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f', flex: 1 }}>{name}</span>
                      <span style={{ fontSize: '14px', color: '#aeaeb2', background: 'rgba(0,0,0,0.04)', padding: '2px 7px', borderRadius: '4px' }}>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature 4: CSV catalogue */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(48,209,88,0.10)', borderRadius: '999px', padding: '4px 10px', fontSize: '15px', fontWeight: 500, color: '#1a8a35', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#30d158' }} />
                  CSV catalogue
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Works without Shopify.</h3>
                <p style={{ fontSize: '17px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>Upload your season&apos;s SKU sheet — any format, any columns. ShotSync maps your data and matches images against it automatically. No API required.</p>
                <div style={{ marginTop: '28px', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '16px' }}>
                  {[
                    { style: 'Style', colour: 'Colour', code: 'Code', name: 'Name', isHeader: true },
                    { style: '05324', colour: 'Burgundy', code: '062', name: 'Midi Dress', isHeader: false },
                    { style: '05324', colour: 'Black',    code: '010', name: 'Midi Dress', isHeader: false },
                    { style: '06001', colour: 'Navy',     code: '034', name: 'Wide Leg',   isHeader: false },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '6px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                      {[row.style, row.colour, row.code, row.name].map((cell, j) => (
                        <span key={j} style={{ fontSize: '14px', fontFamily: "'SF Mono','Fira Code',monospace", flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: row.isHeader ? '#aeaeb2' : '#1d1d1f', fontWeight: row.isHeader ? 400 : 500 }}>{cell}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

            </div>
            </Reveal>

            {/* Feature 5: AI Copywriting — full width */}
            <Reveal>
            <div className="ai-copy-feature" style={{ background: '#f0f0f2', padding: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center', borderRadius: '24px', border: '0.5px solid rgba(0,0,0,0.08)', marginTop: '12px', overflow: 'hidden' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', padding: '4px 10px', fontSize: '15px', fontWeight: 500, color: '#6e6e73', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#5e32f5' }} />
                  AI copywriting
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Product listings written in your brand&apos;s voice.</h3>
                <p style={{ fontSize: '17px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.1px' }}>After clustering, ShotSync uses GPT-4o vision to look at your hero image and write a title, description, and bullet points — in your brand&apos;s tone of voice. Paste in a few examples of copy you love and every description will sound like you wrote it. One click, ready to publish.</p>
              </div>
              <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#aeaeb2', letterSpacing: '.06em', textTransform: 'uppercase' }}>Generated copy</div>
                <div>
                  <div style={{ fontSize: '13px', color: '#aeaeb2', marginBottom: '4px' }}>Title</div>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Relaxed Linen Blazer — Tailored, Breathable</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#aeaeb2', marginBottom: '4px' }}>Description</div>
                  <div style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.6 }}>A relaxed-fit blazer in lightweight linen. Clean lapels, a slightly oversized silhouette, and a single-button closure make this a season-spanning layer.</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#aeaeb2', marginBottom: '6px' }}>Bullets</div>
                  {['Relaxed linen blazer with clean lapels', 'Slightly oversized, single-button closure', 'Lightweight woven linen — breathable', 'Wear over a slip dress or with tailored trousers'].map((b) => (
                    <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginBottom: '5px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(48,209,88,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" width="8" height="8"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <span style={{ fontSize: '14px', color: '#6e6e73' }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </Reveal>

          </div>
        </section>

        {/* ── MARKETPLACE LOGOS ── */}
        <section className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <Reveal y={14}><p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '32px' }}>Publish to the channels you already sell on</p></Reveal>
          <Reveal>
          <div className="mp-logos-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 'clamp(860px,65vw,1100px)', margin: '0 auto', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', overflow: 'hidden' }}>
            {[
              { name: 'THE ICONIC', sub: "Australia's largest fashion retailer" },
              { name: 'Myer',       sub: 'PIM direct upload ready' },
              { name: 'David Jones',sub: 'PIM asset management ready' },
            ].map(({ name, sub }, i) => (
              <div key={name} className="mp-logo-cell" style={{ flex: 1, padding: '28px 20px', borderRight: '0.5px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-.2px', color: '#1d1d1f' }}>{name}</div>
                <div style={{ fontSize: '15px', color: '#6e6e73', marginTop: '4px' }}>{sub}</div>
              </div>
            ))}
          </div>
          </Reveal>
        </section>

        {/* ── WHO IT'S FOR ── */}
        <section className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <Reveal y={14}><p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Who it&apos;s for</p></Reveal>
          <AnimatedHeading
            as="h2"
            style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, letterSpacing: '-1.2px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '780px', margin: '0 auto 48px' }}
            segments={[{ text: 'Built for the person responsible for getting product live.' }]}
          />
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', maxWidth: 'clamp(860px,65vw,1100px)', margin: '0 auto' }}>
            {[
              {
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
                title: 'eCommerce coordinators',
                body: 'You receive the product data, build the listings, populate attributes for each channel, and push everything live. ShotSync automates the formatting and delivery — so you can focus on what actually needs your judgment.',
              },
              {
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
                title: 'Emerging DTC brands',
                body: 'No dedicated team, no complex ops setup — just you, a Shopify store, and a product range to get live. ShotSync gives you the listing workflow of a much larger team, at a price built for growing brands.',
              },
              {
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
                title: 'Mid-tier wholesale brands',
                body: "Selling into THE ICONIC, Myer, or David Jones? ShotSync builds your listing once and delivers it to every retailer in their exact required format — so what your partners receive is always compliant and ready to go live.",
              },
            ].map(({ icon, title, body }, i) => (
              <RevealItem key={title} delay={i * 0.1} style={{ background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '16px', padding: '28px 24px', textAlign: 'left' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '0.5px solid rgba(0,0,0,0.07)' }}>
                  {icon}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-.2px', marginBottom: '10px' }}>{title}</div>
                <div style={{ fontSize: '15px', color: '#4a4a4f', lineHeight: 1.7, letterSpacing: '-.1px' }}>{body}</div>
              </RevealItem>
            ))}
          </div>
        </section>


        {/* ── TESTIMONIAL ── */}
        <section className="section-pad" style={{ padding: '0 40px 100px', textAlign: 'center', position: 'relative' }}>
          <Reveal scale={0.985}>
          <div className="testimonial-pad" style={{ maxWidth: '680px', margin: '0 auto', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', padding: '52px 60px' }}>
            <p style={{ fontSize: 'clamp(18px,2.5vw,24px)', fontWeight: 400, letterSpacing: '-.5px', lineHeight: 1.5, color: '#1d1d1f', marginBottom: '32px' }}>
              &ldquo;I used to spend 2–3 days after every shoot building listings for each marketplace separately. ShotSync has automated the entire process&mdash;it&apos;s been a complete game changer for my workflow.&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, color: '#6e6e73', flexShrink: 0 }}>KC</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Kat C.</div>
                <div style={{ fontSize: '13px', color: '#6e6e73' }}>eCommerce Coordinator, fashion brand</div>
              </div>
            </div>
          </div>
          </Reveal>
        </section>


        {/* ── CTA ── */}
        <section className="section-pad" style={{ padding: '0 40px 120px', textAlign: 'center', position: 'relative' }}>
          <Reveal scale={0.98}>
          <div className="cta-pad" style={{ maxWidth: '680px', margin: '0 auto', background: '#1d1d1f', borderRadius: '24px', padding: '72px 60px' }}>
            <AnimatedHeading
              as="h2"
              style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, letterSpacing: '-1.5px', color: '#f5f5f7', lineHeight: 1.1, marginBottom: '16px' }}
              segments={[{ text: 'List once.' }, { text: ' Sell everywhere.', color: 'rgba(245,245,247,0.55)' }]}
            />
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
          </Reveal>
        </section>

        {/* ── FOOTER ── */}
        {/* Not wrapped in <Reveal>: as the last element, its whileInView trigger can
            sit permanently in the negative-margin dead zone and never fire, leaving
            the footer stuck at opacity 0. The footer must always be visible. */}
        <footer className="section-pad" style={{ padding: 'clamp(36px,4vw,60px) 40px', borderTop: '1px solid rgba(0,0,0,0.1)', background: '#f5f5f7', position: 'relative' }}>
          <div className="footer-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1440px', margin: '0 auto' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/icon.png" alt="ShotSync" style={{ width: '28px', height: '28px', borderRadius: '7px' }} />
              <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.3px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#6e6e73' }}>Sync</span></span>
            </Link>
            <div className="footer-links" style={{ display: 'flex', gap: 'clamp(20px,2.5vw,36px)' }}>
              {[
                { label: 'How it works',     href: '#how-it-works' },
                { label: 'Features',         href: '#features' },
                { label: 'Pricing',          href: '/pricing' },
                { label: 'What is ShotSync', href: '/what-is-shotsync' },
                { label: 'FAQ',              href: '/faq' },
                { label: 'Security',         href: '/security' },
                { label: 'Contact',          href: 'mailto:hello@shotsync.ai' },
                { label: 'Privacy',          href: '/privacy' },
              ].map(({ label, href }) => (
                <a key={label} href={href} className="footer-link">{label}</a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <PaymentLogos />
            </div>
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
