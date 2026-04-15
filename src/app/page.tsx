'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  const [annual, setAnnual] = useState(true)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', color: '#1d1d1f', fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', height: '52px', background: 'rgba(245,245,247,0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '26px', height: '26px', background: '#1d1d1f', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.3px', color: '#1d1d1f' }}>
            Shot<span style={{ color: '#6e6e73' }}>Sync</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '96px 40px 80px' }}>
        <p style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '20px' }}>
          Fashion post-production, automated
        </p>
        <h1 style={{ fontSize: '52px', fontWeight: 500, letterSpacing: '-2px', color: '#1d1d1f', lineHeight: 1.05, marginBottom: '20px', maxWidth: '640px' }}>
          From shoot to marketplace, in minutes.
        </h1>
        <p style={{ fontSize: '17px', color: '#6e6e73', maxWidth: '460px', lineHeight: 1.6, marginBottom: '36px', letterSpacing: '-0.2px' }}>
          Upload your product images. ShotSync groups them by SKU, detects shot angles, renames everything, and exports marketplace-ready sets for THE ICONIC, Myer, and David Jones.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '13px' }}>
            Get started free
          </Link>
          <Link href="/login" className="btn btn-ghost" style={{ padding: '8px 20px', fontSize: '13px' }}>
            Sign in
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '48px', marginTop: '56px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { stat: '500+', label: 'images per job' },
            { stat: '3 hrs', label: 'saved per session' },
            { stat: '4', label: 'marketplaces' },
          ].map(({ stat, label }) => (
            <div key={stat} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '26px', fontWeight: 500, letterSpacing: '-0.8px', color: '#1d1d1f' }}>{stat}</span>
              <span style={{ fontSize: '12px', color: '#aeaeb2', letterSpacing: '-0.1px' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '64px', maxWidth: '840px', width: '100%', textAlign: 'left' }}>
          {[
            { title: 'Smart Grouping', desc: 'Images sorted by filename sequence and split into product clusters automatically. No manual sorting.' },
            { title: 'Angle Detection', desc: 'Front, back, side, and detail shots automatically classified for every cluster using AI.' },
            { title: 'Multi-marketplace Export', desc: 'Rename and package images per THE ICONIC, Myer, and David Jones specs in one click.' },
            { title: 'Shopify Integration', desc: 'Push confirmed clusters directly to your Shopify product listings without downloading a ZIP.' },
            { title: 'Missing Shot Alerts', desc: 'See instantly which products are missing required angles per marketplace before you export.' },
            { title: 'Style List Import', desc: 'Upload your range sheet to auto-fill SKU, colour, and product name across every cluster.' },
          ].map((f) => (
            <div key={f.title} style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '18px', backdropFilter: 'blur(8px)' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', marginBottom: '6px', letterSpacing: '-0.2px' }}>{f.title}</p>
              <p style={{ fontSize: '12px', color: '#aeaeb2', lineHeight: 1.6, letterSpacing: '-0.1px' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Marketplace bar */}
      <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', borderBottom: '0.5px solid rgba(0,0,0,0.07)', padding: '36px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.6)' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '24px' }}>
          Export ready for Australia&apos;s leading fashion platforms
        </p>
        <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['THE ICONIC', 'MYER', 'DAVID JONES', 'SHOPIFY'].map((name) => (
            <span key={name} style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '-0.2px' }}>{name}</span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section style={{ padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '12px' }}>How it works</p>
        <h2 style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-1px', color: '#1d1d1f', marginBottom: '8px', textAlign: 'center' }}>
          From folder to marketplace in 3 steps
        </h2>
        <p style={{ fontSize: '14px', color: '#aeaeb2', marginBottom: '56px', textAlign: 'center', letterSpacing: '-0.1px' }}>
          No retouching knowledge required. No manual renaming. No spreadsheets.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '820px', width: '100%' }}>
          {[
            { step: '01', title: 'Upload your shoot folder', desc: 'Drop in your images. ShotSync reads the filenames, sorts by sequence, and groups images into product clusters automatically.' },
            { step: '02', title: 'Review and assign SKUs', desc: 'Check clusters, fix any grouping issues with drag and drop, assign SKU codes from your range list, and confirm each product.' },
            { step: '03', title: 'Export to all marketplaces', desc: 'Select your marketplaces. ShotSync renames every image per retailer spec and downloads a ready-to-upload ZIP.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '20px', backdropFilter: 'blur(8px)' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '10px' }}>{step}</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', marginBottom: '8px', letterSpacing: '-0.2px' }}>{title}</p>
              <p style={{ fontSize: '12px', color: '#aeaeb2', lineHeight: 1.6, letterSpacing: '-0.1px' }}>{desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '13px' }}>
            Try it free — no credit card needed
          </Link>
          <p style={{ fontSize: '11px', color: '#aeaeb2' }}>Set up in under 2 minutes</p>
        </div>
      </section>

      {/* Outcomes */}
      <section style={{ padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.5)' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '12px' }}>The outcome</p>
        <h2 style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-1px', color: '#1d1d1f', marginBottom: '48px', textAlign: 'center', maxWidth: '520px' }}>
          Three days of post-production. Automated in 25 minutes.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '700px', width: '100%' }}>
          {[
            { heading: '3-day job done in 25 minutes', body: 'From folder drop to marketplace-ready ZIPs — no spreadsheets, no manual renaming, no back-and-forth.' },
            { heading: 'Zero marketplace rejections', body: 'Every image exported to exact retailer spec — correct naming convention and required angles confirmed.' },
            { heading: 'Products live before the window closes', body: 'Stop racing deadlines. Launch-ready assets delivered while the shoot is still fresh.' },
            { heading: 'No more missed seasons', body: 'Post-production is no longer the bottleneck. Your range hits the floor on time, every time.' },
          ].map(({ heading, body }) => (
            <div key={heading} style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '18px 20px', backdropFilter: 'blur(8px)' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', marginBottom: '6px', letterSpacing: '-0.2px' }}>{heading}</p>
              <p style={{ fontSize: '12px', color: '#aeaeb2', lineHeight: 1.6, letterSpacing: '-0.1px' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '12px' }}>Pricing</p>
        <h2 style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-1px', color: '#1d1d1f', marginBottom: '8px', textAlign: 'center' }}>
          Simple, transparent pricing
        </h2>
        <p style={{ fontSize: '14px', color: '#aeaeb2', marginBottom: '32px', textAlign: 'center' }}>Start free. Upgrade as you grow.</p>

        {/* Early access banner */}
        <div style={{ width: '100%', maxWidth: '1060px', marginBottom: '28px', borderRadius: '12px', padding: '14px 18px', background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.07)', backdropFilter: 'blur(8px)' }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#1d1d1f', marginBottom: '3px', letterSpacing: '-0.2px' }}>Early Access Pricing — Lock in your rate for life.</p>
          <p style={{ fontSize: '12px', color: '#aeaeb2', lineHeight: 1.5, letterSpacing: '-0.1px' }}>
            Direct marketplace integrations with THE ICONIC, Myer, and David Jones are on the roadmap. Founding customers keep their current price when new features ship.
          </p>
        </div>

        {/* Billing toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: !annual ? '#1d1d1f' : '#aeaeb2', letterSpacing: '-0.1px' }}>Monthly</span>
            <button
              onClick={() => setAnnual((v) => !v)}
              style={{ position: 'relative', width: '40px', height: '24px', borderRadius: '999px', background: annual ? '#1d1d1f' : 'rgba(0,0,0,0.12)', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
            >
              <span style={{ position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: annual ? '19px' : '3px' }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: annual ? '#1d1d1f' : '#aeaeb2', letterSpacing: '-0.1px' }}>Annual</span>
              <span style={{ fontSize: '11px', fontWeight: 500, background: 'rgba(48,209,88,0.1)', color: '#1a8a35', padding: '2px 7px', borderRadius: '999px' }}>Save 20%</span>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#aeaeb2' }}>All prices in AUD inc. GST. Annual billing charged upfront.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', maxWidth: '1060px', width: '100%' }}>
          {([
            { id: 'free',       name: 'Free',       monthly: '$0',   annual: '$0',   note: 'No credit card required',     features: ['Up to 3 exports/month', 'Up to 50 images per export', '1 marketplace export folder', '1 brand, 1 seat'],                                                                                                                                         forNote: 'Try the workflow',             cta: 'Get started free',   primary: false, popular: false, founding: false },
            { id: 'starter',    name: 'Starter',    monthly: '$79',  annual: '$63',  note: 'per month, billed annually',  features: ['Up to 500 images/month', '1 brand', '2 ANZ marketplaces', '2 seats', '1 Shopify store', 'Email support'],                                                                                                                                       forNote: 'Small brands',                 cta: 'Start with Starter', primary: false, popular: false, founding: true  },
            { id: 'brand',      name: 'Brand',      monthly: '$199', annual: '$143', note: 'per month, billed annually',  features: ['Up to 2,000 images/month', '3 brands', 'All 4 ANZ marketplaces', '5 seats', '3 Shopify stores', 'Custom naming convention', 'Priority processing', 'Onboarding call'],                                                                            forNote: '100–200 SKUs/month',           cta: 'Start with Brand',   primary: true,  popular: true,  founding: true  },
            { id: 'scale',      name: 'Scale',      monthly: '$399', annual: '$359', note: 'per month, billed annually',  features: ['Up to 10,000 images/month', 'Unlimited brands', 'All 4 ANZ marketplaces', 'Unlimited seats', 'Unlimited Shopify stores', 'Custom naming', 'API access', 'Dedicated support', 'Monthly review call', 'White-label exports'],                       forNote: '300–500 SKUs/month',           cta: 'Start with Scale',   primary: false, popular: false, founding: true  },
            { id: 'enterprise', name: 'Enterprise', monthly: null,   annual: null,   note: 'Custom contract & pricing',   features: ['Unlimited everything', 'Custom marketplace rules', 'SSO + role-based permissions', 'SLA guarantee', 'Invoiced billing', 'Dedicated CSM'],                                                                                                           forNote: 'High-volume brands at scale',  cta: 'Contact us',         primary: false, popular: false, founding: false },
          ] as const).map((plan) => {
            const price = annual ? plan.annual : plan.monthly
            return (
              <div
                key={plan.id}
                style={{
                  background: plan.popular ? '#1d1d1f' : 'rgba(255,255,255,0.8)',
                  border: `0.5px solid ${plan.popular ? 'transparent' : 'rgba(0,0,0,0.07)'}`,
                  borderRadius: '14px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {plan.popular && (
                  <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: '#1d1d1f', color: '#f5f5f7', fontSize: '10px', fontWeight: 500, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', letterSpacing: '-0.1px', border: '0.5px solid rgba(255,255,255,0.15)' }}>
                    Most popular
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: plan.popular ? 'rgba(255,255,255,0.5)' : '#aeaeb2' }}>{plan.name}</p>
                  {plan.founding && (
                    <span style={{ fontSize: '9px', fontWeight: 500, padding: '2px 6px', borderRadius: '4px', background: plan.popular ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: plan.popular ? 'rgba(255,255,255,0.6)' : '#6e6e73', letterSpacing: '0.02em' }}>
                      Founding
                    </span>
                  )}
                </div>

                {price === null ? (
                  <p style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '-0.8px', color: plan.popular ? '#ffffff' : '#1d1d1f', marginBottom: '3px' }}>Custom</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-1px', color: plan.popular ? '#ffffff' : '#1d1d1f', lineHeight: 1 }}>{price}</span>
                    {price !== '$0' && <span style={{ fontSize: '11px', color: plan.popular ? 'rgba(255,255,255,0.4)' : '#aeaeb2', marginBottom: '3px' }}>/mo</span>}
                  </div>
                )}
                <p style={{ fontSize: '11px', color: plan.popular ? 'rgba(255,255,255,0.4)' : '#aeaeb2', marginBottom: '16px', letterSpacing: '-0.1px' }}>{plan.note}</p>

                <ul style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px', flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', color: plan.popular ? 'rgba(255,255,255,0.7)' : '#6e6e73', letterSpacing: '-0.1px' }}>
                      <svg style={{ flexShrink: 0, marginTop: '2px' }} width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={plan.popular ? 'rgba(255,255,255,0.5)' : '#aeaeb2'} strokeWidth="1.8"><polyline points="2 6 5 9 10 3"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: '10px', color: plan.popular ? 'rgba(255,255,255,0.3)' : '#aeaeb2', marginBottom: '12px', letterSpacing: '-0.1px' }}>For: {plan.forNote}</p>
                <Link
                  href={plan.id === 'enterprise' ? 'mailto:hello@shotsync.ai' : '/signup'}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, letterSpacing: '-0.1px',
                    background: plan.popular ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                    color: plan.popular ? '#ffffff' : '#1d1d1f',
                    border: plan.popular ? '0.5px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(0,0,0,0.1)',
                    transition: 'all 0.15s',
                    textDecoration: 'none',
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            )
          })}
        </div>

        {/* What's coming */}
        <div style={{ width: '100%', maxWidth: '1060px', marginTop: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#aeaeb2' }}>What&apos;s coming</p>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.08)' }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-0.5px', color: '#1d1d1f', marginBottom: '4px' }}>
            Direct marketplace integrations — in development
          </h3>
          <p style={{ fontSize: '13px', color: '#aeaeb2', marginBottom: '20px', letterSpacing: '-0.1px' }}>
            Included in your plan at no extra cost when launched. Early Access customers lock in their rate now.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { marketplace: 'THE ICONIC', desc: 'Images pushed directly to your THE ICONIC supplier portal. No manual upload.' },
              { marketplace: 'Myer', desc: 'Automatic delivery to Myer\'s supplier portal on export.' },
              { marketplace: 'David Jones', desc: 'One-click submission to David Jones with compliance validation.' },
            ].map(({ marketplace, desc }) => (
              <div key={marketplace} style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '16px 18px', backdropFilter: 'blur(8px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-0.2px' }}>{marketplace}</p>
                  <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 7px', borderRadius: '4px', background: 'rgba(0,0,0,0.05)', color: '#aeaeb2', letterSpacing: '-0.1px' }}>Coming soon</span>
                </div>
                <p style={{ fontSize: '12px', color: '#aeaeb2', lineHeight: 1.6, letterSpacing: '-0.1px' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', padding: '56px 40px 32px', background: 'rgba(255,255,255,0.5)' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '40px', marginBottom: '48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '24px', height: '24px', background: '#1d1d1f', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.3px', color: '#1d1d1f' }}>Shot<span style={{ color: '#6e6e73' }}>Sync</span></span>
              </div>
              <p style={{ fontSize: '12px', color: '#aeaeb2', lineHeight: 1.6, letterSpacing: '-0.1px' }}>Post-production automation for fashion eCommerce. Built for ANZ brands and agencies.</p>
              <a href="mailto:hello@shotsync.ai" style={{ fontSize: '12px', color: '#aeaeb2', letterSpacing: '-0.1px' }}>hello@shotsync.ai</a>
            </div>
            {[
              { heading: 'Product', links: [{ label: 'Features', href: '/#features' }, { label: 'Pricing', href: '/#pricing' }, { label: 'Sign up free', href: '/signup' }, { label: 'Sign in', href: '/login' }] },
              { heading: 'Marketplaces', links: [{ label: 'THE ICONIC', href: '#' }, { label: 'Myer', href: '#' }, { label: 'David Jones', href: '#' }, { label: 'Shopify', href: '#' }] },
              { heading: 'Company', links: [{ label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Service', href: '/terms' }, { label: 'Contact us', href: 'mailto:hello@shotsync.ai' }] },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <p style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '16px' }}>{heading}</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} style={{ fontSize: '13px', color: '#6e6e73', letterSpacing: '-0.1px', textDecoration: 'none' }}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '11px', color: '#aeaeb2', letterSpacing: '-0.1px' }}>© 2026 ShotSync.ai — Photoworks Sydney Pty Ltd</p>
            <p style={{ fontSize: '11px', color: '#aeaeb2', letterSpacing: '-0.1px' }}>Built for fashion eCommerce teams in Australia</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
