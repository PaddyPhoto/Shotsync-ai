'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EnterPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const res = await fetch('/api/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-[10px] mb-10">
        <div
          className="w-9 h-9 rounded-[8px] flex items-center justify-center"
          style={{ background: 'var(--accent-deep)', boxShadow: '0 0 20px rgba(26,79,255,0.4)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
        </div>
        <span className="text-[1.2rem] font-bold tracking-[-0.5px]" style={{ fontFamily: 'var(--font-syne)' }}>
          Shot<span style={{ color: 'var(--accent)' }}>Sync</span><span style={{ color: 'var(--text3)', fontWeight: 300 }}>.ai</span>
        </span>
      </div>

      <div className="w-full max-w-[360px] bg-[var(--bg2)] border border-[var(--line)] rounded-md p-7 flex flex-col gap-5">
        <div>
          <h1 className="text-[1.1rem] font-[700] text-[var(--text)] tracking-[-0.3px]" style={{ fontFamily: 'var(--font-syne)' }}>
            Early Access
          </h1>
          <p className="text-[0.8rem] text-[var(--text3)] mt-1">Enter your access code to continue.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password"
            className="input"
            placeholder="Access code"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            autoFocus
          />
          {error && (
            <p className="text-[0.82rem] text-red-400">Incorrect access code. Try again.</p>
          )}
          <button type="submit" disabled={loading || !password} className="btn btn-primary w-full justify-center">
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>

        <p className="text-[0.79rem] text-[var(--text3)] text-center">
          Need access?{' '}
          <a href="mailto:hello@shotsync.ai" className="text-[var(--accent)] hover:underline">
            hello@shotsync.ai
          </a>
        </p>
      </div>
    </div>
  )
}
