'use client'

import Link from 'next/link'

export default function LandingPage() {
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
        .footer-link { font-size:12px;color:#aeaeb2;text-decoration:none;letter-spacing:-.1px;transition:color .15s; }
        .footer-link:hover { color:#1d1d1f; }
        .price-cta-btn { display:block;text-align:center;margin-top:24px;padding:10px;border-radius:8px;font-size:13px;font-weight:500;letter-spacing:-.2px;text-decoration:none;transition:opacity .15s;background:rgba(0,0,0,0.06);color:#1d1d1f; }
        .price-cta-btn:hover { opacity:.8; }
        .price-cta-btn.featured { background:#fff;color:#1d1d1f; }
        .mp-logo-cell:last-child { border-right: none !important; }
        .hero-stat-cell:last-child { border-right: none !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f5f5f7', color: '#1d1d1f', fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif", WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>

        {/* ── NAV ── */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 40px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245,245,247,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
            <div style={{ width: '24px', height: '24px', background: '#1d1d1f', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-.3px', color: '#1d1d1f' }}>Shot<span style={{ color: '#6e6e73' }}>Sync</span></span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="mailto:hello@shotsync.ai" className="nav-link">Contact</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link href="/login" className="nav-link">Sign in</Link>
            <a href="#pricing" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, letterSpacing: '-.2px', textDecoration: 'none' }}>
            Get early access
            </a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 40px 80px', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '999px', padding: '5px 14px', fontSize: '12px', fontWeight: 500, color: '#6e6e73', letterSpacing: '-.1px', marginBottom: '28px' }}>
            <span className="eyebrow-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158', flexShrink: 0 }} />
            Now in early access — ANZ fashion brands
          </div>
          <h1 className="hero-h1" style={{ fontSize: 'clamp(44px,7vw,80px)', fontWeight: 500, letterSpacing: '-2px', lineHeight: 1.05, color: '#1d1d1f', maxWidth: '820px', marginBottom: '24px' }}>
            Post-production.<br/><span style={{ color: '#6e6e73' }}>On autopilot.</span>
          </h1>
          <p className="hero-sub" style={{ fontSize: 'clamp(17px,2.2vw,21px)', color: '#6e6e73', maxWidth: '520px', lineHeight: 1.5, letterSpacing: '-.3px', marginBottom: '44px' }}>
            Upload your shoot. ShotSync clusters, names, resizes, and exports marketplace-ready images — automatically.
          </p>
          <div className="hero-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#pricing" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Request early access
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a href="#how-it-works" style={{ background: '#fff', color: '#1d1d1f', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', border: '0.5px solid rgba(0,0,0,0.08)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              See how it works
            </a>
          </div>

          {/* Stats bar */}
          <div className="hero-stats" style={{ display: 'flex', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', marginTop: '64px', overflow: 'hidden' }}>
            {[
              { value: '2–3 days', label: 'Manual post-production', color: '#1d1d1f' },
              { value: '25 min',   label: 'With ShotSync',          color: '#30d158' },
              { value: '500+',     label: 'Images per job',         color: '#1d1d1f' },
              { value: '3',        label: 'ANZ marketplaces',       color: '#1d1d1f' },
            ].map(({ value, label, color }, i) => (
              <div key={i} className="hero-stat-cell" style={{ padding: '24px 36px', textAlign: 'center', borderRight: '0.5px solid rgba(0,0,0,0.08)', flex: 1 }}>
                <div style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-1px', color, marginBottom: '4px', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '12px', color: '#aeaeb2', letterSpacing: '-.1px' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── APP MOCKUP ── */}
        <section style={{ padding: '0 40px 100px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '1000px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)' }}>
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
            <div style={{ display: 'flex', height: '420px' }}>
              {/* Sidebar */}
              <div style={{ width: '180px', minWidth: '180px', background: 'rgba(248,248,250,0.9)', borderRight: '0.5px solid rgba(0,0,0,0.05)', padding: '16px 10px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 8px', marginBottom: '16px' }}>
                  <div style={{ width: '20px', height: '20px', background: '#1d1d1f', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" strokeWidth="2.5" width="10" height="10"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '-.2px' }}>Shot<span style={{ color: '#aeaeb2' }}>Sync</span></span>
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
        <section id="how-it-works" style={{ padding: '100px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#aeaeb2', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>How it works</p>
          <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 500, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '600px', margin: '0 auto 16px' }}>Three steps. Zero manual work.</h2>
          <p style={{ fontSize: '17px', color: '#6e6e73', maxWidth: '480px', margin: '0 auto 64px', lineHeight: 1.5, letterSpacing: '-.2px' }}>
            Drop your shoot. ShotSync handles everything between the photographer&apos;s delivery and your marketplace upload.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', maxWidth: '900px', margin: '0 auto' }}>
            {[
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
                title: 'Upload your shoot',
                desc: 'Drop up to 1,000 images. ShotSync ingests, reads your CSV catalogue, and starts the pipeline immediately.',
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>,
                title: 'AI does the work',
                desc: 'Images are clustered by SKU, angles detected, colours matched, files renamed — all automatically, with confidence scoring.',
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
                <p style={{ fontSize: '13px', color: '#6e6e73', lineHeight: 1.6, letterSpacing: '-.1px' }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" style={{ padding: '0 40px 100px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden' }}>

              {/* Feature 1: Auto-rename */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.04)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 500, color: '#6e6e73', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#aeaeb2' }} />
                  Auto-rename
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Files named right. Every time.</h3>
                <p style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.6, letterSpacing: '-.1px' }}>Configure your naming convention once. ShotSync applies it to every image, every job — no manual renaming, no typos, no rejections.</p>
                <div style={{ marginTop: '28px', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '16px' }}>
                  {[
                    { old: 'IMG_4821.jpg',  neo: 'PR05324.062_FRONT.jpg' },
                    { old: 'IMG_4822.jpg',  neo: 'PR05324.062_BACK.jpg' },
                    { old: 'DSC_0019.jpg',  neo: 'PR06001.034_FRONT.jpg' },
                    { old: 'DSC_0020.jpg',  neo: 'PR06001.034_SIDE.jpg' },
                  ].map(({ old, neo }) => (
                    <div key={old} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: '11px', color: '#aeaeb2', fontFamily: "'SF Mono','Fira Code',monospace", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{old}</span>
                      <span style={{ fontSize: '12px', color: '#aeaeb2', flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: '11px', color: '#1d1d1f', fontFamily: "'SF Mono','Fira Code',monospace", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{neo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature 2: AI clustering */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.04)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 500, color: '#6e6e73', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0071e3' }} />
                  AI clustering
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Groups images by SKU automatically.</h3>
                <p style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.6, letterSpacing: '-.1px' }}>Upload a raw, unsorted shoot. The AI clusters every image by product using visual similarity — no manual sorting by your senior staff.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', marginTop: '28px' }}>
                  {[
                    { bg: '#1a1a1a', label: 'Front',  conf: '97%' },
                    { bg: '#111111', label: 'Back',   conf: '94%' },
                    { bg: '#222222', label: 'Side',   conf: '88%' },
                    { bg: '#0d0d0d', label: 'Detail', conf: '91%' },
                  ].map(({ bg, label, conf }) => (
                    <div key={label} style={{ background: bg, borderRadius: '6px', aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontSize: '8px', fontWeight: 500, color: '#fff', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
                      <div style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(48,209,88,.2)', borderRadius: '3px', fontSize: '8px', fontWeight: 500, color: '#1a8a35', padding: '1px 4px' }}>{conf}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature 3: Marketplace rules */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.04)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 500, color: '#6e6e73', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff9f0a' }} />
                  Marketplace rules
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>THE ICONIC. Myer. David Jones.</h3>
                <p style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.6, letterSpacing: '-.1px' }}>Every marketplace has different dimensions, view requirements, and naming rules. ShotSync knows them all and packages output to spec.</p>
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
                      <span style={{ fontSize: '10px', color: '#aeaeb2', background: 'rgba(0,0,0,0.04)', padding: '2px 7px', borderRadius: '4px' }}>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature 4: CSV catalogue */}
              <div style={{ background: '#fff', padding: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.04)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 500, color: '#6e6e73', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#30d158' }} />
                  CSV catalogue
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-.5px', marginBottom: '10px', color: '#1d1d1f' }}>Works without Shopify.</h3>
                <p style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.6, letterSpacing: '-.1px' }}>Upload your season&apos;s SKU sheet — any format, any columns. ShotSync maps your data and matches images against it automatically. No API required.</p>
                <div style={{ marginTop: '28px', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '16px' }}>
                  {[
                    { style: 'Style', colour: 'Colour', code: 'Code', name: 'Name', isHeader: true },
                    { style: '05324', colour: 'Burgundy', code: '062', name: 'Midi Dress', isHeader: false },
                    { style: '05324', colour: 'Black',    code: '010', name: 'Midi Dress', isHeader: false },
                    { style: '06001', colour: 'Navy',     code: '034', name: 'Wide Leg',   isHeader: false },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '6px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                      {[row.style, row.colour, row.code, row.name].map((cell, j) => (
                        <span key={j} style={{ fontSize: '11px', fontFamily: "'SF Mono','Fira Code',monospace", flex: 1, color: row.isHeader ? '#aeaeb2' : '#1d1d1f', fontWeight: row.isHeader ? 400 : 500 }}>{cell}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── MARKETPLACE LOGOS ── */}
        <section style={{ padding: '0 40px 100px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#aeaeb2', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '32px' }}>Built for ANZ&apos;s top fashion marketplaces</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '700px', margin: '0 auto', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '18px', overflow: 'hidden' }}>
            {[
              { name: 'THE ICONIC', sub: "Australia's largest fashion retailer" },
              { name: 'Myer',       sub: 'PIM direct upload ready' },
              { name: 'David Jones',sub: 'PIM asset management ready' },
            ].map(({ name, sub }, i) => (
              <div key={name} className="mp-logo-cell" style={{ flex: 1, padding: '28px 20px', borderRight: '0.5px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-.2px', color: '#1d1d1f' }}>{name}</div>
                <div style={{ fontSize: '11px', color: '#aeaeb2', marginTop: '4px' }}>{sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" style={{ padding: '0 40px 100px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#aeaeb2', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Pricing</p>
          <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 500, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '600px', margin: '0 auto 16px' }}>Simple, transparent pricing.</h2>
          <p style={{ fontSize: '17px', color: '#6e6e73', maxWidth: '480px', margin: '0 auto 64px', lineHeight: 1.5, letterSpacing: '-.2px' }}>Early access customers lock in their price for life.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', maxWidth: '960px', margin: '0 auto' }}>
            {[
              {
                badge: 'Free', name: 'Starter', amount: '$0', period: 'forever',
                features: ['Up to 50 images per export', '3 exports per month', '1 marketplace', '1 brand, 1 seat'],
                cta: 'Get started', href: '/signup', featured: false,
              },
              {
                badge: 'Early access', name: 'Brand', amount: '$79', period: 'AUD / month',
                features: ['500 images / month', '2 marketplaces', '1 brand · 1 Shopify store', 'Email support'],
                cta: 'Request access', href: 'mailto:hello@shotsync.ai', featured: false,
              },
              {
                badge: 'Most popular', name: 'Studio', amount: '$179', period: 'AUD / month',
                features: ['2,000 images / month', 'All 3 ANZ marketplaces', '3 brands · custom naming', 'Priority + onboarding call'],
                cta: 'Request access', href: 'mailto:hello@shotsync.ai', featured: true,
              },
              {
                badge: 'Scale', name: 'Enterprise', amount: 'Contact', period: 'custom pricing',
                features: ['Unlimited images', 'Unlimited brands', 'SSO · SLA · dedicated CSM', 'Invoiced billing'],
                cta: 'Get in touch', href: 'mailto:hello@shotsync.ai', featured: false,
              },
            ].map(({ badge, name, amount, period, features, cta, href, featured }) => (
              <div key={name} style={{ background: featured ? '#1d1d1f' : '#fff', padding: '32px 28px', textAlign: 'left', position: 'relative' }}>
                <div style={{ display: 'inline-block', background: featured ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)', borderRadius: '999px', padding: '4px 10px', fontSize: '10px', fontWeight: 500, color: featured ? 'rgba(255,255,255,0.7)' : '#6e6e73', marginBottom: '20px', letterSpacing: '-.1px' }}>{badge}</div>
                <div style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '-.4px', color: featured ? '#fff' : '#1d1d1f', marginBottom: '6px' }}>{name}</div>
                <div style={{ fontSize: amount === 'Contact' ? '28px' : '36px', fontWeight: 500, letterSpacing: '-1.5px', color: featured ? '#fff' : '#1d1d1f', lineHeight: 1, marginBottom: '4px' }}>{amount}</div>
                <div style={{ fontSize: '13px', color: featured ? 'rgba(255,255,255,0.5)' : '#aeaeb2', marginBottom: '24px', letterSpacing: '-.1px' }}>{period}</div>
                <div style={{ height: '0.5px', background: featured ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', marginBottom: '20px' }} />
                {features.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px', fontSize: '13px', color: featured ? 'rgba(255,255,255,0.7)' : '#6e6e73', letterSpacing: '-.1px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: featured ? 'rgba(48,209,88,.2)' : 'rgba(48,209,88,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" width="8" height="8"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    {f}
                  </div>
                ))}
                <Link href={href} className={`price-cta-btn${featured ? ' featured' : ''}`}>{cta}</Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIAL ── */}
        <section style={{ padding: '0 40px 100px', textAlign: 'center' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', padding: '52px 60px' }}>
            <p style={{ fontSize: 'clamp(18px,2.5vw,24px)', fontWeight: 400, letterSpacing: '-.5px', lineHeight: 1.5, color: '#1d1d1f', marginBottom: '32px' }}>
              &ldquo;I spend 2–3 days after every shoot just renaming files and uploading to portals. If ShotSync does what it says, that&apos;s genuinely the most painful part of my job gone.&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, color: '#6e6e73', flexShrink: 0 }}>KC</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px' }}>Kat C.</div>
                <div style={{ fontSize: '12px', color: '#aeaeb2' }}>eCommerce Coordinator, ANZ fashion brand</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ padding: '0 40px 120px', textAlign: 'center' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', background: '#1d1d1f', borderRadius: '24px', padding: '72px 60px' }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, letterSpacing: '-1.5px', color: '#f5f5f7', lineHeight: 1.1, marginBottom: '16px' }}>Shoot. Sync. Done.</h2>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.6)', marginBottom: '36px', letterSpacing: '-.2px', lineHeight: 1.5 }}>Join the early access program. Lock in your price for life.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="mailto:hello@shotsync.ai" style={{ background: '#fff', color: '#1d1d1f', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none' }}>
                Request early access
              </a>
              <a href="mailto:hello@shotsync.ai" style={{ background: 'transparent', color: 'rgba(255,255,255,0.8)', padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, letterSpacing: '-.3px', textDecoration: 'none', border: '0.5px solid rgba(255,255,255,0.2)' }}>
                hello@shotsync.ai
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ padding: '40px', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '20px', height: '20px', background: '#1d1d1f', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" strokeWidth="2.5" width="10" height="10"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '-.2px', color: '#1d1d1f' }}>Shot<span style={{ color: '#aeaeb2' }}>Sync</span></span>
          </Link>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'How it works', href: '#how-it-works' },
              { label: 'Features',     href: '#features' },
              { label: 'Pricing',      href: '#pricing' },
              { label: 'Contact',      href: 'mailto:hello@shotsync.ai' },
              { label: 'Privacy',      href: '/privacy' },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="footer-link">{label}</a>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#aeaeb2' }}>© 2026 ShotSync.ai</p>
        </footer>

      </div>
    </>
  )
}
