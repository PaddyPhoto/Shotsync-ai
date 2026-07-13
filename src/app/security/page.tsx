import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security & Compliance — ShotSync',
  description: 'How ShotSync protects your data and your unreleased product imagery: tenant isolation, client-side image processing, encryption, and SOC 2-compliant infrastructure.',
  alternates: { canonical: 'https://www.shotsync.ai/security' },
}

const HIGHLIGHTS = [
  { title: 'Your imagery stays on your device', body: 'Pre-launch shoots are clustered, renamed and formatted in your browser — not uploaded to our servers as part of the workflow.' },
  { title: 'Every brand is isolated', body: 'Database-level Row-Level Security enforces strict tenant separation — one organisation can never read another’s data.' },
  { title: 'Built on audited infrastructure', body: 'Every layer runs on SOC 2 Type II–certified providers — Supabase, Vercel and Stripe — so we inherit their controls.' },
  { title: 'We never touch card data', body: 'Payments run entirely through Stripe (PCI-DSS Level 1). ShotSync never sees, transmits or stores card details.' },
]

const CONTROLS: { name: string; desc: string; status: 'live' | 'road' }[] = [
  { name: 'Tenant data isolation', desc: 'Postgres Row-Level Security scopes every query to the caller’s organisation across all tables.', status: 'live' },
  { name: 'Encryption in transit', desc: 'TLS on every request; HTTP is redirected to HTTPS and HSTS is enforced site-wide.', status: 'live' },
  { name: 'Encryption at rest', desc: 'Database and file storage encrypted at rest, managed by Supabase and Vercel.', status: 'live' },
  { name: 'Client-side image processing', desc: 'Clustering, renaming, resizing and formatting run in the browser; only the final listings you choose to publish leave your device.', status: 'live' },
  { name: 'Payment security', desc: 'Stripe (PCI-DSS Level 1) handles all billing; webhooks are cryptographically signature-verified.', status: 'live' },
  { name: 'Authentication & MFA', desc: 'Managed authentication via Supabase, with multi-factor authentication available to accounts.', status: 'live' },
  { name: 'Hardened HTTP headers', desc: 'HSTS, MIME-sniffing protection, and referrer & permissions policies applied across the site.', status: 'live' },
  { name: 'Managed backups & monitoring', desc: 'Automated database backups via Supabase; application error monitoring with sensitive-data scrubbing.', status: 'live' },
  { name: 'SOC 2 Type II report', desc: 'Independent audit of our own controls, pursued on top of our already-audited stack.', status: 'road' },
  { name: 'Third-party penetration test', desc: 'Annual external assessment, with a summary letter available under NDA.', status: 'road' },
  { name: 'Single Sign-On (SAML)', desc: 'SSO and directory-based provisioning for enterprise plans.', status: 'road' },
  { name: 'Rate limiting & WAF', desc: 'Expanded abuse protection and a managed web-application firewall at the edge.', status: 'road' },
]

const SUBPROCESSORS = [
  { p: 'Supabase', purpose: 'Database, authentication & file storage', data: 'Account & product data', cert: 'SOC 2 Type II' },
  { p: 'Vercel', purpose: 'Application hosting, CDN & edge', data: 'Requests & operational logs', cert: 'SOC 2 Type II' },
  { p: 'Stripe', purpose: 'Payment processing', data: 'Billing details (no card data stored by ShotSync)', cert: 'PCI-DSS L1 · SOC 2' },
  { p: 'OpenAI', purpose: 'AI product copy generation', data: 'Product attributes & prompts', cert: 'SOC 2 Type II' },
  { p: 'Sentry', purpose: 'Error monitoring', data: 'Diagnostic data (PII-scrubbed)', cert: 'SOC 2 Type II' },
]

