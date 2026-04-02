import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--line)]">
        <div className="flex items-center gap-[10px]">
          <div className="w-8 h-8 bg-[var(--accent)] rounded-[8px] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="black">
              <rect x="2" y="2" width="5" height="7" rx="1"/>
              <rect x="9" y="2" width="5" height="5" rx="1"/>
              <rect x="9" y="9" width="5" height="5" rx="1"/>
              <rect x="2" y="11" width="5" height="3" rx="1"/>
            </svg>
          </div>
          <span className="text-[1.2rem] font-[800] tracking-[-0.5px]" style={{ fontFamily: 'var(--font-syne)' }}>
            Frames<span style={{ color: 'var(--accent)' }}>Ops</span><span style={{ color: 'var(--text3)' }}>.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[rgba(232,217,122,0.08)] border border-[rgba(232,217,122,0.2)] rounded-[20px] px-4 py-[6px] text-[0.75rem] text-[var(--accent)] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Fashion Post-Production, Automated
        </div>

        <h1
          className="text-[3.5rem] font-[800] tracking-[-2px] text-[var(--text)] leading-[1.05] mb-6 max-w-[680px]"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          From shoot to marketplace,
          <span style={{ color: 'var(--accent)' }}> in minutes.</span>
        </h1>

        <p className="text-[1rem] text-[var(--text2)] max-w-[480px] leading-relaxed mb-10">
          Upload 1000 product images. AI groups them by SKU, detects angles, renames everything,
          and exports marketplace-ready sets for THE ICONIC, Myer, and David Jones.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/signup" className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
            Start Free Trial
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link href="/dashboard/upload" className="btn btn-ghost" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
            See a Demo
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-4 mt-20 max-w-[840px] w-full text-left">
          {[
            {
              icon: '✦',
              color: 'var(--accent)',
              title: 'AI Grouping',
              desc: 'Visual similarity clustering groups images by product automatically — no manual sorting.',
            },
            {
              icon: '◈',
              color: 'var(--accent2)',
              title: 'Angle Detection',
              desc: 'Front, back, side, and detail shots automatically classified for every cluster.',
            },
            {
              icon: '⬡',
              color: 'var(--accent4)',
              title: 'Multi-marketplace Export',
              desc: 'Resize, crop, and name images per THE ICONIC, Myer, and David Jones specs.',
            },
            {
              icon: '⊞',
              color: 'var(--accent)',
              title: 'Shopify Integration',
              desc: 'Pull your product catalogue and confirm SKU matches in one click.',
            },
            {
              icon: '⊿',
              color: 'var(--accent3)',
              title: 'Missing Shot Alerts',
              desc: 'Instantly see which products are missing required angles per marketplace.',
            },
            {
              icon: '≡',
              color: 'var(--accent2)',
              title: 'Auto Rename',
              desc: 'Structured naming like BRAND_SKU_COLOR_VIEW.jpg applied across every image.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-[var(--bg2)] border border-[var(--line)] rounded-md p-5 hover:border-[var(--line2)] transition-colors">
              <span className="text-xl mb-3 block" style={{ color: f.color }}>{f.icon}</span>
              <p className="text-[0.9rem] font-semibold text-[var(--text)] mb-2">{f.title}</p>
              <p className="text-[0.78rem] text-[var(--text3)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] px-8 py-5 flex items-center justify-between text-[0.75rem] text-[var(--text3)]">
        <span>© 2025 FramesOps.ai</span>
        <span>Built for fashion eCommerce teams</span>
      </footer>
    </div>
  )
}
