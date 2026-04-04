'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type InviteStatus = 'loading' | 'valid' | 'accepted' | 'expired' | 'error'

interface InviteInfo {
  org_id: string
  org_name: string
  email: string
  role: string
}

export default function InvitePage() {
  const router = useRouter()
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<InviteStatus>('loading')
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('org_invites')
        .select('org_id, email, role, expires_at, accepted_at, orgs(name)')
        .eq('token', token)
        .single()

      if (error || !data) {
        setStatus('error')
        return
      }
      if (data.accepted_at) {
        setStatus('accepted')
        return
      }
      if (new Date(data.expires_at) < new Date()) {
        setStatus('expired')
        return
      }
      setInvite({
        org_id: data.org_id,
        org_name: (data.orgs as unknown as { name: string } | null)?.name ?? 'Unknown org',
        email: data.email,
        role: data.role,
      })
      setStatus('valid')
    }
    load()
  }, [token])

  const handleAccept = async () => {
    if (!invite) return
    setAccepting(true)
    setError(null)

    try {
      const res = await fetch(`/api/orgs/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to accept invite')
        setAccepting(false)
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setAccepting(false)
    }
  }

  const Logo = () => (
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
  )

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <Logo />

        <div className="card">
          {status === 'loading' && (
            <div className="card-body text-center py-8 text-[var(--text3)] text-[0.85rem]">
              Checking invite…
            </div>
          )}

          {status === 'error' && (
            <div className="card-body text-center py-8">
              <p className="text-[0.88rem] text-[var(--text)]">Invite not found</p>
              <p className="text-[0.78rem] text-[var(--text3)] mt-1">
                This link may be invalid or has already been used.
              </p>
              <Link href="/login" className="mt-4 inline-block text-[0.78rem] text-[var(--accent)] hover:underline">
                Go to login
              </Link>
            </div>
          )}

          {status === 'expired' && (
            <div className="card-body text-center py-8">
              <p className="text-[0.88rem] text-[var(--text)]">Invite expired</p>
              <p className="text-[0.78rem] text-[var(--text3)] mt-1">
                Ask your team admin to send a new invite.
              </p>
            </div>
          )}

          {status === 'accepted' && (
            <div className="card-body text-center py-8">
              <p className="text-[0.88rem] text-[var(--text)]">Already accepted</p>
              <Link href="/dashboard" className="mt-3 inline-block text-[0.78rem] text-[var(--accent)] hover:underline">
                Go to dashboard
              </Link>
            </div>
          )}

          {status === 'valid' && invite && (
            <div className="card-body">
              <div className="card-head" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                <div>
                  <h1 className="text-[1.1rem] font-[700] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>
                    You've been invited
                  </h1>
                  <p className="text-[0.82rem] text-[var(--text2)] mt-1">
                    Join <strong>{invite.org_name}</strong> as{' '}
                    <span className="capitalize">{invite.role}</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <div className="bg-[var(--bg2)] rounded-[8px] px-3 py-2 text-[0.78rem] text-[var(--text3)]">
                  Invited email: <span className="text-[var(--text)]">{invite.email}</span>
                </div>

                {error && <p className="text-[0.78rem] text-[var(--accent3)]">{error}</p>}

                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="btn btn-primary w-full justify-center"
                >
                  {accepting ? 'Joining…' : `Join ${invite.org_name}`}
                </button>

                <p className="text-[0.72rem] text-[var(--text3)] text-center">
                  You'll need to be signed in as {invite.email} to accept.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
