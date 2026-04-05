'use client'

import { useState } from 'react'
import { PLANS, type PlanId } from '@/lib/plans'
import { usePlan } from '@/context/PlanContext'

const STRIPE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY !== 'pk_test_placeholder'
)

export function UpgradeModal() {
  const { upgradeReason, closeUpgrade, planId, refreshPlan } = usePlan()
  const [loading, setLoading] = useState<PlanId | null>(null)

  if (!upgradeReason && upgradeReason !== '') return null

  const handleUpgrade = async (targetPlanId: PlanId) => {
    if (targetPlanId === 'free') return
    setLoading(targetPlanId)

    if (!STRIPE_CONFIGURED) {
      // Demo mode: just update local storage
      localStorage.setItem('shotsync:plan', targetPlanId)
      await refreshPlan()
      setLoading(null)
      closeUpgrade()
      return
    }

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ planId: targetPlanId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      setLoading(null)
    }
  }

  const upgradePlans = (['pro', 'business'] as PlanId[]).filter((id) => id !== planId)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="bg-[var(--bg)] border border-[var(--line2)] rounded-md w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <p className="text-[0.72rem] text-[var(--accent)] uppercase tracking-[0.1em] font-semibold mb-1">Upgrade Required</p>
            <h2 className="text-[1.2rem] font-[700] tracking-[-0.3px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
              {upgradeReason || 'Unlock more with ShotSync'}
            </h2>
            <p className="text-[0.82rem] text-[var(--text3)] mt-1">
              Choose a plan to continue
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
            const isRecommended = id === 'pro'
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
                  <span className="absolute -top-[10px] left-4 text-[0.65rem] font-bold uppercase tracking-[0.1em] bg-[var(--accent)] text-black px-2 py-[2px] rounded-full">
                    Recommended
                  </span>
                )}
                <div>
                  <p className="text-[0.95rem] font-[700] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
                    {p.name}
                  </p>
                  <p className="text-[0.78rem] text-[var(--text3)] mt-[2px]">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-[1.6rem] font-[700] text-[var(--text)]">${p.price}</span>
                  <span className="text-[0.75rem] text-[var(--text3)]">/month</span>
                </div>

                <ul className="flex flex-col gap-[6px]">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-[0.78rem] text-[var(--text2)]">
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
                  ) : (
                    `Upgrade to ${p.name}`
                  )}
                </button>

                {!STRIPE_CONFIGURED && (
                  <p className="text-[0.65rem] text-[var(--text3)] text-center -mt-2">
                    Demo mode — no payment required
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="border-t border-[var(--line)] px-6 py-3 flex items-center justify-between">
          <button onClick={closeUpgrade} className="text-[0.78rem] text-[var(--text3)] hover:text-[var(--text2)] transition-colors">
            Continue on Free
          </button>
          <p className="text-[0.72rem] text-[var(--text3)]">Cancel anytime · No contracts</p>
        </div>
      </div>
    </div>
  )
}
