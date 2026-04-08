'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  const [annual, setAnnual] = useState(true)
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--line)]">
        <div className="flex items-center gap-[10px]">
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center"
            style={{ background: 'var(--accent-deep)', boxShadow: '0 0 16px rgba(26,79,255,0.4)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </div>
          <span className="text-[1.1rem] font-bold tracking-[-0.5px]" style={{ fontFamily: 'var(--font-display)' }}>
            Shot<span style={{ color: 'var(--accent)' }}>Sync</span><span style={{ color: 'var(--text3)', fontWeight: 300 }}>.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Create Free Account</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[rgba(74,158,255,0.08)] border border-[rgba(74,158,255,0.2)] rounded-[20px] px-4 py-[6px] text-[0.75rem] text-[var(--accent)] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Fashion Post-Production, Automated
        </div>

        <h1
          className="text-[3.5rem] font-[800] tracking-[-2px] text-[var(--text)] leading-[1.05] mb-6 max-w-[680px]"
          style={{ fontFamily: 'var(--font-display)' }}
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
            Get Started Free
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* Stat claims */}
        <div className="flex items-center gap-8 mt-10 flex-wrap justify-center">
          {[
            { stat: '500+', label: 'images exported per job' },
            { stat: '3 hrs', label: 'saved per shoot session' },
            { stat: '4', label: 'marketplaces in one export' },
          ].map(({ stat, label }) => (
            <div key={stat} className="flex flex-col items-center">
              <span className="text-[1.8rem] font-[800] tracking-[-1px]" style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{stat}</span>
              <span className="text-[0.75rem] text-[var(--text3)]">{label}</span>
            </div>
          ))}
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

      {/* Marketplace logos bar */}
      <div className="border-y border-[var(--line)] px-8 py-10 flex flex-col items-center bg-[var(--bg2)]">
        <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--text3)] font-semibold mb-8">
          Export ready for Australia&apos;s leading fashion platforms
        </p>
        <div className="flex items-center justify-center gap-12 flex-wrap">
          {[
            { name: 'THE ICONIC', sub: 'Australia & NZ' },
            { name: 'MYER', sub: 'Department Store' },
            { name: 'DAVID JONES', sub: 'Department Store' },
            { name: 'SHOPIFY', sub: 'eCommerce' },
          ].map(({ name, sub }) => (
            <div key={name} className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
              <span className="text-[1rem] font-[800] tracking-[-0.3px] text-[var(--text)]" style={{ fontFamily: 'var(--font-display)' }}>{name}</span>
              <span className="text-[0.62rem] text-[var(--text3)] uppercase tracking-[0.08em]">{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="px-8 py-24 flex flex-col items-center border-b border-[var(--line)]">
        <p className="text-[0.75rem] text-[var(--accent)] uppercase tracking-[0.1em] font-semibold mb-3">How it works</p>
        <h2
          className="text-[2.2rem] font-[800] tracking-[-1px] text-[var(--text)] mb-4 text-center"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          From folder to marketplace in 3 steps
        </h2>
        <p className="text-[0.9rem] text-[var(--text3)] mb-16 text-center max-w-[480px]">
          No retouching knowledge required. No manual renaming. No spreadsheets.
        </p>

        <div className="grid grid-cols-3 gap-6 max-w-[860px] w-full relative">
          {/* Connector line */}
          <div className="absolute top-[28px] left-[calc(16.666%+20px)] right-[calc(16.666%+20px)] h-[1px] bg-[var(--line2)] hidden md:block" />

          {[
            {
              step: '01',
              color: 'var(--accent)',
              title: 'Upload your shoot folder',
              desc: 'Drop in your retouched images. ShotSync reads the filenames, sorts by sequence, and groups images into product clusters automatically.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              ),
            },
            {
              step: '02',
              color: 'var(--accent2)',
              title: 'Review & assign SKUs',
              desc: 'Check the clusters, fix any grouping issues with drag and drop, assign SKU codes from your range list, and confirm each product.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              ),
            },
            {
              step: '03',
              color: 'var(--accent4)',
              title: 'Export to all marketplaces',
              desc: 'Select your marketplaces. ShotSync resizes, crops, renames every image per retailer spec, and downloads a ready-to-upload ZIP.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              ),
            },
          ].map(({ step, color, title, desc, icon }) => (
            <div key={step} className="flex flex-col items-center text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-5 relative z-10"
                style={{ background: `rgba(${color === 'var(--accent)' ? '232,217,122' : color === 'var(--accent2)' ? '62,207,142' : '122,180,232'},0.1)`, border: `1px solid rgba(${color === 'var(--accent)' ? '232,217,122' : color === 'var(--accent2)' ? '62,207,142' : '122,180,232'},0.25)`, color }}
              >
                {icon}
              </div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] mb-2" style={{ color }}>{step}</p>
              <p className="text-[0.95rem] font-semibold text-[var(--text)] mb-3">{title}</p>
              <p className="text-[0.78rem] text-[var(--text3)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-3">
          <Link href="/signup" className="btn btn-primary" style={{ padding: '10px 28px', fontSize: '0.9rem' }}>
            Try it free — no credit card needed
          </Link>
          <p className="text-[0.72rem] text-[var(--text3)]">Set up in under 2 minutes</p>
        </div>
      </div>

      {/* Outcomes */}
      <div className="px-8 py-20 flex flex-col items-center border-b border-[var(--line)] bg-[var(--bg2)]">
        <p className="text-[0.72rem] text-[var(--accent)] uppercase tracking-[0.12em] font-semibold mb-3">The outcome</p>
        <h2
          className="text-[2rem] font-[800] tracking-[-1px] text-[var(--text)] mb-14 text-center max-w-[560px]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Three days of post-production work. Automated in 25 minutes.
        </h2>
        <div className="grid grid-cols-2 gap-5 max-w-[700px] w-full">
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              ),
              color: 'var(--accent)',
              heading: "3-day job done in 25 minutes",
              body: "From folder drop to marketplace-ready ZIPs — no spreadsheets, no manual renaming, no back-and-forth.",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ),
              color: 'var(--accent2)',
              heading: "Zero marketplace rejections",
              body: "Every image exported to exact retailer spec — correct dimensions, naming convention, and required angles confirmed.",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              ),
              color: 'var(--accent4)',
              heading: "Products live before the window closes",
              body: "Stop racing deadlines. Launch-ready assets delivered while the shoot is still fresh.",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              ),
              color: 'var(--accent3)',
              heading: "No more missed seasons",
              body: "Post-production no longer the bottleneck. Your range hits the floor on time, every time.",
            },
          ].map(({ icon, color, heading, body }) => (
            <div key={heading} className="flex gap-4 bg-[var(--bg)] border border-[var(--line)] rounded-md p-5">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 mt-[2px]"
                style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
              >
                {icon}
              </div>
              <div>
                <p className="text-[0.88rem] font-semibold text-[var(--text)] mb-1">{heading}</p>
                <p className="text-[0.77rem] text-[var(--text3)] leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="px-8 py-24 flex flex-col items-center border-t border-[var(--line)]">
        <p className="text-[0.75rem] text-[var(--accent)] uppercase tracking-[0.1em] font-semibold mb-3">Pricing</p>
        <h2
          className="text-[2.2rem] font-[800] tracking-[-1px] text-[var(--text)] mb-4 text-center"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Simple, transparent pricing
        </h2>
        <p className="text-[0.9rem] text-[var(--text3)] mb-8 text-center">
          Start free. Upgrade as you grow. All prices in AUD.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center gap-3 mb-12">
          <span className={`text-[0.85rem] transition-colors ${!annual ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>Monthly</span>
          <button
            onClick={() => setAnnual((v) => !v)}
            className="relative w-[48px] h-[26px] rounded-full transition-colors"
            style={{ background: annual ? 'var(--accent)' : 'var(--bg4)' }}
          >
            <span
              className="absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow transition-all duration-200"
              style={{ left: annual ? '25px' : '3px' }}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[0.85rem] transition-colors ${annual ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>Annual</span>
            <span className="text-[0.68rem] font-semibold bg-[rgba(62,207,142,0.12)] text-[var(--accent2)] px-2 py-[2px] rounded-full">
              Save up to 21%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 max-w-[1100px] w-full">
          {([
            {
              id: 'free',
              name: 'Free',
              monthly: '$0',
              annualMonthly: '$0',
              annualTotal: null,
              color: 'var(--text3)',
              popular: false,
              features: ['1 job only', 'Up to 50 images', '1 marketplace', 'Watermarked exports', '1 seat'],
              forNote: 'Try the workflow',
              cta: 'Get Started Free',
              ctaStyle: 'btn-ghost',
            },
            {
              id: 'starter',
              name: 'Starter',
              monthly: '$99',
              annualMonthly: '$79',
              annualTotal: '$948',
              color: 'var(--accent2)',
              popular: false,
              features: ['Up to 500 images/upload', '1 brand', '2 ANZ marketplaces', '2 seats', '1 Shopify store', 'Email support'],
              forNote: 'Small brands',
              cta: 'Start with Starter',
              ctaStyle: 'btn-ghost',
            },
            {
              id: 'brand',
              name: 'Brand',
              monthly: '$249',
              annualMonthly: '$199',
              annualTotal: '$2,388',
              color: 'var(--accent)',
              popular: true,
              features: ['Up to 2,000 images/upload', '3 brands', 'All ANZ marketplaces', '5 seats', '3 Shopify stores', 'Custom naming', 'Onboarding call'],
              forNote: '100–200 SKUs/month',
              cta: 'Start with Brand',
              ctaStyle: 'btn-primary',
            },
            {
              id: 'scale',
              name: 'Scale',
              monthly: '$499',
              annualMonthly: '$399',
              annualTotal: '$4,788',
              color: 'var(--accent4)',
              popular: false,
              features: ['Up to 5,000 images/upload', '10 brands', 'All ANZ marketplaces', '10 seats', 'Unlimited Shopify', 'Priority processing', 'Dedicated support'],
              forNote: '300–500 SKUs/month',
              cta: 'Start with Scale',
              ctaStyle: 'btn-ghost',
            },
            {
              id: 'enterprise',
              name: 'Enterprise',
              monthly: '$999',
              annualMonthly: '$790',
              annualTotal: '$9,480',
              color: 'var(--accent3)',
              popular: false,
              features: ['Unlimited images', 'Unlimited brands', 'All marketplaces', 'Unlimited seats', 'API access', 'White-label exports', 'Dedicated support + SLA'],
              forNote: 'ShowPo, Meshki scale',
              cta: 'Contact Us',
              ctaStyle: 'btn-ghost',
            },
          ] as const).map((plan) => {
            const displayPrice = annual ? plan.annualMonthly : plan.monthly
            const isFree = plan.monthly === '$0'
            return (
              <div
                key={plan.id}
                className={`bg-[var(--bg2)] rounded-md p-5 flex flex-col relative ${
                  plan.popular ? 'border border-[var(--accent)]' : 'border border-[var(--line)]'
                }`}
                style={plan.popular ? { boxShadow: '0 0 0 1px rgba(232,217,122,0.15), 0 8px 32px rgba(0,0,0,0.25)' } : {}}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-[var(--bg)] text-[0.6rem] font-bold uppercase tracking-[0.08em] px-3 py-[3px] rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <p className="text-[0.65rem] uppercase tracking-[0.1em] font-semibold mb-2" style={{ color: plan.color }}>{plan.name}</p>

                {/* Price display */}
                <div className="flex items-end gap-[3px] mb-[2px]">
                  <span className="text-[1.9rem] font-[800] tracking-[-1px] text-[var(--text)]" style={{ fontFamily: 'var(--font-display)' }}>
                    {displayPrice}
                  </span>
                  {!isFree && <span className="text-[0.75rem] text-[var(--text3)] mb-1">/mo</span>}
                </div>

                {/* Subtext under price */}
                {isFree ? (
                  <p className="text-[0.68rem] text-[var(--text3)] mb-4">No credit card required</p>
                ) : (
                  <p className="text-[0.68rem] text-[var(--text3)] mb-4">{annual ? 'billed annually' : 'billed monthly'}</p>
                )}

                <ul className="flex flex-col gap-[8px] mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-[6px] text-[0.72rem] text-[var(--text2)]">
                      <svg className="flex-shrink-0 mt-[2px]" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={plan.color} strokeWidth="2"><polyline points="2 6 5 9 10 3"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-[0.65rem] text-[var(--text3)] mb-3 italic">For: {plan.forNote}</p>
                <Link href="/signup" className={`btn ${plan.ctaStyle} w-full justify-center text-[0.75rem]`}>
                  {plan.cta}
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] px-8 py-5 flex items-center justify-between text-[0.75rem] text-[var(--text3)]">
        <span>© 2026 ShotSync.ai</span>
        <span>Built for fashion eCommerce teams</span>
      </footer>
    </div>
  )
}
