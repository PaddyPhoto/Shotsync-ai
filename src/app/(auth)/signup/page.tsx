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
  const [brandName, setBrandName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
                <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">Brand Name</label>
                <input
                  className="input"
                  placeholder="Your brand name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@brand.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {error && <p className="text-[0.78rem] text-[var(--accent3)]">{error}</p>}

              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-1">
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <div className="mt-4 text-center text-[0.78rem] text-[var(--text3)]">
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
