'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      router.replace('/dashboard')
    }
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
                Set new password
              </h1>
              <p className="text-[0.82rem] text-[var(--text2)] mt-1">Choose a strong password</p>
            </div>
          </div>

          <div className="card-body pt-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div>
                <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-[0.78rem] text-[var(--accent3)]">{error}</p>}

              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-1">
                {loading ? 'Saving…' : 'Set password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
