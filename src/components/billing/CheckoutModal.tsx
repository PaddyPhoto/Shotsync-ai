'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { PLANS, type PlanId } from '@/lib/plans'

let stripePromise: ReturnType<typeof loadStripe> | null = null
function getStripe() {
  if (!stripePromise && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

const appearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#1d1d1f',
    colorBackground: '#ffffff',
    colorText: '#1d1d1f',
    colorTextSecondary: '#6e6e73',
    colorDanger: '#ff3b30',
    fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
    borderRadius: '8px',
    fontSizeBase: '14px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '0.5px solid rgba(0,0,0,0.15)', boxShadow: 'none', padding: '11px 14px' },
    '.Input:focus': { border: '0.5px solid #1d1d1f', boxShadow: 'none', outline: 'none' },
    '.Label': { color: '#6e6e73', fontWeight: '500', fontSize: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' },
    '.Tab': { border: '0.5px solid rgba(0,0,0,0.1)', boxShadow: 'none', borderRadius: '8px' },
    '.Tab--selected': { border: '0.5px solid #1d1d1f', boxShadow: 'none' },
    '.Tab:hover': { color: '#1d1d1f', border: '0.5px solid rgba(0,0,0,0.2)' },
    '.Block': { border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px' },
    '.CheckboxInput': { border: '0.5px solid rgba(0,0,0,0.2)' },
    '.Error': { color: '#ff3b30', fontSize: '13px' },
  },
}

interface CheckoutModalProps {
  planId: PlanId
  planName: string
  annual: boolean
  currency: 'aud' | 'usd'
  price: number
  features: string[]
  onClose: () => void
}

function PaymentForm({
  planId, planName, annual, currency, price, features,
  intentType, isNewCustomer, onClose,
}: {
  planId: PlanId
  planName: string
  annual: boolean
  currency: 'aud' | 'usd'
  price: number
  features: string[]
  intentType: 'payment' | 'setup'
  isNewCustomer: boolean
  onClose: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currencySymbol = currency === 'usd' ? '$' : '$'
  const currencyLabel = currency === 'usd' ? 'USD' : 'AUD'
  const periodLabel = annual ? `${currencyLabel} / mo, billed annually` : `${currencyLabel} / mo`
  const buttonLabel = isNewCustomer
    ? 'Start 30-day free trial'
    : `Subscribe — ${currencySymbol}${price}/${annual ? 'mo' : 'mo'}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const returnUrl = `${window.location.origin}/dashboard/settings?tab=billing&checkout=success&plan=${planId}`

    const confirmFn = intentType === 'setup' ? stripe.confirmSetup : stripe.confirmPayment
    const { error: stripeError } = await (confirmFn as typeof stripe.confirmPayment)({
      elements,
      confirmParams: { return_url: returnUrl },
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed. Please try again.')
      setLoading(false)
    }
    // On success Stripe redirects to return_url — no need to handle here
  }

  const badgeColors: Record<string, { bg: string; color: string }> = {
    launch: { bg: 'rgba(0,122,255,0.10)', color: '#0062cc' },
    growth: { bg: 'rgba(48,209,88,0.18)', color: '#1a8a35' },
    scale:  { bg: 'rgba(255,159,10,0.12)', color: '#b86e00' },
  }
  const badge = badgeColors[planId] ?? { bg: 'rgba(0,0,0,0.06)', color: '#6e6e73' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', minHeight: '440px' }}>

      {/* Left: plan summary */}
      <div style={{ padding: '36px 32px', borderRight: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '0', background: 'rgba(0,0,0,0.015)' }}>
        <div style={{ display: 'inline-block', background: badge.bg, color: badge.color, fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '999px', marginBottom: '16px', alignSelf: 'flex-start' }}>
          {planName}
        </div>
        <div style={{ fontSize: '36px', fontWeight: 500, letterSpacing: '-1.5px', color: '#1d1d1f', lineHeight: 1, marginBottom: '6px' }}>
          {price === 0 ? 'Free' : `${currencySymbol}${price}`}
        </div>
        {price > 0 && (
          <div style={{ fontSize: '13px', color: '#6e6e73', marginBottom: '24px', letterSpacing: '-.1px' }}>{periodLabel}</div>
        )}
        {isNewCustomer && price > 0 && (
          <div style={{ background: 'rgba(48,209,88,0.1)', border: '0.5px solid rgba(48,209,88,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '24px', fontSize: '13px', color: '#1a8a35', lineHeight: 1.5 }}>
            <strong>30-day free trial</strong> — no charge today.<br />
            <span style={{ color: '#4a4a4f' }}>Your card is saved for after your trial.</span>
          </div>
        )}
        <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.08)', marginBottom: '20px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {features.slice(0, 6).map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#1d1d1f', letterSpacing: '-.1px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(48,209,88,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" width="8" height="8"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              {f}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#aeaeb2' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Secured by Stripe · Cancel anytime
        </div>
      </div>

      {/* Right: payment */}
      <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px', marginBottom: '24px' }}>
          {isNewCustomer ? 'Save your payment details' : 'Complete payment'}
        </h3>
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PaymentElement options={{ layout: 'tabs' }} />
          {error && (
            <div style={{ background: 'rgba(255,59,48,0.08)', border: '0.5px solid rgba(255,59,48,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#c0392b', lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          <div style={{ marginTop: 'auto' }}>
            <button
              type="submit"
              disabled={!stripe || loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? 'rgba(0,0,0,0.4)' : '#1d1d1f',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '-.2px',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'opacity 0.15s',
                fontFamily: "inherit",
              }}
            >
              {loading ? 'Processing…' : buttonLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#6e6e73', fontSize: '13px', cursor: 'pointer', padding: '6px', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CheckoutModal({ planId, planName, annual, currency, price, features, onClose }: CheckoutModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [intentType, setIntentType] = useState<'payment' | 'setup'>('payment')
  const [isNewCustomer, setIsNewCustomer] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchIntent() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const { data: { session } } = await createClient().auth.getSession()
        const res = await fetch('/api/billing/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ planId, annual, currency }),
        })
        const data = await res.json()
        if (cancelled) return
        if (data.clientSecret) {
          setClientSecret(data.clientSecret)
          setIntentType(data.intentType ?? 'payment')
          setIsNewCustomer(data.isNewCustomer ?? true)
        } else {
          setError(data.error ?? 'Could not initialise checkout.')
        }
      } catch {
        if (!cancelled) setError('Network error. Please try again.')
      } finally {
        if (!cancelled) setFetching(false)
      }
    }
    fetchIntent()
    return () => { cancelled = true }
  }, [planId, annual, currency])

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '760px',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)',
          position: 'relative',
          fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 28px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px', margin: 0 }}>
            {annual ? 'Annual plan' : 'Monthly plan'} — {planName}
          </p>
          <button
            onClick={onClose}
            style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e6e73' }}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
              <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        {fetching ? (
          <div style={{ padding: '80px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#6e6e73', fontSize: '14px' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
              <circle cx="9" cy="9" r="7" strokeDasharray="22 10"/>
            </svg>
            Setting up checkout…
          </div>
        ) : error ? (
          <div style={{ padding: '48px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#ff3b30', marginBottom: '16px' }}>{error}</p>
            <button onClick={onClose} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
          </div>
        ) : clientSecret ? (
          <Elements
            stripe={getStripe()!}
            options={{ clientSecret, appearance }}
          >
            <PaymentForm
              planId={planId}
              planName={planName}
              annual={annual}
              currency={currency}
              price={price}
              features={features}
              intentType={intentType}
              isNewCustomer={isNewCustomer}
              onClose={onClose}
            />
          </Elements>
        ) : null}
      </div>
    </div>
  )
}
