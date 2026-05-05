'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type PlanId } from '@/lib/plans'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = (searchParams.get('plan') ?? 'free') as PlanId

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { brand_name: brandName } },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!data.session) {
        setError('Check your email for a confirmation link before signing in.')
        setLoading(false)
        return
      }

      // Fire welcome email — non-blocking, don't await
      fetch('/api/users/welcome', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      }).catch(() => {})

      // If a paid plan was selected from the landing page, go straight to Stripe checkout
      if (planParam && planParam !== 'free') {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ planId: planParam }),
        })
        const json = await res.json()
        if (json.url) {
          window.location.href = json.url
          return
        }
      }

      // Free plan or checkout failed — go to dashboard
      window.location.href = '/dashboard'
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const planLabel = planParam !== 'free' ? ` — ${planParam.charAt(0).toUpperCase() + planParam.slice(1)} plan` : ''

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-[10px] justify-center mb-8">
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-deep)', boxShadow: '0 0 16px rgba(26,79,255,0.4)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </div>
          <span className="text-[1.1rem] font-bold tracking-[-0.5px]" style={{ fontFamily: 'var(--font-syne)' }}>
            Shot<span style={{ color: 'var(--accent)' }}>Sync</span><span style={{ color: 'var(--text3)', fontWeight: 300 }}>.ai</span>
          </span>
        </div>

        <div className="card">
          <div className="card-head" style={{ borderBottom: 'none', paddingBottom: '0' }}>
            <div>
              <h1 className="text-[1.2rem] font-[700] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
                Create account
              </h1>
              <p className="text-[0.82rem] text-[var(--text2)] mt-1">Start your free trial{planLabel}</p>
            </div>
          </div>
          <div className="card-body pt-4">
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <div>
                <label className="text-[0.85rem] text-[var(--text2)] mb-[6px] block">Company Name</label>
                <input
                  className="input"
                  placeholder="Your company name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[0.85rem] text-[var(--text2)] mb-[6px] block">Email</label>
                <input
                  type="email"
                  name="email"
                  className="input"
                  placeholder="you@brand.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="text-[0.85rem] text-[var(--text2)] mb-[6px] block">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="input"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    style={{ paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: '2px', display: 'flex', alignItems: 'center' }}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" strokeLinecap="round"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" strokeLinecap="round"/>
                        <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-[2px] flex-shrink-0 accent-[var(--accent)]"
                />
                <span className="text-[0.82rem] text-[var(--text3)] leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-[var(--accent)] hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" target="_blank" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>
                </span>
              </label>

              {error && <p className="text-[0.85rem] text-[var(--accent3)]">{error}</p>}

              <button type="submit" disabled={loading || !agreed} className="btn btn-primary w-full justify-center mt-1">
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <div className="mt-4 text-center text-[0.85rem] text-[var(--text3)]">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--accent)] hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
