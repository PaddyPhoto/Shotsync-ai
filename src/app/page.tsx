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
