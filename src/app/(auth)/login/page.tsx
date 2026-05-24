'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'

type Mode = 'password' | 'magic' | 'reset'

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>
}

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/dashboard'
  const urlError = searchParams.get('error')

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    urlError === 'auth_callback_failed' ? 'The sign-in link expired or was already used. Try again.' : null
  )
  const [magicSent, setMagicSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Clear error when switching modes
  useEffect(() => { setError(null); setMagicSent(false); setResetSent(false) }, [mode])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

if (authError) {
      setError(authError.message)
      setLoading(false)
    } else if (!data.session) {
      setError('No session returned — email may not be confirmed yet.')
      setLoading(false)
    } else {
      // Small delay to allow session cookie to be written before middleware runs
      window.location.href = nextPath
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })

    if (authError) {
      setError(authError.message)
    } else {
      setMagicSent(true)
    }
    setLoading(false)
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })

    if (authError) {
      setError(authError.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex items-center gap-[10px] justify-center mb-8">
          <img src="/icon.png" alt="ShotSync" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <span className="text-[1.1rem] font-medium tracking-[-0.4px]" style={{ color: '#1d1d1f' }}>
            Shot<span style={{ color: '#6e6e73' }}>Sync</span>
          </span>
        </div>

        <div className="card">
          <div className="card-head" style={{ borderBottom: 'none', paddingBottom: '0' }}>
            <div>
              <h1 className="text-[1.2rem] font-[700] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
                Sign in
              </h1>
              <p className="text-[0.82rem] text-[var(--text2)] mt-1">Welcome back</p>
            </div>
          </div>

          <div className="card-body pt-4">
            {mode !== 'reset' && <SocialAuthButtons nextPath={nextPath} label="Sign in" />}
            {/* Mode tabs */}
            <div className="flex gap-1 p-[3px] bg-[var(--bg2)] rounded-[8px] mb-5">
              {(['password', 'magic'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 text-[0.82rem] font-[600] py-[5px] rounded-[6px] transition-colors ${
                    mode === m
                      ? 'bg-[var(--card)] text-[var(--text)] shadow-sm'
                      : 'text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}
                >
                  {m === 'password' ? 'Password' : 'Magic link'}
                </button>
              ))}
            </div>

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => setMode('password')}
                className="flex items-center gap-1 text-[0.82rem] text-[var(--text3)] hover:text-[var(--text2)] mb-4 -mt-1"
              >
                ← Back to sign in
              </button>
            )}

            {magicSent ? (
              <div className="text-center py-4">
                <div className="text-2xl mb-3">✉️</div>
                <p className="text-[0.88rem] text-[var(--text)] font-[600]">Check your inbox</p>
                <p className="text-[0.85rem] text-[var(--text2)] mt-1">
                  We sent a sign-in link to <strong>{email}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setMagicSent(false)}
                  className="mt-4 text-[0.82rem] text-[var(--accent)] hover:underline"
                >
                  Send another link
                </button>
              </div>
            ) : mode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
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
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      style={{ paddingRight: '36px' }}
                      required
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

                <button type="button" onClick={() => setMode('reset')} className="text-[0.8rem] text-[var(--text3)] hover:text-[var(--accent)] text-left -mt-2">
                  Forgot password?
                </button>

                {error && <p className="text-[0.85rem] text-[var(--accent3)]">{error}</p>}

                <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-1">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            ) : mode === 'reset' ? (
              resetSent ? (
                <div className="text-center py-4">
                  <div className="text-2xl mb-3">✉️</div>
                  <p className="text-[0.88rem] text-[var(--text)] font-[600]">Check your inbox</p>
                  <p className="text-[0.85rem] text-[var(--text2)] mt-1">
                    We sent a password reset link to <strong>{email}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setResetSent(false)}
                    className="mt-4 text-[0.82rem] text-[var(--accent)] hover:underline"
                  >
                    Resend link
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[0.85rem] text-[var(--text2)] mb-[6px] block">Email</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="you@brand.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[0.82rem] text-[var(--text3)] -mt-1">
                    We'll email you a link to set a new password.
                  </p>

                  {error && <p className="text-[0.85rem] text-[var(--accent3)]">{error}</p>}

                  <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-1">
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
                <div>
                  <label className="text-[0.85rem] text-[var(--text2)] mb-[6px] block">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@brand.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[0.82rem] text-[var(--text3)] -mt-1">
                  We'll email you a one-click sign-in link — no password needed.
                </p>

                {error && <p className="text-[0.85rem] text-[var(--accent3)]">{error}</p>}

                <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-1">
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            )}

            <div className="mt-4 text-center text-[0.85rem] text-[var(--text3)]">
              No account?{' '}
              <Link href="/signup" className="text-[var(--accent)] hover:underline">
                Sign up
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
