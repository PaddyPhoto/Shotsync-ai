'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'password' | 'magic'

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

  // Clear error when switching modes
  useEffect(() => { setError(null); setMagicSent(false) }, [mode])

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
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${nextPath}`,
      },
    })

    if (authError) {
      setError(authError.message)
    } else {
      setMagicSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex items-center gap-[10px] justify-center mb-8">
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: '#1d1d1f' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </div>
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
            {/* Mode tabs */}
            <div className="flex gap-1 p-[3px] bg-[var(--bg2)] rounded-[8px] mb-5">
              {(['password', 'magic'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 text-[0.75rem] font-[600] py-[5px] rounded-[6px] transition-colors ${
                    mode === m
                      ? 'bg-[var(--card)] text-[var(--text)] shadow-sm'
                      : 'text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}
                >
                  {m === 'password' ? 'Password' : 'Magic link'}
                </button>
              ))}
            </div>

            {magicSent ? (
              <div className="text-center py-4">
                <div className="text-2xl mb-3">✉️</div>
                <p className="text-[0.88rem] text-[var(--text)] font-[600]">Check your inbox</p>
                <p className="text-[0.78rem] text-[var(--text2)] mt-1">
                  We sent a sign-in link to <strong>{email}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setMagicSent(false)}
                  className="mt-4 text-[0.75rem] text-[var(--accent)] hover:underline"
                >
                  Send another link
                </button>
              </div>
            ) : mode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-[0.78rem] text-[var(--accent3)]">{error}</p>}

                <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-1">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
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
                <p className="text-[0.75rem] text-[var(--text3)] -mt-1">
                  We'll email you a one-click sign-in link — no password needed.
                </p>

                {error && <p className="text-[0.78rem] text-[var(--accent3)]">{error}</p>}

                <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-1">
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            )}

            <div className="mt-4 text-center text-[0.78rem] text-[var(--text3)]">
              No account?{' '}
              <Link href="/signup" className="text-[var(--accent)] hover:underline">
                Sign up
              </Link>
            </div>

            {/* Demo bypass */}
            <div className="mt-3 pt-3 border-t border-[var(--line)] text-center">
              <Link href="/dashboard" className="text-[0.75rem] text-[var(--text3)] hover:text-[var(--text2)]">
                Continue as demo →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