export default function SecurityPage() {
  return (
    <>
      <style>{`
        .nav-link { font-size:13px;color:#6e6e73;text-decoration:none;letter-spacing:-.1px;transition:color .15s; }
        .nav-link:hover { color:#1d1d1f; }
        .footer-link { font-size:14px;color:#6e6e73;text-decoration:none;letter-spacing:-.1px;transition:color .15s; }
        .footer-link:hover { color:#1d1d1f; }
        .sec-pill { font-size:11px;font-weight:600;letter-spacing:.02em;padding:4px 11px;border-radius:999px;white-space:nowrap;display:inline-flex;align-items:center;gap:6px; }
        .sec-pill .d { width:6px;height:6px;border-radius:50%;flex-shrink:0; }
        .sec-pill.live { color:#1a8a35;background:rgba(48,209,88,0.12); }
        .sec-pill.live .d { background:#30d158; }
        .sec-pill.road { color:#8a5a00;background:rgba(255,159,10,0.13); }
        .sec-pill.road .d { background:#ff9f0a; }
        @media (max-width:767px){
          .sec-nav-links { display:none !important; }
          .sec-pad { padding-left:20px !important; padding-right:20px !important; }
          .sec-highlights { grid-template-columns:1fr !important; }
          .sec-row { grid-template-columns:1fr !important; }
          .sec-row .sec-pill { justify-self:start; }
          .sec-footer-inner { flex-direction:column !important; align-items:flex-start !important; gap:16px !important; }
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
          <div className="sec-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <a href="/#how-it-works" className="nav-link">How it works</a>
            <a href="/#features" className="nav-link">Features</a>
            <Link href="/pricing" className="nav-link">Pricing</Link>
          </div>
          <Link href="/login" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, letterSpacing: '-.2px', textDecoration: 'none' }}>Sign in</Link>
        </nav>

        <main className="sec-pad" style={{ maxWidth: '860px', margin: '0 auto', padding: '72px 40px 100px' }}>
          {/* Header */}
          <div style={{ height: '3px', width: '54px', borderRadius: '3px', background: 'linear-gradient(90deg,#30d158,#007aff 50%,#af52de)', marginBottom: '26px' }} />
          <p style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6e6e73', marginBottom: '14px' }}>Security &amp; Compliance</p>
          <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 600, letterSpacing: '-1.5px', lineHeight: 1.05, margin: '0 0 18px', maxWidth: '15ch' }}>How we protect your data and your unreleased imagery.</h1>
          <p style={{ fontSize: '18px', color: '#4a4a4f', lineHeight: 1.5, maxWidth: '58ch', margin: 0 }}>ShotSync turns raw fashion shoots into channel-ready product listings. Here are the security controls we operate today and the compliance work on our roadmap.</p>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', marginTop: '32px', padding: '14px 18px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', fontSize: '13px', color: '#6e6e73' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#30d158' }} /> <b style={{ color: '#1d1d1f', fontWeight: 600 }}>Live</b> — in place today</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff9f0a' }} /> <b style={{ color: '#1d1d1f', fontWeight: 600 }}>On roadmap</b> — planned, not yet in place</span>
          </div>

          {/* Highlights */}
          <div className="sec-highlights" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '44px' }}>
            {HIGHLIGHTS.map(h => (
              <div key={h.title} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px', padding: '22px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-.3px', margin: '0 0 7px' }}>{h.title}</h3>
                <p style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.5, margin: 0 }}>{h.body}</p>
              </div>
            ))}
          </div>

          {/* Controls */}
          <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-.5px', margin: '56px 0 20px', paddingBottom: '12px', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>Security controls</h2>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
            {CONTROLS.map((c, i) => (
              <div key={c.name} className="sec-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px 16px', padding: '16px 20px', alignItems: 'start', borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.07)' }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.2px', margin: '0 0 3px' }}>{c.name}</p>
                  <p style={{ fontSize: '13.5px', color: '#6e6e73', lineHeight: 1.5, margin: 0, maxWidth: '62ch' }}>{c.desc}</p>
                </div>
                <span className={`sec-pill ${c.status}`}><span className="d" />{c.status === 'live' ? 'Live' : 'On roadmap'}</span>
              </div>
            ))}
          </div>

          {/* Data handling callout */}
          <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-.5px', margin: '56px 0 20px', paddingBottom: '12px', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>How we handle your data</h2>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: 'clamp(22px,4vw,34px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '3px', background: 'linear-gradient(#30d158,#007aff,#af52de)' }} />
            <p style={{ fontSize: 'clamp(19px,2.6vw,25px)', fontWeight: 600, letterSpacing: '-.5px', lineHeight: 1.25, margin: '0 0 14px', maxWidth: '24ch' }}>Your unreleased imagery never leaves your device by default.</p>
            <p style={{ fontSize: '14.5px', color: '#4a4a4f', lineHeight: 1.6, margin: '0 0 10px', maxWidth: '64ch' }}>ShotSync was built for brands working with product imagery that hasn&apos;t launched yet. The workflow — grouping images into products, labelling angles, renaming, resizing and formatting for each destination — runs entirely in your browser.</p>
            <p style={{ fontSize: '14.5px', color: '#4a4a4f', lineHeight: 1.6, margin: 0, maxWidth: '64ch' }}>The only images that leave your device are the final, formatted listings you explicitly choose to publish to a platform you&apos;ve connected. Raw and pre-launch shoots are never uploaded to ShotSync&apos;s servers as part of processing.</p>
          </div>

          {/* Sub-processors */}
          <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-.5px', margin: '56px 0 20px', paddingBottom: '12px', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>Sub-processors</h2>
          <div style={{ overflowX: 'auto', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', minWidth: '560px' }}>
              <thead>
                <tr>
                  {['Provider', 'Purpose', 'Data handled', 'Compliance'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '13px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.08em', color: '#9296a0', fontWeight: 600, borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUBPROCESSORS.map((s, i) => (
                  <tr key={s.p}>
                    <td style={{ padding: '13px 16px', fontWeight: 600, borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.07)' }}>{s.p}</td>
                    <td style={{ padding: '13px 16px', color: '#4a4a4f', borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.07)' }}>{s.purpose}</td>
                    <td style={{ padding: '13px 16px', color: '#4a4a4f', borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.07)' }}>{s.data}</td>
                    <td style={{ padding: '13px 16px', fontFamily: "'SF Mono',ui-monospace,monospace", fontSize: '12px', color: '#1a8a35', borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.07)' }}>{s.cert}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '13px', color: '#9296a0', marginTop: '12px', lineHeight: 1.5 }}>Our current sub-processor list. A signed Data Processing Agreement (DPA) is available on request — email <a href="mailto:hello@shotsync.ai" style={{ color: '#1a8a35', fontWeight: 500 }}>hello@shotsync.ai</a>.</p>
        </main>

        {/* Footer */}
        <footer className="sec-pad" style={{ padding: 'clamp(36px,4vw,60px) 40px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <div className="sec-footer-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1440px', margin: '0 auto' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/icon.png" alt="ShotSync" style={{ width: '28px', height: '28px', borderRadius: '7px' }} />
              <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.3px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#6e6e73' }}>Sync</span></span>
            </Link>
            <div style={{ display: 'flex', gap: 'clamp(20px,2.5vw,36px)', flexWrap: 'wrap' }}>
              <Link href="/pricing" className="footer-link">Pricing</Link>
              <Link href="/faq" className="footer-link">FAQ</Link>
              <Link href="/security" className="footer-link">Security</Link>
              <Link href="/privacy" className="footer-link">Privacy</Link>
              <a href="mailto:hello@shotsync.ai" className="footer-link">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
