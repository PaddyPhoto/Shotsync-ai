'use client'

/**
 * Self-contained pricing block — plan cards, monthly/annual toggle, checkout.
 * Used by the standalone /pricing page. Not animated (the landing page links here).
 */
import { useEffect, useRef, useState } from 'react'
import { PLANS } from '@/lib/plans'
import { CheckoutModal } from '@/components/billing/CheckoutModal'

export function PricingBlock() {
  const [annual, setAnnual] = useState(true)
  const [activePricingCard, setActivePricingCard] = useState(0)
  const pricingScrollRef = useRef<HTMLDivElement>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkoutLoading] = useState<string | null>(null)
  const [checkoutModal, setCheckoutModal] = useState<{ planKey: string; price: number; name: string; features: string[] } | null>(null)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().auth.getSession()
    ).then(({ data: { session } }) => {
      if (session) setIsLoggedIn(true)
    }).catch(() => {})
  }, [])

  const handlePlanCta = (planKey: string, signupHref: string) => {
    if (!isLoggedIn) { window.location.href = signupHref; return }
    if (planKey === 'free') { window.location.href = '/dashboard'; return }
    const plan = PLANS[planKey as keyof typeof PLANS]
    if (!plan) return
    const price = annual && plan.priceAudAnnual ? plan.priceAudAnnual : plan.priceAud
    setCheckoutModal({ planKey, price, name: plan.name, features: plan.highlights })
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        .price-cta-btn { display:block;text-align:center;margin-top:24px;padding:10px;border-radius:8px;font-size:13px;font-weight:500;letter-spacing:-.2px;text-decoration:none;transition:opacity .15s;background:rgba(0,0,0,0.06);color:#1d1d1f;border:none;cursor:pointer; }
        .price-cta-btn:hover { opacity:.8; }
        .price-cta-btn.featured { background:#fff;color:#1d1d1f; }
        @media (max-width: 767px) {
          .pricing-grid { grid-template-columns: 1fr 1fr !important; overflow-x: auto; }
        }
        @media (max-width: 600px) {
          .pricing-grid {
            display: flex !important; overflow-x: auto !important; scroll-snap-type: x mandatory !important;
            -webkit-overflow-scrolling: touch !important; padding: 4px 20px 12px !important; gap: 12px !important;
            background: transparent !important; border: none !important; border-radius: 0 !important;
            margin: 0 -20px 8px !important; scrollbar-width: none !important;
          }
          .pricing-grid::-webkit-scrollbar { display: none !important; }
          .pricing-dots { display: flex !important; }
          .pricing-card {
            flex: 0 0 82vw !important; scroll-snap-align: center !important;
            border-radius: 16px !important; border: 0.5px solid rgba(0,0,0,0.10) !important;
          }
        }
      `}</style>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#6e6e73', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Pricing</p>
        <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 500, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#1d1d1f', maxWidth: '600px', margin: '0 auto 16px' }}>Simple, transparent pricing.</h1>
        <p style={{ fontSize: '17px', color: '#4a4a4f', maxWidth: '560px', margin: '0 auto 36px', lineHeight: 1.5, letterSpacing: '-.2px' }}>Start free. Upgrade as you grow. Cancel anytime.</p>

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
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '24px', overflow: 'hidden', maxWidth: 'clamp(1200px,75vw,1440px)', margin: '0 auto 16px' }}
          onScroll={(e) => {
            const el = e.currentTarget
            const cardWidth = el.scrollWidth / 4
            setActivePricingCard(Math.round(el.scrollLeft / cardWidth))
          }}
        >
          {([
            { planKey: 'free'   as const, badge: 'Free',         featured: false, badgeBg: 'rgba(255,59,48,0.10)',     badgeColor: '#c9302a', cta: 'Get started free',  href: '/signup' },
            { planKey: 'launch' as const, badge: 'Launch',       featured: false, badgeBg: 'rgba(0,122,255,0.10)',     badgeColor: '#0062cc', cta: 'Start with Launch', href: '/signup?plan=launch' },
            { planKey: 'growth' as const, badge: 'Most popular', featured: true,  badgeBg: 'rgba(48,209,88,0.18)',     badgeColor: '#30d158', cta: 'Start with Growth', href: '/signup?plan=growth' },
            { planKey: 'scale'  as const, badge: 'Scale',        featured: false, badgeBg: 'rgba(255,159,10,0.12)',    badgeColor: '#b86e00', cta: 'Start with Scale',  href: '/signup?plan=scale' },
          ]).map(({ planKey, badge, featured, badgeBg, badgeColor, cta, href }) => {
            const isLoading = checkoutLoading === planKey
            const p = PLANS[planKey]
            const price = planKey === 'free' ? '$0' : `$${annual ? p.priceAudAnnual : p.priceAud}`
            const period = planKey === 'free' ? 'forever' : annual ? 'AUD / mo, billed annually' : 'AUD / month'
            const saving = planKey !== 'free' && annual ? Math.round((1 - p.priceAudAnnual / p.priceAud) * 100) : 0
            const cardBg = featured
              ? 'linear-gradient(155deg, #0d1a2e 0%, #151e30 40%, #1d1d1f 100%)'
              : '#fff'
            return (
              <div key={planKey} className="pricing-card" style={{ background: cardBg, textAlign: 'left', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'inline-block', background: badgeBg, borderRadius: '999px', padding: '4px 10px', fontSize: '12px', fontWeight: 500, color: badgeColor, marginBottom: '20px', letterSpacing: '-.1px' }}>{badge}</div>
                  <div style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '-.4px', color: featured ? '#fff' : '#1d1d1f', marginBottom: '8px' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '36px', fontWeight: 500, letterSpacing: '-1.5px', color: featured ? '#fff' : '#1d1d1f', lineHeight: 1 }}>{price}</div>
                    {saving > 0 && <span style={{ fontSize: '11px', background: 'rgba(48,209,88,0.18)', color: '#1a8a35', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>-{saving}%</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: featured ? 'rgba(255,255,255,0.75)' : '#3a3a3c', marginBottom: '24px', letterSpacing: '-.1px' }}>{period}</div>
                  <div style={{ height: '0.5px', background: featured ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', marginBottom: '20px' }} />
                  {p.highlights.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px', fontSize: '15px', color: featured ? 'rgba(255,255,255,0.92)' : '#1d1d1f', letterSpacing: '-.1px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: featured ? 'rgba(48,209,88,0.2)' : 'rgba(48,209,88,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
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

        {/* Enterprise — full-width strip below plan cards */}
        <div style={{ maxWidth: '1200px', margin: '12px auto 0', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', background: '#fff', padding: '11px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'left' }}>
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
      </div>

      {checkoutModal && (
        <CheckoutModal
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          planId={checkoutModal.planKey as any}
          planName={checkoutModal.name}
          annual={annual}
          currency="aud"
          price={checkoutModal.price}
          features={checkoutModal.features}
          onClose={() => setCheckoutModal(null)}
        />
      )}
    </>
  )
}
