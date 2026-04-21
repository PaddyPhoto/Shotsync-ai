'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'photoworkssydney@gmail.com'

export default function AdminPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  const [subject, setSubject] = useState("ShotSync.ai is live — post-production on autopilot")
  const [preview, setPreview] = useState<{ count: number; emails: string[]; subject: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session: s } }) => {
      if (!s || s.user.email !== ADMIN_EMAIL) {
        router.replace('/dashboard')
      } else {
        setSession(s)
      }
    })
  }, [router])

  if (!session) return null

  const token = session.access_token

  async function loadPreview() {
    setLoading(true)
    setError(null)
    setResult(null)
    setConfirmed(false)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, preview: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPreview(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function sendBroadcast() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, preview: false }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(json)
      setPreview(null)
      setConfirmed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar breadcrumbs={[{ label: 'Admin' }]} />
      <div style={{ padding: '32px', maxWidth: '640px' }}>

        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head">
            <div>
              <h2 className="text-[1rem] font-[600] text-[var(--text)]">Broadcast EDM</h2>
              <p className="text-[0.8rem] text-[var(--text3)] mt-1">Send the ShotSync promotional email to all signed-up users.</p>
            </div>
          </div>
          <div className="card-body flex flex-col gap-4">

            <div>
              <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">Subject line</label>
              <input
                className="input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>

            {error && (
              <p className="text-[0.78rem] text-[var(--accent3)] bg-[rgba(255,59,48,0.07)] rounded-[8px] px-3 py-2">{error}</p>
            )}

            {!preview && !result && (
              <button
                className="btn btn-primary w-full justify-center"
                onClick={loadPreview}
                disabled={loading || !subject.trim()}
              >
                {loading ? 'Loading…' : 'Preview recipients'}
              </button>
            )}

            {preview && !result && (
              <div className="flex flex-col gap-3">
                <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '16px', border: '0.5px solid var(--line)' }}>
                  <p className="text-[0.82rem] font-[500] text-[var(--text)] mb-2">
                    This will send to <strong>{preview.count}</strong> users
                  </p>
                  <p className="text-[0.75rem] text-[var(--text3)] mb-2">Sample recipients:</p>
                  {preview.emails.map(e => (
                    <p key={e} className="text-[0.75rem] text-[var(--text2)] font-mono">{e}</p>
                  ))}
                  {preview.count > preview.emails.length && (
                    <p className="text-[0.75rem] text-[var(--text3)] mt-1">+{preview.count - preview.emails.length} more…</p>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-[0.8rem] text-[var(--text2)]">
                    I confirm I want to send this EDM to {preview.count} users
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    className="btn btn-primary flex-1 justify-center"
                    onClick={sendBroadcast}
                    disabled={loading || !confirmed}
                  >
                    {loading ? 'Sending…' : `Send to ${preview.count} users`}
                  </button>
                  <button
                    className="btn flex-1 justify-center"
                    onClick={() => { setPreview(null); setConfirmed(false) }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div style={{ background: 'rgba(48,209,88,0.08)', borderRadius: '10px', padding: '16px', border: '0.5px solid rgba(48,209,88,0.2)' }}>
                <p className="text-[0.9rem] font-[600] text-[var(--accent2)] mb-1">Broadcast sent</p>
                <p className="text-[0.8rem] text-[var(--text2)]">
                  ✓ {result.sent} sent · {result.failed} failed · {result.total} total
                </p>
                <button
                  className="btn mt-3"
                  onClick={() => { setResult(null); setPreview(null) }}
                >
                  Send another
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
