'use client'

import { useState } from 'react'
import { PLANS, type PlanId } from '@/lib/plans'
import { planHighlights } from '@/lib/plans/highlights'
import { usePlan } from '@/context/PlanContext'
import { CheckoutModal } from '@/components/billing/CheckoutModal'
import { PaymentLogos } from '@/components/billing/PaymentLogos'

const STRIPE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY !== 'pk_test_placeholder'
)

const PLAN_ORDER: PlanId[] = ['free', 'launch', 'growth', 'scale', 'enterprise']

export function UpgradeModal() {
  const { upgradeReason, closeUpgrade, planId, region, refreshPlan } = usePlan()
  const [loading, setLoading] = useState<PlanId | null>(null)
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null)

  if (!upgradeReason && upgradeReason !== '') return null

  const isChangingPlan = upgradeReason === 'change-plan' || planId !== 'free'
  const currentRank = PLAN_ORDER.indexOf(planId)

  const handleUpgrade = async (targetPlanId: PlanId) => {
    if (targetPlanId === 'free') return
    setLoading(targetPlanId)

    if (!STRIPE_CONFIGURED) {
      localStorage.setItem('shotsync:plan', targetPlanId)
      await refreshPlan()
      setLoading(null)
      closeUpgrade()
      return
    }

    // Open embedded checkout instead of redirecting
    setLoading(null)
    setCheckoutPlan(targetPlanId)
  }

  const upgradePlans = (['launch', 'growth', 'scale', 'enterprise'] as PlanId[]).filter((id) => id !== planId)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="bg-[var(--bg)] border border-[var(--line2)] rounded-md w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <p className="text-[length:var(--font-sm)] text-[var(--accent)] uppercase tracking-[0.1em] font-semibold mb-1">
              {isChangingPlan ? 'Change Plan' : 'Upgrade Required'}
            </p>
            <h2 className="text-[length:var(--font-xl)] font-[700] tracking-[-0.3px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
              {isChangingPlan ? 'Switch to a different plan' : (upgradeReason || 'Unlock more with ShotSync')}
            </h2>
            <p className="text-[length:var(--font-sm)] text-[var(--text3)] mt-1">
              {isChangingPlan
                ? 'Upgrades take effect immediately. Downgrades apply at the end of your billing cycle.'
                : 'Start free for 30 days — no charge until your trial ends'}
            </p>
          </div>
          <button onClick={closeUpgrade} className="text-[var(--text3)] hover:text-[var(--text2)] transition-colors p-1 mt-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Plan cards */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-4">
          {upgradePlans.map((id) => {
            const p = PLANS[id]
            const isRecommended = id === 'growth'
            return (
              <div
                key={id}
                className={`relative rounded-md border p-5 flex flex-col gap-4 ${
                  isRecommended
                    ? 'border-[var(--accent)] bg-[rgba(232,217,122,0.04)]'
                    : 'border-[var(--line2)] bg-[var(--bg3)]'
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-[10px] left-4 text-[length:var(--font-xs)] font-bold uppercase tracking-[0.1em] bg-[var(--accent)] text-black px-2 py-[2px] rounded-full">
                    Recommended
                  </span>
                )}
                <div>
                  <p className="text-[length:var(--font-md)] font-[700] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
                    {p.name}
                  </p>
                  <p className="text-[length:var(--font-base)] text-[var(--text3)] mt-[2px]">{p.description}</p>
                </div>

                <div>
                  {id === 'enterprise' ? (
                    <span className="text-[length:var(--font-xl)] font-[700] text-[var(--text)]">Contact us</span>
                  ) : (
                    <>
                      {!isChangingPlan && (
                        <div className="inline-flex items-center gap-1.5 bg-[rgba(62,207,142,0.12)] text-[var(--accent2)] text-[length:var(--font-sm)] font-semibold px-2 py-[3px] rounded-full mb-2">
                          30 days free
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-[length:var(--font-3xl)] font-[700] text-[var(--text)]">${p.priceAud}</span>
                        <span className="text-[length:var(--font-sm)] text-[var(--text3)]">AUD/month{!isChangingPlan && ' after trial'}</span>
                      </div>
                    </>
                  )}
                </div>

                <ul className="flex flex-col gap-[6px]">
                  {planHighlights(id, region).map((h) => (
                    <li key={h} className="flex items-center gap-2 text-[length:var(--font-base)] text-[var(--text2)]">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="var(--accent2)" strokeWidth="1.8">
                        <polyline points="2 6 4.5 8.5 9 3"/>
                      </svg>
                      {h}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(id)}
                  disabled={loading === id}
                  className={`btn btn-sm w-full justify-center mt-auto ${isRecommended ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {loading === id ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 12 12" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="6" cy="6" r="4" strokeDasharray="16 8"/>
                      </svg>
                      {STRIPE_CONFIGURED ? 'Redirecting…' : 'Activating…'}
                    </>
                  ) : id === 'enterprise' ? (
                    'Contact us'
                  ) : isChangingPlan ? (
                    PLAN_ORDER.indexOf(id) > currentRank ? `Upgrade to ${p.name}` : `Switch to ${p.name}`
                  ) : (
                    `Start free trial — ${p.name}`
                  )}
                </button>

                {!STRIPE_CONFIGURED && (
                  <p className="text-[length:var(--font-xs)] text-[var(--text3)] text-center -mt-2">
                    Demo mode — no payment required
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="border-t border-[var(--line)] px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <button onClick={closeUpgrade} className="text-[length:var(--font-base)] text-[var(--text3)] hover:text-[var(--text2)] transition-colors">
            {isChangingPlan ? 'Keep current plan' : 'Continue on Free'}
          </button>
          <PaymentLogos style={{ gap: '6px' }} />
        </div>
      </div>

      {checkoutPlan && checkoutPlan !== 'enterprise' && (
        <CheckoutModal
          planId={checkoutPlan}
          planName={PLANS[checkoutPlan].name}
          annual={false}
          currency="aud"
          price={PLANS[checkoutPlan].priceAud}
          features={PLANS[checkoutPlan].highlights}
          onClose={() => setCheckoutPlan(null)}
        />
      )}
    </div>
  )
}
