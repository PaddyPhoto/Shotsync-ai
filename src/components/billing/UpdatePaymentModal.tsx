'use client'

import { useState, useEffect } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

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
    '.Label': { color: '#6e6e73', fontWeight: '500', fontSize: '13px', letterSpacing: '0.04em', textTransform: 'uppercase' },
    '.Tab': { border: '0.5px solid rgba(0,0,0,0.1)', boxShadow: 'none', borderRadius: '8px' },
    '.Tab--selected': { border: '0.5px solid #1d1d1f', boxShadow: 'none' },
    '.Tab:hover': { color: '#1d1d1f', border: '0.5px solid rgba(0,0,0,0.2)' },
    '.Block': { border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px' },
    '.Error': { color: '#ff3b30', fontSize: '14px' },
  },
}

function UpdateForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) { setError(submitError.message ?? 'Validation failed'); setLoading(false); return }

    const { setupIntent, error: confirmError } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/dashboard/settings?tab=billing` },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Could not update payment method.')
      setLoading(false)
      return
    }

    if (setupIntent?.status === 'succeeded') {
      onSuccess()
    } else {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div style={{ background: 'rgba(255,59,48,0.08)', border: '0.5px solid rgba(255,59,48,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#c0392b' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={onClose}
          style={{ flex: 1, padding: '11px', background: 'rgba(0,0,0,0.06)', color: '#1d1d1f', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          style={{ flex: 2, padding: '11px', background: loading ? 'rgba(0,0,0,0.4)' : '#1d1d1f', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}
        >
          {loading ? 'Saving…' : 'Save payment method'}
        </button>
      </div>
    </form>
  )
}

export function UpdatePaymentModal({ onClose }: { onClose: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchIntent() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const { data: { session } } = await createClient().auth.getSession()
        const res = await fetch('/api/billing/setup-intent', {
          method: 'POST',
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        const data = await res.json()
        if (cancelled) return
        if (data.clientSecret) {
          setClientSecret(data.clientSecret)
        } else {
          setError(data.error ?? 'Could not open payment settings.')
        }
      } catch {
        if (!cancelled) setError('Network error. Please try again.')
      } finally {
        if (!cancelled) setFetching(false)
      }
    }
    fetchIntent()
    return () => { cancelled = true }
  }, [])

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
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '16px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px', margin: 0 }}>Update payment method</p>
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
        <div style={{ padding: '24px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(48,209,88,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 500, color: '#1d1d1f', marginBottom: '8px' }}>Payment method updated</p>
              <p style={{ fontSize: '14px', color: '#6e6e73', marginBottom: '20px' }}>Your new payment method will be used for future charges.</p>
              <button onClick={onClose} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
            </div>
          ) : fetching ? (
            <div style={{ padding: '40px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#6e6e73', fontSize: '15px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <circle cx="8" cy="8" r="6" strokeDasharray="19 9"/>
              </svg>
              Loading…
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: '14px', color: '#ff3b30', marginBottom: '16px' }}>{error}</p>
              <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.06)', color: '#1d1d1f', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
            </div>
          ) : clientSecret ? (
            <Elements stripe={getStripe()!} options={{ clientSecret, appearance }}>
              <UpdateForm onClose={onClose} onSuccess={() => setSuccess(true)} />
            </Elements>
          ) : null}
        </div>

        {!success && !fetching && !error && (
          <div style={{ padding: '12px 24px 16px', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#aeaeb2' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Secured by Stripe · Your card is never stored on our servers
          </div>
        )}
      </div>
    </div>
  )
}
